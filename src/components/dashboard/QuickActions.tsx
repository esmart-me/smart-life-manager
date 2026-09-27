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
      color: "bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-900/50",
      hover: "hover:border-brand-400 dark:hover:border-brand-600",
    },
    {
      id: "reminder",
      title: "Add Reminder",
      subtitle: "Deadlines, Tasks, Alerts",
      icon: BellPlus,
      color: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50",
      hover: "hover:border-amber-400 dark:hover:border-amber-600",
    },
    {
      id: "payment",
      title: "Add Payment",
      subtitle: "Bills, Rent, Subscriptions",
      icon: CreditCard,
      color: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
      hover: "hover:border-emerald-400 dark:hover:border-emerald-600",
    },
    {
      id: "expense",
      title: "Add Expense",
      subtitle: "Daily Spending & Receipts",
      icon: Receipt,
      color: "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900/50",
      hover: "hover:border-sky-400 dark:hover:border-sky-600",
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              type="button"
              onClick={() => onOpenModal(act.id)}
              className={`group flex flex-col justify-between p-4 rounded-xl border bg-white dark:bg-slate-900 text-left transition-all duration-150 hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-500 ${act.color} ${act.hover}`}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95 bg-white/80 dark:bg-slate-800/80 shadow-2xs">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-100/70 dark:bg-slate-800/70 flex items-center justify-center text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                  {act.title}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
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
