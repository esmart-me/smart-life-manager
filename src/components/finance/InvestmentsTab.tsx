"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  CheckCircle2,
  PieChart,
  Repeat,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { InvestmentFormData, InvestmentModal } from "./InvestmentModal";

export interface InvestmentItem {
  id: string;
  name: string;
  fundHouse?: string | null;
  folioNumber?: string | null;
  type: string;
  investmentMode: string;
  sipAmount?: number | null;
  sipFrequency?: string | null;
  sipDay?: number | null;
  sipStartDate?: string | Date | null;
  sipEndDate?: string | Date | null;
  totalInvested: number;
  currentValuation: number;
  units?: number | null;
  nav?: number | null;
  currency: string;
  lastValuationDate?: string | Date | null;
  notes?: string | null;
  status: string;
}

interface InvestmentsTabProps {
  investments: InvestmentItem[];
  userCurrency: string;
  onRefresh: () => void;
}

export function InvestmentsTab({ investments, userCurrency, onRefresh }: InvestmentsTabProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<InvestmentFormData | null>(null);

  // Computations
  const totalInvested = investments.reduce((acc, i) => acc + i.totalInvested, 0);
  const totalValuation = investments.reduce((acc, i) => acc + i.currentValuation, 0);
  const netGain = totalValuation - totalInvested;
  const netReturnPercent = totalInvested > 0 ? (netGain / totalInvested) * 100 : 0;
  const isOverallPositive = netGain >= 0;

  const monthlySip = investments
    .filter((i) => i.investmentMode === "sip" && i.status === "active" && i.sipAmount)
    .reduce((acc, i) => acc + (i.sipAmount || 0), 0);

  // Filtered investments
  const filtered = investments.filter((i) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "sip") return i.investmentMode === "sip";
    return i.type.toLowerCase() === activeFilter.toLowerCase();
  });

  async function handleDelete(item: InvestmentItem) {
    if (!confirm(`Are you sure you want to delete investment "${item.name}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/finance/investments/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        onRefresh();
      } else {
        alert(data.error?.message || "Failed to delete investment");
      }
    } catch (err) {
      console.error("[Delete Investment Error]:", err);
      alert("Network error deleting investment");
    }
  }

  return (
    <div className="space-y-6">
      {/* Overview Analytics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Portfolio Value</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalValuation, userCurrency)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{investments.length} holdings</span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Invested (Cost)</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalInvested, userCurrency)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Net principal deployed</span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm">
          <p
            className={`text-[11px] font-medium ${
              isOverallPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            Net Returns / P&L
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <p
              className={`text-lg sm:text-xl font-bold ${
                isOverallPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {isOverallPositive ? "+" : ""}
              {formatCurrency(netGain, userCurrency)}
            </p>
            <span
              className={`text-xs font-semibold ${
                isOverallPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              ({isOverallPositive ? "+" : ""}
              {netReturnPercent.toFixed(1)}%)
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Unrealized profit/loss</span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm">
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Monthly SIP Outflow</p>
          <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(monthlySip, userCurrency)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Automated monthly wealth build</span>
        </div>
      </div>

      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Pills */}
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
            All Holdings ({investments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("sip")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === "sip"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            SIPs ({investments.filter((i) => i.investmentMode === "sip").length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("mutual_fund")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === "mutual_fund"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            Mutual Funds
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("stocks")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === "stocks"
                ? "bg-sky-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            Stocks / ETF
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("fd")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === "fd"
                ? "bg-amber-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            Fixed Deposits
          </button>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditingInvestment(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Investment</span>
        </Button>
      </div>

      {/* Holdings List */}
      {filtered.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center mx-auto">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              No investments found
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Track your mutual funds, SIPs, stock portfolios, and fixed deposits to monitor net worth growth.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingInvestment(null);
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
          >
            Add First Investment
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const gain = item.currentValuation - item.totalInvested;
            const returnPercent =
              item.totalInvested > 0 ? (gain / item.totalInvested) * 100 : 0;
            const isPositive = gain >= 0;

            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-3.5"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                        {item.type.replace(/_/g, " ")}
                      </span>
                    </div>
                    {item.fundHouse && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.fundHouse}
                        {item.folioNumber ? ` • Folio: ${item.folioNumber}` : ""}
                      </p>
                    )}
                  </div>

                  {/* Return Pill */}
                  <div
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1 shrink-0 ${
                      isPositive
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                        : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                    }`}
                  >
                    {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>
                      {isPositive ? "+" : ""}
                      {returnPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Valuation vs Invested Metrics */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                      Current Value
                    </span>
                    <strong className="text-base font-bold text-slate-900 dark:text-white">
                      {formatCurrency(item.currentValuation, item.currency)}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                      Invested Cost
                    </span>
                    <strong className="text-base font-semibold text-slate-700 dark:text-slate-300">
                      {formatCurrency(item.totalInvested, item.currency)}
                    </strong>
                  </div>
                </div>

                {/* SIP Schedule Pill if applicable */}
                {item.investmentMode === "sip" && item.sipAmount && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-[11px]">
                    <span className="flex items-center gap-1 font-medium">
                      <Repeat className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        SIP: {formatCurrency(item.sipAmount, item.currency)} / {item.sipFrequency || "mo"}
                      </span>
                    </span>
                    {item.sipDay && <span className="font-semibold">Debits {item.sipDay}th</span>}
                  </div>
                )}

                {/* Units & NAV */}
                {(item.units || item.nav) && (
                  <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                    {item.units && <span>Units: {item.units.toFixed(2)}</span>}
                    {item.nav && <span>NAV: {formatCurrency(item.nav, item.currency)}</span>}
                    {item.lastValuationDate && (
                      <span className="ml-auto text-[10px] text-slate-400">
                        Updated {formatShortDate(item.lastValuationDate)}
                      </span>
                    )}
                  </div>
                )}

                {item.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg">
                    {item.notes}
                  </p>
                )}

                {/* Card Footer Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    Gain: {isPositive ? "+" : ""}{formatCurrency(gain, item.currency)}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingInvestment({
                          id: item.id,
                          name: item.name,
                          fundHouse: item.fundHouse,
                          folioNumber: item.folioNumber,
                          type: item.type,
                          investmentMode: item.investmentMode,
                          sipAmount: item.sipAmount,
                          sipFrequency: item.sipFrequency,
                          sipDay: item.sipDay,
                          sipStartDate: item.sipStartDate ? String(item.sipStartDate) : null,
                          sipEndDate: item.sipEndDate ? String(item.sipEndDate) : null,
                          totalInvested: item.totalInvested,
                          currentValuation: item.currentValuation,
                          units: item.units,
                          nav: item.nav,
                          currency: item.currency,
                          notes: item.notes,
                          status: item.status,
                        });
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Investment"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete Investment"
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

      {/* Investment Modal */}
      <InvestmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={onRefresh}
        initialData={editingInvestment}
        defaultCurrency={userCurrency}
      />
    </div>
  );
}
