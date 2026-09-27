import { UpcomingItem } from "@/types";
import { Calendar, Plus } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

interface UpcomingSectionProps {
  items?: UpcomingItem[];
}

export function UpcomingSection({ items = [] }: UpcomingSectionProps) {
  const hasItems = items.length > 0;

  return (
    <section aria-labelledby="upcoming-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2
          id="upcoming-heading"
          className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight"
        >
          Upcoming Schedule & Renewals
        </h2>
        <Link
          href="/reminders"
          className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Reminder</span>
        </Link>
      </div>

      {!hasItems ? (
        <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="max-w-sm mx-auto">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              No upcoming items scheduled
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Once you add documents, recurring bills, or reminders, your upcoming deadlines and renewals will appear here in chronological order.
            </p>
          </div>
          <div className="pt-1 flex items-center justify-center gap-2">
            <Link
              href="/documents"
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Add Document
            </Link>
            <Link
              href="/reminders"
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              Set Reminder
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {item.title}
                </p>
                {item.subtitle && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {item.subtitle}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">{item.category}</Badge>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {item.eventDate}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
