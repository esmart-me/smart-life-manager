"use client";

import { useState } from "react";
import {
  CreditCard,
  Edit2,
  Calendar,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatRegionalCurrency } from "@/lib/regions";

export interface SubscriptionDTO {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  plan: string;
  region: string;
  currency: string;
  price: number;
  billingInterval: string;
  billingCycle?: string;
  status: string;
  startDate: string;
  currentPeriodEnd: string | null;
  paymentProvider: string;
  providerSubscriptionId?: string | null;
}

interface SubscriptionsClientProps {
  initialSubscriptions: SubscriptionDTO[];
}

export function SubscriptionsClient({ initialSubscriptions }: SubscriptionsClientProps) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionDTO[]>(initialSubscriptions);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterPlan, setFilterPlan] = useState("ALL");

  // Override Modal
  const [selectedSub, setSelectedSub] = useState<SubscriptionDTO | null>(null);
  const [overridePlan, setOverridePlan] = useState("premium");
  const [overrideStatus, setOverrideStatus] = useState("active");
  const [overrideReason, setOverrideReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const filtered = subscriptions.filter((s) => {
    const matchSearch =
      search.trim() === "" ||
      s.customerName.toLowerCase().includes(search.toLowerCase()) ||
      s.customerEmail.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      filterStatus === "ALL" || s.status.toLowerCase() === filterStatus.toLowerCase();

    const matchPlan =
      filterPlan === "ALL" || s.plan.toLowerCase() === filterPlan.toLowerCase();

    return matchSearch && matchStatus && matchPlan;
  });

  const handleOpenOverride = (sub: SubscriptionDTO) => {
    setSelectedSub(sub);
    setOverridePlan(sub.plan);
    setOverrideStatus(sub.status);
    setOverrideReason("");
    setModalError(null);
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    if (!overrideReason.trim() || overrideReason.trim().length < 5) {
      setModalError("Please provide an administrative reason (at least 5 characters).");
      return;
    }

    try {
      setIsSubmitting(true);
      setModalError(null);

      const res = await fetch("/api/admin/subscriptions/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedSub.userId,
          plan: overridePlan,
          status: overrideStatus,
          reason: overrideReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to override subscription.");
      }

      // Update state locally
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === selectedSub.id
            ? { ...s, plan: overridePlan, status: overrideStatus }
            : s
        )
      );

      setSelectedSub(null);
      setSuccessToast(`Subscription for ${selectedSub.customerEmail} updated with audit record.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setModalError(err.message || "Failed to save override.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <Input
            type="text"
            placeholder="Search customer name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 text-xs"
          />
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="past_due">Past Due</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
            <option value="failed">Payment Failed</option>
          </select>
        </div>

        <div>
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Plans</option>
            <option value="free">Free Starter</option>
            <option value="premium">Life Pro Premium</option>
            <option value="family">Family Circle Plus</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Email</th>
                <th className="py-3 px-3">Plan</th>
                <th className="py-3 px-3">Billing Cycle</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Start Date</th>
                <th className="py-3 px-3">Next Renewal</th>
                <th className="py-3 px-3">Payment Provider</th>
                <th className="py-3 px-3">Subscription ID</th>
                <th className="py-3 px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    No subscriptions matching the filters.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-semibold text-white">
                      {s.customerName}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {s.customerEmail}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          s.plan === "family"
                            ? "bg-purple-950 text-purple-300 border border-purple-800"
                            : s.plan === "premium"
                            ? "bg-indigo-950 text-indigo-300 border border-indigo-800"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {s.plan}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 capitalize">
                      {s.billingCycle || s.billingInterval}
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      {formatRegionalCurrency(s.price, s.currency)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                          s.status === "active"
                            ? "text-emerald-400 bg-emerald-950/60"
                            : s.status === "cancelled"
                            ? "text-rose-400 bg-rose-950/60"
                            : s.status === "past_due"
                            ? "text-amber-400 bg-amber-950/60"
                            : "text-slate-400 bg-slate-800"
                        }`}
                      >
                        {s.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {new Date(s.startDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {s.currentPeriodEnd
                        ? new Date(s.currentPeriodEnd).toLocaleDateString()
                        : "Continuous (Free)"}
                    </td>
                    <td className="py-3 px-3 text-slate-400 capitalize text-[11px]">
                      {s.paymentProvider === "stripe" ? "Stripe" : s.paymentProvider}
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-slate-500 truncate max-w-[130px]">
                      {s.providerSubscriptionId || s.id}
                    </td>
                    <td className="py-3 px-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenOverride(s)}
                        className="text-indigo-400 hover:text-white bg-slate-800 hover:bg-slate-700 text-xs gap-1 py-1 px-2.5"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Override</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* OVERRIDE MODAL */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 text-left">
            <div className="flex items-center gap-2.5 text-indigo-400">
              <Shield className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-white">
                Administrative Subscription Override
              </h3>
            </div>

            <p className="text-xs text-slate-400">
              Modifying subscription for <strong className="text-white">{selectedSub.customerEmail}</strong>. All changes are permanently recorded in the audit trail.
            </p>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-300 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveOverride} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Plan Tier
                </label>
                <select
                  value={overridePlan}
                  onChange={(e) => setOverridePlan(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="free">Free Starter</option>
                  <option value="premium">Life Pro Premium</option>
                  <option value="family">Family Circle Plus</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subscription Status
                </label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="past_due">Past Due</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                  <option value="failed">Payment Failed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Administrative Justification Reason <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. VIP Customer courtesy extension, bank transfer approved"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => setSelectedSub(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                >
                  Record Override & Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
