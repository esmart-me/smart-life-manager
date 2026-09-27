import { prisma } from "@/lib/db/prisma";
import { REMINDER_MILESTONES, ReminderMilestone } from "./constants";

/**
 * Synchronizes reminder events for a document's expiry milestones.
 * Prevents duplicates by uniquely identifying reminders by documentId + milestone rule.
 */
export async function syncDocumentReminders(
  userId: string,
  documentId: string,
  documentTitle: string,
  expiryDate: Date | null,
  activeMilestones: number[] = [30, 7, 1]
): Promise<void> {
  // If document has no expiry date, remove any existing scheduled reminders for it
  if (!expiryDate) {
    await prisma.reminder.deleteMany({
      where: {
        userId,
        relatedType: "document",
        relatedId: documentId,
      },
    });
    return;
  }

  // Iterate through all supported milestones
  for (const milestone of REMINDER_MILESTONES) {
    const isRequested = activeMilestones.includes(milestone);
    const ruleIdentifier = `doc_expiry_${milestone}d`;

    if (!isRequested) {
      // User disabled or did not select this milestone; remove any existing reminder
      await prisma.reminder.deleteMany({
        where: {
          userId,
          relatedType: "document",
          relatedId: documentId,
          recurrenceRule: ruleIdentifier,
        },
      });
      continue;
    }

    // Calculate milestone target trigger date
    const targetDueDate = new Date(expiryDate.getTime() - milestone * 24 * 60 * 60 * 1000);

    // Check if an existing reminder for this specific milestone already exists
    const existing = await prisma.reminder.findFirst({
      where: {
        userId,
        relatedType: "document",
        relatedId: documentId,
        recurrenceRule: ruleIdentifier,
      },
    });

    const priority = milestone === 1 ? "urgent" : milestone === 7 ? "high" : "medium";
    const formattedExpiry = expiryDate.toISOString().split("T")[0];
    const reminderTitle = `${documentTitle} - Expiry in ${milestone} ${milestone === 1 ? "day" : "days"}`;
    const description = `Milestone notification: ${documentTitle} expires on ${formattedExpiry}. Please initiate renewal or review.`;

    if (existing) {
      // Update existing reminder to keep it in sync without creating a duplicate
      await prisma.reminder.update({
        where: { id: existing.id },
        data: {
          title: reminderTitle,
          description,
          dueDate: targetDueDate,
          priority,
        },
      });
    } else {
      // Create new unique reminder
      await prisma.reminder.create({
        data: {
          userId,
          title: reminderTitle,
          description,
          dueDate: targetDueDate,
          priority,
          status: "pending",
          category: "document",
          relatedType: "document",
          relatedId: documentId,
          recurrenceRule: ruleIdentifier,
        },
      });
    }
  }
}
