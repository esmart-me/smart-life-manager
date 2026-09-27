"use client";

import { useState, useEffect } from "react";
import {
  Check,
  Sparkles,
  Shield,
  Users,
  Car,
  FileText,
  Download,
  Bot,
  Zap,
  RefreshCw,
  Sliders,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PlanTier, PlanFeature } from "@/lib/plans/constants";
import { UserPlanSummary } from "@/lib/plans/plan-service";

interface PlanItem {
  id: string;
  plan: PlanTier;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  maxDocuments: number;
  maxVehicles: number;
  maxFamilyMembers: number;
  allowAdvancedReports: boolean;
  allowExports: boolean;
  allowSubscriptionTracking: boolean;
  allowCloudBackup: boolean;
  allowCustomRecurrence: boolean;
  allowAiAssistant: boolean;
  allowMultiDeviceSync: boolean;
  isPopular: boolean;
  features: (PlanFeature | string)[];
}

export function PremiumScreenClient() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [summary, setSummary] = useState<UserPlanSummary | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);
  const [updatingTier, setUpdatingTier] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Admin pricing configurator state
  const [showAdminConfig, setShowAdminConfig] = useState(false);
  const [adminSelectedPlan, setAdminSelectedPlan] = useState<PlanTier>("premium");
  const [adminMonthlyPrice, setAdminMonthlyPrice] = useState("9.99");
  const [adminYearlyPrice, setAdminYearlyPrice] = useState("89.99");
  const [adminCurrency, setAdminCurrency] = useState("USD");
  const [adminMaxDocs, setAdminMaxDocs] = useState("5");
  const [adminMaxVehicles, setAdminMaxVehicles] = useState("1");
  const [adminSaving, setAdminSaving] = useState(false);

  const fetchStatusAndPlans = async () => {
    try {
      setLoading(true);
      const [plansRes, subRes] = await Promise.all([
        fetch("/api/plans"),
        fetch("/api/subscription/current"),
      ]);

      const plansData = await plansRes.json();
      const subData = await subRes.json();

      if (plansData.success && plansData.data?.plans) {
        setPlans(plansData.data.plans);
      }

      if (subData.success && subData.data?.summary) {
        setSummary(subData.data.summary);
        if (subData.data.summary.billingInterval) {
          setBillingInterval(subData.data.summary.billingInterval as "monthly" | "yearly");
        }
      }
    } catch (err) {
      console.error("Failed to load plans or subscription:", err);
      setNotification({
        type: "error",
        message: "Failed to connect to subscription service. Please refresh.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndPlans();
  }, []);

  // Update admin form when selected plan changes
  useEffect(() => {
    const target = plans.find((p) => p.plan === adminSelectedPlan);
    if (target) {
      setAdminMonthlyPrice(String(target.monthlyPrice));
      setAdminYearlyPrice(String(target.yearlyPrice));
      setAdminCurrency(target.currency);
      setAdminMaxDocs(String(target.maxDocuments));
      setAdminMaxVehicles(String(target.maxVehicles));
    }
  }, [adminSelectedPlan, plans]);

  const handleSimulatePlanChange = async (targetPlan: PlanTier) => {
    try {
      setUpdatingTier(targetPlan);
      setNotification(null);

      const res = await fetch("/api/subscription/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: targetPlan,
          billingInterval,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSummary(data.data.summary);
        setNotification({
          type: "success",
          message: `Plan changed to ${targetPlan.toUpperCase()} successfully! (Subscription architecture simulation)`,
        });
      } else {
        setNotification({
          type: "error",
          message: data.error?.message || "Failed to switch plan tier.",
        });
      }
    } catch (err) {
      console.error("Error switching plan:", err);
      setNotification({
        type: "error",
        message: "An unexpected error occurred while updating your subscription.",
      });
    } finally {
      setUpdatingTier(null);
    }
  };

  const handleSaveAdminConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAdminSaving(true);
      const res = await fetch("/api/plans/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: adminSelectedPlan,
          updates: {
            monthlyPrice: parseFloat(adminMonthlyPrice) || 0,
            yearlyPrice: parseFloat(adminYearlyPrice) || 0,
            currency: adminCurrency.toUpperCase().trim(),
            maxDocuments: parseInt(adminMaxDocs, 10),
            maxVehicles: parseInt(adminMaxVehicles, 10),
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPlans(data.data.plans);
        setNotification({
          type: "success",
          message: `Configurable pricing for ${adminSelectedPlan.toUpperCase()} updated in database!`,
        });
        // Refresh user summary
        fetchStatusAndPlans();
      } else {
        setNotification({
          type: "error",
          message: data.error?.message || "Failed to update plan configuration.",
        });
      }
    } catch (err) {
      console.error("Admin save error:", err);
      setNotification({
        type: "error",
        message: "Failed to save plan configuration.",
      });
    } finally {
      setAdminSaving(false);
    }
  };

  const activePlanKey = summary?.plan || "free";

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          <span>Monetization & Subscription Architecture</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Supercharge Your Smart Life Manager
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          Choose the ideal plan for your individual journey or family household. Pricing is dynamically configured and stored in the database.
        </p>

        {/* Live Status Notification */}
        {notification && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 max-w-2xl mx-auto transition-all ${
              notification.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : notification.type === "error"
                ? "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                : "bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Current Plan Overview Card */}
        {summary && (
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs max-w-2xl mx-auto text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                  Current Active Plan
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                    {summary.planName}
                  </h3>
                  <Badge variant={summary.plan === "free" ? "outline" : "success"}>
                    {summary.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400 dark:text-slate-500">Billing Cycle</span>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">
                  {summary.billingInterval} ({summary.pricing.currency}{" "}
                  {summary.billingInterval === "yearly"
                    ? summary.pricing.yearlyPrice
                    : summary.pricing.monthlyPrice}
                  )
                </p>
              </div>
            </div>

            {/* Current Resource Usage Meters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Documents
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {summary.limits.documents.current} /{" "}
                    {summary.limits.documents.isUnlimited ? "∞" : summary.limits.documents.max}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      summary.limits.documents.percentUsed >= 100
                        ? "bg-rose-500"
                        : summary.limits.documents.percentUsed > 80
                        ? "bg-amber-500"
                        : "bg-brand-500"
                    }`}
                    style={{ width: `${summary.limits.documents.percentUsed}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Car className="w-3 h-3" /> Vehicles
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {summary.limits.vehicles.current} /{" "}
                    {summary.limits.vehicles.isUnlimited ? "∞" : summary.limits.vehicles.max}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      summary.limits.vehicles.percentUsed >= 100
                        ? "bg-rose-500"
                        : summary.limits.vehicles.percentUsed > 80
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${summary.limits.vehicles.percentUsed}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> Family Members
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {summary.limits.familyMembers.current} /{" "}
                    {summary.limits.familyMembers.isUnlimited ? "∞" : summary.limits.familyMembers.max}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      summary.limits.familyMembers.percentUsed >= 100
                        ? "bg-rose-500"
                        : "bg-indigo-500"
                    }`}
                    style={{ width: `${summary.limits.familyMembers.percentUsed}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Monthly / Yearly Toggle */}
        <div className="pt-2 flex items-center justify-center">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-2xs">
            <button
              type="button"
              onClick={() => setBillingInterval("monthly")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                billingInterval === "monthly"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval("yearly")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                billingInterval === "yearly"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                Save ~25%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = activePlanKey === plan.plan;
          const price =
            billingInterval === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
          const displayPeriod = billingInterval === "yearly" ? "/year" : "/month";

          return (
            <div
              key={plan.plan}
              className={`relative rounded-2xl border transition-all flex flex-col justify-between p-6 ${
                plan.isPopular
                  ? "border-brand-500 dark:border-brand-500 bg-white dark:bg-slate-900 shadow-md ring-1 ring-brand-500/20"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs hover:shadow-xs"
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand-600 text-white shadow-xs">
                    Most Popular
                  </span>
                </div>
              )}

              <div>
                {/* Plan Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {plan.name}
                  </h3>
                  {isCurrent && (
                    <Badge variant="success">Current Plan</Badge>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px]">
                  {plan.description}
                </p>

                {/* Price Display */}
                <div className="mt-4 mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                      {plan.currency === "USD" ? "$" : `${plan.currency} `}
                      {price}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {displayPeriod}
                    </span>
                  </div>
                  {billingInterval === "yearly" && plan.monthlyPrice > 0 && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                      Billed annually (equivalent to ${(plan.yearlyPrice / 12).toFixed(2)}/mo)
                    </p>
                  )}
                </div>

                {/* Resource Limits Highlights */}
                <div className="space-y-2 py-3 border-y border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                    <span>
                      {plan.maxDocuments === -1 ? (
                        <strong>Unlimited</strong>
                      ) : (
                        <strong>Up to {plan.maxDocuments}</strong>
                      )}{" "}
                      Documents
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Car className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>
                      {plan.maxVehicles === -1 ? (
                        <strong>Unlimited</strong>
                      ) : (
                        <strong>{plan.maxVehicles}</strong>
                      )}{" "}
                      Vehicles tracked
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>
                      {plan.maxFamilyMembers === 1 ? (
                        "Single-user profile"
                      ) : (
                        <strong>Up to {plan.maxFamilyMembers} Family Members</strong>
                      )}
                    </span>
                  </div>
                </div>

                {/* Feature Checklist */}
                <div className="mt-4 space-y-2.5">
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Included Capabilities
                  </p>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    {plan.features.map((featureItem, idx) => {
                      const name =
                        typeof featureItem === "string"
                          ? featureItem
                          : featureItem?.name || "";
                      const isIncluded =
                        typeof featureItem === "string"
                          ? true
                          : featureItem?.included !== false;
                      const isHighlight =
                        typeof featureItem === "object"
                          ? Boolean(featureItem?.highlight)
                          : false;

                      return (
                        <li
                          key={idx}
                          className={`flex items-start gap-2 ${
                            isIncluded
                              ? isHighlight
                                ? "text-slate-900 dark:text-white font-semibold"
                                : "text-slate-600 dark:text-slate-300"
                              : "text-slate-400 dark:text-slate-500 line-through opacity-60"
                          }`}
                        >
                          {isIncluded ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          )}
                          <span>{name}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                {isCurrent ? (
                  <Button
                    variant="outline"
                    className="w-full justify-center text-xs font-semibold cursor-default opacity-80"
                    disabled
                  >
                    Active Plan
                  </Button>
                ) : (
                  <Button
                    variant={plan.isPopular ? "primary" : "outline"}
                    className="w-full justify-center text-xs font-semibold gap-1.5"
                    disabled={updatingTier !== null}
                    onClick={() => handleSimulatePlanChange(plan.plan)}
                  >
                    {updatingTier === plan.plan ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Activating...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {plan.plan === "free" ? "Downgrade to Free" : `Switch to ${plan.name}`}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Monetization Architecture Notice */}
      <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 flex items-start gap-3">
        <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            Subscription Architecture Mode (Safe Development Simulation)
          </p>
          <p className="text-amber-700 dark:text-amber-300">
            In accordance with specifications, live payment processing gateways (Stripe/PayPal) are not connected yet. Selecting a tier simulates instant tier activation in the local database, allowing you to test limits, family sharing, and feature flags seamlessly.
          </p>
        </div>
      </div>

      {/* Admin Configurable Pricing Section */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setShowAdminConfig(!showAdminConfig)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Admin Pricing & Limits Configurator
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Verify dynamic pricing architecture: modify plan costs or limits in the database without code changes.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
            {showAdminConfig ? "Collapse" : "Open Editor"}
          </span>
        </button>

        {showAdminConfig && (
          <form
            onSubmit={handleSaveAdminConfig}
            className="p-5 border-t border-slate-200 dark:border-slate-800 space-y-4 bg-slate-50/50 dark:bg-slate-900/50"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Plan Tier
                </label>
                <select
                  value={adminSelectedPlan}
                  onChange={(e) => setAdminSelectedPlan(e.target.value as PlanTier)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="free">Free Tier</option>
                  <option value="premium">Life Pro Premium</option>
                  <option value="family">Family Circle Plus</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={adminMonthlyPrice}
                  onChange={(e) => setAdminMonthlyPrice(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Yearly Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={adminYearlyPrice}
                  onChange={(e) => setAdminYearlyPrice(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Currency Code
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={adminCurrency}
                  onChange={(e) => setAdminCurrency(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Max Documents (-1 for Unlimited)
                </label>
                <input
                  type="number"
                  value={adminMaxDocs}
                  onChange={(e) => setAdminMaxDocs(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Max Vehicles (-1 for Unlimited)
                </label>
                <input
                  type="number"
                  value={adminMaxVehicles}
                  onChange={(e) => setAdminMaxVehicles(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={adminSaving}
                className="text-xs font-semibold gap-1.5"
              >
                {adminSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Update Plan Configuration</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
