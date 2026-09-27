import { prisma } from "@/lib/db/prisma";
import { calculateDocumentStatus } from "@/lib/documents/status";
import { calculatePaymentStatus } from "@/lib/finance/calculations";
import { calculateVehicleStatus } from "@/lib/vehicles/status";
import { calculateSubscriptionMetrics } from "@/lib/subscriptions/calculations";
import { EXPENSE_CATEGORIES } from "@/lib/finance/constants";

export type ReportType =
  | "monthly_expense"
  | "category_spending"
  | "payment_history"
  | "upcoming_payments"
  | "document_expiry"
  | "vehicle_renewal"
  | "subscription_summary";

export interface ReportMetadata {
  type: ReportType;
  title: string;
  description: string;
  generatedAt: string;
  periodLabel?: string;
  currency: string;
  userName: string;
}

export interface BaseReportResult {
  metadata: ReportMetadata;
  summaryCards: Array<{
    label: string;
    value: string;
    subtext?: string;
    variant?: "default" | "success" | "warning" | "danger" | "info";
  }>;
  sections: Array<{
    title: string;
    description?: string;
    headers: string[];
    rows: Array<Array<string | number | null | undefined>>;
  }>;
  rawData?: any;
}

/**
 * Generates the requested report for a user with 100% real database records.
 */
