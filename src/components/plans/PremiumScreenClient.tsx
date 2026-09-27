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
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Globe,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PlanTier, PlanFeature } from "@/lib/plans/constants";
import { UserPlanSummary } from "@/lib/plans/plan-service";
import { RegionDefinition, formatRegionalCurrency } from "@/lib/regions";

interface PlanItem {
  id: string;
  plan: PlanTier;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  currencySymbol: string;
  regionCode?: string;
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
  const [selectedRegion, setSelectedRegion] = useState<RegionDefinition | null>(null);
  const [supportedRegions, setSupportedRegions] = useState<RegionDefinition[]>([]);
  const [isChangingRegion, setIsChangingRegion] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const fetchStatusAndPlans = async (regionCode?: string) => {
    try {
      setLoading(true);
      const url = regionCode ? `/api/plans?region=${regionCode}` : "/api/plans";
      const [plansRes, subRes] = await Promise.all([
        fetch(url),
        fetch("/api/subscription/current"),
      ]);

      const plansData = await plansRes.json();
      const subData = await subRes.json();

      if (plansData.success && plansData.data) {
        setPlans(plansData.data.plans || []);
        setSelectedRegion(plansData.data.selectedRegion || null);
        setSupportedRegions(plansData.data.supportedRegions || []);
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

  const handleRegionChange = async (newCountryCode: string) => {
    try {
      setIsChangingRegion(true);
      // Persist in user profile & cookie
      await fetch("/api/user/region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode: newCountryCode }),
      });

      // Reload regional prices
      await fetchStatusAndPlans(newCountryCode);
      setNotification({
        type: "info",
        message: `Region changed to ${newCountryCode}. Pricing updated.`,
      });
    } catch (err) {
      console.error("Error changing region:", err);
    } finally {
      setIsChangingRegion(false);
    }
  };

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
          regionCode: selectedRegion?.countryCode || "US",
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

  const activePlanKey = summary?.plan || "free";

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          <span>Monetization & Regional Pricing</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Supercharge Your Smart Life Manager
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          Choose the ideal plan for your individual journey or family household. Pricing is dynamically configured per region in local currency.
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

        {/* Region & Multi-Currency Switcher Banner */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2.5 p-2 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Globe className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span className="font-medium">Region & Currency:</span>
          </div>

          <div className="relative inline-block">
            <select
              value={selectedRegion?.countryCode || "US"}
              onChange={(e) => handleRegionChange(e.target.value)}
              disabled={isChangingRegion}
              className="appearance-none pl-3 pr-8 py-1.5 font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 text-xs"
            >
              {supportedRegions.map((reg) => (
                <option key={reg.countryCode} value={reg.countryCode}>
                  {reg.flag} {reg.country} — {reg.currencyCode} ({reg.currencySymbol})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
          </div>

          {selectedRegion && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
              Prices displayed in {selectedRegion.currency} ({selectedRegion.currencySymbol})
            </span>
          )}
        </div>

        {/* Current User Active Plan Overview */}
        {summary && (
          <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-left space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
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
                  {summary.billingInterval} ({selectedRegion?.currencyCode || summary.pricing.currency}{" "}
                  {summary.billingInterval === "yearly"
                    ? summary.pricing.yearlyPrice
                    : summary.pricing.monthlyPrice}
                  )
                </p>
              </div>
            </div>

            {/* Current Resource Usage Meters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
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
          const rawPrice =
            billingInterval === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
          const displayPeriod = billingInterval === "yearly" ? "/year" : "/month";

          const formattedPrice = formatRegionalCurrency(
            rawPrice,
            plan.currency,
            selectedRegion?.locale
          );

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

                {/* Regional Price Display */}
                <div className="mt-4 mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                      {rawPrice === 0 ? "Free" : formattedPrice}
                    </span>
                    {rawPrice > 0 && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {displayPeriod}
                      </span>
                    )}
                  </div>
                  {billingInterval === "yearly" && rawPrice > 0 && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                      Billed annually (approx. {formatRegionalCurrency(rawPrice / 12, plan.currency, selectedRegion?.locale)}/mo)
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
                    <Car className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                    <span>
                      {plan.maxVehicles === -1 ? (
                        <strong>Unlimited</strong>
                      ) : (
                        <strong>Up to {plan.maxVehicles}</strong>
                      )}{" "}
                      Vehicles
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                    <span>
                      {plan.maxFamilyMembers === 0 ? (
                        <span className="text-slate-400">Single User Account</span>
                      ) : (
                        <strong>Up to {plan.maxFamilyMembers} Family Members</strong>
                      )}
                    </span>
                  </div>
                </div>

                {/* Feature Checklist */}
                <div className="mt-5 space-y-2.5">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Included Features
                  </span>
                  <ul className="space-y-2 text-xs">
                    {plan.features.map((feature, idx) => {
                      const featName = typeof feature === "string" ? feature : feature.name;
                      const featIncluded = typeof feature === "string" ? true : feature.included;
                      const featHighlight = typeof feature === "string" ? false : Boolean(feature.highlight);

                      return (
                        <li
                          key={idx}
                          className={`flex items-start gap-2 ${
                            featIncluded
                              ? "text-slate-700 dark:text-slate-200"
                              : "text-slate-400 dark:text-slate-600 line-through"
                          }`}
                        >
                          <div
                            className={`mt-0.5 p-0.5 rounded-full shrink-0 ${
                              featIncluded
                                ? featHighlight
                                  ? "bg-brand-100 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400"
                                  : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                            }`}
                          >
                            <Check className="w-3 h-3" />
                          </div>
                          <span className={featHighlight ? "font-semibold text-brand-700 dark:text-brand-300" : ""}>
                            {featName}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-4">
                {isCurrent ? (
                  <Button
                    variant="outline"
                    className="w-full justify-center text-xs font-semibold py-2.5 bg-slate-50 dark:bg-slate-800 cursor-default"
                    disabled
                  >
                    Current Active Plan
                  </Button>
                ) : (
                  <Button
                    variant={plan.isPopular ? "primary" : "secondary"}
                    className="w-full justify-center text-xs font-semibold py-2.5"
                    disabled={updatingTier !== null}
                    isLoading={updatingTier === plan.plan}
                    onClick={() => handleSimulatePlanChange(plan.plan)}
                  >
                    {plan.plan === "free" ? "Downgrade to Free" : `Select ${plan.name}`}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/60 dark:to-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              No Risk. Cancel or Switch Plans Anytime.
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live payment processing is in test sandbox mode. Your data remains completely safe and private.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <RefreshCw className="w-4 h-4 text-brand-500" />
          <span>Instant Activation</span>
        </div>
      </div>
    </div>
  );
}
