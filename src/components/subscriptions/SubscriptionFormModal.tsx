"use client";

import { useState, useEffect } from "react";
import { X, RefreshCw, Calendar, Tag, DollarSign, Globe, Info, Clock, CheckCircle2 } from "lucide-react";
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
  startDate?: string | null;
  trialEndDate?: string | null;
  cancellationDate?: string | null;
  websiteUrl?: string | null;
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
  const [startDate, setStartDate] = useState("");
  const [isTrial, setIsTrial] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
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
      setIsTrial(initialData.renewalStatus === "trial" || Boolean(initialData.trialEndDate));
      setWebsiteUrl(initialData.websiteUrl || "");
      setNotes(initialData.notes || "");

      if (initialData.startDate) {
        setStartDate(initialData.startDate.split("T")[0]);
      } else {
        setStartDate("");
      }

      if (initialData.trialEndDate) {
        setTrialEndDate(initialData.trialEndDate.split("T")[0]);
      } else {
        setTrialEndDate("");
      }

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
      setIsTrial(false);
      setTrialEndDate("");
      setStartDate("");
      setWebsiteUrl("");
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
      setErrorMessage("Please enter a subscription or service name.");
      return;
    }

    const numCost = Number(cost);
    if (isNaN(numCost) || numCost < 0) {
      setErrorMessage("Please enter a valid recurring cost amount.");
      return;
    }

    if (!nextBillingDate) {
      setErrorMessage("Please select the next billing or renewal date.");
      return;
    }

    if (isTrial && !trialEndDate) {
      setErrorMessage("Please specify the date when your free trial ends.");
      return;
    }

    setIsSubmitting(true);

    try {
      const finalStatus = isTrial ? "trial" : renewalStatus;

      const payload = {
        name: name.trim(),
        cost: numCost,
        currency: currency.trim().toUpperCase(),
        billingCycle,
        nextBillingDate: new Date(nextBillingDate).toISOString(),
        startDate: startDate ? new Date(startDate).toISOString() : null,
        trialEndDate: isTrial && trialEndDate ? new Date(trialEndDate).toISOString() : null,
        websiteUrl: websiteUrl.trim() || null,
        category,
        renewalStatus: finalStatus,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-card border border-theme-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-theme-text-primary">
                {isEditing ? "Edit Tracked Subscription" : "Add Tracked Subscription"}
              </h2>
              <p className="text-xs text-theme-text-muted">
                Track personal recurring expenses, trial periods, and renewals.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-glass-subtle transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <AlertBanner type="error" title="Validation Error" message={errorMessage} />
          )}

          {/* Educational notice */}
          <div className="p-3 rounded-xl bg-theme-glass-subtle border border-theme-border flex items-start gap-2.5 text-xs text-theme-text-muted">
            <Info className="w-4 h-4 text-theme-accent shrink-0 mt-0.5" />
            <span>
              This is a personal expense tracker. It does not initiate charges, contact payment processors, or alter application entitlements.
            </span>
          </div>

          {/* Name & Website */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Service Name <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. Netflix, Spotify, GitHub Pro, Amazon Prime, ChatGPT Plus"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Service Website / Account Portal (Optional)
              </label>
              <div className="relative">
                <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" />
                <Input
                  type="url"
                  placeholder="https://netflix.com/youraccount"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Recurring Amount <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-medium text-theme-text-muted">
                  <DollarSign className="w-3.5 h-3.5" />
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-theme-border bg-theme-bg-elevated text-xs text-theme-text-primary focus:outline-hidden focus:ring-2 focus:ring-theme-accent min-h-[40px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-theme-border bg-theme-bg-elevated text-xs font-semibold uppercase text-theme-text-primary focus:outline-hidden focus:ring-2 focus:ring-theme-accent min-h-[40px]"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
                <option value="INR">INR</option>
              </select>
            </div>
          </div>

          {/* Billing Frequency & Next Billing Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Next Billing / Renewal Date <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                required
                value={nextBillingDate}
                onChange={(e) => setNextBillingDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Billing Frequency
              </label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as SubscriptionBillingCycle)}
                className="w-full px-3 py-2 rounded-xl border border-theme-border bg-theme-bg-elevated text-xs text-theme-text-primary focus:outline-hidden focus:ring-2 focus:ring-theme-accent min-h-[40px]"
              >
                {SUBSCRIPTION_BILLING_CYCLES.map((cycle) => (
                  <option key={cycle.value} value={cycle.value}>
                    {cycle.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Free Trial Toggle & Trial Expiration Date */}
          <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-semibold text-theme-text-primary">
                  Free Trial Period
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="trialToggle"
                  checked={isTrial}
                  onChange={(e) => {
                    setIsTrial(e.target.checked);
                    if (e.target.checked) setRenewalStatus("trial");
                    else setRenewalStatus("active");
                  }}
                  className="w-4 h-4 rounded border-theme-border text-theme-accent focus:ring-theme-accent"
                />
                <label htmlFor="trialToggle" className="text-xs text-theme-text-secondary cursor-pointer">
                  Currently on trial
                </label>
              </div>
            </div>

            {isTrial && (
              <div className="pt-2 border-t border-purple-500/15 animate-in fade-in space-y-2">
                <div>
                  <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                    Free Trial Ends On <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    required={isTrial}
                    value={trialEndDate}
                    onChange={(e) => setTrialEndDate(e.target.value)}
                  />
                </div>
                <p className="text-[11px] text-purple-600 dark:text-purple-400">
                  You will receive an alert before the trial expires to help you cancel or confirm renewal.
                </p>
              </div>
            )}
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SubscriptionCategory)}
                className="w-full px-3 py-2 rounded-xl border border-theme-border bg-theme-bg-elevated text-xs text-theme-text-primary focus:outline-hidden focus:ring-2 focus:ring-theme-accent min-h-[40px]"
              >
                {SUBSCRIPTION_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Tracking Status
              </label>
              <select
                value={renewalStatus}
                onChange={(e) => {
                  setRenewalStatus(e.target.value);
                  if (e.target.value === "trial") setIsTrial(true);
                  else if (isTrial && e.target.value !== "trial") setIsTrial(false);
                }}
                className="w-full px-3 py-2 rounded-xl border border-theme-border bg-theme-bg-elevated text-xs text-theme-text-primary focus:outline-hidden focus:ring-2 focus:ring-theme-accent min-h-[40px]"
              >
                <option value="active">Active (Auto-renew)</option>
                <option value="trial">Free Trial</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled (Manual Confirmation)</option>
                <option value="expired">Expired / Ended</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-theme-text-secondary mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Shared with family, plan details, cancellation terms..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 rounded-xl border border-theme-border bg-theme-bg-elevated text-xs text-theme-text-primary focus:outline-hidden focus:ring-2 focus:ring-theme-accent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-theme-border flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update Subscription" : "Save Subscription"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
