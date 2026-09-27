import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardShellClient } from "@/components/dashboard/DashboardShellClient";
import { AttentionItem } from "@/components/dashboard/AttentionRequired";
import { UpcomingEvent } from "@/components/dashboard/UpcomingSection";
import { DashboardStats } from "@/components/dashboard/SummaryCards";
import { formatShortDate } from "@/lib/utils";
import { calculateDocumentStatus } from "@/lib/documents/status";
import { calculatePaymentStatus, toCalendarDateString } from "@/lib/finance/calculations";
import { calculateVehicleAlerts } from "@/lib/vehicles/status";
import { calculateSubscriptionMetrics } from "@/lib/subscriptions/calculations";
import { calculateNextDateOccurrence } from "@/lib/dates/calculations";

export default async function DashboardPage() {
  const user = await requireUser();

  const now = new Date();

  // Fetch all user-scoped data directly from database in parallel
  const [
    userProfile,
    documents,
    reminders,
    payments,
    expenses,
    budgets,
    vehicles,
    subscriptions,
    importantDates,
  ] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId: user.id },
      select: { currency: true, displayName: true, firstName: true },
    }),
    prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.reminder.findMany({
      where: { userId: user.id },
      orderBy: { dueDate: "asc" },
    }),
    prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { dueDate: "asc" },
    }),
    prisma.expense.findMany({
      where: { userId: user.id },
      orderBy: { spentAt: "desc" },
    }),
    prisma.budget.findMany({
      where: { userId: user.id },
    }),
    prisma.vehicle.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subscription.findMany({
      where: { userId: user.id },
      orderBy: { nextBillingDate: "asc" },
    }),
    prisma.importantDate.findMany({
      where: { userId: user.id },
      orderBy: { eventDate: "asc" },
    }),
  ]);

  const currency = userProfile?.currency || "USD";
  const displayName =
    userProfile?.displayName || userProfile?.firstName || user.displayName || user.email.split("@")[0];

  // 1. Process ATTENTION REQUIRED items (Expired docs, critical reminders, overdue payments, vehicle alerts)
  const attentionItems: AttentionItem[] = [];

  // A. Documents Requiring Attention (Expired & Critical/Expiring Soon)
  documents.forEach((doc) => {
    if (doc.hasExpiry && doc.expiryDate) {
      const statusInfo = calculateDocumentStatus(doc.expiryDate);
      if (statusInfo.status === "EXPIRED") {
        attentionItems.push({
          id: `doc-exp-${doc.id}`,
          title: `${doc.title} Expired`,
          subtitle: `${doc.category} • ${statusInfo.countdownText}`,
          dueDateText: statusInfo.countdownText,
          type: "expired_document",
          urgency: "urgent",
          actionHref: "/documents",
        });
      } else if (statusInfo.status === "CRITICAL" || statusInfo.status === "EXPIRING_SOON") {
        attentionItems.push({
          id: `doc-soon-${doc.id}`,
          title: `${doc.title} Renewal Soon`,
          subtitle: `${doc.category} • ${statusInfo.label} (${statusInfo.countdownText})`,
          dueDateText: statusInfo.countdownText,
          type: "expiring_document",
          urgency: statusInfo.status === "CRITICAL" ? "urgent" : "warning",
          actionHref: "/documents",
        });
      }
    }
  });

  // B. Critical or Overdue Reminders (Filter standalone to prevent duplication with synced module reminders)
  const standaloneReminders = reminders.filter((r) => !r.relatedType);
  standaloneReminders.forEach((rem) => {
    if (rem.status === "pending") {
      const isOverdue = rem.dueDate < now;
      const isUrgent = rem.priority === "urgent" || rem.priority === "high";

      if (isOverdue || isUrgent) {
        attentionItems.push({
          id: `rem-${rem.id}`,
          title: rem.title,
          subtitle: rem.description || `${rem.priority.toUpperCase()} priority task`,
          dueDateText: isOverdue
            ? `Overdue (${formatShortDate(rem.dueDate)})`
            : `Due ${formatShortDate(rem.dueDate)}`,
          type: "critical_reminder",
          urgency: isOverdue ? "urgent" : "high",
          actionHref: "/reminders",
        });
      }
    }
  });

  // C. Overdue Payments
  payments.forEach((pay) => {
    if (!pay.isPaid && pay.dueDate < now) {
      attentionItems.push({
        id: `pay-overdue-${pay.id}`,
        title: `${pay.title} Overdue`,
        subtitle: pay.payee ? `Payee: ${pay.payee}` : "Unpaid bill",
        dueDateText: `Due was ${formatShortDate(pay.dueDate)}`,
        type: "overdue_payment",
        urgency: "urgent",
        actionHref: "/finance",
      });
    }
  });

  // D. Vehicle Alerts (Expired insurance/registration or overdue maintenance/mileage)
  let totalVehicleAlertsCount = 0;
  vehicles.forEach((veh) => {
    const summary = calculateVehicleAlerts(veh, now);
    totalVehicleAlertsCount += summary.alerts.length;

    summary.alerts.forEach((alert) => {
      attentionItems.push({
        id: `veh-alert-${veh.id}-${alert.type}`,
        title: alert.title,
        subtitle: `${veh.make} ${veh.model} • ${alert.message}`,
        dueDateText: alert.dueDate ? formatShortDate(new Date(alert.dueDate)) : "Action required",
        type: "vehicle_alert",
        urgency: alert.urgency === "urgent" ? "urgent" : "warning",
        actionHref: "/more/vehicles",
        customBadge: alert.urgency === "urgent" ? "URGENT" : "VEHICLE ALERT",
      });
    });
  });

  // E. Past Due Subscriptions
  subscriptions.forEach((sub) => {
    if (sub.renewalStatus === "active") {
      const nextBill = new Date(sub.nextBillingDate);
      if (nextBill < now) {
        attentionItems.push({
          id: `sub-due-${sub.id}`,
          title: `${sub.name} Subscription Renewal Due`,
          subtitle: `${sub.category} • ${sub.currency} ${sub.cost.toFixed(2)} (${sub.billingCycle})`,
          dueDateText: `Due was ${formatShortDate(nextBill)}`,
          type: "overdue_payment",
          urgency: "warning",
          actionHref: "/subscriptions",
          customBadge: "DUE",
        });
      }
    }
  });

  // 2. Process UPCOMING items chronologically
  const upcomingEvents: UpcomingEvent[] = [];

  // A. Upcoming Standalone Reminders
  standaloneReminders.forEach((rem) => {
    if (rem.status === "pending" && rem.dueDate >= now) {
      const days = Math.ceil((rem.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      upcomingEvents.push({
        id: `up-rem-${rem.id}`,
        title: rem.title,
        subtitle: rem.description || undefined,
        eventDate: rem.dueDate,
        dateFormatted: formatShortDate(rem.dueDate),
        daysRemaining: days,
        category: "reminder",
        categoryLabel: "Reminder",
        actionHref: "/reminders",
      });
    }
  });

  // B. Upcoming Payments
  payments.forEach((pay) => {
    if (!pay.isPaid && pay.dueDate >= now) {
      const days = Math.ceil((pay.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      upcomingEvents.push({
        id: `up-pay-${pay.id}`,
        title: pay.title,
        subtitle: pay.payee ? `Payee: ${pay.payee}` : undefined,
        eventDate: pay.dueDate,
        dateFormatted: formatShortDate(pay.dueDate),
        daysRemaining: days,
        category: "payment",
        categoryLabel: "Bill Due",
        actionHref: "/finance",
      });
    }
  });

  // C. Upcoming Document Expiries
  documents.forEach((doc) => {
    if (doc.hasExpiry && doc.expiryDate && doc.expiryDate >= now) {
      const days = Math.ceil((doc.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      upcomingEvents.push({
        id: `up-doc-${doc.id}`,
        title: `${doc.title} Expiry`,
        subtitle: `Category: ${doc.category}`,
        eventDate: doc.expiryDate,
        dateFormatted: formatShortDate(doc.expiryDate),
        daysRemaining: days,
        category: "document",
        categoryLabel: "Renewal",
        actionHref: "/documents",
      });
    }
  });

  // D. Upcoming Vehicle Maintenance & Expiries
  vehicles.forEach((veh) => {
    if (veh.nextServiceDate && new Date(veh.nextServiceDate) >= now) {
      const svcDate = new Date(veh.nextServiceDate);
      const days = Math.ceil((svcDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      upcomingEvents.push({
        id: `up-veh-svc-${veh.id}`,
        title: `${veh.name} Scheduled Service`,
        subtitle: `${veh.make} ${veh.model} • Maintenance`,
        eventDate: svcDate,
        dateFormatted: formatShortDate(svcDate),
        daysRemaining: days,
        category: "vehicle",
        categoryLabel: "Vehicle",
        actionHref: "/more/vehicles",
      });
    }
    if (veh.insuranceExpiry && new Date(veh.insuranceExpiry) >= now) {
      const insDate = new Date(veh.insuranceExpiry);
      const days = Math.ceil((insDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      upcomingEvents.push({
        id: `up-veh-ins-${veh.id}`,
        title: `${veh.name} Insurance Expiry`,
        subtitle: `${veh.make} ${veh.model} • Policy Expiry`,
        eventDate: insDate,
        dateFormatted: formatShortDate(insDate),
        daysRemaining: days,
        category: "vehicle",
        categoryLabel: "Vehicle",
        actionHref: "/more/vehicles",
      });
    }
    if (veh.registrationExpiry && new Date(veh.registrationExpiry) >= now) {
      const regDate = new Date(veh.registrationExpiry);
      const days = Math.ceil((regDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      upcomingEvents.push({
        id: `up-veh-reg-${veh.id}`,
        title: `${veh.name} Registration Renewal`,
        subtitle: `${veh.make} ${veh.model} • Plate: ${veh.licensePlate || "N/A"}`,
        eventDate: regDate,
        dateFormatted: formatShortDate(regDate),
        daysRemaining: days,
        category: "vehicle",
        categoryLabel: "Vehicle",
        actionHref: "/more/vehicles",
      });
    }
  });

  // E. Upcoming Active Subscriptions
  subscriptions.forEach((sub) => {
    if (sub.renewalStatus === "active" && new Date(sub.nextBillingDate) >= now) {
      const billDate = new Date(sub.nextBillingDate);
      const days = Math.ceil((billDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      upcomingEvents.push({
        id: `up-sub-${sub.id}`,
        title: `${sub.name} Subscription Renewal`,
        subtitle: `${sub.category} • ${sub.currency} ${sub.cost.toFixed(2)} (${sub.billingCycle})`,
        eventDate: billDate,
        dateFormatted: formatShortDate(billDate),
        daysRemaining: days,
        category: "subscription",
        categoryLabel: "Subscription",
        actionHref: "/subscriptions",
      });
    }
  });

  // F. Upcoming Important Dates (Birthdays, Anniversaries, etc.)
  importantDates.forEach((d) => {
    const computed = calculateNextDateOccurrence(d.eventDate, d.recurrence, now);
    const milestoneStr = computed.yearsCount ? ` (${computed.yearsCount}th year)` : "";
    const catLabel = d.category ? d.category.charAt(0).toUpperCase() + d.category.slice(1) : "Important Date";

    upcomingEvents.push({
      id: `up-date-${d.id}`,
      title: `${d.title}${milestoneStr}`,
      subtitle: `${catLabel} • ${computed.label}`,
      eventDate: computed.nextOccurrence,
      dateFormatted: formatShortDate(computed.nextOccurrence),
      daysRemaining: computed.daysRemaining,
      category: "date",
      categoryLabel: catLabel,
      actionHref: "/more/dates",
    });
  });

  // Sort chronological order (closest date first)
  upcomingEvents.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

  // 3. Compute REAL SUMMARY STATS (Never fake data)
  const expiredDocsCount = documents.filter(
    (d) => calculateDocumentStatus(d.expiryDate).status === "EXPIRED"
  ).length;

  const expiringSoonDocsCount = documents.filter((d) => {
    const s = calculateDocumentStatus(d.expiryDate).status;
    return s === "CRITICAL" || s === "EXPIRING_SOON";
  }).length;

  const pendingReminders = reminders.filter((r) => r.status === "pending");
  const urgentRemindersCount = pendingReminders.filter(
    (r) => r.priority === "urgent" || r.priority === "high" || r.dueDate < now
  ).length;
  const completedRemindersCount = reminders.filter((r) => r.status === "completed").length;

  const pendingPayments = payments.filter((p) => !p.isPaid);
  const totalAmountDue = pendingPayments.reduce((acc, p) => acc + p.amount, 0);

  const upcomingPaymentsList = pendingPayments.filter(
    (p) => calculatePaymentStatus(p.dueDate, false, now) === "Upcoming"
  );
  const overduePaymentsList = pendingPayments.filter(
    (p) => calculatePaymentStatus(p.dueDate, false, now) === "Overdue"
  );

  const upcomingPaymentsCount = upcomingPaymentsList.length;
  const upcomingPaymentsAmount = upcomingPaymentsList.reduce((acc, p) => acc + p.amount, 0);
  const overduePaymentsCount = overduePaymentsList.length;
  const overduePaymentsAmount = overduePaymentsList.reduce((acc, p) => acc + p.amount, 0);

  // Real Expenses & Budget Metrics
  const nowDayStr = toCalendarDateString(now);
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();

  const todayExpensesList = expenses.filter(
    (e) => toCalendarDateString(e.spentAt) === nowDayStr
  );
  const todayExpenseAmount = todayExpensesList.reduce((acc, e) => acc + e.amount, 0);

  const monthlyExpensesList = expenses.filter((e) => {
    const d = new Date(e.spentAt);
    return d.getFullYear() === nowYear && d.getMonth() === nowMonth;
  });
  const monthlyExpenseAmount = monthlyExpensesList.reduce((acc, e) => acc + e.amount, 0);
  const totalExpenseAmount = expenses.reduce((acc, e) => acc + e.amount, 0);

  const totalBudgetRecord = budgets.find((b) => b.category.toLowerCase() === "total");
  const monthlyBudgetLimit = totalBudgetRecord ? totalBudgetRecord.limitAmount : 0;
  const budgetRemaining =
    monthlyBudgetLimit > 0 ? monthlyBudgetLimit - monthlyExpenseAmount : null;

  const subMetrics = calculateSubscriptionMetrics(subscriptions);

  const stats: DashboardStats = {
    documents: {
      total: documents.length,
      expiringSoon: expiringSoonDocsCount,
      expired: expiredDocsCount,
    },
    reminders: {
      total: pendingReminders.length,
      urgent: urgentRemindersCount,
      completed: completedRemindersCount,
    },
    payments: {
      totalPending: pendingPayments.length,
      totalAmountDue,
      overdueCount: overduePaymentsCount,
      overdueAmount: overduePaymentsAmount,
      upcomingCount: upcomingPaymentsCount,
      upcomingAmount: upcomingPaymentsAmount,
      currency,
    },
    expenses: {
      totalRecorded: expenses.length,
      totalAmount: totalExpenseAmount,
      todayAmount: todayExpenseAmount,
      monthlyAmount: monthlyExpenseAmount,
      budgetRemaining,
      monthlyBudget: monthlyBudgetLimit,
      currency,
    },
    connectedModules: {
      vehiclesCount: vehicles.length,
      vehicleAlertsCount: totalVehicleAlertsCount,
      activeSubscriptionsCount: subMetrics.activeCount,
      monthlySubscriptionCost: subMetrics.monthlyTotal,
      importantDatesCount: importantDates.length,
      currency,
    },
  };

  return (
    <div className="space-y-6">
      {/* 1. Header: Greeting, User Name, Today's Date, 5-Second Status */}
      <DashboardHeader
        displayName={displayName}
        attentionCount={attentionItems.length}
        upcomingCount={upcomingEvents.length}
      />

      {/* 2. Client Shell: Quick Actions, Summary Cards, Attention Required, Upcoming & Quick Add Modal */}
      <DashboardShellClient
        stats={stats}
        attentionItems={attentionItems}
        upcomingEvents={upcomingEvents}
        userCurrency={currency}
      />
    </div>
  );
}
