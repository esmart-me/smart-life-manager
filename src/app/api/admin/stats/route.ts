// src/app/api/admin/stats/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  if (!isAdmin(user.role)) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Administrator access required" } },
      { status: 403 }
    );
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      totalCustomers,
      newCustomers30d,
      subscriptions,
      documentsCount,
      remindersCount,
      expensesCount,
      paymentsCount,
      vehiclesCount,
      familyCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: { in: ["user", "customer"] } } }),
      prisma.user.count({
        where: {
          role: { in: ["user", "customer"] },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.userSubscription.findMany({
        select: {
          plan: true,
          status: true,
          billingInterval: true,
          amount: true,
          currency: true,
        },
      }),
      prisma.document.count(),
      prisma.reminder.count(),
      prisma.expense.count(),
      prisma.payment.count(),
      prisma.vehicle.count(),
      prisma.familyMember.count(),
    ]);

    let freeCount = 0;
    let premiumCount = 0;
    let familyCountSub = 0;
    let activeSubs = 0;
    let cancelledSubs = 0;
    let calculatedMRR = 0;

    for (const sub of subscriptions) {
      if (sub.plan === "free") freeCount++;
      else if (sub.plan === "premium") premiumCount++;
      else if (sub.plan === "family") familyCountSub++;

      if (sub.status === "active") {
        activeSubs++;
        if (sub.plan === "premium" || sub.plan === "family") {
          const monthly = sub.billingInterval === "yearly" ? sub.amount / 12 : sub.amount;
          calculatedMRR += monthly || 0;
        }
      } else if (sub.status === "cancelled") {
        cancelledSubs++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          customers: totalCustomers,
          newLast30Days: newCustomers30d,
        },
        subscriptions: {
          total: subscriptions.length,
          active: activeSubs,
          cancelled: cancelledSubs,
          byPlan: {
            free: freeCount,
            premium: premiumCount,
            family: familyCountSub,
          },
        },
        entities: {
          documents: documentsCount,
          reminders: remindersCount,
          expenses: expensesCount,
          payments: paymentsCount,
          vehicles: vehiclesCount,
          familyMembers: familyCount,
        },
        finance: {
          mrr: Math.round(calculatedMRR * 100) / 100,
          currency: "USD",
          revenueFormatted: calculatedMRR > 0 ? `$${calculatedMRR.toFixed(2)}/mo` : "$0.00 / No active paid subscriptions",
        },
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
