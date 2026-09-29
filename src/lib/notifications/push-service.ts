// src/lib/notifications/push-service.ts
// Secure Web Push transport service using standard VAPID credentials.
// Never exposes private VAPID key to client code.
// Automatically cleans up expired subscriptions (HTTP 410/404).

import webpush from "web-push";
import { prisma } from "@/lib/db/prisma";

// Configure Web Push with VAPID credentials from environment
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const privateKey = process.env.VAPID_PRIVATE_KEY || "";
const subject = process.env.VAPID_SUBJECT || "mailto:support@smartlifemanager.local";

let isVapidConfigured = false;
if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    isVapidConfigured = true;
  } catch (err) {
    console.error("[PushService] Failed to configure VAPID:", err);
  }
}

export function getVapidPublicKey(): string | null {
  return publicKey || null;
}

export function isPushConfigured(): boolean {
  return isVapidConfigured;
}

export interface SaveSubscriptionParams {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

/**
 * Saves or updates a browser Web Push subscription for the authenticated user.
 */
export async function savePushSubscription({
  userId,
  endpoint,
  keys,
  userAgent,
}: SaveSubscriptionParams) {
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new Error("Invalid push subscription format: endpoint and keys required.");
  }

  return await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      userId,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent || null,
      updatedAt: new Date(),
    },
    create: {
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent || null,
    },
  });
}

/**
 * Removes a push subscription by endpoint (e.g. when user unregisters).
 */
export async function removePushSubscription(endpoint: string, userId?: string) {
  if (userId) {
    return await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId },
    });
  }
  return await prisma.pushSubscription.deleteMany({
    where: { endpoint },
  });
}

export interface SendPushParams {
  userId: string;
  title: string;
  body: string;
  url?: string;
  priority?: "critical" | "high" | "medium" | "low";
  icon?: string;
  tag?: string;
}

/**
 * Dispatches a Web Push notification to all active devices registered by the user.
 * Cleans up invalid or expired endpoints automatically.
 */
export async function sendWebPushToUser({
  userId,
  title,
  body,
  url = "/reminders",
  priority = "medium",
  icon = "/icons/icon-192x192.png",
  tag,
}: SendPushParams) {
  if (!isVapidConfigured) {
    return { sent: false, deliveredCount: 0, reason: "vapid_not_configured" };
  }

  // 1. Fetch user's active push subscriptions
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { sent: false, deliveredCount: 0, reason: "no_active_subscriptions" };
  }

  // 2. Format payload according to Web Push standards
  const payloadString = JSON.stringify({
    title,
    body,
    icon,
    badge: "/icons/badge-72x72.png",
    tag: tag || `slm-${Date.now()}`,
    priority,
    url,
    data: {
      url,
      priority,
      timestamp: new Date().toISOString(),
    },
  });

  let deliveredCount = 0;
  const expiredEndpoints: string[] = [];

  // 3. Dispatch to all user devices in parallel
  const sendPromises = subscriptions.map(async (sub) => {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSub, payloadString, {
        TTL: priority === "critical" ? 86400 : 3600, // 24h for critical, 1h for normal
        urgency: priority === "critical" ? "high" : "normal",
      });
      deliveredCount++;
    } catch (error: any) {
      // 404 Not Found or 410 Gone indicates the browser unregistered or cleared the subscription
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        expiredEndpoints.push(sub.endpoint);
      } else {
        console.warn(`[PushService] Failed to send push to endpoint:`, error?.message || error);
      }
    }
  });

  await Promise.all(sendPromises);

  // 4. Prune expired endpoints
  if (expiredEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: expiredEndpoints } },
    });
  }

  return {
    sent: deliveredCount > 0,
    deliveredCount,
    totalDevices: subscriptions.length,
    prunedDevices: expiredEndpoints.length,
  };
}
