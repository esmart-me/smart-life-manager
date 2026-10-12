"use client";

import { FileText, Bell, CreditCard, Receipt, Plus, ArrowRight, AlertTriangle, Clock, Wallet, Car, RefreshCw, Calendar } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { QuickModalType } from "./QuickCreateModal";

export interface DashboardStats {
  documents: {
    total: number;
    expiringSoon: number;
    expired: number;
  };
  reminders: {
    total: number;
    urgent: number;
    completed: number;
  };
  payments: {
    totalPending: number;
    totalAmountDue: number;
    overdueCount: number;
    overdueAmount: number;
    upcomingCount: number;
    upcomingAmount: number;
    currency: string;
  };
  expenses: {
    totalRecorded: number;
    totalAmount: number;
    todayAmount: number;
    monthlyAmount: number;
    budgetRemaining: number | null;
    monthlyBudget: number;
    currency: string;
  };
  connectedModules?: {
    vehiclesCount: number;
    vehicleAlertsCount: number;
    activeSubscriptionsCount: number;
    monthlySubscriptionCost: number;
    importantDatesCount: number;
    currency: string;
  };
}

interface SummaryCardsProps {
  stats: DashboardStats;
  onOpenModal: (type: NonNullable<QuickModalType>) => void;
}

export function SummaryCards({ stats, onOpenModal }: SummaryCardsProps) {
  return (
    <section aria-labelledby="summary-cards-heading" className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2
          id="summary-cards-heading"
          className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
        >
          Life Vault Summary
        </h2>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          Live database metrics
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. DOCUMENTS SUMMARY CARD */}
        <div className="p-5 rounded-2xl glass-card glass-card-hover flex flex-col justify-between transition-all animate-card-enter stagger-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Documents
            </span>
            <div className="w-8 h-8 rounded-xl bg-theme-accent-subtle text-theme-accent flex items-center justify-center border border-theme-accent/25 shadow-2xs">
              <FileText className="w-4 h-4" />
            </div>
          </div>

          {stats.documents.total === 0 ? (
            <div className="my-2 space-y-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                No documents yet.
              </p>
              <button
                type="button"
                onClick={() => onOpenModal("document")}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-theme-accent hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Document</span>
              </button>
            </div>
          ) : (
            <div className="my-1">
              <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {stats.documents.total}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {stats.documents.expired > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                    {stats.documents.expired} expired
                  </span>
                ) : stats.documents.expiringSoon > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {stats.documents.expiringSoon} expiring soon
                  </span>
                ) : (
                  <span>All documents valid</span>
                )}
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <Link
              href="/documents"
              className="text-[11px] font-medium text-slate-500 hover:text-theme-accent dark:text-slate-400 dark:hover:text-theme-accent inline-flex items-center gap-1 transition-colors"
            >
              <span>View Vault</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* 2. REMINDERS SUMMARY CARD */}
        <div className="p-5 rounded-2xl glass-card glass-card-hover flex flex-col justify-between transition-all animate-card-enter stagger-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Reminders
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-2xs">
              <Bell className="w-4 h-4" />
            </div>
          </div>

          {stats.reminders.total === 0 ? (
            <div className="my-2 space-y-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                No upcoming reminders.
              </p>
              <button
                type="button"
                onClick={() => onOpenModal("reminder")}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Reminder</span>
              </button>
            </div>
          ) : (
            <div className="my-1">
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {stats.reminders.total}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {stats.reminders.urgent > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                    {stats.reminders.urgent} critical/urgent
                  </span>
                ) : (
                  <span>All scheduled on track</span>
                )}
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
            <Link
              href="/reminders"
              className="text-[11px] font-medium text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 inline-flex items-center gap-1 transition-colors"
            >
              <span>View Reminders</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>


        {/* 3. PAYMENTS SUMMARY CARD (Upcoming & Overdue Payments) */}
        <div className="p-5 rounded-2xl glass-card glass-card-hover flex flex-col justify-between transition-all animate-card-enter stagger-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Payments &amp; Bills
            </span>
            <div className="w-8 h-8 rounded-xl bg-theme-accent-subtle text-theme-accent flex items-center justify-center border border-theme-accent/20 shadow-2xs">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>

          {stats.payments.totalPending === 0 ? (
            <div className="my-2 space-y-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                No payments due.
              </p>
              <button
                type="button"
                onClick={() => onOpenModal("payment")}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-theme-accent hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Payment</span>
              </button>
            </div>
          ) : (
            <div className="my-1 space-y-1">
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {formatCurrency(stats.payments.totalAmountDue, stats.payments.currency)}
              </p>
              <div className="text-[11px] space-y-0.5">
                {stats.payments.overdueCount > 0 ? (
                  <p className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>
                      {stats.payments.overdueCount} overdue ({formatCurrency(stats.payments.overdueAmount, stats.payments.currency)})
                    </span>
                  </p>
                ) : null}
                <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-500" />
                  <span>
                    {stats.payments.upcomingCount} upcoming ({formatCurrency(stats.payments.upcomingAmount, stats.payments.currency)})
                  </span>
                </p>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
            <Link
              href="/finance"
              className="text-[11px] font-medium text-slate-500 hover:text-theme-accent dark:text-slate-400 dark:hover:text-theme-accent inline-flex items-center gap-1 transition-colors"
            >
              <span>Manage Bills</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>


        {/* 4. EXPENSES SUMMARY CARD (Today's, Monthly, Budget Remaining) */}
        <div className="p-5 rounded-2xl glass-card glass-card-hover flex flex-col justify-between transition-all animate-card-enter stagger-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Expenses &amp; Budget
            </span>
            <div className="w-8 h-8 rounded-xl bg-theme-accent-subtle text-theme-accent flex items-center justify-center border border-theme-accent/25 shadow-2xs">
              <Receipt className="w-4 h-4" />
            </div>
          </div>

          {stats.expenses.totalRecorded === 0 ? (
            <div className="my-2 space-y-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                No expenses recorded.
              </p>
              <button
                type="button"
                onClick={() => onOpenModal("expense")}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-theme-accent hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Expense</span>
              </button>
            </div>
          ) : (
            <div className="my-1 space-y-1">
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {formatCurrency(stats.expenses.totalAmount, stats.expenses.currency)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {stats.expenses.totalRecorded} {stats.expenses.totalRecorded === 1 ? "entry" : "entries"} logged
              </p>
              <div className="text-[11px] space-y-0.5 text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-white/[0.06]">
                <p>
                  Today: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(stats.expenses.todayAmount, stats.expenses.currency)}</strong> • Month: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(stats.expenses.monthlyAmount, stats.expenses.currency)}</strong>
                </p>
                <p className="flex items-center gap-1">
                  <Wallet className="w-3 h-3 text-emerald-500" />
                  <span>
                    Budget remaining:{" "}
                    {stats.expenses.budgetRemaining !== null ? (
                      <span className={stats.expenses.budgetRemaining < 0 ? "text-rose-600 font-semibold" : "font-medium text-slate-700 dark:text-slate-300"}>
                        {formatCurrency(stats.expenses.budgetRemaining, stats.expenses.currency)}
                      </span>
                    ) : (
                      "Not set"
                    )}
                  </span>
                </p>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
            <Link
              href="/finance"
              className="text-[11px] font-medium text-slate-500 hover:text-theme-accent dark:text-slate-400 dark:hover:text-theme-accent inline-flex items-center gap-1 transition-colors"
            >
              <span>View Finance</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {stats.connectedModules && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          <Link
            href="/more/vehicles"
            className="p-3.5 rounded-2xl glass-card glass-card-hover transition-all flex items-center justify-between group shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-theme-accent-subtle text-theme-accent flex items-center justify-center border border-theme-accent/25 shadow-2xs shrink-0">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-theme-accent transition-colors">
                  Vehicles Garage
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {stats.connectedModules.vehiclesCount} {stats.connectedModules.vehiclesCount === 1 ? "vehicle" : "vehicles"}
                  {stats.connectedModules.vehicleAlertsCount > 0 ? (
                    <span className="text-rose-500 font-medium"> • {stats.connectedModules.vehicleAlertsCount} alert{stats.connectedModules.vehicleAlertsCount === 1 ? "" : "s"}</span>
                  ) : (
                    " • All clear"
                  )}
                </p>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-theme-accent transition-colors" />
          </Link>

          <Link
            href="/subscriptions"
            className="p-3.5 rounded-2xl glass-card glass-card-hover transition-all flex items-center justify-between group shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-theme-accent-subtle text-theme-accent flex items-center justify-center border border-theme-accent/25 shadow-2xs shrink-0">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-theme-accent transition-colors">
                  Subscriptions
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {stats.connectedModules.activeSubscriptionsCount} active • {formatCurrency(stats.connectedModules.monthlySubscriptionCost, stats.connectedModules.currency)}/mo
                </p>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-theme-accent transition-colors" />
          </Link>

          <Link
            href="/more/dates"
            className="p-3.5 rounded-2xl glass-card glass-card-hover transition-all flex items-center justify-between group shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/25 shadow-2xs shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Important Dates
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {stats.connectedModules.importantDatesCount} {stats.connectedModules.importantDatesCount === 1 ? "milestone" : "milestones"} tracked
                </p>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-colors" />
          </Link>
        </div>
      )}
    </section>
  );
}

