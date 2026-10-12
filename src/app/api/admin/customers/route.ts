// src/app/api/admin/customers/route.ts
// Secure Admin Customer Directory API — Central Control Plane Only.
// ZERO private record counts or queries.

import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isSupabaseServerAdminConfigured } from "@/lib/supabase/config";
import { createServerAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Administrator access denied. Master Administrator privileges required.",
        },
      },
      { status: 403 }
    );
  }

  try {
    // Query users with profile and subscription (strictly control metadata)
    const customers = await prisma.user.findMany({
      where: {
        role: { in: ["user", "customer"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            displayName: true,
            country: true,
            region: true,
            currency: true,
            timezone: true,
          },
        },
        userSubscription: {
          select: {
            plan: true,
            planName: true,
            status: true,
            billingInterval: true,
            amount: true,
            currency: true,
            currentPeriodEnd: true,
          },
        },
      },
    });

    // Optionally fetch device telemetry counts from central Supabase
    const deviceCountsMap = new Map<string, number>();
    const appVersionMap = new Map<string, string>();
    if (isSupabaseServerAdminConfigured()) {
      const client = createServerAdminSupabaseClient();
      if (client) {
        const { data: devices } = await client
          .from("devices")
          .select("customer_id, app_version");
        if (devices) {
          for (const d of devices) {
            const count = deviceCountsMap.get(d.customer_id) || 0;
            deviceCountsMap.set(d.customer_id, count + 1);
            if (d.app_version) appVersionMap.set(d.customer_id, d.app_version);
          }
        }
      }
    }

    const formattedCustomers = customers.map((c) => {
      const plan = c.userSubscription?.plan || "free";
      const isPremium = plan === "premium" || plan === "pro" || plan === "family";
      const expDate = c.userSubscription?.currentPeriodEnd;
      const isExpired = expDate ? new Date(expDate).getTime() < Date.now() : false;

      return {
        id: c.id,
        email: c.email,
        name:
          c.profile?.displayName ||
          `${c.profile?.firstName || ""} ${c.profile?.lastName || ""}`.trim() ||
          c.email.split("@")[0],
        role: c.role,
        country: c.profile?.country || "US",
        region: c.profile?.region || "US",
        currency: c.profile?.currency || "USD",
        plan,
        planName: c.userSubscription?.planName || (plan === "premium" ? "Premium Tier" : "Free Starter"),
        premiumEnabled: isPremium && !isExpired && (c.userSubscription?.status === "active"),
        status: c.status || "active",
        subscriptionStatus: isExpired ? "expired" : (c.userSubscription?.status || "active"),
        billingInterval: c.userSubscription?.billingInterval || "monthly",
        subscriptionAmount: c.userSubscription?.amount || 0.0,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        lastLoginAt: c.lastLoginAt ? c.lastLoginAt.toISOString() : null,
        currentPeriodEnd: expDate ? expDate.toISOString() : null,
        deviceCount: deviceCountsMap.get(c.id) || 1,
        appVersion: appVersionMap.get(c.id) || "1.0.0",
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        customers: formattedCustomers,
        total: formattedCustomers.length,
      },
    });
  } catch (error: unknown) {
    console.error("[Admin Customers API Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch customer directory" } },
      { status: 500 }
    );
  }
}
