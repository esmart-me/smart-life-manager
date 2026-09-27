import { PaymentStatus, BUDGET_KEYS, BUDGET_ALERT_THRESHOLDS } from "./constants";

/**
 * Normalizes a date to YYYY-MM-DD string for calendar-based comparisons
 * regardless of time components or time zones.
 */
export function toCalendarDateString(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates payment status accurately:
 * - Paid: if isPaid is true
 * - Overdue: if dueDate is before today
 * - Due Today: if dueDate falls on today
 * - Upcoming: if dueDate is after today
 */
export function calculatePaymentStatus(
  dueDate: Date | string,
  isPaid: boolean,
  targetDate: Date = new Date()
): PaymentStatus {
  if (isPaid) {
    return "Paid";
  }

  const dueStr = toCalendarDateString(dueDate);
  const targetStr = toCalendarDateString(targetDate);

  if (dueStr < targetStr) {
    return "Overdue";
  } else if (dueStr === targetStr) {
    return "Due Today";
  } else {
    return "Upcoming";
  }
}

/**
 * Advanced date recurrence calculation:
 * Preserves day-of-month where possible (e.g., Jan 31 -> Feb 28/29, or March 15 -> April 15)
 */
export function calculateNextOccurrence(dueDate: Date | string, frequency?: string | null): Date {
  const current = new Date(dueDate);
  const next = new Date(current.getTime());

  const freq = (frequency || "").toLowerCase().trim();

  switch (freq) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;

    case "monthly": {
      const origDay = current.getDate();
      next.setMonth(next.getMonth() + 1);
      // If month rolled over too far (e.g. 31st in a 30-day month), clamp to last day of that month
      if (next.getDate() !== origDay) {
        next.setDate(0);
      }
      break;
    }

    case "quarterly": {
      const origDay = current.getDate();
      next.setMonth(next.getMonth() + 3);
      if (next.getDate() !== origDay) {
        next.setDate(0);
      }
      break;
    }

    case "yearly": {
      const origDay = current.getDate();
      next.setFullYear(next.getFullYear() + 1);
      if (next.getDate() !== origDay) {
        next.setDate(0);
      }
      break;
    }

    default:
      // Default to +1 month if recurring without explicit frequency
      next.setMonth(next.getMonth() + 1);
      break;
  }

  return next;
}

export interface BudgetStatusInfo {
  totalIncome: number;
  totalExpenses: number;
  monthlyBudget: number;
  savingsTarget: number;
  remainingBudget: number;
  savings: number;
  budgetUsagePercent: number;
  isOverBudget: boolean;
  isNearBudget: boolean; // >= 80% and < 100%
  categoryBreakdown: Array<{
    category: string;
    limit: number;
    spent: number;
    remaining: number;
    usagePercent: number;
    status: "safe" | "warning" | "exceeded";
  }>;
  alerts: Array<{
    category: string;
    type: "warning" | "exceeded";
    message: string;
  }>;
}

/**
 * Computes complete budget analytics for a given month
 */
export function calculateBudgetAnalytics(
  budgets: Array<{ category: string; limitAmount: number; currency: string }>,
  expenses: Array<{ category: string; amount: number; spentAt: Date | string }>,
  referenceDate: Date = new Date()
): BudgetStatusInfo {
  const targetYear = referenceDate.getFullYear();
  const targetMonth = referenceDate.getMonth();

  // 1. Filter expenses for the target month
  const monthlyExpenses = expenses.filter((e) => {
    const d = new Date(e.spentAt);
    return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
  });

  const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 2. Extract special budget rows
  const incomeRow = budgets.find((b) => b.category.toLowerCase() === BUDGET_KEYS.INCOME);
  const totalBudgetRow = budgets.find((b) => b.category.toLowerCase() === BUDGET_KEYS.TOTAL);
  const savingsTargetRow = budgets.find(
    (b) => b.category.toLowerCase() === BUDGET_KEYS.SAVINGS_TARGET
  );

  const totalIncome = incomeRow ? incomeRow.limitAmount : 0;
  const monthlyBudget = totalBudgetRow ? totalBudgetRow.limitAmount : 0;
  const savingsTarget = savingsTargetRow ? savingsTargetRow.limitAmount : 0;

  const remainingBudget = monthlyBudget > 0 ? monthlyBudget - totalExpenses : 0;
  const savings = totalIncome - totalExpenses;

  const budgetUsagePercent =
    monthlyBudget > 0 ? Math.round((totalExpenses / monthlyBudget) * 100) : 0;
  const isOverBudget = monthlyBudget > 0 && totalExpenses > monthlyBudget;
  const isNearBudget =
    monthlyBudget > 0 &&
    budgetUsagePercent >= BUDGET_ALERT_THRESHOLDS.WARNING &&
    totalExpenses <= monthlyBudget;

  const alerts: BudgetStatusInfo["alerts"] = [];

  // Overall budget alert
  if (monthlyBudget > 0) {
    if (isOverBudget) {
      alerts.push({
        category: "Overall Monthly Budget",
        type: "exceeded",
        message: `You have exceeded your monthly budget by ${(totalExpenses - monthlyBudget).toFixed(2)} (${budgetUsagePercent}% spent).`,
      });
    } else if (isNearBudget) {
      alerts.push({
        category: "Overall Monthly Budget",
        type: "warning",
        message: `You have reached ${budgetUsagePercent}% of your monthly budget (${(monthlyBudget - totalExpenses).toFixed(2)} remaining).`,
      });
    }
  }

  // 3. Category Budgets breakdown
  const categoryBudgets = budgets.filter(
    (b) =>
      b.category.toLowerCase() !== BUDGET_KEYS.INCOME &&
      b.category.toLowerCase() !== BUDGET_KEYS.TOTAL &&
      b.category.toLowerCase() !== BUDGET_KEYS.SAVINGS_TARGET
  );

  const categoryBreakdown = categoryBudgets.map((cb) => {
    const spentInCat = monthlyExpenses
      .filter((e) => e.category.toLowerCase() === cb.category.toLowerCase())
      .reduce((sum, e) => sum + e.amount, 0);

    const limit = cb.limitAmount;
    const remaining = limit - spentInCat;
    const usagePercent = limit > 0 ? Math.round((spentInCat / limit) * 100) : 0;

    let status: "safe" | "warning" | "exceeded" = "safe";
    if (spentInCat > limit && limit > 0) {
      status = "exceeded";
      alerts.push({
        category: cb.category,
        type: "exceeded",
        message: `Category "${cb.category}" exceeded budget: ${spentInCat.toFixed(2)} spent of ${limit.toFixed(2)} limit.`,
      });
    } else if (usagePercent >= BUDGET_ALERT_THRESHOLDS.WARNING && limit > 0) {
      status = "warning";
      alerts.push({
        category: cb.category,
        type: "warning",
        message: `Category "${cb.category}" has reached ${usagePercent}% of limit (${remaining.toFixed(2)} remaining).`,
      });
    }

    return {
      category: cb.category,
      limit,
      spent: spentInCat,
      remaining,
      usagePercent,
      status,
    };
  });

  return {
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
  };
}
