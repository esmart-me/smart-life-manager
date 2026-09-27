"use client";

import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  AlertTriangle,
  AlertOctagon,
  Settings,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BudgetStatusInfo } from "@/lib/finance/calculations";
import { Button } from "@/components/ui/Button";

interface BudgetOverviewTabProps {
  analytics: BudgetStatusInfo;
  userCurrency: string;
  onOpenConfig: () => void;
  onAddExpense: () => void;
}

export function BudgetOverviewTab({
  analytics,
  userCurrency,
  onOpenConfig,
  onAddExpense,
}: BudgetOverviewTabProps) {
  const {
    totalIncome,
    totalExpenses,
    monthlyBudget,
    savingsTarget,
    remainingBudget,
    savings,
    budgetUsagePercent,
    isOverBudget,
    isNearBudget,
    categoryBreakdown,
    alerts,
  } = analytics;

  return (
    <div className="space-y-6">
      {/* 1. Alerts Section (Approaching or Exceeding Budgets) */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                alert.type === "exceeded"
                  ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300"
                  : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300"
              }`}
            >
              {alert.type === "exceeded" ? (
                <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs">
                <span className="font-semibold">{alert.category}: </span>
                <span>{alert.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Primary 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Income */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Income
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formatCurrency(totalIncome, userCurrency)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Expected monthly earnings
          </p>
        </div>

        {/* Total Expenses */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Expenses
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formatCurrency(totalExpenses, userCurrency)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Logged spent this month
          </p>
        </div>

        {/* Remaining Budget */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Remaining Budget
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isOverBudget
                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600"
                  : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600"
              }`}
            >
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-2xl font-bold tracking-tight ${
              isOverBudget
                ? "text-rose-600 dark:text-rose-400"
                : "text-slate-900 dark:text-white"
            }`}
          >
            {monthlyBudget > 0
              ? formatCurrency(remainingBudget, userCurrency)
              : "Not Set"}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {monthlyBudget > 0
              ? `${budgetUsagePercent}% of ${formatCurrency(monthlyBudget, userCurrency)} budget`
              : "Configure monthly budget ceiling"}
          </p>
        </div>

        {/* Savings */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Net Savings
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-2xl font-bold tracking-tight ${
              savings < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {formatCurrency(savings, userCurrency)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {savingsTarget > 0
              ? `Target: ${formatCurrency(savingsTarget, userCurrency)}`
              : "Income minus expenses"}
          </p>
        </div>
      </div>

      {/* 3. Monthly Budget Progress Card */}
      {monthlyBudget > 0 ? (
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Monthly Spending Progress
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatCurrency(totalExpenses, userCurrency)} of {formatCurrency(monthlyBudget, userCurrency)} used
              </p>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                isOverBudget
                  ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400"
                  : isNearBudget
                  ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                  : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
              }`}
            >
              {budgetUsagePercent}%
            </span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverBudget
                  ? "bg-rose-500"
                  : isNearBudget
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, budgetUsagePercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>0%</span>
            <span className="text-amber-600 font-medium">80% Warning Threshold</span>
            <span>100% Limit</span>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Set Up Your Monthly Budget Ceiling
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Establish a spending limit to receive visual warnings when approaching or exceeding your budget.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onOpenConfig}
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configure Budget</span>
          </Button>
        </div>
      )}

      {/* 4. Category Budgets Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Category Budgets & Limits
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Spending limits per category with automatic alert thresholds.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenConfig}
            className="text-xs inline-flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Adjust Budgets</span>
          </Button>
        </div>

        {categoryBreakdown.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No specific category budgets defined yet.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenConfig}
              className="text-xs"
            >
              Set Category Spending Ceilings
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryBreakdown.map((cat) => (
              <div
                key={cat.category}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {cat.category}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      cat.status === "exceeded"
                        ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400"
                        : cat.status === "warning"
                        ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                        : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    {cat.status === "exceeded"
                      ? "Exceeded"
                      : cat.status === "warning"
                      ? "Near Limit"
                      : "On Track"}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-900 dark:text-white font-bold">
                    {formatCurrency(cat.spent, userCurrency)}
                  </span>
                  <span className="text-slate-400">
                    of {formatCurrency(cat.limit, userCurrency)}
                  </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      cat.status === "exceeded"
                        ? "bg-rose-500"
                        : cat.status === "warning"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, cat.usagePercent)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{cat.usagePercent}% spent</span>
                  <span>
                    {cat.remaining >= 0
                      ? `${formatCurrency(cat.remaining, userCurrency)} left`
                      : `${formatCurrency(Math.abs(cat.remaining), userCurrency)} over`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
