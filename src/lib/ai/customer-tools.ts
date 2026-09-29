// src/lib/ai/customer-tools.ts
// Secure, read-only customer data access tools for Smart Life Manager AI Assistant.
// Strictly scopes every database query to the authenticated userId.
// All date and financial calculations are computed accurately without guessing.

import { prisma } from "@/lib/db/prisma";

// ============================================================================
// DTO & Result Interfaces
// ============================================================================

export interface CustomerProfileData {
  displayName: string;
  email: string;
  currency: string;
  country: string;
  region: string;
  timezone: string;
  planName: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  documentNumber: string | null;
  issuedBy: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  hasExpiry: boolean;
  status: "expired" | "expiring_soon" | "valid" | "no_expiry";
  daysUntilExpiry: number | null;
  notes: string | null;
}

export interface DocumentsResult {
  total: number;
  expiredCount: number;
  expiringSoonCount: number;
  documents: DocumentItem[];
  summary: string;
}

export interface ReminderItem {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  dueDateFormatted: string;
  priority: string;
  status: string;
  category: string;
  isOverdue: boolean;
  isDueToday: boolean;
  isDueThisWeek: boolean;
  daysUntilDue: number;
  isRecurring: boolean;
  recurrenceRule: string | null;
}

export interface RemindersResult {
  total: number;
  pendingCount: number;
  overdueCount: number;
  dueThisWeekCount: number;
  reminders: ReminderItem[];
  summary: string;
}

export interface ImportantDateItem {
  id: string;
  title: string;
  eventDate: string;
  eventDateFormatted: string;
  category: string;
  recurrence: string;
  daysUntilEvent: number;
  isUpcomingSoon: boolean;
  notes: string | null;
}

export interface ImportantDatesResult {
  total: number;
  upcomingCount: number;
  importantDates: ImportantDateItem[];
  summary: string;
}

export interface VehicleItem {
  id: string;
  name: string;
  make: string | null;
  model: string | null;
  year: number | null;
  licensePlate: string | null;
  vin: string | null;
  mileage: number | null;
  insuranceExpiry: string | null;
  insuranceStatus: "active" | "expiring_soon" | "expired" | "not_recorded";
  insuranceDaysRemaining: number | null;
  registrationExpiry: string | null;
  registrationStatus: "active" | "expiring_soon" | "expired" | "not_recorded";
  registrationDaysRemaining: number | null;
  nextServiceDate: string | null;
  serviceStatus: "due_soon" | "overdue" | "up_to_date" | "not_recorded";
  notes: string | null;
}

export interface VehiclesResult {
  total: number;
  vehicles: VehicleItem[];
  summary: string;
}

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  spentAt: string;
  spentAtFormatted: string;
  paymentMethod: string | null;
  merchant: string | null;
  notes: string | null;
}

export interface ExpensesResult {
  totalCount: number;
  totalAmount: number;
  currentMonthTotal: number;
  currentYearTotal: number;
  past30DaysTotal: number;
  currency: string;
  categoryBreakdown: Record<string, number>;
  expenses: ExpenseItem[];
  summary: string;
}

export interface PaymentItem {
  id: string;
  title: string;
  payee: string | null;
  amount: number;
  currency: string;
  dueDate: string;
  dueDateFormatted: string;
  isPaid: boolean;
  paidAt: string | null;
  category: string;
  isOverdue: boolean;
  isDueSoon: boolean;
  daysUntilDue: number;
  isRecurring: boolean;
  frequency: string | null;
}

export interface PaymentsResult {
  total: number;
  unpaidTotal: number;
  unpaidCount: number;
  paidCount: number;
  overdueCount: number;
  currency: string;
  upcomingPayments: PaymentItem[];
  overduePayments: PaymentItem[];
  payments: PaymentItem[];
  summary: string;
}

export interface BudgetItem {
  id: string;
  category: string;
  limitAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  currency: string;
  period: string;
  alertThreshold: number;
  isOverBudget: boolean;
  isNearLimit: boolean;
}

