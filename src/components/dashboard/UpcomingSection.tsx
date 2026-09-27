"use client";

import { Calendar, Bell, CreditCard, FileText, Plus, ChevronRight, Clock, Car, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { QuickModalType } from "./QuickCreateModal";

export interface UpcomingEvent {
  id: string;
  title: string;
  subtitle?: string;
  eventDate: Date;
  dateFormatted: string;
  daysRemaining: number;
  category: "reminder" | "payment" | "document" | "vehicle" | "subscription" | "date";
  categoryLabel: string;
  actionHref: string;
}

interface UpcomingSectionProps {
  events: UpcomingEvent[];
  onOpenModal: (type: NonNullable<QuickModalType>) => void;
}

export function UpcomingSection({ events, onOpenModal }: UpcomingSectionProps) {
  const hasEvents = events.length > 0;

  const categoryIcons = {
    reminder: Bell,
    payment: CreditCard,
    document: FileText,
    vehicle: Car,
    subscription: RefreshCw,
    date: Calendar,
  };

  const getDaysBadge = (days: number) => {
    if (days < 0) return { label: "Overdue", variant: "danger" as const };
    if (days === 0) return { label: "Today", variant: "warning" as const };
    if (days === 1) return { label: "Tomorrow", variant: "warning" as const };
    if (days <= 7) return { label: `In ${days} days`, variant: "info" as const };
    return { label: `In ${days} days`, variant: "default" as const };
  };

  return (
    <section aria-labelledby="upcoming-heading" className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <h2
            id="upcoming-heading"
            className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white"
          >
            Upcoming Schedule
          </h2>
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          Chronological events
        </span>
      </div>

      {!hasEvents ? (
        <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
            <Calendar className="w-5 h-5" />
          </div>

          <div className="max-w-sm mx-auto">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              No upcoming events scheduled
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Add your upcoming deadlines, renewal dates, or bill payments to see them listed here in chronological order.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => onOpenModal("reminder")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Reminder</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal("payment")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Payment</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((item) => {
            const Icon = categoryIcons[item.category] || Calendar;
            const daysBadge = getDaysBadge(item.daysRemaining);

            return (
              <Link
                key={item.id}
                href={item.actionHref}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 shrink-0 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:underline">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {item.subtitle ? `${item.subtitle} • ` : ""}
                      {item.dateFormatted}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={daysBadge.variant} className="text-[10px] font-medium">
                    {daysBadge.label}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