export async function generateReport(
  userId: string,
  type: ReportType,
  options?: { month?: string; year?: number }
): Promise<BaseReportResult> {
  const [user, profile, userSettings] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.userSetting.findUnique({ where: { userId } }),
  ]);

  const userName = profile?.displayName || profile?.firstName || user?.email?.split("@")[0] || "User";
  const currency = profile?.currency || "USD";
  const now = new Date();

  // Selected month parsing (defaults to current month YYYY-MM)
  const targetMonthStr = options?.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [yearStr, monthStr] = targetMonthStr.split("-");
  const targetYear = parseInt(yearStr, 10) || now.getFullYear();
  const targetMonthIdx = (parseInt(monthStr, 10) || now.getMonth() + 1) - 1;

  const startOfMonth = new Date(targetYear, targetMonthIdx, 1);
  const endOfMonth = new Date(targetYear, targetMonthIdx + 1, 0, 23, 59, 59, 999);
  const monthName = startOfMonth.toLocaleString("default", { month: "long", year: "numeric" });

  switch (type) {
    // =========================================================================
    // 1. MONTHLY EXPENSE REPORT
    // =========================================================================
    case "monthly_expense": {
      const expenses = await prisma.expense.findMany({
        where: {
          userId,
          spentAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        orderBy: { spentAt: "desc" },
      });

      const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
      const count = expenses.length;
      const avgSpent = count > 0 ? totalSpent / count : 0;
      const maxExpense = expenses.length > 0 ? Math.max(...expenses.map((e) => e.amount)) : 0;

      // Category breakdown
      const categoryMap = new Map<string, { total: number; count: number }>();
      for (const e of expenses) {
        const cat = e.category || "Other";
        const cur = categoryMap.get(cat) || { total: 0, count: 0 };
        categoryMap.set(cat, { total: cur.total + e.amount, count: cur.count + 1 });
      }

      const topCategoryEntry = Array.from(categoryMap.entries()).sort((a, b) => b[1].total - a[1].total)[0];
      const topCategoryName = topCategoryEntry ? topCategoryEntry[0] : "None";
      const topCategoryAmount = topCategoryEntry ? topCategoryEntry[1].total : 0;

      const categoryRows = Array.from(categoryMap.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .map(([cat, val]) => [
          cat,
          `${currency} ${val.total.toFixed(2)}`,
          val.count,
          totalSpent > 0 ? `${((val.total / totalSpent) * 100).toFixed(1)}%` : "0.0%",
        ]);

      const transactionRows = expenses.map((e) => [
        new Date(e.spentAt).toLocaleDateString(),
        e.title,
        e.category,
        e.paymentMethod || "Other",
        `${currency} ${e.amount.toFixed(2)}`,
        e.notes || "—",
      ]);

      return {
        metadata: {
          type: "monthly_expense",
          title: "Monthly Expense Report",
          description: `Detailed audit of all recorded expenditures during ${monthName}.`,
          generatedAt: now.toISOString(),
          periodLabel: monthName,
          currency,
          userName,
        },
        summaryCards: [
          {
            label: "Total Expenses",
            value: `${currency} ${totalSpent.toFixed(2)}`,
            subtext: `${count} transactions recorded`,
            variant: "default",
          },
          {
            label: "Average Transaction",
            value: `${currency} ${avgSpent.toFixed(2)}`,
            subtext: `Per transaction`,
            variant: "info",
          },
          {
            label: "Top Spending Category",
            value: topCategoryName,
            subtext: `${currency} ${topCategoryAmount.toFixed(2)} (${totalSpent > 0 ? ((topCategoryAmount / totalSpent) * 100).toFixed(0) : 0}%)`,
            variant: "warning",
          },
          {
            label: "Largest Single Expense",
            value: `${currency} ${maxExpense.toFixed(2)}`,
            subtext: "Highest expense item",
            variant: "default",
          },
        ],
        sections: [
          {
            title: "Category Breakdown",
            description: "Expense distribution grouped by expenditure category.",
            headers: ["Category", "Total Spent", "Transactions", "% of Total"],
            rows: categoryRows,
          },
          {
            title: "Itemized Transactions",
            description: `All ${count} expense items recorded in ${monthName}.`,
            headers: ["Date", "Description", "Category", "Payment Method", "Amount", "Notes"],
            rows: transactionRows,
          },
        ],
        rawData: { totalSpent, count, expenses, categoryBreakdown: Array.from(categoryMap.entries()) },
      };
    }

    // =========================================================================
    // 2. CATEGORY SPENDING REPORT
    // =========================================================================
    case "category_spending": {
      const [expenses, budgets] = await Promise.all([
        prisma.expense.findMany({
          where: {
            userId,
            spentAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        }),
        prisma.budget.findMany({
          where: { userId },
        }),
      ]);

      const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

      // Map budgets by category
      const budgetMap = new Map<string, number>();
      for (const b of budgets) {
        if (!b.category.startsWith("__")) {
          budgetMap.set(b.category, b.limitAmount);
        }
      }

      // Aggregate spend by category
      const spendMap = new Map<string, number>();
      for (const e of expenses) {
        const cur = spendMap.get(e.category) || 0;
        spendMap.set(e.category, cur + e.amount);
      }

      // Collect all active categories
      const allCategories = Array.from(new Set([...EXPENSE_CATEGORIES, ...Array.from(spendMap.keys()), ...Array.from(budgetMap.keys())]));

      const categoryDetails = allCategories
        .map((cat) => {
          const spent = spendMap.get(cat) || 0;
          const limit = budgetMap.get(cat) || 0;
          const remaining = limit > 0 ? limit - spent : 0;
          const pct = limit > 0 ? (spent / limit) * 100 : 0;

          let status = "No Budget";
          if (limit > 0) {
            if (spent > limit) status = "Exceeded";
            else if (pct >= 80) status = "Warning";
            else status = "On Track";
          }

          return {
            category: cat,
            spent,
            limit,
            remaining,
            pct,
            status,
          };
        })
        .filter((c) => c.spent > 0 || c.limit > 0)
        .sort((a, b) => b.spent - a.spent);

      const exceededCount = categoryDetails.filter((c) => c.status === "Exceeded").length;
      const warningCount = categoryDetails.filter((c) => c.status === "Warning").length;

      const rows = categoryDetails.map((c) => [
        c.category,
        `${currency} ${c.spent.toFixed(2)}`,
        c.limit > 0 ? `${currency} ${c.limit.toFixed(2)}` : "Not Set",
        c.limit > 0 ? `${currency} ${c.remaining.toFixed(2)}` : "—",
        c.limit > 0 ? `${c.pct.toFixed(0)}%` : "—",
        c.status,
      ]);

      return {
        metadata: {
          type: "category_spending",
          title: "Category Spending & Budget Report",
          description: `Analysis of expenditures vs budget limits by category for ${monthName}.`,
          generatedAt: now.toISOString(),
          periodLabel: monthName,
          currency,
          userName,
        },
        summaryCards: [
          {
            label: "Total Spent",
            value: `${currency} ${totalSpent.toFixed(2)}`,
            subtext: `Across ${categoryDetails.length} categories`,
            variant: "default",
          },
          {
            label: "Over-Budget Categories",
            value: String(exceededCount),
            subtext: exceededCount > 0 ? "Requires spending reduction" : "Zero categories exceeded",
            variant: exceededCount > 0 ? "danger" : "success",
          },
          {
            label: "Warning Categories (80%+)",
            value: String(warningCount),
            subtext: "Approaching budget ceiling",
            variant: warningCount > 0 ? "warning" : "success",
          },
          {
            label: "Active Categories",
            value: String(categoryDetails.length),
            subtext: "With budget or spending",
            variant: "info",
          },
        ],
        sections: [
          {
            title: "Category Spending vs Budget",
            description: "Direct comparison between budgeted amounts and actual spending.",
            headers: ["Category", "Actual Spent", "Budget Limit", "Remaining", "Utilization", "Status"],
            rows,
          },
        ],
        rawData: { totalSpent, categoryDetails, exceededCount, warningCount },
      };
    }

    // =========================================================================
    // 3. PAYMENT HISTORY REPORT
    // =========================================================================
    case "payment_history": {
      const paidPayments = await prisma.payment.findMany({
        where: {
          userId,
          isPaid: true,
        },
        orderBy: { paidAt: "desc" },
      });

      const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);
      const count = paidPayments.length;

      // Group by payee
      const payeeMap = new Map<string, number>();
      for (const p of paidPayments) {
        const payee = p.payee || p.title;
        payeeMap.set(payee, (payeeMap.get(payee) || 0) + p.amount);
      }

      const rows = paidPayments.map((p) => [
        p.paidAt ? new Date(p.paidAt).toLocaleDateString() : new Date(p.updatedAt).toLocaleDateString(),
        p.title,
        p.payee || "—",
        p.category,
        `${currency} ${p.amount.toFixed(2)}`,
        p.isRecurring ? `Recurring (${p.frequency})` : "One-time",
        "Paid",
      ]);

      return {
        metadata: {
          type: "payment_history",
          title: "Payment History Report",
          description: "Comprehensive historical log of all cleared bills and completed payments.",
          generatedAt: now.toISOString(),
          currency,
          userName,
        },
        summaryCards: [
          {
            label: "Total Paid Out",
            value: `${currency} ${totalPaid.toFixed(2)}`,
            subtext: `Across ${count} cleared bills`,
            variant: "success",
          },
          {
            label: "Cleared Payments",
            value: String(count),
            subtext: "100% verified paid",
            variant: "info",
          },
          {
            label: "Unique Payees",
            value: String(payeeMap.size),
            subtext: "Service providers & creditors",
            variant: "default",
          },
        ],
        sections: [
          {
            title: "Cleared Payment Ledger",
            description: "Detailed chronological record of all settled payments.",
            headers: ["Date Paid", "Bill Title", "Payee", "Category", "Amount", "Type", "Status"],
            rows,
          },
        ],
        rawData: { totalPaid, count, paidPayments },
      };
    }

    // =========================================================================
    // 4. UPCOMING PAYMENT REPORT
    // =========================================================================
    case "upcoming_payments": {
      const unpaidPayments = await prisma.payment.findMany({
        where: {
          userId,
          isPaid: false,
        },
        orderBy: { dueDate: "asc" },
      });

      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      let overdueAmount = 0;
      let overdueCount = 0;
      let next7DaysAmount = 0;
      let next30DaysAmount = 0;
      let totalUpcomingAmount = 0;

      const rows = unpaidPayments.map((p) => {
        const dueDate = new Date(p.dueDate);
        const status = calculatePaymentStatus(dueDate, false);
        totalUpcomingAmount += p.amount;

        if (status === "Overdue") {
          overdueAmount += p.amount;
          overdueCount++;
        }
        if (dueDate <= in7Days && dueDate > todayEnd) {
          next7DaysAmount += p.amount;
        }
        if (dueDate <= in30Days) {
          next30DaysAmount += p.amount;
        }

        return [
          dueDate.toLocaleDateString(),
          p.title,
          p.payee || "—",
          p.category,
          `${currency} ${p.amount.toFixed(2)}`,
          p.isRecurring ? `Recurring (${p.frequency})` : "One-time",
          status,
        ];
      });

      return {
        metadata: {
          type: "upcoming_payments",
          title: "Upcoming Payment Obligations Report",
          description: "Schedule of upcoming bills, payment liabilities, and overdue obligations.",
          generatedAt: now.toISOString(),
          currency,
          userName,
        },
        summaryCards: [
          {
            label: "Total Upcoming Obligations",
            value: `${currency} ${totalUpcomingAmount.toFixed(2)}`,
            subtext: `${unpaidPayments.length} upcoming bills`,
            variant: "default",
          },
          {
            label: "Overdue Bills",
            value: `${currency} ${overdueAmount.toFixed(2)}`,
            subtext: `${overdueCount} bills need immediate attention`,
            variant: overdueCount > 0 ? "danger" : "success",
          },
          {
            label: "Due Next 7 Days",
            value: `${currency} ${next7DaysAmount.toFixed(2)}`,
            subtext: "Immediate cash flow need",
            variant: "warning",
          },
          {
            label: "Due Next 30 Days",
            value: `${currency} ${next30DaysAmount.toFixed(2)}`,
            subtext: "Monthly projected bills",
            variant: "info",
          },
        ],
        sections: [
          {
            title: "Upcoming Bill Schedule",
            description: "Prioritized schedule of pending obligations ordered chronologically by due date.",
            headers: ["Due Date", "Bill Title", "Payee", "Category", "Amount", "Frequency", "Status"],
            rows,
          },
        ],
        rawData: { totalUpcomingAmount, overdueAmount, overdueCount, unpaidPayments },
      };
    }

    // =========================================================================
    // 5. DOCUMENT EXPIRY REPORT
    // =========================================================================
    case "document_expiry": {
      const documents = await prisma.document.findMany({
        where: { userId },
        orderBy: { expiryDate: "asc" },
      });

      let expiredCount = 0;
      let criticalCount = 0;
      let expiringSoonCount = 0;
      let validCount = 0;
      let noExpiryCount = 0;

      const categorizedDocs = documents.map((doc) => {
        const statusInfo = calculateDocumentStatus(doc.expiryDate);
        if (statusInfo.status === "EXPIRED") expiredCount++;
        else if (statusInfo.status === "CRITICAL") criticalCount++;
        else if (statusInfo.status === "EXPIRING_SOON") expiringSoonCount++;
        else if (statusInfo.status === "VALID") validCount++;
        else noExpiryCount++;

        return {
          ...doc,
          statusInfo,
        };
      });

      // Sort with Expired & Critical first
      categorizedDocs.sort((a, b) => {
        const order: Record<string, number> = {
          EXPIRED: 0,
          CRITICAL: 1,
          EXPIRING_SOON: 2,
          VALID: 3,
          NO_EXPIRY: 4,
        };
        return (order[a.statusInfo.status] ?? 5) - (order[b.statusInfo.status] ?? 5);
      });

      const rows = categorizedDocs.map((d) => [
        d.title,
        d.category,
        d.documentNumber || "—",
        d.issuedBy || "—",
        d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : "No Expiry",
        d.statusInfo.countdownText || d.statusInfo.label,
        d.statusInfo.status.replace(/_/g, " "),
      ]);

      const urgentCount = expiredCount + criticalCount;

      return {
        metadata: {
          type: "document_expiry",
          title: "Document Expiry & Compliance Report",
          description: "Audit of all identity, residency, vehicle, and contractual document expiries.",
          generatedAt: now.toISOString(),
          currency,
          userName,
        },
        summaryCards: [
          {
            label: "Total Documents",
            value: String(documents.length),
            subtext: "In personal vault",
            variant: "default",
          },
          {
            label: "Expired Documents",
            value: String(expiredCount),
            subtext: expiredCount > 0 ? "Urgent action required" : "Zero expired documents",
            variant: expiredCount > 0 ? "danger" : "success",
          },
          {
            label: "Critical (1-7 Days)",
            value: String(criticalCount),
            subtext: "Expires this week",
            variant: criticalCount > 0 ? "warning" : "success",
          },
          {
            label: "Expiring Soon (8-30 Days)",
            value: String(expiringSoonCount),
            subtext: "Prepare renewals",
            variant: expiringSoonCount > 0 ? "info" : "default",
          },
        ],
        sections: [
          {
            title: "Document Expiry Audit",
            description: "All documents ranked by expiry urgency.",
            headers: ["Document Title", "Type", "Number", "Issuer", "Expiry Date", "Timeline", "Status"],
            rows,
          },
        ],
        rawData: { expiredCount, criticalCount, expiringSoonCount, validCount, total: documents.length },
      };
    }

    // =========================================================================
    // 6. VEHICLE RENEWAL REPORT
    // =========================================================================
    case "vehicle_renewal": {
      const vehicles = await prisma.vehicle.findMany({
        where: { userId },
        orderBy: { name: "asc" },
      });

      let totalAlerts = 0;
      let expiredRegistrationCount = 0;
      let overdueServiceCount = 0;

      const vehicleSummaries = vehicles.map((v) => {
        const summary = calculateVehicleStatus(v);
        totalAlerts += summary.alerts.length;
        if (summary.registrationStatus === "EXPIRED") expiredRegistrationCount++;
        if (summary.mileageStatus === "OVERDUE") overdueServiceCount++;

        return {
          vehicle: v,
          summary,
        };
      });

      const rows = vehicleSummaries.map(({ vehicle: v, summary }) => {
        const regDate = v.registrationExpiry ? new Date(v.registrationExpiry).toLocaleDateString() : "Not Set";
        const insDate = v.insuranceExpiry ? new Date(v.insuranceExpiry).toLocaleDateString() : "Not Set";
        const svcDate = v.nextServiceDate ? new Date(v.nextServiceDate).toLocaleDateString() : "Not Set";

        return [
          v.name,
          [v.year, v.make, v.model].filter(Boolean).join(" ") || "—",
          v.licensePlate || "—",
          `${(v.mileage || 0).toLocaleString()} km`,
          `${regDate} (${summary.registrationStatus})`,
          `${insDate} (${summary.insuranceStatus})`,
          `${svcDate} (${summary.mileageStatus})`,
          summary.alerts.length > 0
            ? summary.alerts.map((a) => a.message || a.title).join("; ")
            : "Good Standing",
        ];
      });

      return {
        metadata: {
          type: "vehicle_renewal",
          title: "Vehicle Renewal & Maintenance Report",
          description: "Status report of vehicle fleet registrations, insurance policies, and service intervals.",
          generatedAt: now.toISOString(),
          currency,
          userName,
        },
        summaryCards: [
          {
            label: "Vehicles in Garage",
            value: String(vehicles.length),
            subtext: "Tracked vehicles",
            variant: "default",
          },
          {
            label: "Active Alerts",
            value: String(totalAlerts),
            subtext: totalAlerts > 0 ? "Maintenance / Renewal Required" : "All vehicles up to date",
            variant: totalAlerts > 0 ? "danger" : "success",
          },
          {
            label: "Expired Registrations",
            value: String(expiredRegistrationCount),
            subtext: expiredRegistrationCount > 0 ? "Illegal to drive" : "All registrations valid",
            variant: expiredRegistrationCount > 0 ? "danger" : "success",
          },
          {
            label: "Overdue Services",
            value: String(overdueServiceCount),
            subtext: "Mileage threshold exceeded",
            variant: overdueServiceCount > 0 ? "warning" : "info",
          },
        ],
        sections: [
          {
            title: "Fleet Renewal & Service Status",
            description: "Audit of registrations, insurance policies, and upcoming maintenance.",
            headers: [
              "Vehicle Name",
              "Make & Model",
              "License Plate",
              "Current Mileage",
              "Registration Expiry",
              "Insurance Expiry",
              "Next Service",
              "Status / Alerts",
            ],
            rows,
          },
        ],
        rawData: { totalVehicles: vehicles.length, totalAlerts, vehicleSummaries },
      };
    }

    // =========================================================================
    // 7. SUBSCRIPTION REPORT
    // =========================================================================
    case "subscription_summary": {
      const subscriptions = await prisma.subscription.findMany({
        where: { userId },
        orderBy: { cost: "desc" },
      });

      const metrics = calculateSubscriptionMetrics(subscriptions);
      const activeSubs = subscriptions.filter((s) => s.renewalStatus === "active");
      const cancelledSubs = subscriptions.filter((s) => s.renewalStatus === "cancelled");
      const highestExpense = [...activeSubs].sort((a, b) => b.cost - a.cost)[0];

      const rows = subscriptions.map((s) => [
        s.name,
        s.category,
        s.billingCycle.toUpperCase(),
        `${currency} ${s.cost.toFixed(2)}`,
        new Date(s.nextBillingDate).toLocaleDateString(),
        s.renewalStatus.toUpperCase(),
        s.notes || "—",
      ]);

      return {
        metadata: {
          type: "subscription_summary",
          title: "Subscription Burn Rate & Membership Report",
          description: "Summary of recurring software, streaming services, and monthly/annual burn rate.",
          generatedAt: now.toISOString(),
          currency,
          userName,
        },
        summaryCards: [
          {
            label: "Monthly Burn Rate",
            value: `${currency} ${metrics.monthlyTotal.toFixed(2)}`,
            subtext: "Normalized cost per month",
            variant: "warning",
          },
          {
            label: "Projected Annual Spend",
            value: `${currency} ${metrics.annualTotal.toFixed(2)}`,
            subtext: "12-month recurring projection",
            variant: "default",
          },
          {
            label: "Active Subscriptions",
            value: String(activeSubs.length),
            subtext: `${cancelledSubs.length} cancelled`,
            variant: "info",
          },
          {
            label: "Highest Monthly Cost",
            value: highestExpense ? `${highestExpense.name} (${currency} ${highestExpense.cost.toFixed(2)})` : "None",
            subtext: "Top recurring cost",
            variant: "default",
          },
        ],
        sections: [
          {
            title: "Recurring Subscriptions List",
            description: "Complete inventory of all active and cancelled recurring subscriptions.",
            headers: ["Subscription Name", "Category", "Billing Cycle", "Cost", "Next Renewal", "Status", "Notes"],
            rows,
          },
        ],
        rawData: { metrics, subscriptions, activeCount: activeSubs.length, cancelledCount: cancelledSubs.length },
      };
    }

    default:
      throw new Error(`Unsupported report type: ${type}`);
  }
}