export interface BudgetsResult {
  total: number;
  overBudgetCount: number;
  budgets: BudgetItem[];
  summary: string;
}

export interface SubscriptionItem {
  id: string;
  name: string;
  cost: number;
  currency: string;
  billingCycle: string;
  nextBillingDate: string | null;
  nextBillingDateFormatted: string | null;
  daysUntilRenewal: number | null;
  renewalStatus: string;
  category: string;
  notes: string | null;
}

export interface SubscriptionsResult {
  total: number;
  activeCount: number;
  monthlyEquivalentTotal: number;
  currency: string;
  upcomingRenewals: SubscriptionItem[];
  subscriptions: SubscriptionItem[];
  summary: string;
}

export interface FamilyResult {
  memberCount: number;
  groupCount: number;
  emergencyContacts: Array<{ name: string; relationship: string; phone: string | null; email: string | null }>;
  members: Array<{ name: string; relationship: string; bloodType: string | null; emergencyContact: boolean }>;
  groups: Array<{ name: string; memberCount: number; members: Array<{ name: string; role: string; email: string | null }> }>;
  summary: string;
}

// ============================================================================
// Tool Factory: Scoped to Authenticated User ID
// ============================================================================

/**
 * Creates secure, user-isolated read-only data access tools for the AI assistant.
 * All functions automatically bind to `authenticatedUserId`.
 * Never accepts a foreign user ID from user input or AI models.
 */
