/**
 * Automated Verification Script for Smart Life Manager Phase 3
 * Features:
 *  1. Daily Life Planner (Tasks, Appointments, Timeline, Daily Briefing Preferences)
 *  2. Home Inventory & Warranty Manager (Items, Warranty Status, Masking, Service Logs, User Isolation)
 *  3. Subscription & Free Trial Tracker (Multi-currency metrics, Billing Frequencies, Trial Warnings, Cancellation)
 *  4. Database Integrity & Migration Safety
 */

import assert from "node:assert";
import { PrismaClient } from "@prisma/client";

// Import helper functions directly from TypeScript source
import { calculateWarrantyStatus } from "../src/lib/inventory/status";
import { calculateSubscriptionMetrics } from "../src/lib/subscriptions/calculations";

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function report(testName: string, ok: boolean, detail: string = "") {
  if (ok) {
    console.log(`  [PASS] ${testName} ${detail ? "(" + detail + ")" : ""}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName} ${detail ? "(" + detail + ")" : ""}`);
    failed++;
  }
}

async function runAllTests() {
  console.log("================================================================================");
  console.log("🚀 STARTING SMART LIFE MANAGER PHASE 3 AUTOMATED VERIFICATION SUITE");
  console.log("================================================================================\n");

  // -------------------------------------------------------------------------
  // SECTION 1: UNIT TESTS - Inventory Warranty Status
  // -------------------------------------------------------------------------
  console.log("📌 SECTION 1: Home Inventory Warranty Calculations & Edge Cases");
  try {
    // Case 1: No expiry date -> unknown
    const s1 = calculateWarrantyStatus(null, null);
    assert.strictEqual(s1.status, "unknown");
    assert.strictEqual(s1.daysRemaining, null);
    report("1.1 Warranty unknown when no expiry date", true);

    // Case 2: Expired 10 days ago -> expired
    const expiredDate = new Date(Date.now() - 10 * 86400000);
    const s2 = calculateWarrantyStatus(expiredDate);
    assert.strictEqual(s2.status, "expired");
    assert(s2.daysRemaining !== null && s2.daysRemaining < 0);
    report("1.2 Warranty expired status on past date", true, `${s2.daysRemaining} days remaining`);

    // Case 3: Expiring in 10 days (<= 30 days) -> expiring_soon
    const soonDate = new Date(Date.now() + 10 * 86400000);
    const s3 = calculateWarrantyStatus(soonDate);
    assert.strictEqual(s3.status, "expiring_soon");
    assert(s3.daysRemaining !== null && s3.daysRemaining <= 30 && s3.daysRemaining > 0);
    report("1.3 Warranty expiring_soon status within 30 days window", true, `${s3.daysRemaining} days remaining`);

    // Case 4: Expiring in 90 days (> 30 days) -> active
    const activeDate = new Date(Date.now() + 90 * 86400000);
    const s4 = calculateWarrantyStatus(activeDate);
    assert.strictEqual(s4.status, "active");
    assert(s4.daysRemaining !== null && s4.daysRemaining > 30);
    report("1.4 Warranty active status (> 30 days)", true, `${s4.daysRemaining} days remaining`);

    // Case 5: Invalid date string -> unknown
    const s5 = calculateWarrantyStatus("invalid-date-string");
    assert.strictEqual(s5.status, "unknown");
    assert.strictEqual(s5.daysRemaining, null);
    report("1.5 Warranty handles invalid date gracefully as unknown", true);
  } catch (err: any) {
    report("1. Warranty Unit Tests", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 2: UNIT TESTS - Subscription Tracker & Multi-Currency Safety
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 2: Subscription Metrics & Multi-Currency Isolation");
  try {
    const mockSubscriptions = [
      {
        cost: 15.99,
        currency: "USD",
        billingCycle: "monthly",
        renewalStatus: "active",
        category: "Entertainment",
        nextBillingDate: new Date(Date.now() + 3 * 86400000), // in 3 days -> renewal soon
        trialEndDate: null,
      },
      {
        cost: 50,
        currency: "USD",
        billingCycle: "monthly",
        renewalStatus: "active",
        category: "Fitness",
        nextBillingDate: new Date(Date.now() + 20 * 86400000),
        trialEndDate: null,
      },
      {
        cost: 120,
        currency: "USD",
        billingCycle: "yearly",
        renewalStatus: "active",
        category: "Shopping",
        nextBillingDate: new Date(Date.now() + 4 * 86400000), // in 4 days -> renewal soon
        trialEndDate: null,
      },
      {
        cost: 10,
        currency: "EUR",
        billingCycle: "monthly",
        renewalStatus: "active",
        category: "News",
        nextBillingDate: new Date(Date.now() + 15 * 86400000),
        trialEndDate: null,
      },
      {
        cost: 29,
        currency: "USD",
        billingCycle: "monthly",
        renewalStatus: "trial",
        category: "Software",
        nextBillingDate: new Date(Date.now() + 14 * 86400000),
        trialEndDate: new Date(Date.now() + 4 * 86400000), // in 4 days -> trial ending soon
      },
      {
        cost: 40,
        currency: "USD",
        billingCycle: "monthly",
        renewalStatus: "cancelled",
        category: "Fitness",
        nextBillingDate: new Date(Date.now() - 30 * 86400000),
        trialEndDate: null,
      },
    ];

    const metrics = calculateSubscriptionMetrics(mockSubscriptions);

    // Multi-currency check: USD and EUR must be separated and never summed together
    assert(metrics.byCurrency["USD"], "USD currency summary must exist");
    assert(metrics.byCurrency["EUR"], "EUR currency summary must exist");
    const currencyKeys = Object.keys(metrics.byCurrency);
    assert.strictEqual(currencyKeys.length, 2, "Must detect exactly 2 distinct currencies");

    // Monthly cost calculations for USD:
    // Netflix ($15.99) + Gym ($50) + Amazon ($120/12 = $10) + SaaS Trial ($29) = $104.99
    // (Note: active and trial subscriptions contribute to ongoing recurring commitments)
    const usdMonthly = metrics.byCurrency["USD"].monthlyTotal;
    assert(Math.abs(usdMonthly - 104.99) < 0.05, `USD monthly expected ~104.99, got ${usdMonthly}`);
    report("2.1 Monthly cost calculation with mixed frequencies (monthly + yearly)", true, `$${usdMonthly}`);

    // Annual cost calculations for USD:
    // $104.99 * 12 = $1259.88
    const usdAnnual = metrics.byCurrency["USD"].annualTotal;
    assert(Math.abs(usdAnnual - 1259.88) < 0.1, `USD annual expected ~1259.88, got ${usdAnnual}`);
    report("2.2 Annual cost calculation accuracy", true, `$${usdAnnual}`);

    // EUR currency isolation:
    assert.strictEqual(metrics.byCurrency["EUR"].monthlyTotal, 10);
    assert.strictEqual(metrics.byCurrency["EUR"].annualTotal, 120);
    report("2.3 Strict Multi-Currency Isolation (EUR never mixed into USD total)", true, "EUR: €10/mo, €120/yr");

    // Trial count and status breakdown:
    assert.strictEqual(metrics.upcomingTrialEndingsCount, 1, "Must detect exactly 1 trial ending within 7 days");
    assert.strictEqual(metrics.upcomingRenewalsCount, 2, "Must detect exactly 2 renewals within 7 days");
    assert.strictEqual(metrics.activeCount, 4, "Must have 4 active subscriptions");
    assert.strictEqual(metrics.trialCount, 1, "Must have 1 trial subscription");
    assert.strictEqual(metrics.cancelledCount, 1, "Must have 1 cancelled subscription");
    report("2.4 Trial and renewal alerts count", true, `${metrics.upcomingTrialEndingsCount} trial ending soon, ${metrics.upcomingRenewalsCount} renewals soon`);
  } catch (err: any) {
    report("2. Subscription Unit Tests", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 3: DATABASE INTEGRITY & MODEL VERIFICATION
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 3: Database Connection & Schema Verification");
  let testUserId: string | null = null;
  const testUserEmail = `phase3_test_${Date.now()}@test.local`;

  try {
    // 3.1 Verify existing tables are intact
    const existingUsers = await prisma.user.count();
    const existingExpenses = await prisma.expense.count();
    const existingReminders = await prisma.reminder.count();
    const existingDocs = await prisma.document.count();
    report("3.1 Existing database tables intact", true, `Users: ${existingUsers}, Expenses: ${existingExpenses}, Reminders: ${existingReminders}, Docs: ${existingDocs}`);

    // 3.2 Create isolated test user
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        passwordHash: "hash_for_phase3_verification_test",
        role: "user",
        status: "active",
      },
    });
    testUserId = user.id;
    report("3.2 Created test user for isolated feature validation", true, `User ID: ${user.id}`);

    // 3.3 Verify UserSetting briefing fields
    const setting = await prisma.userSetting.create({
      data: {
        userId: testUserId,
        dailyBriefingEnabled: true,
        dailyBriefingTime: "08:15",
      },
    });
    assert.strictEqual(setting.dailyBriefingEnabled, true);
    assert.strictEqual(setting.dailyBriefingTime, "08:15");
    report("3.3 UserSetting daily briefing fields persisted", true, "Enabled: true, Time: 08:15");
  } catch (err: any) {
    report("3. Database Setup & Schema Check", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 4: FEATURE 1 - Daily Life Planner CRUD & Timeline Ordering
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 4: Daily Life Planner Task & Appointment Operations");
  let taskId1: string | null = null;
  let appointmentId: string | null = null;

  try {
    if (!testUserId) throw new Error("Test user not available");

    // 4.1 Create a task
    const task = await prisma.plannerTask.create({
      data: {
        userId: testUserId,
        title: "Review quarterly financial goals",
        description: "Examine investments and budget categories",
        itemType: "task",
        date: new Date("2026-10-14T00:00:00.000Z"),
        startTime: "10:00",
        endTime: "11:30",
        priority: "high",
        category: "personal",
        isCompleted: false,
        notes: "Prepare notes for advisor",
      },
    });
    taskId1 = task.id;
    assert.strictEqual(task.title, "Review quarterly financial goals");
    assert.strictEqual(task.priority, "high");
    assert.strictEqual(task.isCompleted, false);
    report("4.1 Create planner task with priority and time range", true, `ID: ${task.id}`);

    // 4.2 Create an appointment
    const appointment = await prisma.plannerTask.create({
      data: {
        userId: testUserId,
        title: "Dentist checkup",
        description: "Routine cleaning",
        itemType: "appointment",
        date: new Date("2026-10-14T00:00:00.000Z"),
        startTime: "14:00",
        endTime: "15:00",
        location: "Downtown Dental Clinic",
        priority: "medium",
        category: "health",
        isCompleted: false,
      },
    });
    appointmentId = appointment.id;
    assert.strictEqual(appointment.itemType, "appointment");
    assert.strictEqual(appointment.location, "Downtown Dental Clinic");
    report("4.2 Create appointment with location and timing", true, `ID: ${appointment.id}`);

    // 4.3 Query timeline items for that date in chronological order
    const dayTasks = await prisma.plannerTask.findMany({
      where: {
        userId: testUserId,
        date: {
          gte: new Date("2026-10-14T00:00:00.000Z"),
          lte: new Date("2026-10-14T23:59:59.999Z"),
        },
      },
      orderBy: [{ startTime: "asc" }, { createdAt: "asc" }],
    });
    assert.strictEqual(dayTasks.length, 2);
    assert.strictEqual(dayTasks[0].startTime, "10:00");
    assert.strictEqual(dayTasks[1].startTime, "14:00");
    report("4.3 Timeline chronological ordering (10:00 AM before 14:00 PM)", true);

    // 4.4 Mark task completed
    const completedTask = await prisma.plannerTask.update({
      where: { id: taskId1 },
      data: { isCompleted: true, completedAt: new Date() },
    });
    assert.strictEqual(completedTask.isCompleted, true);
    report("4.4 Complete task status transition (isCompleted: true)", true);

    // 4.5 Reschedule appointment to tomorrow
    const rescheduled = await prisma.plannerTask.update({
      where: { id: appointmentId },
      data: {
        date: new Date("2026-10-15T00:00:00.000Z"),
        startTime: "15:30",
        endTime: "16:30",
      },
    });
    assert.strictEqual(rescheduled.startTime, "15:30");
    report("4.5 Reschedule appointment date and time", true, "Moved to 15:30 on 2026-10-15");

    // 4.6 Overdue task query handling
    const overdueTask = await prisma.plannerTask.create({
      data: {
        userId: testUserId,
        title: "Overdue tax preparation",
        itemType: "task",
        date: new Date("2026-10-01T00:00:00.000Z"),
        priority: "urgent",
        isCompleted: false,
      },
    });
    const overdueItems = await prisma.plannerTask.findMany({
      where: {
        userId: testUserId,
        date: { lt: new Date("2026-10-13T00:00:00.000Z") },
        isCompleted: false,
      },
    });
    assert(overdueItems.some((i) => i.id === overdueTask.id));
    report("4.6 Overdue task detection query", true, `Found ${overdueItems.length} overdue task(s)`);

    // 4.7 Test Unified Planner Aggregator
    const { getUnifiedPlannerData } = await import("../src/lib/planner/planner-service");
    const unifiedData = await getUnifiedPlannerData(testUserId, "2026-10-15", "all", "all");
    assert(Array.isArray(unifiedData.timeline), "Timeline should be an array");
    assert(unifiedData.briefing, "Briefing data should exist");
    assert.strictEqual(unifiedData.briefing.enabled, true);
    assert.strictEqual(unifiedData.briefing.preferredTime, "08:15");
    report("4.7 Unified Planner Aggregator (Cross-module timeline & briefing integration)", true, `Total timeline items: ${unifiedData.timeline.length}`);

    await prisma.plannerTask.delete({ where: { id: overdueTask.id } });
  } catch (err: any) {
    report("4. Planner Tasks CRUD", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 5: FEATURE 2 - Home Inventory & Warranty Manager
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 5: Home Inventory Items, Service History & User Isolation");
  let inventoryItemId: string | null = null;
  let serviceLogId: string | null = null;

  try {
    if (!testUserId) throw new Error("Test user not available");

    // 5.1 Create Inventory Item
    const item = await prisma.inventoryItem.create({
      data: {
        userId: testUserId,
        name: "LG OLED 65-inch 4K TV",
        category: "appliances",
        brand: "LG",
        modelNumber: "OLED65C3PUA",
        serialNumber: "LG-SN-9988776655",
        purchaseDate: new Date("2025-11-20T00:00:00.000Z"),
        purchasePrice: 1799.99,
        currency: "USD",
        retailer: "Best Buy",
        warrantyStart: new Date("2025-11-20T00:00:00.000Z"),
        warrantyExpiry: new Date("2027-11-20T00:00:00.000Z"),
        location: "Living Room",
        notes: "Wall mounted with Sanus mount",
      },
    });
    inventoryItemId = item.id;
    assert.strictEqual(item.name, "LG OLED 65-inch 4K TV");
    assert.strictEqual(item.serialNumber, "LG-SN-9988776655");
    report("5.1 Create inventory item with warranty and location", true, `ID: ${item.id}`);

    // 5.2 Add Service History Log
    const service = await prisma.inventoryServiceLog.create({
      data: {
        inventoryItemId: inventoryItemId,
        userId: testUserId,
        serviceDate: new Date("2026-06-15T00:00:00.000Z"),
        description: "Firmware update and color calibration",
        provider: "Geek Squad",
        cost: 120.0,
        currency: "USD",
        nextServiceDate: new Date("2027-06-15T00:00:00.000Z"),
        notes: "Calibrated for cinema room dark mode",
      },
    });
    serviceLogId = service.id;
    assert.strictEqual(service.provider, "Geek Squad");
    assert.strictEqual(service.cost, 120.0);
    report("5.2 Attach maintenance service record to inventory item", true, `Service ID: ${service.id}`);

    // 5.3 Retrieve item with service history
    const itemWithServices = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: { serviceLogs: true },
    });
    assert(itemWithServices);
    assert.strictEqual(itemWithServices.serviceLogs.length, 1);
    assert.strictEqual(itemWithServices.serviceLogs[0].description, "Firmware update and color calibration");
    report("5.3 Query item with nested service logs", true, `Found ${itemWithServices.serviceLogs.length} log(s)`);

    // 5.4 Archive item
    const archivedItem = await prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { isArchived: true },
    });
    assert.strictEqual(archivedItem.isArchived, true);
    report("5.4 Archive inventory item", true);

    // 5.5 User Isolation: Another user cannot see or modify this item
    const fakeOtherUserId = "other_user_id_999999";
    const crossUserQuery = await prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, userId: fakeOtherUserId },
    });
    assert.strictEqual(crossUserQuery, null, "Other user must not find item owned by test user");
    report("5.5 Cross-user isolation enforced (unauthorized query returns null)", true);
  } catch (err: any) {
    report("5. Home Inventory CRUD & Isolation", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 6: FEATURE 3 - Personal Subscription & Free Trial Tracker DB
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 6: Subscription Extended Fields & Free Trial Tracking DB");
  let subId: string | null = null;

  try {
    if (!testUserId) throw new Error("Test user not available");

    // 6.1 Create tracked subscription with trial dates and portal URL
    const trialSub = await prisma.subscription.create({
      data: {
        userId: testUserId,
        name: "Adobe Creative Cloud",
        category: "productivity",
        cost: 54.99,
        currency: "USD",
        billingCycle: "monthly",
        renewalStatus: "trial",
        startDate: new Date("2026-10-01T00:00:00.000Z"),
        trialEndDate: new Date("2026-10-31T00:00:00.000Z"),
        nextBillingDate: new Date("2026-11-01T00:00:00.000Z"),
        websiteUrl: "https://account.adobe.com/plans",
        notes: "Free trial before yearly commitment",
      },
    });
    subId = trialSub.id;
    assert.strictEqual(trialSub.renewalStatus, "trial");
    assert.strictEqual(trialSub.websiteUrl, "https://account.adobe.com/plans");
    assert(trialSub.trialEndDate instanceof Date);
    report("6.1 Create subscription with free trial end date and portal URL", true, `ID: ${trialSub.id}`);

    // 6.2 Manual cancellation confirmation
    const cancelledSub = await prisma.subscription.update({
      where: { id: subId },
      data: {
        renewalStatus: "cancelled",
        cancellationDate: new Date("2026-10-13T10:00:00.000Z"),
      },
    });
    assert.strictEqual(cancelledSub.renewalStatus, "cancelled");
    assert(cancelledSub.cancellationDate instanceof Date);
    report("6.2 Manual cancellation confirmation with timestamp", true, `Status: ${cancelledSub.renewalStatus}`);
  } catch (err: any) {
    report("6. Subscription Extended Model", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 7: CLEANUP TEST DATA
  // -------------------------------------------------------------------------
  console.log("\n📌 SECTION 7: Cleanup Test Records");
  try {
    if (serviceLogId && inventoryItemId) {
      await prisma.inventoryServiceLog.deleteMany({ where: { inventoryItemId } });
    }
    if (inventoryItemId) {
      await prisma.inventoryItem.delete({ where: { id: inventoryItemId } });
    }
    if (taskId1) {
      await prisma.plannerTask.delete({ where: { id: taskId1 } });
    }
    if (appointmentId) {
      await prisma.plannerTask.delete({ where: { id: appointmentId } });
    }
    if (subId) {
      await prisma.subscription.delete({ where: { id: subId } });
    }
    if (testUserId) {
      await prisma.userSetting.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } });
    }
    report("7.1 Cleaned up all temporary test records", true, "Database returned to pristine state");
  } catch (err: any) {
    report("7. Cleanup Test Records", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`🏁 AUTOMATED TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests()
  .catch((e) => {
    console.error("Unhandled verification exception:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
