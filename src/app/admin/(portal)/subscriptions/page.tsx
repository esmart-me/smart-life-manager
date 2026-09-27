import { prisma } from "@/lib/db/prisma";
import { SubscriptionsClient, SubscriptionDTO } from "@/components/admin/SubscriptionsClient";
import { getAuthoritativePlanPrice } from "@/lib/plans/regional-pricing";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({
    where: {
      role: { in: ["user", "customer"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      profile: true,
      userSubscription: true,
    },
  });

  const subDTOs: SubscriptionDTO[] = await Promise.all(
    users.map(async (u) => {
      const plan = u.userSubscription?.plan || "free";
      const region = u.profile?.country || "US";
      const interval = (u.userSubscription?.billingInterval as any) || "monthly";

      const priceInfo = await getAuthoritativePlanPrice(plan, region, interval);

      return {
        id: u.userSubscription?.id || `sub_${u.id}`,
        userId: u.id,
        customerName:
          u.profile?.displayName ||
          `${u.profile?.firstName || ""} ${u.profile?.lastName || ""}`.trim() ||
          u.email.split("@")[0],
        customerEmail: u.email,
        plan,
        region,
        currency: u.userSubscription?.currency || priceInfo.currency,
        price: u.userSubscription?.amount || priceInfo.amount,
        billingInterval: interval,
        billingCycle: u.userSubscription?.billingCycle || interval,
        status: u.userSubscription?.status || "active",
        startDate: u.userSubscription?.startedAt
          ? u.userSubscription.startedAt.toISOString()
          : u.userSubscription?.currentPeriodStart
          ? u.userSubscription.currentPeriodStart.toISOString()
          : u.createdAt.toISOString(),
        currentPeriodEnd: u.userSubscription?.currentPeriodEnd
          ? u.userSubscription.currentPeriodEnd.toISOString()
          : null,
        paymentProvider: u.userSubscription?.provider || "stripe",
        providerSubscriptionId: u.userSubscription?.providerSubscriptionId || null,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Subscription Management
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review customer tier entitlements, billing cycles, renewals, and log verified administrative overrides.
        </p>
      </div>

      <SubscriptionsClient initialSubscriptions={subDTOs} />
    </div>
  );
}
