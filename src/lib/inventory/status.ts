import { prisma } from "@/lib/db/prisma";

export type WarrantyStatus = "active" | "expiring_soon" | "expired" | "unknown";

export interface WarrantyCalculationResult {
  status: WarrantyStatus;
  daysRemaining: number | null;
  label: string;
}

/**
 * Calculates warranty status and remaining days
 */
export function calculateWarrantyStatus(
  warrantyExpiry: Date | string | null | undefined,
  warrantyStart?: Date | string | null | undefined
): WarrantyCalculationResult {
  if (!warrantyExpiry) {
    return {
      status: "unknown",
      daysRemaining: null,
      label: "No Warranty",
    };
  }

  const expiry = typeof warrantyExpiry === "string" ? new Date(warrantyExpiry) : warrantyExpiry;
  if (isNaN(expiry.getTime())) {
    return {
      status: "unknown",
      daysRemaining: null,
      label: "Invalid Expiry",
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const target = new Date(expiry);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      status: "expired",
      daysRemaining,
      label: `Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} ago`,
    };
  }

  if (daysRemaining <= 30) {
    return {
      status: "expiring_soon",
      daysRemaining,
      label: `Expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`,
    };
  }

  return {
    status: "active",
    daysRemaining,
    label: `${daysRemaining} days remaining`,
  };
}

/**
 * Synchronizes advance warranty reminders in the central Reminder system
 */
export async function syncWarrantyReminder(
  userId: string,
  itemId: string,
  itemName: string,
  warrantyExpiryDate: Date,
  daysBefore: number = 30
): Promise<void> {
  const existing = await prisma.reminder.findFirst({
    where: {
      userId,
      relatedType: "inventory_warranty",
      relatedId: itemId,
    },
  });

  const reminderDueDate = new Date(warrantyExpiryDate);
  reminderDueDate.setDate(reminderDueDate.getDate() - daysBefore);

  const title = `Warranty Expiring: ${itemName} (${daysBefore}d warning)`;
  const description = `The warranty for ${itemName} expires on ${warrantyExpiryDate.toISOString().split("T")[0]}. Check coverage or extend if applicable.`;

  if (existing) {
    await prisma.reminder.update({
      where: { id: existing.id },
      data: {
        title,
        description,
        dueDate: reminderDueDate,
        priority: "high",
        category: "general",
        status: reminderDueDate < new Date() ? "completed" : "pending",
      },
    });
  } else if (reminderDueDate >= new Date()) {
    await prisma.reminder.create({
      data: {
        userId,
        title,
        description,
        dueDate: reminderDueDate,
        priority: "high",
        category: "general",
        relatedType: "inventory_warranty",
        relatedId: itemId,
      },
    });
  }
}
