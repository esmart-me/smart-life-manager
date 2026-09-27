import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardShellClient } from "@/components/dashboard/DashboardShellClient";
import { AttentionItem } from "@/components/dashboard/AttentionRequired";
import { UpcomingEvent } from "@/components/dashboard/UpcomingSection";
import { DashboardStats } from "@/components/dashboard/SummaryCards";
import { formatShortDate } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();

  const now = new Date();
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Fetch all user-scoped data directly from database in parallel
  const [userProfile, documents, reminders, payments, expenses] = await Promise.all([
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
  ]);

  const currency = userProfile?.currency || "USD";
  const displayName =
    userProfile?.displayName || userProfile?.firstName || user.displayName || user.email.split("@")[0];

  // 1. Process ATTENTION REQUIRED items (Expired docs, critical reminders, overdue payments)
  const attentionItems: AttentionItem[] = [];

  // A. Expired Documents
  documents.forEach((doc) => {
    if (doc.hasExpiry && doc.expiryDate) {
      if (doc.expiryDate < now) {
        attentionItems.push({
          id: `doc-exp-${doc.id}`,
          title: `${doc.title} Expired`,
          subtitle: `Category: ${doc.category}`,
          dueDateText: `Expired on ${formatShortDate(doc.expiryDate)}`,
          type: "expired_document",
          urgency: "urgent",
          actionHref: "/documents",
        });
      } else if (doc.expiryDate <= thirtyDaysFromNow) {
        attentionItems.push({
          id: `doc-soon-${doc.id}`,
          title: `${doc.title} Renewal Soon`,
          subtitle: `Category: ${doc.category}`,
          dueDateText: `Expires on ${formatShortDate(doc.expiryDate)}`,
          type: "expiring_document",
          urgency: "warning",
          actionHref: "/documents",
        });
      }
    }
  });

  // B. Critical or Overdue Reminders
  reminders.forEach((rem) => {
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

  // 2. Process UPCOMING items chronologically
  const upcomingEvents: UpcomingEvent[] = [];

  // A. Upcoming Reminders
  reminders.forEach((rem) => {
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

  // Sort chronological order (closest date first)
  upcomingEvents.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

  // 3. Compute REAL SUMMARY STATS (Never fake data)
  const expiredDocsCount = documents.filter(
    (d) => d.hasExpiry && d.expiryDate && d.expiryDate < now
  ).length;

  const expiringSoonDocsCount = documents.filter(
    (d) => d.hasExpiry && d.expiryDate && d.expiryDate >= now && d.expiryDate <= thirtyDaysFromNow
  ).length;

  const pendingReminders = reminders.filter((r) => r.status === "pending");
  const urgentRemindersCount = pendingReminders.filter(
    (r) => r.priority === "urgent" || r.priority === "high" || r.dueDate < now
  ).length;
  const completedRemindersCount = reminders.filter((r) => r.status === "completed").length;

  const pendingPayments = payments.filter((p) => !p.isPaid);
  const totalAmountDue = pendingPayments.reduce((acc, p) => acc + p.amount, 0);
  const overduePaymentsCount = pendingPayments.filter((p) => p.dueDate < now).length;

  const totalExpenseAmount = expenses.reduce((acc, e) => acc + e.amount, 0);

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
      currency,
    },
    expenses: {
      totalRecorded: expenses.length,
      totalAmount: totalExpenseAmount,
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
