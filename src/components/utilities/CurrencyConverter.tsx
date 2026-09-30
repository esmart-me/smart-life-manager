"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  SUPPORTED_CURRENCIES,
  CurrencyMetadata,
  convertCurrency,
} from "@/lib/currency/exchange-service";
import {
  ArrowRightLeft,
  Copy,
  Check,
  RefreshCw,
  TrendingUp,
  Globe,
  Coins,
  ChevronDown,
} from "lucide-react";

export function CurrencyConverter() {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [source, setSource] = useState<string>("loading");
  const [loading, setLoading] = useState<boolean>(true);
  const [amount, setAmount] = useState<string>("100");
  const [fromCurrency, setFromCurrency] = useState<string>("AED");
  const [toCurrency, setToCurrency] = useState<string>("INR");
  const [copied, setCopied] = useState<boolean>(false);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/utilities/exchange-rates");
      const data = await res.json();
      if (data.success && data.rates) {
        setRates(data.rates);
        setLastUpdated(data.lastUpdated);
        setSource(data.source);
      }
    } catch (e) {
      console.error("Failed to load exchange rates", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
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

  const fromMeta = SUPPORTED_CURRENCIES.find((c) => c.code === fromCurrency) || SUPPORTED_CURRENCIES[0];
  const toMeta = SUPPORTED_CURRENCIES.find((c) => c.code === toCurrency) || SUPPORTED_CURRENCIES[1];

  const quickPills = [50, 100, 500, 1000, 5000];

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Outer Glass Card */}
      <div className="glass-card rounded-2xl p-6 sm:p-7 shadow-xl border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-none">
                Live Currency Converter
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                GCC & International Interbank Rates
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchRates}
              disabled={loading}
              title="Refresh Rates"
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-brand-500" : ""}`} />
            </button>
            <button
              onClick={handleCopy}
              title="Copy Conversion"
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied && (
                <span className="absolute -top-7 right-0 text-[10px] font-semibold bg-emerald-600 text-white px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
                  Copied!
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
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
              className="glass-input w-full px-4 py-3 text-2xl font-bold font-mono text-slate-900 dark:text-white rounded-xl border border-slate-200/80 dark:border-slate-800/80 focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-inner"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
              {fromMeta.symbol}
            </div>
          </div>

          {/* Quick Amount Pills */}
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1">
            <span className="text-[11px] text-slate-400 mr-1 shrink-0">Quick:</span>
            {quickPills.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(val.toString())}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  amount === val.toString()
                    ? "bg-brand-600 text-white font-semibold shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
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
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              From Currency
            </label>
            <div className="relative">
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="glass-input w-full appearance-none pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <option
                    key={curr.code}
                    value={curr.code}
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {curr.flag} {curr.code} — {curr.name} ({curr.symbol})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Swap Button */}
          <div className="sm:col-span-1 flex justify-center pt-5 sm:pt-4">
            <button
              type="button"
              onClick={handleSwap}
              title="Swap Currencies"
              className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/60 active:scale-90 transition-all border border-brand-200/50 dark:border-brand-800/50 shadow-xs"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* To Currency */}
          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              To Currency
            </label>
            <div className="relative">
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="glass-input w-full appearance-none pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <option
                    key={curr.code}
                    value={curr.code}
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {curr.flag} {curr.code} — {curr.name} ({curr.symbol})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Result Glass Display Banner */}
        <div className="glass-panel rounded-2xl p-5 border border-brand-200/50 dark:border-brand-900/50 bg-brand-50/30 dark:bg-brand-950/30">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Converted Equivalent:
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold font-mono text-brand-600 dark:text-brand-400 tracking-tight">
                  {result.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {toCurrency}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {numAmount.toLocaleString()} {fromCurrency} ({fromMeta.name})
              </p>
            </div>

            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Rate Breakdown */}
          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-600 dark:text-slate-300">
            <div>
              1 {fromCurrency} ={" "}
              <span className="font-bold text-slate-900 dark:text-white">
                {rate.toFixed(4)}
              </span>{" "}
              {toCurrency}
            </div>
            <div>
              1 {toCurrency} ={" "}
              <span className="font-bold text-slate-900 dark:text-white">
                {reverseRate.toFixed(4)}
              </span>{" "}
              {fromCurrency}
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Status: {source === "live" ? "Real-time Interbank" : source === "cache" ? "Hourly Cache" : "Benchmark Fallback"}</span>
          </div>
          {lastUpdated && (
            <span className="truncate max-w-[200px]" title={lastUpdated}>
              Updated: {new Date(lastUpdated).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
