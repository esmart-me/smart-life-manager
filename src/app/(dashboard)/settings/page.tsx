import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const user = await requireUser();

  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      profile: true,
      settings: true,
      userSubscription: true,
    },
  });

  const initialProfile = {
    email: user.email,
    firstName: userRecord?.profile?.firstName || "",
    lastName: userRecord?.profile?.lastName || "",
    displayName: userRecord?.profile?.displayName || user.email.split("@")[0],
    phoneNumber: userRecord?.profile?.phoneNumber || "",
    timezone: userRecord?.profile?.timezone || "UTC",
    country: userRecord?.profile?.country || "US",
    region: userRecord?.profile?.region || "US",
    currency: userRecord?.profile?.currency || "USD",
  };

  const initialSettings = {
    theme: userRecord?.settings?.theme || "system",
    emailNotifications: userRecord?.settings?.emailNotifications ?? true,
    pushNotifications: userRecord?.settings?.pushNotifications ?? true,
    reminderDaysBefore: userRecord?.settings?.reminderDaysBefore ?? 3,
    weeklyDigest: userRecord?.settings?.weeklyDigest ?? true,
    securityAlerts: userRecord?.settings?.securityAlerts ?? true,
    // Phase 12 Notification Engine Settings
    notificationsEnabled: userRecord?.settings?.notificationsEnabled ?? true,
    notifyCritical: userRecord?.settings?.notifyCritical ?? true,
    notifyHigh: userRecord?.settings?.notifyHigh ?? true,
    notifyMedium: userRecord?.settings?.notifyMedium ?? true,
    notifyLow: userRecord?.settings?.notifyLow ?? true,
    notifyReminders: userRecord?.settings?.notifyReminders ?? true,
    notifyPayments: userRecord?.settings?.notifyPayments ?? true,
    notifyDocuments: userRecord?.settings?.notifyDocuments ?? true,
    notifyVehicles: userRecord?.settings?.notifyVehicles ?? true,
    notifySubscriptions: userRecord?.settings?.notifySubscriptions ?? true,
    notifyImportantDates: userRecord?.settings?.notifyImportantDates ?? true,
    quietHoursEnabled: userRecord?.settings?.quietHoursEnabled ?? false,
    quietHoursStart: userRecord?.settings?.quietHoursStart || "22:00",
    quietHoursEnd: userRecord?.settings?.quietHoursEnd || "07:00",
    allowCriticalInQuietHours: userRecord?.settings?.allowCriticalInQuietHours ?? true,
    soundEnabled: userRecord?.settings?.soundEnabled ?? true,
  };

  const transactions = await prisma.billingTransaction.findMany({
    where: { userId: user.id },
    orderBy: { paymentDate: "desc" },
    take: 10,
  });

  const subscriptionInfo = {
    plan: userRecord?.userSubscription?.plan || "free",
    planName:
      userRecord?.userSubscription?.planName ||
      (userRecord?.userSubscription?.plan === "family"
        ? "Family Circle Plus"
        : userRecord?.userSubscription?.plan === "premium"
        ? "Life Pro Premium"
        : "Free Starter"),
    status: userRecord?.userSubscription?.status || "active",
    billingInterval: userRecord?.userSubscription?.billingInterval || "monthly",
    billingCycle: userRecord?.userSubscription?.billingCycle || userRecord?.userSubscription?.billingInterval || "monthly",
    amount: userRecord?.userSubscription?.amount ?? 0,
    currency: userRecord?.userSubscription?.currency || userRecord?.profile?.currency || "USD",
    provider: userRecord?.userSubscription?.provider || "stripe",
    startedAt: userRecord?.userSubscription?.startedAt?.toISOString() || userRecord?.createdAt?.toISOString() || new Date().toISOString(),
    currentPeriodStart: userRecord?.userSubscription?.currentPeriodStart?.toISOString() || new Date().toISOString(),
    currentPeriodEnd: userRecord?.userSubscription?.currentPeriodEnd?.toISOString() || null,
    cancelAtPeriodEnd: Boolean(userRecord?.userSubscription?.cancelAtPeriodEnd),
    cancelledAt: userRecord?.userSubscription?.cancelledAt?.toISOString() || null,
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Account Settings & Preferences
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal profile, regional currency, notification alerts, subscription, and data controls.
        </p>
      </div>

      <SettingsForm
        initialProfile={initialProfile}
        initialSettings={initialSettings}
        subscriptionInfo={subscriptionInfo}
        initialTransactions={transactions.map((t) => ({
          id: t.id,
          transactionId: t.transactionId,
          plan: t.plan,
          amount: t.amount,
          currency: t.currency,
          status: t.status,
          billingCycle: t.billingCycle,
          paymentDate: t.paymentDate.toISOString(),
          paymentProvider: t.paymentProvider,
          failureReason: t.failureReason,
        }))}
      />
    </div>
  );
}
