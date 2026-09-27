import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatRecurrenceLabel } from "@/lib/reminders/recurring";
import { ReminderListClient, ReminderItem, ReminderTab } from "@/components/reminders/ReminderListClient";

export default async function RemindersPage() {
  const user = await requireUser();

  const rawReminders = await prisma.reminder.findMany({
    where: { userId: user.id },
    orderBy: { dueDate: "asc" },
  });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const endOfTomorrow = new Date(endOfToday.getTime() + 24 * 60 * 60 * 1000);

  const dayOfWeek = now.getDay();
  const daysUntilEndOfWeek = (7 - dayOfWeek) % 7;
  const endOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysUntilEndOfWeek,
    23,
    59,
    59,
    999
  );

  const reminders: ReminderItem[] = rawReminders.map((rem) => {
    const dueDate = new Date(rem.dueDate);
    const recurrenceLabel = formatRecurrenceLabel(rem.recurrenceRule);

    let groupTag: ReminderTab;
    if (rem.status === "completed") {
      groupTag = "completed";
    } else if (dueDate <= endOfToday) {
      groupTag = "today";
    } else if (dueDate <= endOfTomorrow) {
      groupTag = "tomorrow";
    } else if (dueDate <= endOfWeek) {
      groupTag = "this_week";
    } else {
      groupTag = "upcoming";
    }

    const isOverdue = rem.status === "pending" && dueDate < now;

    return {
      id: rem.id,
      title: rem.title,
      description: rem.description,
      dueDate: rem.dueDate.toISOString(),
      priority: rem.priority,
      status: rem.status,
      category: rem.category,
      isRecurring: rem.isRecurring,
      recurrenceRule: rem.recurrenceRule,
      recurrenceLabel,
      groupTag,
      isOverdue,
      dateString: dueDate.toISOString().split("T")[0],
      timeString: dueDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  });

  return <ReminderListClient initialReminders={reminders} />;
}
