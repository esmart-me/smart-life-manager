"use client";

import { useState } from "react";
import {
  Receipt,
  Search,
  Plus,
  Calendar,
  FileText,
  Trash2,
  Edit2,
  CreditCard,
  Download,
  Filter,
} from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  ExpenseCategory,
  ExpensePaymentMethod,
} from "@/lib/finance/constants";
import { ExpenseFormData } from "./ExpenseFormModal";
import { Button } from "@/components/ui/Button";

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  spentAt: string | Date;
  paymentMethod?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
}

interface ExpenseListTabProps {
  expenses: ExpenseItem[];
  userCurrency: string;
  onAddExpense: () => void;
  onEditExpense: (expense: ExpenseFormData) => void;
  onRefresh: () => void;
}

export function ExpenseListTab({
  expenses,
  userCurrency,
  onAddExpense,
  onEditExpense,
  onRefresh,
}: ExpenseListTabProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = expenses.filter((e) => {
    if (categoryFilter !== "all" && e.category.toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }
    if (
      methodFilter !== "all" &&
      (e.paymentMethod || "").toLowerCase() !== methodFilter.toLowerCase()
    ) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchNotes = e.notes?.toLowerCase().includes(q) || false;
      const matchCat = e.category.toLowerCase().includes(q);
      const matchMethod = (e.paymentMethod || "").toLowerCase().includes(q);
      if (!matchTitle && !matchNotes && !matchCat && !matchMethod) return false;
    }

    return true;
  });

  const totalFilteredAmount = filtered.reduce((acc, curr) => acc + curr.amount, 0);

  async function handleDelete(expense: ExpenseItem) {
    if (!confirm(`Are you sure you want to delete expense "${expense.title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        onRefresh();
      } else {
        alert(data.error?.message || "Failed to delete expense");
      }
    } catch (err) {
      console.error("[Delete Expense Error]:", err);
      alert("Network error deleting expense");
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Controls & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Total Filtered:{" "}
            <strong className="text-slate-900 dark:text-white">
              {formatCurrency(totalFilteredAmount, userCurrency)}
            </strong>{" "}
            ({filtered.length} entries)
          </span>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={onAddExpense}
          className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Log Expense</span>
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search description, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="all">All Categories</option>
          {EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="all">All Payment Methods</option>
          {EXPENSE_PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Expense List */}
      {filtered.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No expenses found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {searchQuery || categoryFilter !== "all" || methodFilter !== "all"
                ? "Try clearing filters to view all logged expenses."
                : "Keep an accurate financial ledger and track every transaction."}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onAddExpense}
            className="bg-sky-600 hover:bg-sky-700 text-white text-xs"
          >
            Log First Expense
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((expense) => {
            const dateStr = formatShortDate(expense.spentAt);

            return (
              <div
                key={expense.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {expense.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{dateStr}</span>
                    </p>
                  </div>

                  <p className="text-base font-bold text-slate-900 dark:text-white shrink-0">
                    {formatCurrency(expense.amount, expense.currency)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-medium text-[11px] border border-sky-100 dark:border-sky-900">
                    {expense.category}
                  </span>

                  {expense.paymentMethod && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px]">
                      {expense.paymentMethod}
                    </span>
                  )}

                  {expense.receiptUrl && (
                    <a
                      href={`/api/expenses/${expense.id}/receipt`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900 hover:underline"
                    >
                      <FileText className="w-3 h-3" />
                      <span>View Receipt</span>
                    </a>
                  )}
                </div>

                {expense.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg italic">
                    {expense.notes}
                  </p>
                )}

                {/* Card Footer Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {expense.paymentMethod || "Direct expense"}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        onEditExpense({
                          id: expense.id,
                          title: expense.title,
                          amount: expense.amount,
                          currency: expense.currency,
                          category: expense.category,
                          spentAt: String(expense.spentAt),
                          paymentMethod: expense.paymentMethod,
                          notes: expense.notes,
                          receiptUrl: expense.receiptUrl,
                        })
                      }
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit expense"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(expense)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete expense"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
