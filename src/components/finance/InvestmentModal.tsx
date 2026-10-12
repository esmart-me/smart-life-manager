"use client";

import { useState, useEffect } from "react";
import { X, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ISO_CURRENCIES } from "@/lib/regions";

export interface InvestmentFormData {
  id?: string;
  name: string;
  fundHouse?: string | null;
  folioNumber?: string | null;
  type: string;
  investmentMode: string;
  sipAmount?: number | null;
  sipFrequency?: string | null;
  sipDay?: number | null;
  sipStartDate?: string | null;
  sipEndDate?: string | null;
  totalInvested: number;
  currentValuation: number;
  units?: number | null;
  nav?: number | null;
  currency: string;
  notes?: string | null;
  status: string;
}

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: InvestmentFormData | null;
  defaultCurrency?: string;
}

export function InvestmentModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  defaultCurrency = "USD",
}: InvestmentModalProps) {
  const [name, setName] = useState("");
  const [fundHouse, setFundHouse] = useState("");
  const [folioNumber, setFolioNumber] = useState("");
  const [type, setType] = useState("mutual_fund");
  const [investmentMode, setInvestmentMode] = useState("sip");
  const [sipAmount, setSipAmount] = useState<number | "">("");
  const [sipFrequency, setSipFrequency] = useState("monthly");
  const [sipDay, setSipDay] = useState<number>(5);
  const [sipStartDate, setSipStartDate] = useState("");
  const [sipEndDate, setSipEndDate] = useState("");
  const [totalInvested, setTotalInvested] = useState<number | "">("");
  const [currentValuation, setCurrentValuation] = useState<number | "">("");
  const [units, setUnits] = useState<number | "">("");
  const [nav, setNav] = useState<number | "">("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("active");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setFundHouse(initialData.fundHouse || "");
      setFolioNumber(initialData.folioNumber || "");
      setType(initialData.type || "mutual_fund");
      setInvestmentMode(initialData.investmentMode || "sip");
      setSipAmount(initialData.sipAmount ?? "");
      setSipFrequency(initialData.sipFrequency || "monthly");
      setSipDay(initialData.sipDay ?? 5);
      setSipStartDate(
        initialData.sipStartDate
          ? new Date(initialData.sipStartDate).toISOString().split("T")[0]
          : ""
      );
      setSipEndDate(
        initialData.sipEndDate
          ? new Date(initialData.sipEndDate).toISOString().split("T")[0]
          : ""
      );
      setTotalInvested(initialData.totalInvested);
      setCurrentValuation(initialData.currentValuation);
      setUnits(initialData.units ?? "");
      setNav(initialData.nav ?? "");
      setCurrency(initialData.currency || defaultCurrency);
      setNotes(initialData.notes || "");
      setStatus(initialData.status || "active");
    } else {
      setName("");
      setFundHouse("");
      setFolioNumber("");
      setType("mutual_fund");
      setInvestmentMode("sip");
      setSipAmount("");
      setSipFrequency("monthly");
      setSipDay(5);
      setSipStartDate(new Date().toISOString().split("T")[0]);
      setSipEndDate("");
      setTotalInvested("");
      setCurrentValuation("");
      setUnits("");
      setNav("");
      setCurrency(defaultCurrency);
      setNotes("");
      setStatus("active");
    }
    setError(null);
  }, [initialData, defaultCurrency, isOpen]);

  // Auto calculate valuation if units and nav are filled
  function handleUnitsChange(val: string) {
    const u = val === "" ? "" : Number(val);
    setUnits(u);
    if (typeof u === "number" && typeof nav === "number" && nav > 0) {
      setCurrentValuation(Math.round(u * nav * 100) / 100);
    }
  }

  function handleNavChange(val: string) {
    const n = val === "" ? "" : Number(val);
    setNav(n);
    if (typeof n === "number" && typeof units === "number" && units > 0) {
      setCurrentValuation(Math.round(units * n * 100) / 100);
    }
  }

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Investment or Fund Name is required.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        fundHouse: fundHouse.trim() || null,
        folioNumber: folioNumber.trim() || null,
        type,
        investmentMode,
        sipAmount: sipAmount === "" ? null : Number(sipAmount),
        sipFrequency,
        sipDay: investmentMode === "sip" ? Number(sipDay) : null,
        sipStartDate: sipStartDate ? new Date(sipStartDate).toISOString() : null,
        sipEndDate: sipEndDate ? new Date(sipEndDate).toISOString() : null,
        totalInvested: Number(totalInvested || 0),
        currentValuation: Number(currentValuation || totalInvested || 0),
        units: units === "" ? null : Number(units),
        nav: nav === "" ? null : Number(nav),
        currency,
        notes: notes.trim() || null,
        status,
      };

      const url = initialData?.id
        ? `/api/finance/investments/${initialData.id}`
        : "/api/finance/investments";

      const method = initialData?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save investment");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("[Investment Submit Error]:", err);
      setError(err instanceof Error ? err.message : "Network error saving investment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {initialData?.id ? "Edit Investment" : "Add Investment / SIP"}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Track mutual funds, recurring SIP debits, stocks, and portfolio returns.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Fund or Investment Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Parag Parikh Flexi Cap Fund, Vanguard S&P 500 ETF"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Fund House / Asset Manager
              </label>
              <input
                type="text"
                placeholder="e.g. PPFAS, Vanguard, BlackRock, HDFC"
                value={fundHouse}
                onChange={(e) => setFundHouse(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Folio / Account Reference
              </label>
              <input
                type="text"
                placeholder="e.g. 1029481/94"
                value={folioNumber}
                onChange={(e) => setFolioNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Asset Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="mutual_fund">Mutual Fund</option>
                <option value="sip">SIP Fund</option>
                <option value="stocks">Stocks / ETF</option>
                <option value="fd">Fixed Deposit (FD)</option>
                <option value="bonds">Bonds / Sukuk</option>
                <option value="gold">Gold / Commodities</option>
                <option value="crypto">Crypto</option>
                <option value="other">Other Asset</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Investment Mode
              </label>
              <select
                value={investmentMode}
                onChange={(e) => setInvestmentMode(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="sip">Systematic (SIP)</option>
                <option value="lumpsum">One-Time (Lumpsum)</option>
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {ISO_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SIP Specific Settings */}
          {investmentMode === "sip" && (
            <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 space-y-3">
              <h4 className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                SIP Recurrence & Schedule
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Periodic SIP Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 500"
                    value={sipAmount}
                    onChange={(e) => setSipAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-2.5 py-1 text-xs rounded border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Debit Frequency
                  </label>
                  <select
                    value={sipFrequency}
                    onChange={(e) => setSipFrequency(e.target.value)}
                    className="w-full px-2 py-1 text-xs rounded border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Debit Day of Month
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={sipDay}
                      onChange={(e) => setSipDay(Math.min(31, Math.max(1, Number(e.target.value))))}
                      className="w-16 px-2 py-1 text-xs rounded border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 text-center text-slate-900 dark:text-white"
                    />
                    <span className="text-[11px] text-slate-500">th</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Valuation & Cost Basis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Total Invested (Cost Basis) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                placeholder="e.g. 10000"
                value={totalInvested}
                onChange={(e) => setTotalInvested(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Current Market Valuation *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                placeholder="e.g. 12450"
                value={currentValuation}
                onChange={(e) => setCurrentValuation(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Units Held (Optional)
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 248.5"
                value={units}
                onChange={(e) => handleUnitsChange(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                NAV / Unit Price (Optional)
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 52.4"
                value={nav}
                onChange={(e) => handleNavChange(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="redeemed">Redeemed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Retirement goal, rebalance in December..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? "Saving..." : initialData?.id ? "Save Changes" : "Add Investment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
