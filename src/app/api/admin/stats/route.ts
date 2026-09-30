import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isRealStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Administrator access denied. Master Administrator privileges required." } },
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
      customerSubscriptions,
      billingTransactions,
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
      // Strictly query customer subscriptions (exclude admin accounts)
      prisma.userSubscription.findMany({
        where: {
          user: { role: { in: ["user", "customer"] } },
        },
        select: {
          plan: true,
          status: true,
          billingInterval: true,
          amount: true,
          currency: true,
        },
      }),
      // Strictly query customer billing transactions (exclude admin accounts)
      prisma.billingTransaction.findMany({
        where: {
          user: { role: { in: ["user", "customer"] } },
        },
        select: {
          amount: true,
          currency: true,
          status: true,
        },
      }),
      prisma.document.count(),
      prisma.reminder.count(),
      prisma.expense.count(),
      prisma.payment.count(),
      prisma.vehicle.count(),
      prisma.familyMember.count(),
    ]);

    let explicitFreeCount = 0;
    let premiumCount = 0;
    let familyCountSub = 0;
    let payingCustomers = 0;
    let cancelledSubs = 0;
    let calculatedMRR = 0;

    for (const sub of customerSubscriptions) {
      if (sub.plan === "free") explicitFreeCount++;
      else if (sub.plan === "premium") premiumCount++;
      else if (sub.plan === "family") familyCountSub++;

      if (sub.status === "active" && (sub.plan === "premium" || sub.plan === "family")) {
        payingCustomers++;
        const monthly = sub.billingInterval === "yearly" ? sub.amount / 12 : sub.amount;
        calculatedMRR += monthly || 0;
      } else if (sub.status === "cancelled") {
        cancelledSubs++;
      }
    }

    // Any registered customer without an explicit subscription row defaults to free tier
    const freeCount = explicitFreeCount + Math.max(0, totalCustomers - customerSubscriptions.length);
    const activeCustomers = Math.max(0, totalCustomers - cancelledSubs);

    // Customer payments collected
    let customerRevenue = 0;
    for (const tx of billingTransactions) {
      if (tx.status === "paid") {
        customerRevenue += tx.amount;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          customers: totalCustomers,
          activeCustomers,
          payingCustomers,
          freeCustomers: freeCount,
          newLast30Days: newCustomers30d,
        },
        subscriptions: {
          total: customerSubscriptions.length,
          activePaying: payingCustomers,
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
          revenueFormatted: payingCustomers > 0 ? `$${calculatedMRR.toFixed(2)}/mo` : "$0.00 (0 active paying customers)",
          totalRevenueCollected: customerRevenue,
        },
        paymentProvider: {
          status: isRealStripeConfigured()
            ? "Stripe configured and active (Live mode)"
            : "Stripe webhook/keys not configured in production - Running in sandbox mode",
          mode: isRealStripeConfigured() ? "live" : "sandbox",
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
