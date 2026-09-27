import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AttentionRequired } from "@/components/dashboard/AttentionRequired";
import { UpcomingSection } from "@/components/dashboard/UpcomingSection";
import { AttentionItem, UpcomingItem } from "@/types";
import { formatShortDate } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();

  // Fetch real user-scoped data (Strictly scoped by user.id)
  // For new accounts or phase 1, queries return real empty arrays -> zero fake data!
  const [urgentReminders, urgentDocuments, upcomingReminders, upcomingPayments] = await Promise.all([
    prisma.reminder.findMany({
      where: {
        userId: user.id,
        status: "pending",
        priority: { in: ["urgent", "high"] },
      },
      take: 5,
      orderBy: { dueDate: "asc" },
    }),
    prisma.document.findMany({
      where: {
        userId: user.id,
        hasExpiry: true,
        expiryDate: {
          not: null,
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // within 30 days
        },
      },
      take: 5,
      orderBy: { expiryDate: "asc" },
    }),
    prisma.reminder.findMany({
      where: {
        userId: user.id,
        status: "pending",
        dueDate: { gte: new Date() },
      },
      take: 5,
      orderBy: { dueDate: "asc" },
    }),
    prisma.payment.findMany({
      where: {
        userId: user.id,
        isPaid: false,
        dueDate: { gte: new Date() },
      },
      take: 5,
      orderBy: { dueDate: "asc" },
    }),
  ]);

  // Transform into UI display contracts
  const attentionItems: AttentionItem[] = [
    ...urgentDocuments.map((doc) => ({
      id: doc.id,
      title: `${doc.title} Expiring Soon`,
      subtitle: `Document category: ${doc.category}`,
      dueDate: doc.expiryDate ? formatShortDate(doc.expiryDate) : "Upcoming",
      urgency: "urgent" as const,
      category: "document" as const,
      actionHref: "/documents",
    })),
    ...urgentReminders.map((rem) => ({
      id: rem.id,
      title: rem.title,
      subtitle: rem.description || "High priority reminder",
      dueDate: formatShortDate(rem.dueDate),
      urgency: "high" as const,
      category: "reminder" as const,
      actionHref: "/reminders",
    })),
  ];

  const upcomingItems: UpcomingItem[] = [
    ...upcomingReminders.map((rem) => ({
      id: rem.id,
      title: rem.title,
      subtitle: rem.description || undefined,
      eventDate: formatShortDate(rem.dueDate),
      category: "Reminder",
      actionHref: "/reminders",
    })),
    ...upcomingPayments.map((pay) => ({
      id: pay.id,
      title: pay.title,
      subtitle: pay.payee ? `Payee: ${pay.payee}` : undefined,
      eventDate: formatShortDate(pay.dueDate),
      category: "Bill",
      actionHref: "/finance",
    })),
  ];

  return (
    <div className="space-y-6">
      {/* 1. Welcome Message & Today's Date */}
      <WelcomeBanner displayName={user.displayName || "User"} />

      {/* 2. Quick Action Area */}
      <QuickActions />

      {/* 3. Attention Required Section (Empty state when clear, no fake data) */}
      <AttentionRequired items={attentionItems} />

      {/* 4. Upcoming Section (Empty state when clear, no fake data) */}
      <UpcomingSection items={upcomingItems} />
    </div>
  );
}
