"use client";

import { useState, useEffect } from "react";
import { X, RefreshCw, Calendar, Tag, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertBanner } from "@/components/ui/AlertBanner";
import {
  SUBSCRIPTION_CATEGORIES,
  SUBSCRIPTION_BILLING_CYCLES,
  SubscriptionBillingCycle,
  SubscriptionCategory,
} from "@/lib/subscriptions/constants";

export interface SubscriptionFormData {
  id?: string;
  name: string;
  cost: number | string;
  currency?: string;
  billingCycle: string;
  nextBillingDate: string;
  renewalStatus?: string;
  category?: string;
  notes?: string | null;
}

interface SubscriptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: SubscriptionFormData | null;
  userCurrency?: string;
}

export function SubscriptionFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  userCurrency = "USD",
}: SubscriptionFormModalProps) {
  const isEditing = Boolean(initialData?.id);

  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState(userCurrency);
  const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle>("monthly");
  const [nextBillingDate, setNextBillingDate] = useState("");
  const [category, setCategory] = useState<SubscriptionCategory>("Entertainment");
  const [notes, setNotes] = useState("");
  const [renewalStatus, setRenewalStatus] = useState("active");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setCost(initialData.cost !== undefined ? String(initialData.cost) : "");
      setCurrency(initialData.currency || userCurrency);
      setBillingCycle((initialData.billingCycle as SubscriptionBillingCycle) || "monthly");
      setCategory((initialData.category as SubscriptionCategory) || "Entertainment");
      setRenewalStatus(initialData.renewalStatus || "active");
      setNotes(initialData.notes || "");

      if (initialData.nextBillingDate) {
        const d = new Date(initialData.nextBillingDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        setNextBillingDate(`${yyyy}-${mm}-${dd}`);
      } else {
        setNextBillingDate("");
      }
    } else {
      setName("");
      setCost("");
      setCurrency(userCurrency);
      setBillingCycle("monthly");
      setCategory("Entertainment");
      setRenewalStatus("active");
      setNotes("");

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      setNextBillingDate(`${yyyy}-${mm}-${dd}`);
    }
    setErrorMessage(null);
  }, [initialData, isOpen, userCurrency]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Please enter a subscription name.");
      return;
    }

    const numCost = Number(cost);
    if (isNaN(numCost) || numCost <= 0) {
      setErrorMessage("Please enter a valid positive cost amount.");
      return;
    }

    if (!nextBillingDate) {
      setErrorMessage("Please select the next billing date.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        cost: numCost,
        currency,
        billingCycle,
        nextBillingDate: new Date(nextBillingDate).toISOString(),
        category,
        renewalStatus,
        notes: notes.trim() || null,
      };

      const endpoint = isEditing ? `/api/subscriptions/${initialData?.id}` : "/api/subscriptions";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || "Failed to save subscription.");
        setIsSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("[SubscriptionForm Submit Error]:", err);
      setErrorMessage("Network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {isEditing ? "Edit Subscription" : "Add Subscription"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track recurring memberships, software, and services.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <AlertBanner type="error" title="Validation Error" message={errorMessage} />
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Subscription Name <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. Netflix, Spotify, GitHub Pro, Gym Membership"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Amount <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-medium text-slate-400">
                  <DollarSign className="w-3.5 h-3.5" />
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm min-h-[42px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Currency
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm min-h-[42px] font-semibold uppercase text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Billing Date & Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Next Billing Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={nextBillingDate}
                onChange={(e) => setNextBillingDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm min-h-[42px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Billing Frequency
              </label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as SubscriptionBillingCycle)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm min-h-[42px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {SUBSCRIPTION_BILLING_CYCLES.map((cycle) => (
                  <option key={cycle.value} value={cycle.value}>
                    {cycle.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SubscriptionCategory)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm min-h-[42px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {SUBSCRIPTION_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Renewal Status
              </label>
              <select
                value={renewalStatus}
                onChange={(e) => setRenewalStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm min-h-[42px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="active">Active (Auto-renew)</option>
                <option value="cancelled">Cancelled</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Shared with family, plan details, cancellation terms..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update Subscription" : "Save Subscription"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
