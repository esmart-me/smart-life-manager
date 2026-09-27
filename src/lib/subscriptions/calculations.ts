import { SubscriptionBillingCycle } from "./constants";

export interface SubscriptionCostSummary {
  monthlyTotal: number;
  annualTotal: number;
  activeCount: number;
  cancelledCount: number;
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
 * Computes monthly and annual subscription totals across active subscriptions
 */
export function calculateSubscriptionMetrics(
  subscriptions: Array<{
    cost: number;
    billingCycle: string;
    renewalStatus: string;
  }>
): SubscriptionCostSummary {
  let monthlyTotal = 0;
  let annualTotal = 0;
  let activeCount = 0;
  let cancelledCount = 0;

  for (const sub of subscriptions) {
    if (sub.renewalStatus === "cancelled") {
      cancelledCount++;
      continue;
    }

    activeCount++;
    const { monthly, annual } = normalizeSubscriptionCost(sub.cost, sub.billingCycle);
    monthlyTotal += monthly;
    annualTotal += annual;
  }

  return {
    monthlyTotal: Math.round(monthlyTotal * 100) / 100,
    annualTotal: Math.round(annualTotal * 100) / 100,
    activeCount,
    cancelledCount,
  };
}

/**
 * Reuses the existing Reminder system to synchronize subscription renewal reminders
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

  if (subscription.renewalStatus === "active") {
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
    // Cancelled or paused subscription: remove the active reminder
    await prismaClient.reminder.delete({
      where: { id: existing.id },
    });
  }
}
