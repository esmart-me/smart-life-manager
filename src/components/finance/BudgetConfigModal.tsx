"use client";

import { useState, useEffect } from "react";
import { X, DollarSign, PieChart, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { EXPENSE_CATEGORIES, BUDGET_KEYS } from "@/lib/finance/constants";

interface BudgetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialBudgets: Array<{ category: string; limitAmount: number; currency: string }>;
  userCurrency?: string;
}

export function BudgetConfigModal({
  isOpen,
  onClose,
  onSuccess,
  initialBudgets,
  userCurrency = "USD",
}: BudgetConfigModalProps) {
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [savingsTarget, setSavingsTarget] = useState("");
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialBudgets && initialBudgets.length > 0) {
      const incomeRow = initialBudgets.find((b) => b.category.toLowerCase() === BUDGET_KEYS.INCOME);
      const totalRow = initialBudgets.find((b) => b.category.toLowerCase() === BUDGET_KEYS.TOTAL);
      const savingsRow = initialBudgets.find(
        (b) => b.category.toLowerCase() === BUDGET_KEYS.SAVINGS_TARGET
      );

      setMonthlyIncome(incomeRow && incomeRow.limitAmount > 0 ? String(incomeRow.limitAmount) : "");
      setMonthlyBudget(totalRow && totalRow.limitAmount > 0 ? String(totalRow.limitAmount) : "");
      setSavingsTarget(savingsRow && savingsRow.limitAmount > 0 ? String(savingsRow.limitAmount) : "");

      const catMap: Record<string, string> = {};
      EXPENSE_CATEGORIES.forEach((cat) => {
        const found = initialBudgets.find((b) => b.category.toLowerCase() === cat.toLowerCase());
        catMap[cat] = found && found.limitAmount > 0 ? String(found.limitAmount) : "";
      });
      setCategoryBudgets(catMap);
    } else {
      setMonthlyIncome("");
      setMonthlyBudget("");
      setSavingsTarget("");
      const catMap: Record<string, string> = {};
      EXPENSE_CATEGORIES.forEach((cat) => {
        catMap[cat] = "";
      });
      setCategoryBudgets(catMap);
    }
    setErrorMessage(null);
  }, [initialBudgets, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    setIsSubmitting(true);

    try {
      const catBudgetsArray = Object.entries(categoryBudgets)
        .filter(([_, val]) => val !== "" && Number(val) > 0)
        .map(([category, val]) => ({
          category,
          limitAmount: Number(val),
        }));

      const payload = {
        monthlyIncome: monthlyIncome !== "" ? Number(monthlyIncome) : 0,
        monthlyBudget: monthlyBudget !== "" ? Number(monthlyBudget) : 0,
        savingsTarget: savingsTarget !== "" ? Number(savingsTarget) : 0,
        categoryBudgets: catBudgetsArray,
        currency: userCurrency,
      };

      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || "Failed to save budget settings.");
        setIsSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("[BudgetConfig Submit Error]:", err);
      setErrorMessage("Network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Configure Budget & Targets
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Define your income, spending ceiling, and category limits in {userCurrency}.
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {errorMessage && (
            <AlertBanner type="error" title="Error" message={errorMessage} />
          )}

          {/* Primary Budget Controls */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Primary Financial Targets ({userCurrency})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Income
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400">
                    {userCurrency}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    className="w-full pl-11 pr-2.5 py-2 min-h-[42px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Budget
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs font-semibold text-slate-400">
                    {userCurrency}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    className="w-full pl-11 pr-2.5 py-2 min-h-[42px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Savings Target
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs font-semibold text-slate-400">
                    {userCurrency}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={savingsTarget}
                    onChange={(e) => setSavingsTarget(e.target.value)}
                    className="w-full pl-11 pr-2.5 py-2 min-h-[42px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Category Budgets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Category Spending Ceilings (Optional)
              </h3>
              <span className="text-[11px] text-slate-400">Warns at 80% & 100%</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {EXPENSE_CATEGORIES.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                >
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {cat}
                  </span>
                  <div className="relative w-32">
                    <span className="absolute left-2 top-1.5 text-[11px] text-slate-400 font-semibold">
                      {userCurrency}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="No limit"
                      value={categoryBudgets[cat] || ""}
                      onChange={(e) =>
                        setCategoryBudgets({
                          ...categoryBudgets,
                          [cat]: e.target.value,
                        })
                      }
                      className="w-full pl-10 pr-2 py-1.5 min-h-[38px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500 text-right"
                    />
                  </div>
                </div>
              ))}
            </div>
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
              className="bg-brand-600 hover:bg-brand-700 text-white"
            >
              {isSubmitting ? "Saving..." : "Save Budget Limits"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
