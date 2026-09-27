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
    },
  });

  const initialProfile = {
    firstName: userRecord?.profile?.firstName || "",
    lastName: userRecord?.profile?.lastName || "",
    displayName: userRecord?.profile?.displayName || user.email.split("@")[0],
    phoneNumber: userRecord?.profile?.phoneNumber || "",
    timezone: userRecord?.profile?.timezone || "UTC",
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Settings & Preferences
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Customize your display theme, notification preferences, and account profile.
        </p>
      </div>

      <SettingsForm
        initialProfile={initialProfile}
        initialSettings={initialSettings}
      />
    </div>
  );
}
