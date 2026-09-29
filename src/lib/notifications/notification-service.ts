// src/lib/notifications/notification-service.ts
// Smart Life Manager - Smart Notification & Reminder Engine
// Handles in-app notifications, user preferences, quiet hours, priority filtering, and duplicate prevention.

import { prisma } from "@/lib/db/prisma";
import { sendWebPushToUser } from "./push-service";

export type NotificationPriority = "critical" | "high" | "medium" | "low";
export type NotificationCategory =
  | "reminder"
  | "document"
  | "vehicle"
  | "payment"
  | "subscription"
  | "date"
  | "general";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: "info" | "warning" | "alert" | "success";
  priority?: NotificationPriority;
  category?: NotificationCategory;
  linkUrl?: string;
  deliveryKey?: string;
  deduplicationWindowHours?: number;
  skipPush?: boolean;
}

/**
 * Checks if the current time falls within the customer's configured Quiet Hours
 * using the customer's specific timezone (e.g. "America/New_York", "Asia/Dubai").
 */
export function isInQuietHours(
  quietHoursStart: string, // e.g. "22:00"
  quietHoursEnd: string,   // e.g. "07:00"
  timezone: string = "UTC"
): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "UTC",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    });

    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
    const currentMins = hour * 60 + minute;

    const startParts = (quietHoursStart || "22:00").split(":");
    const endParts = (quietHoursEnd || "07:00").split(":");

    const startH = isNaN(Number(startParts[0])) ? 22 : Number(startParts[0]);
    const startM = isNaN(Number(startParts[1])) ? 0 : Number(startParts[1]);
    const endH = isNaN(Number(endParts[0])) ? 7 : Number(endParts[0]);
    const endM = isNaN(Number(endParts[1])) ? 0 : Number(endParts[1]);

    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    // If quiet hours span across midnight (e.g. 22:00 to 07:00)
    if (startMins > endMins) {
      return currentMins >= startMins || currentMins < endMins;
    }
    // If quiet hours are within the same calendar day (e.g. 13:00 to 15:00 or 00:00 to 23:59)
    return currentMins >= startMins && currentMins <= endMins;
  } catch {
    // If timezone parsing fails, safely default to not blocking
    return false;
  }
}

/**
 * Creates and dispatches an in-app and web-push notification while enforcing:
 * 1. User notification settings (master toggle, priority filters, module filters)
 * 2. Quiet hours protection (blocking non-critical notifications)
 * 3. Duplicate prevention via deliveryKey or time-window deduplication
 */
export async function createSmartNotification({
  userId,
  title,
  message,
  type = "info",
  priority = "medium",
  category = "general",
  linkUrl = "/reminders",
  deliveryKey,
  deduplicationWindowHours = 12,
  skipPush = false,
}: CreateNotificationParams) {
  // 1. Fetch user's settings and timezone profile in parallel
  const [settings, profile] = await Promise.all([
    prisma.userSetting.findUnique({ where: { userId } }),
    prisma.profile.findUnique({ where: { userId }, select: { timezone: true } }),
  ]);

  const timezone = profile?.timezone || "UTC";

  // 2. Check master notifications toggle
  if (settings && !settings.notificationsEnabled && priority !== "critical") {
    return { created: false, reason: "notifications_disabled_by_user" };
  }

  // 3. Check priority-level filter
  if (settings) {
    if (priority === "critical" && !settings.notifyCritical) {
      return { created: false, reason: "critical_notifications_muted" };
    }
    if (priority === "high" && !settings.notifyHigh) {
      return { created: false, reason: "high_priority_muted" };
    }
    if (priority === "medium" && !settings.notifyMedium) {
      return { created: false, reason: "medium_priority_muted" };
    }
    if (priority === "low" && !settings.notifyLow) {
      return { created: false, reason: "low_priority_muted" };
    }
  }

  // 4. Check category-level filter
  if (settings) {
    if (category === "reminder" && !settings.notifyReminders && priority !== "critical") {
      return { created: false, reason: "reminder_category_muted" };
    }
    if (category === "payment" && !settings.notifyPayments && priority !== "critical") {
      return { created: false, reason: "payment_category_muted" };
    }
    if (category === "document" && !settings.notifyDocuments && priority !== "critical") {
      return { created: false, reason: "document_category_muted" };
    }
    if (category === "vehicle" && !settings.notifyVehicles && priority !== "critical") {
      return { created: false, reason: "vehicle_category_muted" };
    }
    if (category === "subscription" && !settings.notifySubscriptions && priority !== "critical") {
      return { created: false, reason: "subscription_category_muted" };
    }
    if (category === "date" && !settings.notifyImportantDates && priority !== "critical") {
      return { created: false, reason: "date_category_muted" };
    }
  }

  // 5. Check Quiet Hours
  if (settings?.quietHoursEnabled) {
    const isQuiet = isInQuietHours(
      settings.quietHoursStart || "22:00",
      settings.quietHoursEnd || "07:00",
      timezone
    );

    if (isQuiet) {
      const allowCritical = settings.allowCriticalInQuietHours;
      if (priority !== "critical" || !allowCritical) {
        return { created: false, reason: "quiet_hours_active" };
      }
    }
  }

  // 6. Duplicate Prevention (Section 13)
  if (deliveryKey) {
    const existingByKey = await prisma.notification.findFirst({
      where: { userId, deliveryKey },
    });
    if (existingByKey) {
      return { created: false, notification: existingByKey, reason: "duplicate_key_prevented" };
    }
  } else {
    // Window-based deduplication
    const windowStart = new Date(Date.now() - deduplicationWindowHours * 60 * 60 * 1000);
    const existingByTitle = await prisma.notification.findFirst({
      where: {
        userId,
        title,
        createdAt: { gte: windowStart },
      },
    });
    if (existingByTitle) {
      return { created: false, notification: existingByTitle, reason: "duplicate_window_prevented" };
    }
  }

  // 7. Store Notification in Database
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      priority,
      category,
      linkUrl,
      deliveryKey: deliveryKey || null,
      status: "delivered",
      isRead: false,
    },
  });

  // 8. Dispatch Web Push Notification (if enabled in user settings and not skipped)
  let pushResult = null;
  if (!skipPush && (!settings || settings.pushNotifications)) {
    pushResult = await sendWebPushToUser({
      userId,
      title,
      body: message,
      url: linkUrl,
      priority,
      tag: deliveryKey || `notif-${notification.id}`,
    });
  }

  return {
    created: true,
    notification,
    pushResult,
  };
}

/**
 * Backward-compatible helper for existing code paths
 */
export async function createInAppNotification(params: CreateNotificationParams) {
  return createSmartNotification(params);
}

/**
 * Dispatches notification when a reminder is created or triggered
 */
export async function notifyReminderEvent(
  userId: string,
  reminder: { id: string; title: string; description?: string | null; priority?: string },
  preference?: string
) {
  const priority: NotificationPriority =
    reminder.priority === "urgent" ? "critical" : (reminder.priority as NotificationPriority) || "medium";

  return createSmartNotification({
    userId,
    title: `Reminder Scheduled: ${reminder.title}`,
    message: reminder.description || `Reminder '${reminder.title}' has been successfully scheduled.`,
    priority,
    category: "reminder",
    linkUrl: "/reminders",
    deliveryKey: `rem-created-${reminder.id}`,
    skipPush: preference === "in_app_only",
  });
}
