"use client";

import { useState } from "react";
import {
  CreditCard,
  Search,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Repeat,
  Trash2,
  Edit2,
  Clock,
  Filter,
} from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { PaymentStatus, PAYMENT_CATEGORIES } from "@/lib/finance/constants";
import { PaymentFormData } from "./PaymentFormModal";
import { Button } from "@/components/ui/Button";

export interface PaymentItem {
  id: string;
  title: string;
  payee?: string | null;
  amount: number;
  currency: string;
  dueDate: string | Date;
  category: string;
  isRecurring: boolean;
  frequency?: string | null;
  notes?: string | null;
  isPaid: boolean;
  paidAt?: string | Date | null;
  status: PaymentStatus;
}

interface PaymentListTabProps {
  payments: PaymentItem[];
  userCurrency: string;
  onAddPayment: () => void;
  onEditPayment: (payment: PaymentFormData) => void;
  onRefresh: () => void;
}

export function PaymentListTab({
  payments,
  userCurrency,
  onAddPayment,
  onEditPayment,
  onRefresh,
}: PaymentListTabProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Compute status counts
  const totalCount = payments.length;
  const upcomingCount = payments.filter((p) => p.status === "Upcoming").length;
  const dueTodayCount = payments.filter((p) => p.status === "Due Today").length;
  const overdueCount = payments.filter((p) => p.status === "Overdue").length;
  const paidCount = payments.filter((p) => p.status === "Paid").length;

  // Filter payments
  const filtered = payments.filter((p) => {
    // Status filter
    if (activeFilter === "upcoming" && p.status !== "Upcoming") return false;
    if (activeFilter === "due_today" && p.status !== "Due Today") return false;
    if (activeFilter === "overdue" && p.status !== "Overdue") return false;
    if (activeFilter === "paid" && p.status !== "Paid") return false;

    // Category filter
    if (categoryFilter !== "all" && p.category.toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchPayee = p.payee?.toLowerCase().includes(q) || false;
      const matchNotes = p.notes?.toLowerCase().includes(q) || false;
      const matchCat = p.category.toLowerCase().includes(q);
      if (!matchTitle && !matchPayee && !matchNotes && !matchCat) return false;
    }

    return true;
  });

  async function handleMarkPaid(payment: PaymentItem) {
    setProcessingId(payment.id);
    setSuccessBanner(null);

    try {
      const res = await fetch(`/api/payments/${payment.id}/pay`, {
        method: "PATCH",
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.data?.nextPayment) {
          setSuccessBanner(
            `Marked "${payment.title}" as paid! Next recurring payment automatically scheduled for ${formatShortDate(
              data.data.nextPayment.dueDate
            )}.`
          );
        } else {
          setSuccessBanner(`Marked "${payment.title}" as paid!`);
        }
        onRefresh();
      } else {
        alert(data.error?.message || "Failed to mark payment as paid");
      }
    } catch (err) {
      console.error("[Mark Paid Error]:", err);
      alert("Network error marking payment as paid");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDelete(payment: PaymentItem) {
    if (!confirm(`Are you sure you want to delete payment reminder "${payment.title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/payments/${payment.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        onRefresh();
      } else {
        alert(data.error?.message || "Failed to delete payment");
      }
    } catch (err) {
      console.error("[Delete Payment Error]:", err);
      alert("Network error deleting payment");
    }
  }

  return (
    <div className="space-y-5">
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Pills & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            All ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("upcoming")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === "upcoming"
                ? "bg-sky-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            Upcoming ({upcomingCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("due_today")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === "due_today"
                ? "bg-amber-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            Due Today ({dueTodayCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("overdue")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === "overdue"
                ? "bg-rose-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            Overdue ({overdueCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("paid")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === "paid"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            Paid ({paidCount})
          </button>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={onAddPayment}
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Payment</span>
        </Button>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search payments by name, payee, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-48 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="all">All Categories</option>
          {PAYMENT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Payments List */}
      {filtered.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No payments found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {searchQuery || activeFilter !== "all" || categoryFilter !== "all"
                ? "Try clearing filters to view all scheduled payments."
                : "Stay ahead of your bills and never pay late fees again."}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onAddPayment}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
          >
            Create First Payment
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((payment) => {
            const isProcessing = processingId === payment.id;
            const dueStr = formatShortDate(payment.dueDate);

            let statusBadge = (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-900">
                Upcoming
              </span>
            );

            if (payment.status === "Paid") {
              statusBadge = (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Paid</span>
                </span>
              );
            } else if (payment.status === "Due Today") {
              statusBadge = (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Due Today</span>
                </span>
              );
            } else if (payment.status === "Overdue") {
              statusBadge = (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Overdue</span>
                </span>
              );
            }

            return (
              <div
                key={payment.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {payment.title}
                      </h4>
                      {statusBadge}
                    </div>
                    {payment.payee && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Payee: {payment.payee}
                      </p>
                    )}
                  </div>

                  <p className="text-base font-bold text-slate-900 dark:text-white shrink-0">
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    {payment.category}
                  </span>

                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Due: {dueStr}</span>
                  </span>

                  {payment.isRecurring && (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Repeat className="w-3 h-3" />
                      <span className="capitalize">{payment.frequency || "Monthly"}</span>
                    </span>
                  )}
                </div>

                {payment.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg italic">
                    {payment.notes}
                  </p>
                )}

                {/* Card Footer Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        onEditPayment({
                          id: payment.id,
                          title: payment.title,
                          payee: payment.payee,
                          amount: payment.amount,
                          currency: payment.currency,
                          dueDate: String(payment.dueDate),
                          category: payment.category,
                          frequency: payment.frequency,
                          isRecurring: payment.isRecurring,
                          notes: payment.notes,
                          isPaid: payment.isPaid,
                        })
                      }
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit payment"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(payment)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete payment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!payment.isPaid ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isProcessing}
                      onClick={() => handleMarkPaid(payment)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isProcessing ? "Processing..." : "Mark Paid"}</span>
                    </Button>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">
                      Paid on {payment.paidAt ? formatShortDate(payment.paidAt) : "record"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
