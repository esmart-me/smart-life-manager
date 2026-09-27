/**
 * Calculations and recurrence handling for Important Dates
 */

export interface ComputedDateInfo {
  nextOccurrence: Date;
  daysRemaining: number;
  isToday: boolean;
  yearsCount?: number | null; // e.g. 5th Anniversary or turning 30
  label: string;
}

/**
 * Calculates the next occurrence of an event, handling yearly or monthly recurrence
 */
export function calculateNextDateOccurrence(
  eventDate: Date | string,
  recurrence: string = "yearly",
  referenceDate: Date = new Date()
): ComputedDateInfo {
  const orig = new Date(eventDate);
  const now = new Date(referenceDate);

  // Normalize today's date to midnight for accurate day difference
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let next = new Date(orig.getFullYear(), orig.getMonth(), orig.getDate());

  if (recurrence === "yearly") {
    // Set to current year
    next.setFullYear(now.getFullYear());
    // If date has already passed this year, advance to next year
    if (next < todayMidnight) {
      next.setFullYear(now.getFullYear() + 1);
    }
  } else if (recurrence === "monthly") {
    next.setFullYear(now.getFullYear());
    next.setMonth(now.getMonth());
    if (next < todayMidnight) {
      next.setMonth(now.getMonth() + 1);
    }
  }

  const diffMs = next.getTime() - todayMidnight.getTime();
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const isToday = daysRemaining === 0;

  // Calculate year milestone (e.g. 10th anniversary or turning 30)
  let yearsCount: number | null = null;
  if (recurrence === "yearly" && orig.getFullYear() < next.getFullYear()) {
    yearsCount = next.getFullYear() - orig.getFullYear();
  }

  let label = "";
  if (isToday) {
    label = "Today!";
  } else if (daysRemaining === 1) {
    label = "Tomorrow";
  } else if (daysRemaining < 30) {
    label = `In ${daysRemaining} days`;
  } else {
    const months = Math.floor(daysRemaining / 30);
    label = `In ${months} month${months === 1 ? "" : "s"}`;
  }

  return {
    nextOccurrence: next,
    daysRemaining,
    isToday,
    yearsCount,
    label,
  };
}

/**
 * Reuses the existing Reminder system to synchronize Important Date reminders
 */
export async function syncImportantDateReminder(
  prismaClient: any,
  userId: string,
  importantDate: {
    id: string;
    title: string;
    eventDate: Date;
    category: string;
    recurrence: string;
    reminderDaysBefore?: number;
  }
) {
  const info = calculateNextDateOccurrence(importantDate.eventDate, importantDate.recurrence);

  // Set reminder due date (e.g. 7 days before event)
  const daysBefore = importantDate.reminderDaysBefore || 7;
  const reminderDueDate = new Date(info.nextOccurrence.getTime() - daysBefore * 24 * 60 * 60 * 1000);

  const existing = await prismaClient.reminder.findFirst({
    where: {
      userId,
      relatedType: "important_date",
      relatedId: importantDate.id,
    },
  });

  const milestoneText = info.yearsCount ? ` (${info.yearsCount}${getOrdinal(info.yearsCount)} year)` : "";
  const reminderTitle = `${importantDate.title}${milestoneText} on ${info.nextOccurrence.toLocaleDateString()}`;

  if (existing) {
    await prismaClient.reminder.update({
      where: { id: existing.id },
      data: {
        title: reminderTitle,
        dueDate: reminderDueDate,
        priority: "medium",
        category: "personal",
        status: "pending",
        isRecurring: importantDate.recurrence !== "none",
        recurrenceRule: importantDate.recurrence === "yearly" ? "FREQ=YEARLY" : null,
      },
    });
  } else {
    await prismaClient.reminder.create({
      data: {
        userId,
        title: reminderTitle,
        dueDate: reminderDueDate,
        priority: "medium",
        category: "personal",
        relatedType: "important_date",
        relatedId: importantDate.id,
        status: "pending",
        isRecurring: importantDate.recurrence !== "none",
        recurrenceRule: importantDate.recurrence === "yearly" ? "FREQ=YEARLY" : null,
      },
    });
  }
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
