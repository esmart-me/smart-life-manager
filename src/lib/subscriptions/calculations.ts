export interface CurrencyCostSummary {
  currency: string;
  monthlyTotal: number;
  annualTotal: number;
  activeCount: number;
}

export interface SubscriptionCostSummary {
  byCurrency: Record<string, CurrencyCostSummary>;
  byCategory: Record<string, Record<string, number>>; // category -> currency -> monthlyTotal
  activeCount: number;
  trialCount: number;
  pausedCount: number;
  cancelledCount: number;
  expiredCount: number;
  upcomingRenewalsCount: number;
  upcomingTrialEndingsCount: number;
  // Backward compatibility fields for single-currency callers
  monthlyTotal: number;
  annualTotal: number;
}

/**
 * Normalizes a subscription's cost to monthly and annual equivalents.
 */
export function normalizeSubscriptionCost(cost: number, cycle: string): { monthly: number; annual: number } {
  const c = Math.max(0, cost);
  const normalizedCycle = (cycle || "monthly").toLowerCase();

  switch (normalizedCycle) {
    case "weekly":
      return {
        monthly: (c * 52) / 12,
        annual: c * 52,
      };
    case "quarterly":
      return {
        monthly: c / 3,
        annual: c * 4,
      };
    case "yearly":
      return {
        monthly: c / 12,
        annual: c,
      };
    case "monthly":
    default:
      return {
        monthly: c,
        annual: c * 12,
      };
  }
}

/**
 * Computes monthly and annual subscription totals grouped strictly by currency and category.
 * Prevents summing different currencies without valid conversion rates.
 */
export function calculateSubscriptionMetrics(
  subscriptions: Array<{
    cost: number;
    currency?: string;
    billingCycle: string;
    renewalStatus: string;
    category?: string;
    nextBillingDate?: Date | string;
    trialEndDate?: Date | string | null;
  }>
): SubscriptionCostSummary {
  const byCurrency: Record<string, CurrencyCostSummary> = {};
  const byCategory: Record<string, Record<string, number>> = {};

  let activeCount = 0;
  let trialCount = 0;
  let pausedCount = 0;
  let cancelledCount = 0;
  let expiredCount = 0;
  let upcomingRenewalsCount = 0;
  let upcomingTrialEndingsCount = 0;

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  for (const sub of subscriptions) {
    const status = (sub.renewalStatus || "active").toLowerCase();
    const curr = (sub.currency || "USD").toUpperCase();
    const cat = sub.category || "General";

    if (status === "cancelled") {
      cancelledCount++;
      continue;
    } else if (status === "expired") {
      expiredCount++;
      continue;
    } else if (status === "paused") {
      pausedCount++;
      continue;
    } else if (status === "trial") {
      trialCount++;
      // Check upcoming trial ending
      if (sub.trialEndDate) {
        const tDate = new Date(sub.trialEndDate);
        if (tDate >= now && tDate <= nextWeek) {
          upcomingTrialEndingsCount++;
        }
      }
    } else {
      activeCount++;
      // Check upcoming renewal
      if (sub.nextBillingDate) {
        const rDate = new Date(sub.nextBillingDate);
        if (rDate >= now && rDate <= nextWeek) {
          upcomingRenewalsCount++;
        }
      }
    }

    // Only active and trial subscriptions contribute to ongoing recurring commitments
    const { monthly, annual } = normalizeSubscriptionCost(sub.cost, sub.billingCycle);

    if (!byCurrency[curr]) {
      byCurrency[curr] = {
        currency: curr,
        monthlyTotal: 0,
        annualTotal: 0,
        activeCount: 0,
      };
    }
    byCurrency[curr].monthlyTotal += monthly;
    byCurrency[curr].annualTotal += annual;
    byCurrency[curr].activeCount++;

    if (!byCategory[cat]) {
      byCategory[cat] = {};
    }
    byCategory[cat][curr] = (byCategory[cat][curr] || 0) + monthly;
  }

  // Round currency totals to 2 decimals
  for (const curr of Object.keys(byCurrency)) {
    byCurrency[curr].monthlyTotal = Math.round(byCurrency[curr].monthlyTotal * 100) / 100;
    byCurrency[curr].annualTotal = Math.round(byCurrency[curr].annualTotal * 100) / 100;
  }

  // Pick first currency or USD as legacy fallback
  const firstCurrency = Object.keys(byCurrency)[0] || "USD";
  const primarySummary = byCurrency[firstCurrency] || { monthlyTotal: 0, annualTotal: 0 };

  return {
    byCurrency,
    byCategory,
    activeCount,
    trialCount,
    pausedCount,
    cancelledCount,
    expiredCount,
    upcomingRenewalsCount,
    upcomingTrialEndingsCount,
    monthlyTotal: primarySummary.monthlyTotal,
    annualTotal: primarySummary.annualTotal,
  };
}

/**
 * Reuses the existing Reminder system to synchronize renewal and trial ending reminders
 */
export async function syncSubscriptionReminder(
  prismaClient: any,
  userId: string,
  subscription: {
    id: string;
    name: string;
    cost: number;
    currency: string;
    nextBillingDate: Date;
    trialEndDate?: Date | null;
    renewalStatus: string;
  }
) {
  const existing = await prismaClient.reminder.findFirst({
    where: {
      userId,
      relatedType: "subscription",
      relatedId: subscription.id,
    },
  });

  const status = (subscription.renewalStatus || "active").toLowerCase();

  if (status === "trial" && subscription.trialEndDate) {
    const title = `Free Trial Ending: ${subscription.name} (Upcoming renewal: ${subscription.currency} ${subscription.cost.toFixed(2)})`;
    if (existing) {
      await prismaClient.reminder.update({
        where: { id: existing.id },
        data: {
          title,
          dueDate: subscription.trialEndDate,
          priority: "high",
          category: "payment",
          status: "pending",
        },
      });
    } else {
      await prismaClient.reminder.create({
        data: {
          userId,
          title,
          dueDate: subscription.trialEndDate,
          priority: "high",
          category: "payment",
          relatedType: "subscription",
          relatedId: subscription.id,
          status: "pending",
        },
      });
    }
  } else if (status === "active") {
    const title = `Subscription Renewal: ${subscription.name} (${subscription.currency} ${subscription.cost.toFixed(2)})`;
    if (existing) {
      await prismaClient.reminder.update({
        where: { id: existing.id },
        data: {
          title,
          dueDate: subscription.nextBillingDate,
          priority: "medium",
          category: "payment",
          status: "pending",
        },
      });
    } else {
      await prismaClient.reminder.create({
        data: {
          userId,
          title,
          dueDate: subscription.nextBillingDate,
          priority: "medium",
          category: "payment",
          relatedType: "subscription",
          relatedId: subscription.id,
          status: "pending",
        },
      });
    }
  } else if (existing) {
    // Cancelled, expired, or paused: remove the active reminder
    await prismaClient.reminder.delete({
      where: { id: existing.id },
    });
  }
}
