import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateNextDateOccurrence } from "@/lib/dates/calculations";
import { ImportantDateListClient, ImportantDateRecord } from "@/components/dates/ImportantDateListClient";

export const dynamic = "force-dynamic";

export default async function ImportantDatesPage() {
  const user = await requireUser();

  const rawDates = await prisma.importantDate.findMany({
    where: { userId: user.id },
    orderBy: { eventDate: "asc" },
  });

  const now = new Date();
  const dates: ImportantDateRecord[] = rawDates.map((d) => {
    const computed = calculateNextDateOccurrence(d.eventDate, d.recurrence, now);
    return {
      id: d.id,
      title: d.title,
      eventDate: d.eventDate.toISOString(),
      category: d.category,
      recurrence: d.recurrence,
      reminderDaysBefore: d.reminderDaysBefore,
      notes: d.notes,
      computed,
    };
  });

  // Sort chronologically by next occurrence
  dates.sort((a, b) => a.computed.nextOccurrence.getTime() - b.computed.nextOccurrence.getTime());

  return <ImportantDateListClient initialDates={dates} />;
}
