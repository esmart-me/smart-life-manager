"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  SUPPORTED_CURRENCIES,
  convertCurrency,
} from "@/lib/currency/exchange-service";
import {
  ArrowRightLeft,
  Copy,
  Check,
  RefreshCw,
  TrendingUp,
  Globe,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";

export function CurrencyConverter() {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [source, setSource] = useState<"live" | "cache" | "fallback" | "loading">("loading");
  const [provider, setProvider] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isDebouncing, setIsDebouncing] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>("100");
  const [fromCurrency, setFromCurrency] = useState<string>("AED");
  const [toCurrency, setToCurrency] = useState<string>("INR");
  const [copied, setCopied] = useState<boolean>(false);

  const fetchRates = async (force = false) => {
    if (force && isDebouncing) return;

    setLoading(true);
    if (force) {
      setIsDebouncing(true);
      setTimeout(() => setIsDebouncing(false), 2000);
    }

    try {
      const url = force ? "/api/utilities/exchange-rates?force=true" : "/api/utilities/exchange-rates";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.rates) {
        setRates(data.rates);
        setLastUpdated(data.lastUpdated);
        setSource(data.source);
        setProvider(data.provider || "Exchange Rates");
      } else {
        setSource("fallback");
      }
    } catch (e) {
      console.error("Failed to load exchange rates", e);
      setSource("fallback");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates(false);
  }, []);

  const numAmount = parseFloat(amount) || 0;

  const { result, rate } = useMemo(() => {
    if (Object.keys(rates).length === 0) return { result: 0, rate: 0 };
    return convertCurrency(numAmount, fromCurrency, toCurrency, rates);
  }, [numAmount, fromCurrency, toCurrency, rates]);

  const reverseRate = useMemo(() => {
    if (rate <= 0) return 0;
    return 1 / rate;
  }, [rate]);

  const handleSwap = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const handleCopy = async () => {
    try {
      const formatted = `${numAmount.toLocaleString()} ${fromCurrency} = ${result.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      })} ${toCurrency}`;
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy currency conversion", e);
    }
  };

  const formatUpdatedDate = (dateStr: string) => {
    if (!dateStr) return "";
    if (dateStr.includes("Static") || dateStr.includes("Benchmark")) return dateStr;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const fromMeta = SUPPORTED_CURRENCIES.find((c) => c.code === fromCurrency) || SUPPORTED_CURRENCIES[0];
  const toMeta = SUPPORTED_CURRENCIES.find((c) => c.code === toCurrency) || SUPPORTED_CURRENCIES[1];

  const quickPills = [50, 100, 500, 1000, 5000];

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Offline / Benchmark Warning Banner */}
      {source === "fallback" && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5 animate-fade-in shadow-xs">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">Offline Benchmark Rates Active</p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Unable to reach live exchange rate servers. Rates shown are reference benchmarks ({lastUpdated || "Offline Reference"}). Check internet connectivity and click Refresh.
            </p>
          </div>
        </div>
      )}

      {/* Outer Glass Card */}
      <div className="glass-card rounded-2xl p-6 sm:p-7 shadow-glass-lg border border-theme-border animate-card-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-theme-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-theme-accent-subtle text-theme-accent border border-theme-accent/25 flex items-center justify-center shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-theme-text-primary leading-none">
                Live Currency Converter
              </h2>
              <span className="text-xs text-theme-text-muted mt-1 block">
                GCC & International Interbank Rates
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchRates(true)}
              disabled={loading || isDebouncing}
              title={isDebouncing ? "Please wait a moment..." : "Force Refresh Live Rates"}
              className="p-2 rounded-lg text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-glass-subtle transition-colors disabled:opacity-50 flex items-center gap-1.5 text-xs border border-transparent hover:border-theme-border"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-theme-accent" : ""}`} />
              <span className="hidden sm:inline font-medium text-[11px]">
                {loading ? "Updating..." : "Refresh"}
              </span>
            </button>
            <button
              onClick={handleCopy}
              title="Copy Conversion"
              className="p-2 rounded-lg text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-glass-subtle transition-colors relative border border-transparent hover:border-theme-border"
            >
              {copied ? (
                <Check className="w-4 h-4 text-theme-accent" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied && (
                <span className="absolute -top-7 right-0 text-[10px] font-semibold btn-theme-accent text-white px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
                  Copied!
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-theme-text-secondary mb-2">
            Amount to Convert
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="glass-input w-full px-4 py-3 text-2xl font-bold font-mono text-theme-text-primary rounded-xl border border-theme-border focus:ring-2 focus:ring-theme-accent/40 focus:border-theme-accent outline-none transition-all shadow-inner"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-theme-accent">
              {fromMeta.symbol}
            </div>
          </div>

          {/* Quick Amount Pills */}
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1">
            <span className="text-[11px] text-theme-text-muted mr-1 shrink-0">Quick:</span>
            {quickPills.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(val.toString())}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  amount === val.toString()
                    ? "btn-theme-accent text-white font-bold shadow-xs"
                    : "glass-subtle text-theme-text-secondary hover:bg-theme-accent-subtle border border-theme-border"
                }`}
              >
                {val.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Currency Selectors & Swap Button */}
        <div className="grid grid-cols-1 sm:grid-cols-9 gap-3 items-center mb-6">
          {/* From Currency */}
          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-theme-text-secondary mb-1.5">
              From Currency
            </label>
            <div className="relative">
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="glass-input w-full appearance-none pl-3.5 pr-8 py-2.5 rounded-xl border border-theme-border text-sm font-medium text-theme-text-primary outline-none focus:ring-2 focus:ring-theme-accent/40 focus:border-theme-accent cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <option
                    key={curr.code}
                    value={curr.code}
                    className="bg-theme-surface text-theme-text-primary"
                  >
                    {curr.flag} {curr.code} — {curr.name} ({curr.symbol})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-theme-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Swap Button */}
          <div className="sm:col-span-1 flex justify-center pt-5 sm:pt-4">
            <button
              type="button"
              onClick={handleSwap}
              title="Swap Currencies"
              className="p-2.5 rounded-xl bg-theme-accent-subtle text-theme-accent hover:border-theme-accent/50 active:scale-90 transition-all border border-theme-accent/30 shadow-xs"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* To Currency */}
          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-theme-text-secondary mb-1.5">
              To Currency
            </label>
            <div className="relative">
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="glass-input w-full appearance-none pl-3.5 pr-8 py-2.5 rounded-xl border border-theme-border text-sm font-medium text-theme-text-primary outline-none focus:ring-2 focus:ring-theme-accent/40 focus:border-theme-accent cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <option
                    key={curr.code}
                    value={curr.code}
                    className="bg-theme-surface text-theme-text-primary"
                  >
                    {curr.flag} {curr.code} — {curr.name} ({curr.symbol})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-theme-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Result Glass Display Banner */}
        <div className="glass-panel rounded-2xl p-5 border border-theme-accent/30 bg-theme-accent-subtle shadow-theme-glow">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-medium text-theme-text-secondary">
                Converted Equivalent:
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold font-mono text-theme-accent tracking-tight">
                  {result.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </span>
                <span className="text-base font-bold text-theme-text-primary">
                  {toCurrency}
                </span>
              </div>
              <p className="text-xs text-theme-text-muted mt-0.5">
                {numAmount.toLocaleString()} {fromCurrency} ({fromMeta.name})
              </p>
            </div>

            <div className="w-10 h-10 rounded-xl bg-theme-accent-subtle text-theme-accent border border-theme-accent/20 flex items-center justify-center shrink-0 shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Rate Breakdown */}
          <div className="mt-4 pt-3 border-t border-theme-border flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-theme-text-secondary">
            <div>
              1 {fromCurrency} ={" "}
              <span className="font-bold text-theme-accent">
                {rate.toFixed(4)}
              </span>{" "}
              {toCurrency}
            </div>
            <div>
              1 {toCurrency} ={" "}
              <span className="font-bold text-theme-accent">
                {reverseRate.toFixed(4)}
              </span>{" "}
              {fromCurrency}
            </div>
          </div>
        </div>


        {/* Footer Meta */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-500 pt-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                source === "live"
                  ? "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                  : source === "cache"
                  ? "bg-blue-500 shadow-xs shadow-blue-500/50"
                  : "bg-amber-500 shadow-xs shadow-amber-500/50"
              }`}
            />
            <span className="font-medium text-slate-600 dark:text-slate-300">
              Status:{" "}
              {source === "live"
                ? "Live Market Rates"
                : source === "cache"
                ? "Cached Rates (Recent)"
                : "Offline Benchmark — Not Live"}
            </span>
            {provider && (
              <span className="hidden md:inline text-slate-400">
                &bull; {provider}
              </span>
            )}
          </div>

          {lastUpdated && (
            <span className="truncate max-w-[240px] text-right font-mono" title={lastUpdated}>
              Updated: {formatUpdatedDate(lastUpdated)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
