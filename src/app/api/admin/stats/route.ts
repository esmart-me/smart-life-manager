// src/app/api/admin/stats/route.ts
// Secure Admin Dashboard Statistics API — Central Control Plane Only.
// ZERO private-record counts (no documents, expenses, vehicles, reminders, budgets, or family members).

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
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Baseline local account counts (control plane metadata)
    const [
      totalCustomers,
      newCustomers30d,
      suspendedAccounts,
      localSubscriptions,
      localBillingTransactions,
    ] = await Promise.all([
      prisma.user.count({ where: { role: { in: ["user", "customer"] } } }),
      prisma.user.count({
        where: {
          role: { in: ["user", "customer"] },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.user.count({
        where: {
          role: { in: ["user", "customer"] },
          status: "suspended",
        },
      }),
      prisma.userSubscription.findMany({
        where: { user: { role: { in: ["user", "customer"] } } },
        select: {
          plan: true,
          status: true,
          amount: true,
          currency: true,
          currentPeriodEnd: true,
        },
      }),
      prisma.billingTransaction.findMany({
        where: { user: { role: { in: ["user", "customer"] } } },
        orderBy: { paymentDate: "desc" },
        take: 10,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          paymentDate: true,
          paymentProvider: true,
        },
      }),
    ]);

    // Central telemetry metrics from Supabase if configured
    let activeDevicesCount = 0;
    let recentLogins: any[] = [];
    const appVersionDistribution: Record<string, number> = {};

    if (isSupabaseServerAdminConfigured()) {
      const client = createServerAdminSupabaseClient();
      if (client) {
        const [devRes, logRes] = await Promise.all([
          client.from("devices").select("app_version, is_active"),
          client
            .from("login_events")
            .select("created_at, login_method, device_id, os, app_version, customer_id")
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        if (devRes.data) {
          activeDevicesCount = devRes.data.filter((d) => d.is_active).length;
          for (const d of devRes.data) {
            const v = d.app_version || "1.0.0";
            appVersionDistribution[v] = (appVersionDistribution[v] || 0) + 1;
          }
        }

        if (logRes.data) {
          recentLogins = logRes.data;
        }
      }
    }

    if (Object.keys(appVersionDistribution).length === 0) {
      appVersionDistribution["1.0.0"] = totalCustomers || 1;
    }

    // Evaluate subscription tiers & expirations
    let basicCount = 0;
    let premiumCount = 0;
    let expiredPremiumCount = 0;
    const nowMs = Date.now();

    for (const sub of localSubscriptions) {
      const isPremTier = sub.plan === "premium" || sub.plan === "pro" || sub.plan === "family";
      const isExpired = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).getTime() < nowMs : false;

      if (isPremTier) {
        if (isExpired || sub.status === "expired" || sub.status === "canceled") {
          expiredPremiumCount++;
          basicCount++;
        } else {
          premiumCount++;
        }
      } else {
        basicCount++;
      }
    }

    // Registered users without a row default to basic
    const usersWithoutSub = Math.max(0, totalCustomers - localSubscriptions.length);
    basicCount += usersWithoutSub;

    const activeCustomers = Math.max(0, totalCustomers - suspendedAccounts);

    return NextResponse.json({
      success: true,
      data: {
        customers: {
          total: totalCustomers,
          active: activeCustomers,
          newLast30Days: newCustomers30d,
          suspended: suspendedAccounts,
        },
        subscriptions: {
          premium: premiumCount,
          basic: basicCount,
          expiredPremium: expiredPremiumCount,
        },
        telemetry: {
          activeDevices: activeDevicesCount || totalCustomers,
          appVersionDistribution,
          recentLogins,
        },
        recentPayments: localBillingTransactions.map((tx) => ({
          id: tx.id,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status,
          date: tx.paymentDate.toISOString(),
          provider: tx.paymentProvider,
        })),
      },
    });
  } catch (error: unknown) {
    console.error("[Admin Stats API Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to load admin statistics" } },
      { status: 500 }
    );
  }
}
