// Smart Life Manager - Notification Architecture & Deduplication Engine
import { prisma } from "@/lib/db/prisma";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: "info" | "warning" | "alert" | "success";
  linkUrl?: string;
  deduplicationWindowHours?: number; // Hours within which duplicate titles are blocked
}

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

/**
 * Creates an in-app notification while strictly preventing duplicate notifications
 * within the specified time window (default 12 hours).
 */
export async function createInAppNotification({
  userId,
  title,
  message,
  type = "info",
  linkUrl = "/reminders",
  deduplicationWindowHours = 12,
}: CreateNotificationParams) {
  const windowStart = new Date(Date.now() - deduplicationWindowHours * 60 * 60 * 1000);

  // Check for duplicate notification within window
  const duplicate = await prisma.notification.findFirst({
    where: {
      userId,
      title,
      createdAt: { gte: windowStart },
    },
  });

  if (duplicate) {
    // Duplicate detected; skip creation to protect user from notification spam
    return { created: false, notification: duplicate, reason: "duplicate_prevented" };
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      linkUrl,
      isRead: false,
    },
  });

  return { created: true, notification };
}

/**
 * Dispatches a push notification payload.
 * Checks user settings to respect notification preferences.
 */
export async function dispatchPushNotification({
  userId,
  title,
  body,
  icon = "/icons/icon-192x192.png",
  url = "/reminders",
  tag,
}: PushNotificationPayload) {
  // Check user settings
  const settings = await prisma.userSetting.findUnique({
    where: { userId },
  });

  if (settings && !settings.pushNotifications) {
    return { sent: false, reason: "user_push_disabled" };
  }

  // Push notification payload is formatted according to W3C Push API / Web Notifications standard
  const payload = {
    title,
    options: {
      body,
      icon,
      badge: "/icons/badge-72x72.png",
      tag: tag || `reminder-${Date.now()}`,
      data: { url },
      renotify: false,
    },
    timestamp: new Date().toISOString(),
  };

  // Ready for WebPush / Firebase Cloud Messaging transport layer
  return {
    sent: true,
    method: "web_push_ready",
    payload,
  };
}

/**
 * Triggers dual in-app + push notification for a reminder, with automatic deduplication.
 */
export async function notifyReminderEvent(
  userId: string,
  reminder: { id: string; title: string; dueDate: Date; category?: string },
  preference: string = "both"
) {
  const timeStr = reminder.dueDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = reminder.dueDate.toLocaleDateString();
  const notificationTitle = `Reminder: ${reminder.title}`;
  const message = `Your reminder '${reminder.title}' is scheduled for ${dateStr} at ${timeStr}.`;

  const results: { inApp?: unknown; push?: unknown } = {};

  if (preference === "in_app" || preference === "both") {
    results.inApp = await createInAppNotification({
      userId,
      title: notificationTitle,
      message,
      type: "info",
      linkUrl: "/reminders",
      deduplicationWindowHours: 12,
    });
  }

  if (preference === "push" || preference === "both") {
    results.push = await dispatchPushNotification({
      userId,
      title: notificationTitle,
      body: message,
      url: "/reminders",
      tag: `reminder-${reminder.id}`,
    });
  }

  return results;
}
