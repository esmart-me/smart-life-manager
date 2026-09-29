// src/lib/notifications/scheduler.ts
// Backend Scheduler Engine for Smart Life Manager Notifications.
// Scans across life modules (Reminders, Documents, Vehicles, Payments, Subscriptions, Important Dates).
// Implements missed notification handling, quiet hours, and duplicate prevention.

import { prisma } from "@/lib/db/prisma";
import { createSmartNotification, NotificationPriority } from "./notification-service";

export interface SchedulerRunResult {
  timestamp: string;
  usersProcessed: number;
  notificationsCreated: number;
  duplicatesPrevented: number;
  missedExpiredSkipped: number;
  details: string[];
}

/**
 * Calculates the exact trigger time for a reminder given its dueDate and timing preference.
 */
export function calculateReminderTriggerTime(
  dueDate: Date,
  reminderTiming: string = "exact",
  customMinutes?: number | null
): Date {
  const dueMs = dueDate.getTime();
  let offsetMs = 0;

  switch (reminderTiming) {
    case "5m":
      offsetMs = 5 * 60 * 1000;
      break;
    case "15m":
      offsetMs = 15 * 60 * 1000;
      break;
    case "30m":
      offsetMs = 30 * 60 * 1000;
      break;
    case "1h":
      offsetMs = 60 * 60 * 1000;
      break;
    case "1d":
      offsetMs = 24 * 60 * 60 * 1000;
      break;
    case "3d":
      offsetMs = 3 * 24 * 60 * 60 * 1000;
      break;
    case "7d":
      offsetMs = 7 * 24 * 60 * 60 * 1000;
      break;
    case "30d":
      offsetMs = 30 * 24 * 60 * 60 * 1000;
      break;
    case "custom":
      offsetMs = (customMinutes || 0) * 60 * 1000;
      break;
    case "exact":
    default:
      offsetMs = 0;
      break;
  }

  return new Date(dueMs - offsetMs);
}

/**
 * Executes a full scheduler cycle for all users (or scoped to a single user).
 * Can be run via Next.js API route, background worker, or cron trigger.
 */
