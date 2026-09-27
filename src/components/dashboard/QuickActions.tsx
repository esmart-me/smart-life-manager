import Link from "next/link";
import {
  FilePlus,
  BellPlus,
  CreditCard,
  CalendarPlus,
  LucideIcon,
  ChevronRight,
} from "lucide-react";
import { DASHBOARD_QUICK_ACTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ACTION_ICONS: Record<string, LucideIcon> = {
  FilePlus,
  BellPlus,
  CreditCard,
  CalendarPlus,
};

const COLOR_STYLES = {
  primary: {
    bg: "bg-brand-50 dark:bg-brand-950/60",
    text: "text-brand-600 dark:text-brand-400",
    border: "border-brand-100 dark:border-brand-900/50",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/60",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-100 dark:border-amber-900/50",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/60",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-100 dark:border-emerald-900/50",
  },
  sky: {
    bg: "bg-sky-50 dark:bg-sky-950/60",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-100 dark:border-sky-900/50",
  },
};

export function QuickActions() {
  return (
    <section aria-labelledby="quick-actions-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2
          id="quick-actions-heading"
          className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight"
        >
          Quick Actions
        </h2>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          Core entries
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {DASHBOARD_QUICK_ACTIONS.map((action) => {
          const Icon = ACTION_ICONS[action.iconName] || FilePlus;
          const colors = COLOR_STYLES[action.colorVariant];

          return (
            <Link
              key={action.id}
              href={action.href}
              className={cn(
                "group relative p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-300 dark:hover:border-brand-700/60 transition-all hover:shadow-xs",
                "flex flex-col justify-between"
              )}
            >
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105",
                    colors.bg,
                    colors.text
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 transition-colors" />
              </div>

              <div className="mt-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {action.title}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {action.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
