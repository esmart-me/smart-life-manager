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
  };

  const subscriptionInfo = {
    plan: userRecord?.userSubscription?.plan || "free",
    status: userRecord?.userSubscription?.status || "active",
    billingInterval: userRecord?.userSubscription?.billingInterval || "monthly",
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
      />
    </div>
  );
}
