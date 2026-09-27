import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateSubscriptionMetrics } from "@/lib/subscriptions/calculations";
import { SubscriptionListClient, SubscriptionRecord } from "@/components/subscriptions/SubscriptionListClient";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const user = await requireUser();

  const [rawSubscriptions, profile] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId: user.id },
      orderBy: { nextBillingDate: "asc" },
    }),
    prisma.profile.findUnique({
      where: { userId: user.id },
      select: { currency: true },
    }),
  ]);

  const userCurrency = profile?.currency || "USD";
  const metrics = calculateSubscriptionMetrics(rawSubscriptions);

  const subscriptions: SubscriptionRecord[] = rawSubscriptions.map((s) => ({
    id: s.id,
    name: s.name,
    cost: s.cost,
    currency: s.currency,
    billingCycle: s.billingCycle,
    nextBillingDate: s.nextBillingDate.toISOString(),
    renewalStatus: s.renewalStatus,
    category: s.category,
    notes: s.notes,
  }));

  return (
    <SubscriptionListClient
      initialSubscriptions={subscriptions}
      initialMetrics={metrics}
      userCurrency={userCurrency}
    />
  );
}
