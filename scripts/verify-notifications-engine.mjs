// scripts/verify-notifications-engine.mjs
// Phase 12 Verification Script - Smart Notification & Reminder Engine

import { PrismaClient } from "@prisma/client";
import {
  isInQuietHours,
  createSmartNotification,
} from "../src/lib/notifications/notification-service.ts";
import {
  calculateReminderTriggerTime,
  runNotificationScheduler,
} from "../src/lib/notifications/scheduler.ts";
import {
  getVapidPublicKey,
  isPushConfigured,
  savePushSubscription,
  removePushSubscription,
} from "../src/lib/notifications/push-service.ts";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runVerification() {
  console.log("==================================================");
  console.log("PHASE 12 — SMART NOTIFICATION ENGINE VERIFICATION");
  console.log("==================================================\n");

  // 1. Files & Assets verification
  console.log("1. Verifying Files & Assets...");
  assert(fs.existsSync(path.resolve("public/sw.js")), "Service worker public/sw.js exists");
  assert(fs.existsSync(path.resolve("src/lib/notifications/sound.ts")), "Audio synthesizer sound.ts exists");
  assert(fs.existsSync(path.resolve("src/components/notifications/NotificationBellDropdown.tsx")), "NotificationBellDropdown component exists");

  // 2. VAPID Configuration
  console.log("\n2. Verifying VAPID Credentials & Push Configuration...");
  const vapidKey = getVapidPublicKey();
  assert(Boolean(vapidKey && vapidKey.length > 20), `VAPID public key loaded properly (${vapidKey?.slice(0, 10)}...)`);
  assert(isPushConfigured(), "Web Push transport configured successfully with VAPID details");

  // 3. User Setup for Testing
  console.log("\n3. Setting Up Test User Context...");
  let testUser = await prisma.user.findFirst({
    where: { email: "notification-test@smartlifemanager.local" },
  });

  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: "notification-test@smartlifemanager.local",
        passwordHash: "test-hash",
        role: "user",
        profile: {
          create: {
            firstName: "Notif",
            lastName: "Tester",
            timezone: "America/New_York",
          },
        },
        settings: {
          create: {
            notificationsEnabled: true,
            notifyCritical: true,
            notifyHigh: true,
            notifyMedium: true,
            notifyLow: true,
            notifyReminders: true,
            notifyPayments: true,
            notifyDocuments: true,
            notifyVehicles: true,
            notifySubscriptions: true,
            notifyImportantDates: true,
            quietHoursEnabled: false,
            quietHoursStart: "22:00",
            quietHoursEnd: "07:00",
            allowCriticalInQuietHours: true,
            soundEnabled: true,
          },
        },
      },
    });
  }

  assert(Boolean(testUser?.id), `Test user authenticated/available: ${testUser.id}`);

  // 4. Test In-App Notification Center & DB Creation
  console.log("\n4. Verifying Smart Notification Creation & Delivery...");
  const notif1 = await createSmartNotification({
    userId: testUser.id,
    title: "Test Critical Notification",
    message: "Immediate action required for testing.",
    priority: "critical",
    category: "payment",
    linkUrl: "/payments",
    deliveryKey: `test-crit-${Date.now()}`,
    skipPush: true,
  });

  assert(notif1.created === true, "Critical notification created in database");
  assert(notif1.notification?.priority === "critical", "Priority preserved as critical");
  assert(notif1.notification?.category === "payment", "Category preserved as payment");

  // 5. Test Duplicate Prevention (deliveryKey)
  console.log("\n5. Verifying Duplicate Prevention...");
  const duplicateAttempt = await createSmartNotification({
    userId: testUser.id,
    title: "Test Critical Notification",
    message: "Immediate action required for testing.",
    priority: "critical",
    category: "payment",
    linkUrl: "/payments",
    deliveryKey: notif1.notification?.deliveryKey,
    skipPush: true,
  });

  assert(duplicateAttempt.created === false, "Duplicate notification blocked with deliveryKey");
  assert(duplicateAttempt.reason === "duplicate_key_prevented", "Reason recorded as duplicate_key_prevented");

  // 6. Test Timezone-aware Quiet Hours calculation
  console.log("\n6. Verifying Timezone-Aware Quiet Hours Logic...");
  const overnightCheck = isInQuietHours("22:00", "07:00", "America/New_York");
  // At any given time, isInQuietHours returns boolean without crashing
  assert(typeof overnightCheck === "boolean", "Quiet hours evaluated cleanly with timezone America/New_York");

  // Check custom daytime quiet window
  const customWindowCheck = isInQuietHours("00:00", "23:59", "UTC");
  assert(customWindowCheck === true, "Full-day quiet window accurately evaluates to true");

  // 7. Test Critical Bypass during Quiet Hours
  console.log("\n7. Verifying Quiet Hours Enforcement & Critical Bypass...");
  // Temporarily enable quiet hours for full day
  await prisma.userSetting.update({
    where: { userId: testUser.id },
    data: {
      quietHoursEnabled: true,
      quietHoursStart: "00:00",
      quietHoursEnd: "23:59",
      allowCriticalInQuietHours: true,
    },
  });

  const lowPriorityDuringQuiet = await createSmartNotification({
    userId: testUser.id,
    title: "Low Priority During Quiet Hours",
    message: "Should be muted.",
    priority: "low",
    category: "general",
    deliveryKey: `test-quiet-low-${Date.now()}`,
    skipPush: true,
  });
  assert(lowPriorityDuringQuiet.created === false, "Low priority notification muted during quiet hours");
  assert(lowPriorityDuringQuiet.reason === "quiet_hours_active", "Reason is quiet_hours_active");

  const criticalDuringQuiet = await createSmartNotification({
    userId: testUser.id,
    title: "Emergency Critical Bypass",
    message: "Must bypass quiet hours.",
    priority: "critical",
    category: "payment",
    deliveryKey: `test-quiet-crit-${Date.now()}`,
    skipPush: true,
  });
  assert(criticalDuringQuiet.created === true, "Critical alert successfully bypasses quiet hours");

  // Restore user quiet hours
  await prisma.userSetting.update({
    where: { userId: testUser.id },
    data: {
      quietHoursEnabled: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    },
  });

  // 8. Test Priority & Module Toggles
  console.log("\n8. Verifying Module & Priority Muting Filters...");
  await prisma.userSetting.update({
    where: { userId: testUser.id },
    data: {
      notifyVehicles: false,
    },
  });

  const vehicleNotifMuted = await createSmartNotification({
    userId: testUser.id,
    title: "Car Service Due",
    message: "Should be muted because notifyVehicles is false",
    priority: "medium",
    category: "vehicle",
    deliveryKey: `test-veh-muted-${Date.now()}`,
    skipPush: true,
  });
  assert(vehicleNotifMuted.created === false, "Vehicle notification muted when user disabled vehicle alerts");
  assert(vehicleNotifMuted.reason === "vehicle_category_muted", "Reason is vehicle_category_muted");

  // Restore vehicle alerts
  await prisma.userSetting.update({
    where: { userId: testUser.id },
    data: { notifyVehicles: true },
  });

  // 9. Test Reminder Timing Calculations
  console.log("\n9. Verifying Reminder Timing Calculations...");
  const baseDueDate = new Date("2026-10-15T10:00:00.000Z");

  const exactTrigger = calculateReminderTriggerTime(baseDueDate, "exact");
  assert(exactTrigger.getTime() === baseDueDate.getTime(), "Exact timing triggers at exact dueDate");

  const trigger5m = calculateReminderTriggerTime(baseDueDate, "5m");
  assert(trigger5m.getTime() === baseDueDate.getTime() - 5 * 60 * 1000, "5m before calculates 5 minutes earlier");

  const trigger1h = calculateReminderTriggerTime(baseDueDate, "1h");
  assert(trigger1h.getTime() === baseDueDate.getTime() - 60 * 60 * 1000, "1h before calculates 1 hour earlier");

  const trigger1d = calculateReminderTriggerTime(baseDueDate, "1d");
  assert(trigger1d.getTime() === baseDueDate.getTime() - 24 * 60 * 60 * 1000, "1d before calculates 24 hours earlier");

  const triggerCustom = calculateReminderTriggerTime(baseDueDate, "custom", 45);
  assert(triggerCustom.getTime() === baseDueDate.getTime() - 45 * 60 * 1000, "Custom 45 minutes calculates accurately");

  // 10. Test Push Subscription Storage & Removal
  console.log("\n10. Verifying Push Subscription Store & Prune...");
  const testEndpoint = `https://fcm.googleapis.com/fcm/send/test-endpoint-${Date.now()}`;
  const savedSub = await savePushSubscription({
    userId: testUser.id,
    endpoint: testEndpoint,
    keys: {
      p256dh: "BM_test_p256dh_key_sample_string_for_verification",
      auth: "test_auth_key_1234",
    },
    userAgent: "TestRunner/1.0",
  });
  assert(Boolean(savedSub.id), "Push subscription stored in database for user");

  await removePushSubscription(testEndpoint, testUser.id);
  const checkSub = await prisma.pushSubscription.findFirst({
    where: { endpoint: testEndpoint },
  });
  assert(checkSub === null, "Push subscription cleanly removed on unregister");

  // 11. Test Notification Scheduler Run
  console.log("\n11. Verifying Scheduler Scan & Missed Notification Recovery...");
  // Create a pending reminder due right now for test user
  const dueNowReminder = await prisma.reminder.create({
    data: {
      userId: testUser.id,
      title: "Scheduler Verification Task",
      dueDate: new Date(Date.now() - 1000), // Due 1 second ago
      status: "pending",
      priority: "medium",
      category: "general",
      reminderTiming: "exact",
    },
  });

  const schedulerResult = await runNotificationScheduler(testUser.id);
  assert(schedulerResult.notificationsCreated >= 1, "Scheduler created notification for due reminder");

  // Clean up test reminder
  await prisma.reminder.delete({ where: { id: dueNowReminder.id } });

  // 12. Test Old Expired Missed Event Suppression (>7 days)
  const oldExpiredReminder = await prisma.reminder.create({
    data: {
      userId: testUser.id,
      title: "Old Forgotten Reminder From Last Month",
      dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Due 30 days ago
      status: "pending",
      priority: "low",
      category: "general",
      reminderTiming: "exact",
    },
  });

  const schedulerOldResult = await runNotificationScheduler(testUser.id);
  assert(schedulerOldResult.missedExpiredSkipped >= 1, "Scheduler skipped >7-day old missed reminder without spamming user");
  await prisma.reminder.delete({ where: { id: oldExpiredReminder.id } });

  // Clean up test notifications
  await prisma.notification.deleteMany({
    where: { userId: testUser.id },
  });

  console.log("\n==================================================");
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification()
  .catch((err) => {
    console.error("Verification failed with error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
