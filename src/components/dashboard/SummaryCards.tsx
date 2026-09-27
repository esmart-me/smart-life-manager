"use client";

import { FileText, Bell, CreditCard, Receipt, Plus, ArrowRight, AlertTriangle } from "lucide-react";
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
    currency: string;
  };
  expenses: {
    totalRecorded: number;
    totalAmount: number;
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. DOCUMENTS SUMMARY CARD */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Documents
            </span>
            <div className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
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
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
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
              className="text-[11px] font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 inline-flex items-center gap-1 transition-colors"
            >
              <span>View Vault</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* 2. REMINDERS SUMMARY CARD */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Reminders
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
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
              <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
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

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <Link
              href="/reminders"
              className="text-[11px] font-medium text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 inline-flex items-center gap-1 transition-colors"
            >
              <span>View Reminders</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* 3. PAYMENTS SUMMARY CARD */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Payments & Bills
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
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
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Payment</span>
              </button>
            </div>
          ) : (
            <div className="my-1">
              <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {formatCurrency(stats.payments.totalAmountDue, stats.payments.currency)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {stats.payments.overdueCount > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                    {stats.payments.overdueCount} overdue bill{stats.payments.overdueCount > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span>{stats.payments.totalPending} pending payment{stats.payments.totalPending > 1 ? "s" : ""}</span>
                )}
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <Link
              href="/finance"
              className="text-[11px] font-medium text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 inline-flex items-center gap-1 transition-colors"
            >
              <span>Manage Bills</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* 4. EXPENSES SUMMARY CARD */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Logged Expenses
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
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
                className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Expense</span>
              </button>
            </div>
          ) : (
            <div className="my-1">
              <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {formatCurrency(stats.expenses.totalAmount, stats.expenses.currency)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {stats.expenses.totalRecorded} {stats.expenses.totalRecorded === 1 ? "entry" : "entries"} logged
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <Link
              href="/finance"
              className="text-[11px] font-medium text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 inline-flex items-center gap-1 transition-colors"
            >
              <span>View Ledger</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
