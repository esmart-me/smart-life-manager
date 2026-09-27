import { requireUser } from "@/lib/auth/session";
import Link from "next/link";
import {
  Car,
  Calendar,
  Users,
  Settings,
  Shield,
  Bell,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default async function MorePage() {
  await requireUser();

  const sections = [
    {
      title: "System & Profile",
      items: [
        {
          title: "My Profile",
          description: "Name, email, currency, time zone, and notification preferences",
          href: "/profile",
          icon: Users,
          badge: "Active",
          variant: "success" as const,
        },
        {
          title: "Account & Settings",
          description: "Theme preferences, notifications, security, and profile details",
          href: "/settings",
          icon: Settings,
          badge: "Active",
          variant: "success" as const,
        },
      ],
    },
    {
      title: "Future Life Modules (Architected)",
      items: [
        {
          title: "Vehicles & Assets",
          description: "Registration, insurance renewals, inspection alerts, and maintenance logs",
          href: "/more/vehicles",
          icon: Car,
          badge: "Planned for Future Phase",
          variant: "outline" as const,
        },
        {
          title: "Important Dates & Anniversaries",
          description: "Birthdays, anniversaries, and life milestone tracking",
          href: "/more/dates",
          icon: Calendar,
          badge: "Planned for Future Phase",
          variant: "outline" as const,
        },
        {
          title: "Family Circle",
          description: "Family member profiles, emergency medical information, and document sharing",
          href: "/more/family",
          icon: Users,
          badge: "Planned for Future Phase",
          variant: "outline" as const,
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          More Hub
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Access your account settings, privacy configurations, and upcoming life modules.
        </p>
      </div>

      <div className="space-y-6">
        {sections.map((sec) => (
          <div key={sec.title} className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {sec.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sec.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-300 dark:hover:border-brand-700/60 transition-all hover:shadow-2xs group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:text-brand-600 dark:group-hover:text-brand-400 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/50 transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                            {item.title}
                          </p>
                          <Badge variant={item.variant}>{item.badge}</Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 transition-colors shrink-0 ml-2" />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
