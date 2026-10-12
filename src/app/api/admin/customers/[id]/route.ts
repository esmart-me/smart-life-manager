// src/app/api/admin/customers/[id]/route.ts
// Secure Admin Customer Detail API — Central Control Plane Only.
// ZERO access to private customer application data (no documents, expenses, vehicles, reminders, or family records).

import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isSupabaseServerAdminConfigured } from "@/lib/supabase/config";
import { getCentralCustomerDetail, mutateCentralSubscription, createServerAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

  const { id } = await context.params;

  try {
    // 1. Fetch baseline user control account from local Prisma (account identity only)
    const user = await prisma.user.findUnique({
      where: { id },
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
            id: true,
            plan: true,
            planName: true,
            status: true,
            billingInterval: true,
            amount: true,
            currency: true,
            provider: true,
            startedAt: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
          },
        },
        billingTransactions: {
          take: 50,
          orderBy: { paymentDate: "desc" },
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            paymentDate: true,
            transactionId: true,
            utrNumber: true,
            paymentProvider: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Customer account not found" } },
        { status: 404 }
      );
    }

    // 2. Fetch Central Control Plane data from Supabase if configured
    let centralProfile: any = null;
    let centralSub: any = null;
    let centralPayments: any[] = [];
    let centralDevices: any[] = [];
    let centralLoginEvents: any[] = [];

    if (isSupabaseServerAdminConfigured()) {
      const central = await getCentralCustomerDetail(id);
      centralProfile = central.profile;
      centralSub = central.subscription;
      centralPayments = central.payments;
      centralDevices = central.devices;
      centralLoginEvents = central.loginEvents;
    }

    // 3. Construct Pure Central Control-Plane Response
    const effectivePlan = centralSub?.plan_id || user.userSubscription?.plan || "basic";
    const effectiveStatus = centralSub?.status || user.userSubscription?.status || "active";
    const expiresAt = centralSub?.expires_at || user.userSubscription?.currentPeriodEnd || null;

    let daysRemaining = null;
    if (expiresAt) {
      const diffMs = new Date(expiresAt).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    const premiumEnabled =
      (effectivePlan === "premium" || effectivePlan === "pro" || effectivePlan === "family") &&
      effectiveStatus === "active" &&
      (daysRemaining === null || daysRemaining > 0);

    // Map Payments
    const paymentsList = centralPayments.length > 0
      ? centralPayments.map((p) => ({
          id: p.id,
          amount: Number(p.amount) || 0,
          currency: p.currency || "USD",
          status: p.status || "succeeded",
          date: p.created_at,
          referenceId: p.transaction_id || p.id,
          method: p.payment_method || "card",
        }))
      : user.billingTransactions.map((tx) => ({
          id: tx.id,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status,
          date: tx.paymentDate.toISOString(),
          referenceId: tx.utrNumber || tx.transactionId,
          method: tx.paymentProvider,
        }));

    // Map Devices
    const devicesList = centralDevices.map((d) => ({
      id: d.id,
      deviceId: d.device_id,
      os: d.os || "windows",
      appVersion: d.app_version || "1.0.0",
      firstSeen: d.first_seen,
      lastSeen: d.last_seen,
      isActive: Boolean(d.is_active),
    }));

    // Map Login History
    const loginHistoryList = centralLoginEvents.map((l) => ({
      id: l.id,
      timestamp: l.created_at,
      loginMethod: l.login_method || "password",
      deviceId: l.device_id || "unknown",
      os: l.os || "windows",
      appVersion: l.app_version || "1.0.0",
    }));

    return NextResponse.json({
      success: true,
      data: {
        account: {
          id: user.id,
          name:
            user.profile?.displayName ||
            `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim() ||
            user.email.split("@")[0],
          email: user.email,
          loginMethod: centralLoginEvents[0]?.login_method || "password",
          accountStatus: centralProfile?.account_status || user.status || "active",
          createdDate: user.createdAt.toISOString(),
          firstLogin: user.createdAt.toISOString(),
          lastLogin: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
          lastActive: user.updatedAt.toISOString(),
          country: user.profile?.country || "US",
          currency: user.profile?.currency || "USD",
        },
        subscription: {
          plan: effectivePlan,
          status: effectiveStatus,
          startDate: centralSub?.starts_at || user.userSubscription?.startedAt?.toISOString() || user.createdAt.toISOString(),
          expiryDate: expiresAt ? new Date(expiresAt).toISOString() : null,
          premiumEnabled,
          daysRemaining,
        },
        payments: paymentsList,
        devices: devicesList,
        loginHistory: loginHistoryList,
      },
    });
  } catch (error: any) {
    console.error("[Admin API] Failed to fetch customer details:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch customer control plane data" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

  const { id } = await context.params;

  try {
    const body = await request.json().catch(() => ({}));
    const targetStatus = typeof body.status === "string" ? body.status : (typeof body.accountStatus === "string" ? body.accountStatus : undefined);
    const { plan, subscriptionStatus, expiryDate, reason } = body;

    // 1. Update user account status if requested
    if (targetStatus) {
      await prisma.user.update({
        where: { id },
        data: { status: targetStatus },
      });

      // Synchronize account status to Supabase profile if client configured
      const adminClient = createServerAdminSupabaseClient();
      if (adminClient) {
        try {
          await adminClient
            .from("customer_profiles")
            .update({
              account_status: targetStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id);
        } catch (err) {
          console.warn("[Central Supabase] Sync account status warning:", err);
        }
      }
    }

    // 2. Update subscription if requested
    if (plan || subscriptionStatus || expiryDate) {
      const updatedSub = await prisma.userSubscription.upsert({
        where: { userId: id },
        update: {
          ...(plan ? { plan, planName: plan === "premium" ? "Life Pro Premium" : plan === "family" ? "Family Circle Plus" : "Basic Free Tier" } : {}),
          ...(subscriptionStatus ? { status: subscriptionStatus } : {}),
          ...(expiryDate ? { currentPeriodEnd: new Date(expiryDate) } : {}),
        },
        create: {
          userId: id,
          plan: plan || "basic",
          planName: plan === "premium" ? "Life Pro Premium" : plan === "family" ? "Family Circle Plus" : "Basic Free Tier",
          status: subscriptionStatus || "active",
          currentPeriodEnd: expiryDate ? new Date(expiryDate) : null,
          billingInterval: "monthly",
          amount: plan === "premium" ? 9.99 : 0.0,
          currency: "USD",
        },
      });

      // Synchronize subscription to Central Supabase
      await mutateCentralSubscription({
        customerId: id,
        plan: (plan === "premium" || plan === "family" || plan === "pro") ? "premium" : "basic",
        status: (subscriptionStatus === "active" || subscriptionStatus === "expired" || subscriptionStatus === "canceled")
          ? subscriptionStatus
          : "active",
        expiresAt: expiryDate ? new Date(expiryDate).toISOString() : (updatedSub.currentPeriodEnd ? updatedSub.currentPeriodEnd.toISOString() : null),
        adminEmail: admin.email,
        reason: reason || "Administrative update via Admin Portal API",
      }).catch((e) => console.warn("[Central Supabase] Sync customer sub error:", e));
    }

    // 3. Log audit event
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: "customer_control_updated",
        targetType: "user",
        targetId: id,
        details: JSON.stringify({ accountStatus: targetStatus, plan, subscriptionStatus, expiryDate, reason }),
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Customer control plane metadata updated successfully.",
    });
  } catch (error: any) {
    console.error("[Admin API] Failed to update customer:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update customer" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

  const { id } = await context.params;

  try {
    const body = await request.json().catch(() => ({}));
    if (body.confirmText !== "DELETE") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Explicit confirmation required. Please confirm by providing confirmText: 'DELETE'.",
          },
        },
        { status: 400 }
      );
    }

    // PRIVACY COMPLIANT SUSPENSION / ARCHIVAL:
    // We strictly DO NOT delete or alter customer private SQLite records (documents, expenses, vehicles, etc.).
    // We suspend the central account status and cancel the subscription entitlement.
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { status: "archived" },
      }),
      prisma.userSubscription.updateMany({
        where: { userId: id },
        data: { status: "canceled" },
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          adminEmail: admin.email,
          action: "customer_archived",
          targetType: "user",
          targetId: id,
          details: JSON.stringify({
            reason: "Account deactivated and archived from admin control plane. Customer private data remains untouched.",
          }),
          ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      mode: "archived",
      message: "Customer account deactivated and archived safely. Customer private data remains untouched.",
    });
  } catch (error: any) {
    console.error("[Admin API] Failed to archive customer:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to archive customer account" } },
      { status: 500 }
    );
  }
}
