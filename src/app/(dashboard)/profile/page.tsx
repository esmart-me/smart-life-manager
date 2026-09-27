import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheck, User } from "lucide-react";

export default async function ProfilePage() {
  const sessionUser = await requireUser();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      profile: true,
      settings: true,
    },
  });

  if (!user) {
    return null;
  }

  const initialData = {
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    firstName: user.profile?.firstName || "",
    lastName: user.profile?.lastName || "",
    displayName: user.profile?.displayName || user.email.split("@")[0],
    phoneNumber: user.profile?.phoneNumber || "",
    currency: user.profile?.currency || "USD",
    timezone: user.profile?.timezone || "UTC",
    emailNotifications: user.settings?.emailNotifications ?? true,
    pushNotifications: user.settings?.pushNotifications ?? true,
    reminderDaysBefore: user.settings?.reminderDaysBefore ?? 3,
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              User Profile
            </h1>
            <Badge variant="success">Authenticated</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your personal identity, default currency, time zone, and notification preferences.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Tenant Isolated</span>
        </div>
      </div>

      <ProfileForm initialData={initialData} />
    </div>
  );
}
