// src/app/api/central/handshake/route.ts
// Central customer handshake endpoint executed after authentication.
// Verifies identity, registers device, logs login telemetry, and retrieves authoritative entitlement.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  ensureCentralCustomerProfile,
  recordCentralLoginEvent,
  registerCentralDevice,
  getCentralCustomerData,
  mutateCentralSubscription,
} from "@/lib/supabase/server";
import { isSupabaseServerAdminConfigured } from "@/lib/supabase/config";
import {
  computeEntitlement,
  saveCachedEntitlement,
  resolveOfflineEntitlement,
} from "@/lib/entitlement/entitlement-service";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Authoritative caller authentication
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authenticated session required" } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const deviceId = typeof body.deviceId === "string" && body.deviceId.trim() ? body.deviceId.trim() : "desktop_default";
    const os = typeof body.os === "string" && body.os.trim() ? body.os.trim() : "windows";
    const appVersion = typeof body.appVersion === "string" && body.appVersion.trim() ? body.appVersion.trim() : "1.0.0";
    const loginMethod = typeof body.loginMethod === "string" && body.loginMethod.trim() ? body.loginMethod.trim() : "password";

    // 2. Check if Central Supabase is configured
    const isCentralConfigured = isSupabaseServerAdminConfigured();

    if (isCentralConfigured) {
      try {
        // Execute central control flow asynchronously or in sequence
        await Promise.allSettled([
          ensureCentralCustomerProfile({
            customerId: user.id,
            email: user.email,
            fullName: user.displayName,
          }),
          recordCentralLoginEvent({
            customerId: user.id,
            deviceId,
            loginMethod,
            os,
            appVersion,
          }),
          registerCentralDevice({
            customerId: user.id,
            deviceId,
            os,
            appVersion,
          }),
        ]);

        // Authoritatively query central entitlement
        const centralData = await getCentralCustomerData(user.id);
        let entitlement: any;

        if (centralData && centralData.subscription) {
          entitlement = computeEntitlement(centralData.subscription, centralData.profile);
        } else {
          // If Central Supabase has no subscription record yet, consult local SQLite
          const localSub = await prisma.userSubscription.findUnique({
            where: { userId: user.id },
          }).catch(() => null);
          const localProfile = await prisma.profile.findUnique({
            where: { userId: user.id },
          }).catch(() => null);
          entitlement = computeEntitlement(localSub, centralData?.profile || localProfile);

          // If local active subscription is found, keep central updated
          if (entitlement.premiumEnabled && localSub) {
            const centralStatus: "active" | "expired" | "canceled" =
              localSub.status === "active" ? "active" : localSub.status === "expired" ? "expired" : "canceled";
            mutateCentralSubscription({
              customerId: user.id,
              plan: "premium",
              status: centralStatus,
              expiresAt: localSub.currentPeriodEnd ? localSub.currentPeriodEnd.toISOString() : null,
              adminEmail: user.email,
              reason: "Handshake sync from local active subscription",
            }).catch(() => {});
          }
        }

        // Update local secure cache for offline resilience
        saveCachedEntitlement(user.id, entitlement);

        return NextResponse.json({
          success: true,
          connectionState: "ONLINE_VERIFIED",
          entitlement,
          deviceId,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
        });
      } catch (centralErr) {
        console.warn("[Central Handshake] Central connection failed, evaluating offline fallback:", centralErr);
      }
    }

    // 3. Fallback when central is offline, unreachable, or unconfigured
    // Read local subscription to compute baseline entitlement without disrupting user
    const localSub = await prisma.userSubscription.findUnique({
      where: { userId: user.id },
    }).catch(() => null);

    const localProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
    }).catch(() => null);

    // Compute offline entitlement with grace period safeguards
    const offlineResult = resolveOfflineEntitlement(user.id);
    let effectiveEntitlement = offlineResult.entitlement;

    // Honor local subscription authoritatively
    if (localSub) {
      const computedLocal = computeEntitlement(localSub, localProfile);
      if (computedLocal.premiumEnabled || computedLocal.status === "expired" || computedLocal.status === "canceled") {
        effectiveEntitlement = computedLocal;
        saveCachedEntitlement(user.id, effectiveEntitlement);
      }
    }

    return NextResponse.json({
      success: true,
      connectionState: isCentralConfigured ? "ONLINE_UNVERIFIED" : "OFFLINE",
      entitlement: effectiveEntitlement,
      deviceId,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("[Central Handshake Exception]:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Handshake failed unexpectedly" },
      },
      { status: 500 }
    );
  }
}
