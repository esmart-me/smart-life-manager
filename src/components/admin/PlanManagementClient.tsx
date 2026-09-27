"use client";

import { useState } from "react";
import {
  Sparkles,
  Globe,
  Save,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SUPPORTED_REGIONS, RegionDefinition, formatRegionalCurrency } from "@/lib/regions";

export interface PlanPricingRow {
  id: string;
  plan: string;
  regionCode: string;
  country: string;
  currency: string;
  currencySymbol: string;
  monthlyPrice: number;
  yearlyPrice: number;
  enabled: boolean;
}

interface PlanManagementClientProps {
  initialPricings: PlanPricingRow[];
}

export function PlanManagementClient({ initialPricings }: PlanManagementClientProps) {
  const [pricings, setPricings] = useState<PlanPricingRow[]>(initialPricings);
  const [selectedRegionCode, setSelectedRegionCode] = useState<string>("US");

  // Form editing state for the active region
  const [editState, setEditState] = useState<Record<string, { monthlyPrice: string; yearlyPrice: string; enabled: boolean }>>({});
  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const activeRegion = SUPPORTED_REGIONS.find((r) => r.countryCode === selectedRegionCode) || SUPPORTED_REGIONS[2];

  // Get rows for currently selected region
  const regionRows = pricings.filter((p) => p.regionCode.toUpperCase() === selectedRegionCode.toUpperCase());

  // Get current editing values for a plan
  const getPlanForm = (planKey: string) => {
    if (editState[`${planKey}_${selectedRegionCode}`]) {
      return editState[`${planKey}_${selectedRegionCode}`];
    }
    const found = regionRows.find((r) => r.plan === planKey);
    return {
      monthlyPrice: found ? String(found.monthlyPrice) : "0",
      yearlyPrice: found ? String(found.yearlyPrice) : "0",
      enabled: found ? found.enabled : true,
    };
  };

  const updatePlanField = (planKey: string, field: "monthlyPrice" | "yearlyPrice" | "enabled", value: any) => {
    const current = getPlanForm(planKey);
    setEditState((prev) => ({
      ...prev,
      [`${planKey}_${selectedRegionCode}`]: {
        ...current,
        [field]: value,
      },
    }));
  };

  const handleSavePlan = async (planKey: string) => {
    try {
      setSavingPlan(planKey);
      setSuccessToast(null);
      setErrorToast(null);

      const form = getPlanForm(planKey);

      const res = await fetch("/api/admin/plans/regional", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planKey,
          regionCode: selectedRegionCode,
          monthlyPrice: parseFloat(form.monthlyPrice) || 0,
          yearlyPrice: parseFloat(form.yearlyPrice) || 0,
          enabled: form.enabled,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update regional price");
      }

      // Update in state
      setPricings((prev) => {
        const idx = prev.findIndex((p) => p.plan === planKey && p.regionCode === selectedRegionCode);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            monthlyPrice: parseFloat(form.monthlyPrice) || 0,
            yearlyPrice: parseFloat(form.yearlyPrice) || 0,
            enabled: form.enabled,
          };
          return updated;
        }
        return prev;
      });

      setSuccessToast(
        `Pricing for ${planKey.toUpperCase()} in ${activeRegion.country} (${activeRegion.currencyCode}) saved and live on customer pricing page!`
      );
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: any) {
      setErrorToast(err.message || "Failed to save plan pricing.");
    } finally {
      setSavingPlan(null);
    }
  };

  const plansMeta = [
    {
      key: "free",
      name: "Free Starter",
      tagline: "Essential life tracking for single users (Fixed $0 / free tier)",
      isEditable: false,
    },
    {
      key: "premium",
      name: "Life Pro Premium",
      tagline: "Unlimited documents, vehicles, analytics, and exports",
      isEditable: true,
    },
    {
      key: "family",
      name: "Family Circle Plus",
      tagline: "Up to 6 family members, shared vaults, and permission roles",
      isEditable: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* Region Picker Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Globe className="w-4 h-4 text-indigo-400" />
          <span>Select Target Region to Configure:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {SUPPORTED_REGIONS.map((reg) => {
            const isSelected = selectedRegionCode === reg.countryCode;
            return (
              <button
                key={reg.countryCode}
                type="button"
                onClick={() => setSelectedRegionCode(reg.countryCode)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                <span>{reg.flag}</span>
                <span>{reg.country}</span>
                <span className="opacity-75 font-mono text-[11px]">({reg.currencyCode})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pricing Configuration Cards for Selected Region */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plansMeta.map((pMeta) => {
          const form = getPlanForm(pMeta.key);
          const isSaving = savingPlan === pMeta.key;

          return (
            <div
              key={pMeta.key}
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">{pMeta.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{pMeta.tagline}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-400">
                    {activeRegion.currencyCode} ({activeRegion.currencySymbol})
                  </span>
                </div>

                {/* Monthly Price Input */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Monthly Price ({activeRegion.currencyCode})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">
                      {activeRegion.currencySymbol}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={!pMeta.isEditable || isSaving}
                      value={form.monthlyPrice}
                      onChange={(e) => updatePlanField(pMeta.key, "monthlyPrice", e.target.value)}
                      className="pl-9 bg-slate-950 border-slate-800 text-white font-mono font-semibold text-xs disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Annual Price Input */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Annual Price ({activeRegion.currencyCode})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">
                      {activeRegion.currencySymbol}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={!pMeta.isEditable || isSaving}
                      value={form.yearlyPrice}
                      onChange={(e) => updatePlanField(pMeta.key, "yearlyPrice", e.target.value)}
                      className="pl-9 bg-slate-950 border-slate-800 text-white font-mono font-semibold text-xs disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Enabled Toggle */}
                <div className="pt-1">
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                    <span className="text-xs font-medium text-slate-300">
                      Tier Enabled in {activeRegion.country}
                    </span>
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      disabled={!pMeta.isEditable || isSaving}
                      onChange={(e) => updatePlanField(pMeta.key, "enabled", e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                  </label>
                </div>
              </div>

              {/* Action Button */}
              <div>
                {pMeta.isEditable ? (
                  <Button
                    type="button"
                    variant="primary"
                    isLoading={isSaving}
                    onClick={() => handleSavePlan(pMeta.key)}
                    className="w-full justify-center bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save {activeRegion.currencyCode} Pricing</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled
                    className="w-full justify-center bg-slate-800 text-slate-400 text-xs cursor-default"
                  >
                    Fixed Free Tier
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
