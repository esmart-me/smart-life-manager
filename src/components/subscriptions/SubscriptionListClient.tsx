"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Plus,
  Calendar,
  CreditCard,
  Trash2,
  Edit2,
  Ban,
  CheckCircle2,
  TrendingDown,
  Layers,
  Sparkles,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { SubscriptionCostSummary } from "@/lib/subscriptions/calculations";
import { SubscriptionFormModal, SubscriptionFormData } from "./SubscriptionFormModal";

export interface SubscriptionRecord {
  id: string;
  name: string;
  cost: number;
  currency: string;
  billingCycle: string;
  nextBillingDate: string | Date;
  renewalStatus: string;
  category: string;
  notes?: string | null;
}

interface SubscriptionListClientProps {
  initialSubscriptions: SubscriptionRecord[];
  initialMetrics: SubscriptionCostSummary;
  userCurrency: string;
}

export function SubscriptionListClient({
  initialSubscriptions,
  initialMetrics,
  userCurrency,
}: SubscriptionListClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionFormData | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "cancelled">("active");
  const [searchQuery, setSearchQuery] = useState("");

  const handleRefresh = () => {
    router.refresh();
  };

  const handleOpenAdd = () => {
    setSelectedSubscription(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub: SubscriptionRecord) => {
    setSelectedSubscription({
      id: sub.id,
      name: sub.name,
      cost: sub.cost,
      currency: sub.currency,
      billingCycle: sub.billingCycle,
      nextBillingDate: String(sub.nextBillingDate),
      renewalStatus: sub.renewalStatus,
      category: sub.category,
      notes: sub.notes,
    });
    setIsModalOpen(true);
  };

  const handleCancel = async (sub: SubscriptionRecord) => {
    if (!confirm(`Are you sure you want to mark subscription "${sub.name}" as cancelled?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/subscriptions/${sub.id}/cancel`, { method: "PATCH" });
      const data = await res.json();
      if (res.ok && data.success) {
        handleRefresh();
      } else {
        alert(data.error?.message || "Failed to cancel subscription");
      }
    } catch (err) {
      console.error("[Cancel Subscription Error]:", err);
      alert("Network error cancelling subscription");
    }
  };

  const handleDelete = async (sub: SubscriptionRecord) => {
    if (!confirm(`Are you sure you want to permanently delete subscription "${sub.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/subscriptions/${sub.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        handleRefresh();
      } else {
        alert(data.error?.message || "Failed to delete subscription");
      }
    } catch (err) {
      console.error("[Delete Subscription Error]:", err);
      alert("Network error deleting subscription");
    }
  };

  const filtered = initialSubscriptions.filter((s) => {
    if (filter === "active" && s.renewalStatus !== "active") return false;
    if (filter === "cancelled" && s.renewalStatus !== "cancelled") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchCat = s.category.toLowerCase().includes(q);
      const matchNotes = (s.notes || "").toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchNotes) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Subscriptions & Memberships
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track recurring software, streaming services, memberships, and optimize your monthly burn.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Subscription</span>
        </Button>
      </div>

      {/* KPI Cards: Monthly, Annual, Active Count */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Monthly Subscription Cost
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formatCurrency(initialMetrics.monthlyTotal, userCurrency)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Estimated monthly recurring burn
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Annual Subscription Cost
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formatCurrency(initialMetrics.annualTotal, userCurrency)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Projected annual subscription run-rate
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Active Subscriptions
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {initialMetrics.activeCount}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {initialMetrics.cancelledCount} cancelled / inactive
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subscriptions, category, notes..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === "active"
                ? "bg-purple-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            Active ({initialMetrics.activeCount})
          </button>

          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            All ({initialSubscriptions.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter("cancelled")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === "cancelled"
                ? "bg-slate-700 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            Cancelled ({initialMetrics.cancelledCount})
          </button>
        </div>
      </div>

      {/* Subscription List */}
      {initialSubscriptions.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No subscriptions found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Add recurring memberships, streaming subscriptions, and services to track burn rate.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenAdd}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
          >
            Add First Subscription
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            No subscriptions match your search or filter
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setFilter("all");
            }}
            className="text-xs text-purple-600 hover:underline"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((sub) => {
            const dateStr = formatShortDate(sub.nextBillingDate);
            const isCancelled = sub.renewalStatus === "cancelled";

            return (
              <div
                key={sub.id}
                className={`p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-3 ${
                  isCancelled
                    ? "border-slate-200 dark:border-slate-800/60 opacity-60"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {sub.name}
                      </h4>
                      {isCancelled ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                          Cancelled
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {sub.category} • <span className="capitalize">{sub.billingCycle}</span>
                    </p>
                  </div>

                  <p className="text-base font-bold text-slate-900 dark:text-white shrink-0">
                    {formatCurrency(sub.cost, sub.currency)}
                    <span className="text-[11px] font-normal text-slate-400 ml-1">/{sub.billingCycle.slice(0, 2)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Next payment: {dateStr}</span>
                </div>

                {sub.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                    {sub.notes}
                  </p>
                )}

                {/* Footer Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(sub)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit subscription"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(sub)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete subscription"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!isCancelled && (
                    <button
                      type="button"
                      onClick={() => handleCancel(sub)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-rose-600 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Ban className="w-3 h-3" />
                      <span>Cancel Plan</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <SubscriptionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRefresh}
        initialData={selectedSubscription}
        userCurrency={userCurrency}
      />
    </div>
  );
}