export function createCustomerDataTools(authenticatedUserId: string) {
  if (!authenticatedUserId || typeof authenticatedUserId !== "string") {
    throw new Error("Cannot initialize CustomerDataTools without a valid authenticated user ID.");
  }

  const userId = authenticatedUserId;
  const now = new Date();

  return {
    /**
     * Retrieves customer profile and configuration (currency, timezone, region).
     */
    async getCustomerProfile(): Promise<CustomerProfileData | null> {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          profile: {
            select: {
              displayName: true,
              firstName: true,
              lastName: true,
              currency: true,
              country: true,
              region: true,
              timezone: true,
            },
          },
          userSubscription: {
            select: {
              planName: true,
            },
          },
        },
      });

      if (!user) return null;

      const p = user.profile;
      const displayName = p?.displayName || [p?.firstName, p?.lastName].filter(Boolean).join(" ") || user.email.split("@")[0];

      return {
        displayName,
        email: user.email,
        currency: p?.currency || "USD",
        country: p?.country || "US",
        region: p?.region || "US",
        timezone: p?.timezone || "UTC",
        planName: user.userSubscription?.planName || "Free Starter",
      };
    },

    /**
     * Tool: getMyDocuments()
     * Fetches authenticated customer's documents, computing expiration statuses and days remaining.
     */
    async getMyDocuments(): Promise<DocumentsResult> {
      const docs = await prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          category: true,
          documentNumber: true,
          issuedBy: true,
          issueDate: true,
          expiryDate: true,
          hasExpiry: true,
          notes: true,
        },
      });

      if (docs.length === 0) {
        return {
          total: 0,
          expiredCount: 0,
          expiringSoonCount: 0,
          documents: [],
          summary: "No documents have been uploaded to your account.",
        };
      }

      let expiredCount = 0;
      let expiringSoonCount = 0;

      const documents: DocumentItem[] = docs.map((d) => {
        let status: DocumentItem["status"] = "no_expiry";
        let daysUntilExpiry: number | null = null;

        if (d.expiryDate) {
          const diffMs = d.expiryDate.getTime() - now.getTime();
          daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          if (daysUntilExpiry < 0) {
            status = "expired";
            expiredCount++;
          } else if (daysUntilExpiry <= 30) {
            status = "expiring_soon";
            expiringSoonCount++;
          } else {
            status = "valid";
          }
        }

        return {
          id: d.id,
          title: d.title,
          category: d.category,
          documentNumber: d.documentNumber,
          issuedBy: d.issuedBy,
          issueDate: d.issueDate ? d.issueDate.toISOString().split("T")[0] : null,
          expiryDate: d.expiryDate ? d.expiryDate.toISOString().split("T")[0] : null,
          hasExpiry: d.hasExpiry,
          status,
          daysUntilExpiry,
          notes: d.notes,
        };
      });

      return {
        total: documents.length,
        expiredCount,
        expiringSoonCount,
        documents,
        summary: `You have ${documents.length} document(s) uploaded. ${expiredCount} expired, ${expiringSoonCount} expiring within 30 days.`,
      };
    },

    /**
     * Tool: getMyReminders()
     * Fetches authenticated customer's reminders, computing overdue and due-this-week statuses.
     */
    async getMyReminders(): Promise<RemindersResult> {
      const items = await prisma.reminder.findMany({
        where: { userId },
        orderBy: { dueDate: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          dueDate: true,
          priority: true,
          status: true,
          category: true,
          isRecurring: true,
          recurrenceRule: true,
        },
      });

      if (items.length === 0) {
        return {
          total: 0,
          pendingCount: 0,
          overdueCount: 0,
          dueThisWeekCount: 0,
          reminders: [],
          summary: "No reminders recorded in your account.",
        };
      }

      let pendingCount = 0;
      let overdueCount = 0;
      let dueThisWeekCount = 0;

      const reminders: ReminderItem[] = items.map((r) => {
        const diffMs = r.dueDate.getTime() - now.getTime();
        const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const isCompleted = r.status.toLowerCase() === "completed";
        const isOverdue = !isCompleted && daysUntilDue < 0;
        const isDueToday = !isCompleted && daysUntilDue === 0;
        const isDueThisWeek = !isCompleted && daysUntilDue >= 0 && daysUntilDue <= 7;

        if (!isCompleted) {
          pendingCount++;
          if (isOverdue) overdueCount++;
          if (isDueThisWeek) dueThisWeekCount++;
        }

        return {
          id: r.id,
          title: r.title,
          description: r.description,
          dueDate: r.dueDate.toISOString().split("T")[0],
          dueDateFormatted: r.dueDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
          priority: r.priority,
          status: r.status,
          category: r.category,
          isOverdue,
          isDueToday,
          isDueThisWeek,
          daysUntilDue,
          isRecurring: r.isRecurring,
          recurrenceRule: r.recurrenceRule,
        };
      });

      return {
        total: reminders.length,
        pendingCount,
        overdueCount,
        dueThisWeekCount,
        reminders,
        summary: `You have ${reminders.length} reminder(s). ${pendingCount} pending (${overdueCount} overdue, ${dueThisWeekCount} due this week).`,
      };
    },

    /**
     * Tool: getMyImportantDates()
     * Fetches authenticated customer's important dates, anniversaries, and milestones.
     */
    async getMyImportantDates(): Promise<ImportantDatesResult> {
      const dates = await prisma.importantDate.findMany({
        where: { userId },
        orderBy: { eventDate: "asc" },
        select: {
          id: true,
          title: true,
          eventDate: true,
          category: true,
          recurrence: true,
          notes: true,
        },
      });

      if (dates.length === 0) {
        return {
          total: 0,
          upcomingCount: 0,
          importantDates: [],
          summary: "No important dates recorded in your account.",
        };
      }

      let upcomingCount = 0;

      const importantDates: ImportantDateItem[] = dates.map((d) => {
        // Calculate days relative to current year for recurring events
        let targetDate = new Date(d.eventDate);
        if (d.recurrence === "yearly") {
          targetDate = new Date(now.getFullYear(), d.eventDate.getMonth(), d.eventDate.getDate());
          if (targetDate.getTime() < now.getTime() - 86400000) {
            targetDate.setFullYear(now.getFullYear() + 1);
          }
        }

        const diffMs = targetDate.getTime() - now.getTime();
        const daysUntilEvent = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const isUpcomingSoon = daysUntilEvent >= 0 && daysUntilEvent <= 30;
        if (isUpcomingSoon) upcomingCount++;

        return {
          id: d.id,
          title: d.title,
          eventDate: d.eventDate.toISOString().split("T")[0],
          eventDateFormatted: targetDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
          category: d.category,
          recurrence: d.recurrence,
          daysUntilEvent,
          isUpcomingSoon,
          notes: d.notes,
        };
      });

      return {
        total: importantDates.length,
        upcomingCount,
        importantDates,
        summary: `You have ${importantDates.length} important date(s) recorded (${upcomingCount} coming up in the next 30 days).`,
      };
    },

    /**
     * Tool: getMyVehicles()
     * Fetches vehicles from garage with insurance, registration, and service due statuses.
     */
    async getMyVehicles(): Promise<VehiclesResult> {
      const list = await prisma.vehicle.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          make: true,
          model: true,
          year: true,
          licensePlate: true,
          vin: true,
          mileage: true,
          insuranceExpiry: true,
          registrationExpiry: true,
          inspectionExpiry: true,
          nextServiceDate: true,
          notes: true,
        },
      });

      if (list.length === 0) {
        return {
          total: 0,
          vehicles: [],
          summary: "No vehicles registered in your garage.",
        };
      }

      const vehicles: VehicleItem[] = list.map((v) => {
        // Insurance calculation
        let insuranceStatus: VehicleItem["insuranceStatus"] = "not_recorded";
        let insuranceDaysRemaining: number | null = null;
        if (v.insuranceExpiry) {
          const diffMs = v.insuranceExpiry.getTime() - now.getTime();
          insuranceDaysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (insuranceDaysRemaining < 0) insuranceStatus = "expired";
          else if (insuranceDaysRemaining <= 30) insuranceStatus = "expiring_soon";
          else insuranceStatus = "active";
        }

        // Registration calculation
        let registrationStatus: VehicleItem["registrationStatus"] = "not_recorded";
        let registrationDaysRemaining: number | null = null;
        if (v.registrationExpiry) {
          const diffMs = v.registrationExpiry.getTime() - now.getTime();
          registrationDaysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (registrationDaysRemaining < 0) registrationStatus = "expired";
          else if (registrationDaysRemaining <= 30) registrationStatus = "expiring_soon";
          else registrationStatus = "active";
        }

        // Service calculation
        let serviceStatus: VehicleItem["serviceStatus"] = "not_recorded";
        if (v.nextServiceDate) {
          const diffMs = v.nextServiceDate.getTime() - now.getTime();
          const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (days < 0) serviceStatus = "overdue";
          else if (days <= 14) serviceStatus = "due_soon";
          else serviceStatus = "up_to_date";
        }

        return {
          id: v.id,
          name: v.name,
          make: v.make,
          model: v.model,
          year: v.year,
          licensePlate: v.licensePlate,
          vin: v.vin,
          mileage: v.mileage,
          insuranceExpiry: v.insuranceExpiry ? v.insuranceExpiry.toISOString().split("T")[0] : null,
          insuranceStatus,
          insuranceDaysRemaining,
          registrationExpiry: v.registrationExpiry ? v.registrationExpiry.toISOString().split("T")[0] : null,
          registrationStatus,
          registrationDaysRemaining,
          nextServiceDate: v.nextServiceDate ? v.nextServiceDate.toISOString().split("T")[0] : null,
          serviceStatus,
          notes: v.notes,
        };
      });

      return {
        total: vehicles.length,
        vehicles,
        summary: `You have ${vehicles.length} vehicle(s) in your garage.`,
      };
    },

    /**
     * Tool: getMyExpenses()
     * Fetches expense history, computing accurate monthly/yearly totals and category breakdowns.
     */
    async getMyExpenses(): Promise<ExpensesResult> {
      const items = await prisma.expense.findMany({
        where: { userId },
        orderBy: { spentAt: "desc" },
        select: {
          id: true,
          title: true,
          amount: true,
          currency: true,
          category: true,
          spentAt: true,
          paymentMethod: true,
          merchant: true,
          notes: true,
        },
      });

      const currency = items[0]?.currency || "USD";

      if (items.length === 0) {
        return {
          totalCount: 0,
          totalAmount: 0,
          currentMonthTotal: 0,
          currentYearTotal: 0,
          past30DaysTotal: 0,
          currency,
          categoryBreakdown: {},
          expenses: [],
          summary: "No expenses have been logged in your account.",
        };
      }

      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      let totalAmount = 0;
      let currentMonthTotal = 0;
      let currentYearTotal = 0;
      let past30DaysTotal = 0;
      const categoryBreakdown: Record<string, number> = {};

      const expenses: ExpenseItem[] = items.map((e) => {
        totalAmount += e.amount;
        const eDate = new Date(e.spentAt);

        if (eDate.getFullYear() === currentYear) {
          currentYearTotal += e.amount;
          if (eDate.getMonth() === currentMonth) {
            currentMonthTotal += e.amount;
          }
        }

        if (eDate >= thirtyDaysAgo) {
          past30DaysTotal += e.amount;
        }

        categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;

        return {
          id: e.id,
          title: e.title,
          amount: e.amount,
          currency: e.currency,
          category: e.category,
          spentAt: e.spentAt.toISOString().split("T")[0],
          spentAtFormatted: eDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
          paymentMethod: e.paymentMethod,
          merchant: e.merchant,
          notes: e.notes,
        };
      });

      const monthName = now.toLocaleString("en-US", { month: "long" });

      return {
        totalCount: expenses.length,
        totalAmount: Number(totalAmount.toFixed(2)),
        currentMonthTotal: Number(currentMonthTotal.toFixed(2)),
        currentYearTotal: Number(currentYearTotal.toFixed(2)),
        past30DaysTotal: Number(past30DaysTotal.toFixed(2)),
        currency,
        categoryBreakdown,
        expenses,
        summary: `Total logged expenses: ${currency} ${totalAmount.toFixed(2)} (${expenses.length} entries). Spent in ${monthName} ${currentYear}: ${currency} ${currentMonthTotal.toFixed(2)}. Spent past 30 days: ${currency} ${past30DaysTotal.toFixed(2)}.`,
      };
    },

    /**
     * Tool: getMyPayments()
     * Fetches bills and payments, isolating unpaid bills, overdue payments, and upcoming due dates.
     */
    async getMyPayments(): Promise<PaymentsResult> {
      const items = await prisma.payment.findMany({
        where: { userId },
        orderBy: { dueDate: "asc" },
        select: {
          id: true,
          title: true,
          payee: true,
          amount: true,
          currency: true,
          dueDate: true,
          isPaid: true,
          paidAt: true,
          category: true,
          isRecurring: true,
          frequency: true,
        },
      });

      const currency = items[0]?.currency || "USD";

      if (items.length === 0) {
        return {
          total: 0,
          unpaidTotal: 0,
          unpaidCount: 0,
          paidCount: 0,
          overdueCount: 0,
          currency,
          upcomingPayments: [],
          overduePayments: [],
          payments: [],
          summary: "No payment or bill records found in your account.",
        };
      }

      let unpaidTotal = 0;
      let unpaidCount = 0;
      let paidCount = 0;
      let overdueCount = 0;
      const upcomingPayments: PaymentItem[] = [];
      const overduePayments: PaymentItem[] = [];

      const payments: PaymentItem[] = items.map((p) => {
        const diffMs = p.dueDate.getTime() - now.getTime();
        const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const isOverdue = !p.isPaid && daysUntilDue < 0;
        const isDueSoon = !p.isPaid && daysUntilDue >= 0 && daysUntilDue <= 14;

        if (p.isPaid) {
          paidCount++;
        } else {
          unpaidCount++;
          unpaidTotal += p.amount;
          if (isOverdue) overdueCount++;
        }

        const item: PaymentItem = {
          id: p.id,
          title: p.title,
          payee: p.payee,
          amount: p.amount,
          currency: p.currency,
          dueDate: p.dueDate.toISOString().split("T")[0],
          dueDateFormatted: p.dueDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
          isPaid: p.isPaid,
          paidAt: p.paidAt ? p.paidAt.toISOString().split("T")[0] : null,
          category: p.category,
          isOverdue,
          isDueSoon,
          daysUntilDue,
          isRecurring: p.isRecurring,
          frequency: p.frequency,
        };

        if (!p.isPaid) {
          if (isOverdue) overduePayments.push(item);
          else upcomingPayments.push(item);
        }

        return item;
      });

      return {
        total: payments.length,
        unpaidTotal: Number(unpaidTotal.toFixed(2)),
        unpaidCount,
        paidCount,
        overdueCount,
        currency,
        upcomingPayments,
        overduePayments,
        payments,
        summary: `You have ${payments.length} payment record(s). Unpaid total: ${currency} ${unpaidTotal.toFixed(2)} (${unpaidCount} bills pending, ${overdueCount} overdue).`,
      };
    },

    /**
     * Tool: getMyBudgets()
     * Fetches customer budgets with spending calculations and alert thresholds.
     */
    async getMyBudgets(): Promise<BudgetsResult> {
      const [budgetsRaw, expenses] = await Promise.all([
        prisma.budget.findMany({
          where: { userId },
          select: {
            id: true,
            category: true,
            limitAmount: true,
            currency: true,
            period: true,
            alertThreshold: true,
          },
        }),
        prisma.expense.findMany({
          where: {
            userId,
            spentAt: {
              gte: new Date(now.getFullYear(), now.getMonth(), 1),
            },
          },
          select: {
            category: true,
            amount: true,
          },
        }),
      ]);

      if (budgetsRaw.length === 0) {
        return {
          total: 0,
          overBudgetCount: 0,
          budgets: [],
          summary: "No budgets configured in your account.",
        };
      }

      // Sum expenses per category for this month
      const spentByCategory: Record<string, number> = {};
      for (const e of expenses) {
        spentByCategory[e.category.toLowerCase()] = (spentByCategory[e.category.toLowerCase()] || 0) + e.amount;
      }

      let overBudgetCount = 0;

      const budgets: BudgetItem[] = budgetsRaw.map((b) => {
        const spent = spentByCategory[b.category.toLowerCase()] || 0;
        const remaining = Math.max(0, b.limitAmount - spent);
        const percentageUsed = b.limitAmount > 0 ? Math.round((spent / b.limitAmount) * 100) : 0;
        const isOverBudget = spent > b.limitAmount;
        const isNearLimit = percentageUsed >= b.alertThreshold && !isOverBudget;

        if (isOverBudget) overBudgetCount++;

        return {
          id: b.id,
          category: b.category,
          limitAmount: b.limitAmount,
          spentAmount: Number(spent.toFixed(2)),
          remainingAmount: Number(remaining.toFixed(2)),
          percentageUsed,
          currency: b.currency,
          period: b.period,
          alertThreshold: b.alertThreshold,
          isOverBudget,
          isNearLimit,
        };
      });

      return {
        total: budgets.length,
        overBudgetCount,
        budgets,
        summary: `You have ${budgets.length} active budget(s). ${overBudgetCount} currently exceeding limits.`,
      };
    },

    /**
     * Tool: getMySubscriptions()
     * Fetches active recurring subscriptions with monthly cost totals and renewal schedules.
     */
    async getMySubscriptions(): Promise<SubscriptionsResult> {
      const items = await prisma.subscription.findMany({
        where: { userId },
        orderBy: { nextBillingDate: "asc" },
        select: {
          id: true,
          name: true,
          cost: true,
          currency: true,
          billingCycle: true,
          nextBillingDate: true,
          renewalStatus: true,
          category: true,
          notes: true,
        },
      });

      const currency = items[0]?.currency || "USD";

      if (items.length === 0) {
        return {
          total: 0,
          activeCount: 0,
          monthlyEquivalentTotal: 0,
          currency,
          upcomingRenewals: [],
          subscriptions: [],
          summary: "No subscriptions tracked in your account.",
        };
      }

      let activeCount = 0;
      let monthlyEquivalentTotal = 0;
      const upcomingRenewals: SubscriptionItem[] = [];

      const subscriptions: SubscriptionItem[] = items.map((s) => {
        const isActive = s.renewalStatus.toLowerCase() === "active";
        if (isActive) {
          activeCount++;
          // Normalize to monthly equivalent
          if (s.billingCycle === "yearly") {
            monthlyEquivalentTotal += s.cost / 12;
          } else if (s.billingCycle === "weekly") {
            monthlyEquivalentTotal += s.cost * 4.33;
          } else if (s.billingCycle === "quarterly") {
            monthlyEquivalentTotal += s.cost / 3;
          } else {
            monthlyEquivalentTotal += s.cost;
          }
        }

        let daysUntilRenewal: number | null = null;
        let isUpcoming = false;
        if (s.nextBillingDate) {
          const diffMs = s.nextBillingDate.getTime() - now.getTime();
          daysUntilRenewal = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          isUpcoming = daysUntilRenewal >= 0 && daysUntilRenewal <= 30;
        }

        const item: SubscriptionItem = {
          id: s.id,
          name: s.name,
          cost: s.cost,
          currency: s.currency,
          billingCycle: s.billingCycle,
          nextBillingDate: s.nextBillingDate ? s.nextBillingDate.toISOString().split("T")[0] : null,
          nextBillingDateFormatted: s.nextBillingDate ? s.nextBillingDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : null,
          daysUntilRenewal,
          renewalStatus: s.renewalStatus,
          category: s.category,
          notes: s.notes,
        };

        if (isActive && isUpcoming) {
          upcomingRenewals.push(item);
        }

        return item;
      });

      return {
        total: subscriptions.length,
        activeCount,
        monthlyEquivalentTotal: Number(monthlyEquivalentTotal.toFixed(2)),
        currency,
        upcomingRenewals,
        subscriptions,
        summary: `You have ${subscriptions.length} subscription(s) (${activeCount} active). Monthly commitment: ~${currency} ${monthlyEquivalentTotal.toFixed(2)}. ${upcomingRenewals.length} renewing in the next 30 days.`,
      };
    },

    /**
     * Tool: getMyFamily()
     * Fetches customer family members, emergency contacts, and family groups.
     */
    async getMyFamily(): Promise<FamilyResult> {
      const [membersRaw, groupsRaw] = await Promise.all([
        prisma.familyMember.findMany({
          where: { userId },
          select: {
            name: true,
            relationship: true,
            bloodType: true,
            emergencyContact: true,
            phoneNumber: true,
            email: true,
          },
        }),
        prisma.familyGroup.findMany({
          where: { ownerId: userId },
          include: {
            members: {
              select: {
                name: true,
                role: true,
                email: true,
              },
            },
          },
        }),
      ]);

      if (membersRaw.length === 0 && groupsRaw.length === 0) {
        return {
          memberCount: 0,
          groupCount: 0,
          emergencyContacts: [],
          members: [],
          groups: [],
          summary: "No family members or family groups configured in your account.",
        };
      }

      const emergencyContacts = membersRaw
        .filter((m) => m.emergencyContact)
        .map((m) => ({
          name: m.name,
          relationship: m.relationship,
          phone: m.phoneNumber,
          email: m.email,
        }));

      const members = membersRaw.map((m) => ({
        name: m.name,
        relationship: m.relationship,
        bloodType: m.bloodType,
        emergencyContact: m.emergencyContact,
      }));

      const groups = groupsRaw.map((g) => ({
        name: g.name,
        memberCount: g.members.length,
        members: g.members.map((gm) => ({
          name: gm.name,
          role: gm.role,
          email: gm.email,
        })),
      }));

      return {
        memberCount: members.length,
        groupCount: groups.length,
        emergencyContacts,
        members,
        groups,
        summary: `Family Circle: ${members.length} family member(s), ${emergencyContacts.length} designated emergency contact(s), ${groups.length} family group(s).`,
      };
    },
  };
}

export type CustomerDataTools = ReturnType<typeof createCustomerDataTools>;
