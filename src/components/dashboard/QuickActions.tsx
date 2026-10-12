"use client";

import { FilePlus, BellPlus, CreditCard, Receipt, Plus, ArrowUpRight } from "lucide-react";
import { QuickModalType } from "./QuickCreateModal";

interface QuickActionsProps {
  onOpenModal: (type: NonNullable<QuickModalType>) => void;
}

export function QuickActions({ onOpenModal }: QuickActionsProps) {
  const actions = [
    {
      id: "document",
      title: "Add Document",
      subtitle: "Passport, ID, Insurance",
      icon: FilePlus,
      color: "bg-theme-accent-subtle text-theme-accent border-theme-accent/25",
      hover: "hover:border-theme-accent/50",
      stagger: "stagger-1",
    },
    {
      id: "reminder",
      title: "Add Reminder",
      subtitle: "Deadlines, Tasks, Alerts",
      icon: BellPlus,
      color: "bg-amber-500/10 text-amber-500 border-amber-500/25",
      hover: "hover:border-amber-500/50",
      stagger: "stagger-2",
    },
    {
      id: "payment",
      title: "Add Payment",
      subtitle: "Bills, Rent, Subscriptions",
      icon: CreditCard,
      color: "bg-theme-accent-subtle text-theme-accent border-theme-accent/25",
      hover: "hover:border-theme-accent/50",
      stagger: "stagger-3",
    },
    {
      id: "expense",
      title: "Add Expense",
      subtitle: "Daily Spending & Receipts",
      icon: Receipt,
      color: "bg-theme-accent-subtle text-theme-accent border-theme-accent/25",
      hover: "hover:border-theme-accent/50",
      stagger: "stagger-4",
    },
  ] as const;

  return (
    <section aria-labelledby="quick-actions-heading" className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2
          id="quick-actions-heading"
          className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
        >
          Quick Actions
        </h2>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          Fast record entry
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              type="button"
              onClick={() => onOpenModal(act.id)}
              className={`group flex flex-col justify-between w-full min-w-0 overflow-hidden p-3.5 sm:p-4 rounded-2xl border glass-card glass-card-hover text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent animate-card-enter ${act.stagger} ${act.color} ${act.hover}`}
            >
              <div className="flex items-center justify-between w-full mb-3 shrink-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95 bg-white/80 dark:bg-white/[0.08] border border-slate-200/80 dark:border-white/[0.1] shadow-2xs shrink-0">
                  <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                </div>
                <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-slate-100/70 dark:bg-white/[0.06] flex items-center justify-center text-slate-400 group-hover:text-theme-accent transition-colors shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="w-full min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white tracking-tight truncate">
                  {act.title}
                </p>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={act.subtitle}>
                  {act.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

    </section>
  );
}
