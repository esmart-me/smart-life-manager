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
  Clock,
  ExternalLink,
  AlertTriangle,
  Info,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
  startDate?: string | Date | null;
  trialEndDate?: string | Date | null;
  cancellationDate?: string | Date | null;
  websiteUrl?: string | null;
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
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>(initialSubscriptions);
  const [metrics, setMetrics] = useState<SubscriptionCostSummary>(initialMetrics);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionFormData | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "trial" | "cancelled">("active");
  const [searchQuery, setSearchQuery] = useState("");

  const handleRefresh = async () => {
    try {
      const res = await fetch("/api/subscriptions");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setSubscriptions(json.data.subscriptions);
          setMetrics(json.data.metrics);
        }
      }
    } catch {
      router.refresh();
    }
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
      startDate: sub.startDate ? String(sub.startDate) : null,
      trialEndDate: sub.trialEndDate ? String(sub.trialEndDate) : null,
      cancellationDate: sub.cancellationDate ? String(sub.cancellationDate) : null,
      websiteUrl: sub.websiteUrl || null,
      renewalStatus: sub.renewalStatus,
      category: sub.category,
      notes: sub.notes,
    });
    setIsModalOpen(true);
  };

  const handleManualCancel = async (sub: SubscriptionRecord) => {
    if (
      !confirm(
        `Confirm that you have cancelled "${sub.name}" on their service?\n\nNote: Smart Life Manager does not contact third-party services. This updates your personal spending records and stops renewal alerts.`
      )
    ) {
      return;
    }

    // Optimistic UI update
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === sub.id ? { ...s, renewalStatus: "cancelled" } : s))
    );

    try {
      const res = await fetch(`/api/subscriptions/${sub.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          renewalStatus: "cancelled",
          cancellationDate: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        await handleRefresh();
      } else {
        await handleRefresh();
      }
    } catch (err) {
      console.error("[Cancel Subscription Error]:", err);
      await handleRefresh();
    }
  };

  const handleDelete = async (sub: SubscriptionRecord) => {
    if (!confirm(`Are you sure you want to permanently delete subscription "${sub.name}"?`)) {
      return;
    }

    // Optimistic UI update
    setSubscriptions((prev) => prev.filter((s) => s.id !== sub.id));

    try {
      const res = await fetch(`/api/subscriptions/${sub.id}`, { method: "DELETE" });
      if (res.ok) {
        await handleRefresh();
      } else {
        await handleRefresh();
      }
    } catch (err) {
      console.error("[Delete Subscription Error]:", err);
      await handleRefresh();
    }
  };

  const filtered = subscriptions.filter((s) => {
    const status = (s.renewalStatus || "active").toLowerCase();
    if (filter === "active" && status !== "active") return false;
    if (filter === "trial" && status !== "trial") return false;
    if (filter === "cancelled" && status !== "cancelled" && status !== "expired") return false;

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

  const currencyKeys = metrics.byCurrency ? Object.keys(metrics.byCurrency) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-theme-text-primary">
            Subscriptions & Free Trials
          </h1>
          <p className="text-xs text-theme-text-muted mt-1">
            Track personal recurring memberships, software, free trials, and avoid unintended subscription renewals.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant="primary"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Subscription</span>
        </Button>
      </div>

      {/* Disclaimers & Alerts Banner */}
      {(metrics.upcomingTrialEndingsCount > 0 || metrics.upcomingRenewalsCount > 0) && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-amber-700 dark:text-amber-300">
                Upcoming Attention Required:
              </span>{" "}
              {metrics.upcomingTrialEndingsCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400 mr-2">
                  {metrics.upcomingTrialEndingsCount} free trial{metrics.upcomingTrialEndingsCount > 1 ? "s" : ""} ending this week.
                </span>
              )}
              {metrics.upcomingRenewalsCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {metrics.upcomingRenewalsCount} renewal{metrics.upcomingRenewalsCount > 1 ? "s" : ""} due in the next 7 days.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards: Multi-Currency Isolation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl glass-card border border-theme-border shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-theme-text-muted">
              Monthly Recurring Burn
            </span>
            <div className="w-7 h-7 rounded-lg bg-theme-accent-subtle text-theme-accent flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          {currencyKeys.length > 0 ? (
            <div className="space-y-1">
              {currencyKeys.map((curr) => (
                <p key={curr} className="text-xl font-bold tracking-tight text-theme-text-primary">
                  {formatCurrency(metrics.byCurrency[curr].monthlyTotal, curr)}
                  <span className="text-xs font-normal text-theme-text-muted ml-1.5">/month</span>
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xl font-bold tracking-tight text-theme-text-primary">
              {formatCurrency(0, userCurrency)}
            </p>
          )}
          <p className="text-[11px] text-theme-text-muted mt-1.5">
            Normalized to monthly equivalent per currency
          </p>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-theme-border shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-theme-text-muted">
              Annual Projected Spend
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          {currencyKeys.length > 0 ? (
            <div className="space-y-1">
              {currencyKeys.map((curr) => (
                <p key={curr} className="text-xl font-bold tracking-tight text-theme-text-primary">
                  {formatCurrency(metrics.byCurrency[curr].annualTotal, curr)}
                  <span className="text-xs font-normal text-theme-text-muted ml-1.5">/year</span>
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xl font-bold tracking-tight text-theme-text-primary">
              {formatCurrency(0, userCurrency)}
            </p>
          )}
          <p className="text-[11px] text-theme-text-muted mt-1.5">
            Assuming active auto-renewal intervals
          </p>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-theme-border shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-theme-text-muted">
              Active & Free Trials
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-theme-text-primary">
            {metrics.activeCount}{" "}
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
              (+{metrics.trialCount} on trial)
            </span>
          </p>
          <p className="text-[11px] text-theme-text-muted mt-1.5">
            {metrics.cancelledCount} cancelled • {metrics.pausedCount || 0} paused
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subscriptions, category, notes..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-theme-border bg-theme-bg-elevated text-xs text-theme-text-primary placeholder:text-theme-text-muted focus:outline-hidden focus:ring-2 focus:ring-theme-accent"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-theme-glass-subtle border border-theme-border">
          <button
            type="button"
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === "active"
                ? "bg-theme-accent text-white shadow-2xs font-semibold"
                : "text-theme-text-secondary hover:text-theme-text-primary"
            }`}
          >
            Active ({metrics.activeCount})
          </button>

          <button
            type="button"
            onClick={() => setFilter("trial")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === "trial"
                ? "bg-purple-600 text-white shadow-2xs font-semibold"
                : "text-theme-text-secondary hover:text-theme-text-primary"
            }`}
          >
            Free Trials ({metrics.trialCount})
          </button>

          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === "all"
                ? "bg-theme-accent text-white shadow-2xs font-semibold"
                : "text-theme-text-secondary hover:text-theme-text-primary"
            }`}
          >
            All ({subscriptions.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter("cancelled")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === "cancelled"
                ? "bg-slate-700 text-white shadow-2xs font-semibold"
                : "text-theme-text-secondary hover:text-theme-text-primary"
            }`}
          >
            Cancelled ({metrics.cancelledCount + metrics.expiredCount})
          </button>
        </div>
      </div>

      {/* Subscription Grid */}
      {subscriptions.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-theme-border text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-theme-accent-subtle text-theme-accent flex items-center justify-center mx-auto">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-theme-text-primary">
              No subscriptions tracked yet
            </h3>
            <p className="text-xs text-theme-text-muted mt-0.5">
              Add recurring software, streaming services, and free trials to monitor burn rate.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={handleOpenAdd}
            className="text-xs"
          >
            Add First Subscription
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-theme-border text-center space-y-2">
          <p className="text-xs font-semibold text-theme-text-primary">
            No subscriptions match your search or filter
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setFilter("all");
            }}
            className="text-xs text-theme-accent hover:underline"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((sub) => {
            const dateStr = formatShortDate(sub.nextBillingDate);
            const status = (sub.renewalStatus || "active").toLowerCase();
            const isCancelled = status === "cancelled" || status === "expired";
            const isTrial = status === "trial";

            return (
              <div
                key={sub.id}
                className={`p-4 rounded-xl border glass-panel shadow-xs flex flex-col justify-between space-y-3 transition-all duration-150 hover:border-theme-accent/30 ${
                  isCancelled
                    ? "opacity-60 bg-theme-glass-subtle/50 border-theme-border"
                    : isTrial
                    ? "border-purple-500/30 bg-purple-500/[0.02]"
                    : "border-theme-border bg-theme-glass"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-theme-text-primary truncate">
                        {sub.name}
                      </h4>
                      {isCancelled ? (
                        <Badge variant="default">Cancelled</Badge>
                      ) : isTrial ? (
                        <Badge variant="accent">Free Trial</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </div>
                    <p className="text-xs text-theme-text-muted">
                      {sub.category} • <span className="capitalize">{sub.billingCycle}</span>
                    </p>
                  </div>

                  <p className="text-base font-bold text-theme-text-primary shrink-0">
                    {formatCurrency(sub.cost, sub.currency)}
                    <span className="text-[11px] font-normal text-theme-text-muted ml-1">
                      /{sub.billingCycle.slice(0, 2)}
                    </span>
                  </p>
                </div>

                {/* Trial or Renewal Dates */}
                <div className="space-y-1 text-xs text-theme-text-secondary">
                  {isTrial && sub.trialEndDate && (
                    <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Trial Ends: {formatShortDate(sub.trialEndDate)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-theme-text-muted">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Next billing: {dateStr}</span>
                  </div>
                </div>

                {/* Notes */}
                {sub.notes && (
                  <p className="text-xs text-theme-text-secondary italic bg-theme-glass-subtle p-2 rounded-lg border border-theme-border/50">
                    {sub.notes}
                  </p>
                )}

                {/* Portal Link & Action Buttons */}
                <div className="pt-2 border-t border-theme-border flex items-center justify-between gap-2">
                  <div>
                    {sub.websiteUrl && (
                      <a
                        href={sub.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-theme-accent hover:underline"
                        title="Open account portal"
                      >
                        <Globe className="w-3 h-3" />
                        <span>Account Portal</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {!isCancelled && (
                      <button
                        type="button"
                        onClick={() => handleManualCancel(sub)}
                        className="p-1.5 rounded-lg text-theme-text-muted hover:text-amber-500 hover:bg-amber-500/10"
                        title="Mark as cancelled"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(sub)}
                      className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-glass-subtle"
                      title="Edit subscription"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(sub)}
                      className="p-1.5 rounded-lg text-theme-text-muted hover:text-rose-500 hover:bg-rose-500/10"
                      title="Delete subscription"
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

      {/* Subscription Modal */}
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