export async function runNotificationScheduler(targetUserId?: string): Promise<SchedulerRunResult> {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let notificationsCreated = 0;
  let duplicatesPrevented = 0;
  let missedExpiredSkipped = 0;
  const details: string[] = [];

  // Filter users
  const userFilter = targetUserId ? { id: targetUserId } : {};
  const users = await prisma.user.findMany({
    where: userFilter,
    select: { id: true, email: true },
  });

  for (const user of users) {
    const userId = user.id;

    // =========================================================================
    // 1. Reminders
    // =========================================================================
    const reminders = await prisma.reminder.findMany({
      where: {
        userId,
        status: "pending",
      },
    });

    for (const r of reminders) {
      const triggerTime = calculateReminderTriggerTime(r.dueDate, r.reminderTiming, r.customMinutesBefore);

      // Check if trigger time has arrived
      if (triggerTime <= now) {
        // Section 14: Missed Notification Handling
        // If scheduled over 7 days ago, skip to avoid spamming after long downtime
        if (triggerTime < sevenDaysAgo) {
          missedExpiredSkipped++;
          continue;
        }

        const deliveryKey = `rem-${r.id}-${r.dueDate.toISOString().split("T")[0]}-${r.reminderTiming}`;
        const priority: NotificationPriority =
          r.priority === "urgent" ? "critical" : (r.priority as NotificationPriority) || "medium";

        const res = await createSmartNotification({
          userId,
          title: `Reminder: ${r.title}`,
          message: r.description || `Your reminder '${r.title}' is due.`,
          type: priority === "critical" ? "alert" : "info",
          priority,
          category: "reminder",
          linkUrl: "/reminders",
          deliveryKey,
        });

        if (res.created) {
          notificationsCreated++;
          details.push(`Reminder notified: ${r.title} for user ${user.email}`);
        } else if (res.reason?.includes("duplicate")) {
          duplicatesPrevented++;
        }
      }
    }

    // =========================================================================
    // 2. Documents Expiry
    // =========================================================================
    const documents = await prisma.document.findMany({
      where: {
        userId,
        hasExpiry: true,
        expiryDate: { not: null },
      },
    });

    for (const d of documents) {
      if (!d.expiryDate) continue;
      const daysUntil = Math.ceil((d.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let alertStage: string | null = null;
      let priority: NotificationPriority = "medium";

      if (daysUntil < 0 && daysUntil >= -7) {
        alertStage = "expired";
        priority = "critical";
      } else if (daysUntil === 1) {
        alertStage = "1d";
        priority = "high";
      } else if (daysUntil === 7) {
        alertStage = "7d";
        priority = "medium";
      } else if (daysUntil === 30) {
        alertStage = "30d";
        priority = "low";
      }

      if (alertStage) {
        const deliveryKey = `doc-exp-${d.id}-${alertStage}-${todayStr}`;
        const message =
          alertStage === "expired"
            ? `Your document '${d.title}' expired ${Math.abs(daysUntil)} day(s) ago.`
            : `Your document '${d.title}' expires in ${daysUntil} day(s).`;

        const res = await createSmartNotification({
          userId,
          title: alertStage === "expired" ? `Document Expired: ${d.title}` : `Document Renewal Notice: ${d.title}`,
          message,
          type: alertStage === "expired" ? "alert" : "warning",
          priority,
          category: "document",
          linkUrl: `/documents/${d.id}`,
          deliveryKey,
        });

        if (res.created) {
          notificationsCreated++;
          details.push(`Document expiry notified: ${d.title} (${alertStage})`);
        } else if (res.reason?.includes("duplicate")) {
          duplicatesPrevented++;
        }
      }
    }

    // =========================================================================
    // 3. Vehicles: Insurance, Registration & Service Expiry
    // =========================================================================
    const vehicles = await prisma.vehicle.findMany({
      where: { userId },
    });

    for (const v of vehicles) {
      // Insurance Expiry
      if (v.insuranceExpiry) {
        const insDays = Math.ceil((v.insuranceExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        let insStage: string | null = null;
        let insPriority: NotificationPriority = "high";

        if (insDays < 0 && insDays >= -7) {
          insStage = "expired";
          insPriority = "critical";
        } else if (insDays === 1) {
          insStage = "1d";
          insPriority = "critical";
        } else if (insDays === 7) {
          insStage = "7d";
          insPriority = "high";
        } else if (insDays === 30) {
          insStage = "30d";
          insPriority = "medium";
        }

        if (insStage) {
          const deliveryKey = `veh-ins-${v.id}-${insStage}-${todayStr}`;
          const res = await createSmartNotification({
            userId,
            title: insStage === "expired" ? `Car Insurance Expired: ${v.name}` : `Car Insurance Renewal: ${v.name}`,
            message:
              insStage === "expired"
                ? `Insurance for ${v.name} expired ${Math.abs(insDays)} day(s) ago. Renew immediately.`
                : `Insurance for ${v.name} expires in ${insDays} day(s).`,
            type: insPriority === "critical" ? "alert" : "warning",
            priority: insPriority,
            category: "vehicle",
            linkUrl: `/vehicles/${v.id}`,
            deliveryKey,
          });

          if (res.created) notificationsCreated++;
          else if (res.reason?.includes("duplicate")) duplicatesPrevented++;
        }
      }

      // Registration Expiry
      if (v.registrationExpiry) {
        const regDays = Math.ceil((v.registrationExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        let regStage: string | null = null;
        let regPriority: NotificationPriority = "medium";

        if (regDays < 0 && regDays >= -7) {
          regStage = "expired";
          regPriority = "critical";
        } else if (regDays === 1) {
          regStage = "1d";
          regPriority = "high";
        } else if (regDays === 7) {
          regStage = "7d";
          regPriority = "medium";
        } else if (regDays === 30) {
          regStage = "30d";
          regPriority = "low";
        }

        if (regStage) {
          const deliveryKey = `veh-reg-${v.id}-${regStage}-${todayStr}`;
          const res = await createSmartNotification({
            userId,
            title: regStage === "expired" ? `Registration Expired: ${v.name}` : `Vehicle Registration Due: ${v.name}`,
            message: `Registration for ${v.name} ${regStage === "expired" ? "is expired" : `expires in ${regDays} day(s)`}.`,
            type: regPriority === "critical" ? "alert" : "info",
            priority: regPriority,
            category: "vehicle",
            linkUrl: `/vehicles/${v.id}`,
            deliveryKey,
          });

          if (res.created) notificationsCreated++;
          else if (res.reason?.includes("duplicate")) duplicatesPrevented++;
        }
      }
    }

    // =========================================================================
    // 4. Payments: Upcoming & Overdue Bills
    // =========================================================================
    const payments = await prisma.payment.findMany({
      where: {
        userId,
        isPaid: false,
      },
    });

    for (const p of payments) {
      const daysUntilDue = Math.ceil((p.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      let payStage: string | null = null;
      let payPriority: NotificationPriority = "medium";

      if (daysUntilDue < 0 && daysUntilDue >= -7) {
        payStage = "overdue";
        payPriority = "critical";
      } else if (daysUntilDue === 1) {
        payStage = "1d";
        payPriority = "high";
      } else if (daysUntilDue === 3) {
        payStage = "3d";
        payPriority = "medium";
      } else if (daysUntilDue === 7) {
        payStage = "7d";
        payPriority = "low";
      }

      if (payStage) {
        const deliveryKey = `pay-${p.id}-${payStage}-${todayStr}`;
        const res = await createSmartNotification({
          userId,
          title: payStage === "overdue" ? `Payment Overdue: ${p.title}` : `Payment Due Soon: ${p.title}`,
          message:
            payStage === "overdue"
              ? `Bill '${p.title}' of ${p.currency} ${p.amount.toFixed(2)} is overdue by ${Math.abs(daysUntilDue)} day(s).`
              : `Bill '${p.title}' of ${p.currency} ${p.amount.toFixed(2)} is due in ${daysUntilDue} day(s).`,
          type: payPriority === "critical" ? "alert" : "warning",
          priority: payPriority,
          category: "payment",
          linkUrl: `/payments/${p.id}`,
          deliveryKey,
        });

        if (res.created) notificationsCreated++;
        else if (res.reason?.includes("duplicate")) duplicatesPrevented++;
      }
    }

    // =========================================================================
    // 5. Subscriptions: Upcoming Renewals
    // =========================================================================
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        renewalStatus: "active",
      },
    });

    for (const s of subscriptions) {
      const daysUntilRenewal = Math.ceil((s.nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilRenewal === 3 || daysUntilRenewal === 1) {
        const deliveryKey = `sub-${s.id}-${daysUntilRenewal}d-${todayStr}`;
        const res = await createSmartNotification({
          userId,
          title: `Subscription Renewal: ${s.name}`,
          message: `Your ${s.name} subscription (${s.currency} ${s.cost.toFixed(2)}) renews in ${daysUntilRenewal} day(s).`,
          type: "info",
          priority: "low",
          category: "subscription",
          linkUrl: "/subscriptions",
          deliveryKey,
        });

        if (res.created) notificationsCreated++;
        else if (res.reason?.includes("duplicate")) duplicatesPrevented++;
      }
    }

    // =========================================================================
    // 6. Important Dates & Milestones
    // =========================================================================
    const importantDates = await prisma.importantDate.findMany({
      where: { userId },
    });

    for (const idObj of importantDates) {
      // Annual recurring calculation
      let targetDate = new Date(idObj.eventDate);
      if (idObj.recurrence === "yearly") {
        targetDate = new Date(now.getFullYear(), idObj.eventDate.getMonth(), idObj.eventDate.getDate());
        if (targetDate.getTime() < now.getTime() - 86400000) {
          targetDate.setFullYear(now.getFullYear() + 1);
        }
      }

      const daysUntil = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil === idObj.reminderDaysBefore || daysUntil === 1) {
        const deliveryKey = `date-${idObj.id}-${daysUntil}d-${todayStr}`;
        const res = await createSmartNotification({
          userId,
          title: `Upcoming Date: ${idObj.title}`,
          message: `'${idObj.title}' is coming up in ${daysUntil} day(s).`,
          type: "info",
          priority: "medium",
          category: "date",
          linkUrl: `/dates/${idObj.id}`,
          deliveryKey,
        });

        if (res.created) notificationsCreated++;
        else if (res.reason?.includes("duplicate")) duplicatesPrevented++;
      }
    }
  }

  return {
    timestamp: now.toISOString(),
    usersProcessed: users.length,
    notificationsCreated,
    duplicatesPrevented,
    missedExpiredSkipped,
    details,
  };
}
