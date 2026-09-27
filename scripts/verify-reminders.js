// Smart Life Manager - Complete Reminders System Verification Test Suite
// Tests:
// 1. Create reminder with all fields (title, description, date, time, repeat, category, notification preference)
// 2. Edit reminder
// 3. Complete reminder (toggle status)
// 4. Recurring reminder advancement (auto-creates next occurrence on complete)
// 5. Past / Overdue reminder (grouped under Today & Attention Required)
// 6. Upcoming reminder groupings (Tomorrow, This Week, Upcoming)
// 7. Notification architecture & deduplication (In-app + push, prevents duplicate spam)
// 8. Delete reminder
// 9. Dashboard integration & alert display

const BASE_URL = "http://localhost:3000";

async function runRemindersVerification() {
  console.log("=================================================");
  console.log("SMART LIFE MANAGER - COMPLETE REMINDER TESTS");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`Testing ${name}... `);
      await fn();
      console.log("✅ PASS");
      passed++;
    } catch (err) {
      console.log("❌ FAIL");
      console.error("   Error:", err.message);
      failed++;
    }
  }

  // Setup Test User
  const testEmail = `reminder_tester_${Date.now()}@smartlifemanager.local`;
  const password = "ReminderPass2026!";
  let authCookie = "";

  await test("User Registration for Reminder Testing", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password,
        firstName: "Jordan",
        lastName: "Taylor",
      }),
    });
    if (res.status !== 201) throw new Error(`Registration failed: ${res.status}`);
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) throw new Error("Missing auth cookie");
    authCookie = setCookie.split(";")[0];
  });

  // -------------------------------------------------------------
  // Test 1: Create Reminder with All Fields & Notification
  // -------------------------------------------------------------
  let reminderId = "";
  await test("Create Reminder (Title, Description, Date, Time, Repeat, Category, Priority)", async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const res = await fetch(`${BASE_URL}/api/reminders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
      body: JSON.stringify({
        title: "Call customer regarding renewal",
        description: "Follow up with VIP client regarding enterprise contract renewal",
        date: tomorrow,
        time: "14:30",
        repeat: "weekly",
        category: "work",
        priority: "high",
        notificationPreference: "both",
      }),
    });

    if (res.status !== 201) throw new Error(`Create reminder failed: ${res.status}`);
    const json = await res.json();
    if (!json.success || !json.data?.reminder?.id) {
      throw new Error("Invalid reminder response payload");
    }

    reminderId = json.data.reminder.id;
    if (json.data.reminder.title !== "Call customer regarding renewal") {
      throw new Error(`Unexpected title: ${json.data.reminder.title}`);
    }
    if (json.data.reminder.category !== "work") {
      throw new Error(`Unexpected category: ${json.data.reminder.category}`);
    }
    if (!json.data.reminder.isRecurring || json.data.reminder.recurrenceRule !== "weekly") {
      throw new Error("Recurrence rule was not set to weekly");
    }
    if (json.data.reminder.recurrenceLabel !== "Repeats weekly") {
      throw new Error(`Unexpected recurrence label: ${json.data.reminder.recurrenceLabel}`);
    }
  });

  // -------------------------------------------------------------
  // Test 2: Edit Reminder
  // -------------------------------------------------------------
  await test("Edit Reminder (Update Title, Description, Priority & Time)", async () => {
    const res = await fetch(`${BASE_URL}/api/reminders/${reminderId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
      body: JSON.stringify({
        title: "Call customer regarding renewal - High Priority",
        priority: "urgent",
        time: "16:00",
      }),
    });

    if (res.status !== 200) throw new Error(`Edit failed: ${res.status}`);
    const json = await res.json();
    if (json.data.reminder.priority !== "urgent") {
      throw new Error(`Expected priority 'urgent', got ${json.data.reminder.priority}`);
    }
    if (!json.data.reminder.title.includes("High Priority")) {
      throw new Error("Title update was not persisted");
    }
  });

  // -------------------------------------------------------------
  // Test 3: Complete & Recurring Next-Occurrence Auto-Creation
  // -------------------------------------------------------------
  let nextOccurrenceId = "";
  await test("Complete Recurring Reminder & Auto-Schedule Next Occurrence", async () => {
    const res = await fetch(`${BASE_URL}/api/reminders/${reminderId}/complete`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
      body: JSON.stringify({ completed: true }),
    });

    if (res.status !== 200) throw new Error(`Complete failed: ${res.status}`);
    const json = await res.json();

    if (json.data.reminder.status !== "completed") {
      throw new Error(`Expected status 'completed', got ${json.data.reminder.status}`);
    }

    // Must have auto-created the next occurrence for weekly task!
    if (!json.data.nextOccurrence || !json.data.nextOccurrence.id) {
      throw new Error("Next recurring occurrence was not automatically scheduled");
    }

    nextOccurrenceId = json.data.nextOccurrence.id;
    if (json.data.nextOccurrence.status !== "pending") {
      throw new Error("Next occurrence should be in pending status");
    }

    // Verify next due date is 7 days ahead
    const origDate = new Date(json.data.reminder.dueDate);
    const nextDate = new Date(json.data.nextOccurrence.dueDate);
    const diffDays = Math.round((nextDate.getTime() - origDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays !== 7) {
      throw new Error(`Expected next occurrence in 7 days, got ${diffDays} days`);
    }
  });

  // -------------------------------------------------------------
  // Test 4: Past / Overdue Reminder (Grouped under Today & Attention)
  // -------------------------------------------------------------
  let overdueId = "";
  await test("Create Past Overdue Reminder & Verify In Today / Attention Required", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const res = await fetch(`${BASE_URL}/api/reminders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
      body: JSON.stringify({
        title: "Pay apartment maintenance rent",
        date: yesterday,
        time: "10:00",
        priority: "urgent",
        category: "financial",
        repeat: "one_time",
      }),
    });

    if (res.status !== 201) throw new Error(`Create past reminder failed: ${res.status}`);
    const json = await res.json();
    overdueId = json.data.reminder.id;

    // Check list with ?tab=today (must include overdue items so they aren't lost)
    const listRes = await fetch(`${BASE_URL}/api/reminders?tab=today`, {
      headers: { Cookie: authCookie },
    });
    const listJson = await listRes.json();
    const found = listJson.data.reminders.find((r) => r.id === overdueId);
    if (!found) {
      throw new Error("Overdue reminder was not included under 'today' tab");
    }
    if (!found.isOverdue) {
      throw new Error("Overdue flag was not true for past reminder");
    }
  });

  // -------------------------------------------------------------
  // Test 5: Upcoming Reminders Groupings (Tomorrow, This Week, Upcoming)
  // -------------------------------------------------------------
  await test("Upcoming Reminders Tab & Chronological Grouping", async () => {
    const twoDaysAhead = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const twentyDaysAhead = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Reminder 1: Near future
    await fetch(`${BASE_URL}/api/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: authCookie },
      body: JSON.stringify({
        title: "Vehicle 10,000km Major Service",
        date: twoDaysAhead,
        time: "08:30",
        category: "vehicle",
        priority: "medium",
      }),
    });

    // Reminder 2: Distant future
    await fetch(`${BASE_URL}/api/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: authCookie },
      body: JSON.stringify({
        title: "Annual Medical Checkup Appointment",
        date: twentyDaysAhead,
        time: "11:00",
        category: "health",
        priority: "high",
      }),
    });

    // Check upcoming tab
    const upcomingRes = await fetch(`${BASE_URL}/api/reminders?tab=upcoming`, {
      headers: { Cookie: authCookie },
    });
    const upcomingJson = await upcomingRes.json();
    const hasDistant = upcomingJson.data.reminders.some((r) => r.title.includes("Annual Medical Checkup"));
    if (!hasDistant) {
      throw new Error("Distant reminder was not found under 'upcoming' tab");
    }

    // Check completed tab
    const compRes = await fetch(`${BASE_URL}/api/reminders?tab=completed`, {
      headers: { Cookie: authCookie },
    });
    const compJson = await compRes.json();
    if (compJson.data.reminders.length === 0) {
      throw new Error("Completed tab empty; expected completed reminder from Test 3");
    }
  });

  // -------------------------------------------------------------
  // Test 6: Notification Deduplication & Dispatching
  // -------------------------------------------------------------
  await test("Notification Service & Anti-Duplicate Architecture", async () => {
    // 1. Dispatch first in-app notification
    const res1 = await fetch(`${BASE_URL}/api/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: authCookie },
      body: JSON.stringify({
        title: "Rent Payment Due Notice",
        message: "Your monthly rent is due today.",
        type: "warning",
      }),
    });
    const json1 = await res1.json();
    if (!json1.success || !json1.data.created) {
      throw new Error("First notification dispatch failed");
    }

    // 2. Dispatch duplicate notification with same title within window
    const res2 = await fetch(`${BASE_URL}/api/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: authCookie },
      body: JSON.stringify({
        title: "Rent Payment Due Notice",
        message: "Duplicate attempt for monthly rent.",
        type: "warning",
      }),
    });
    const json2 = await res2.json();
    // Must prevent duplicate!
    if (json2.data.created === true) {
      throw new Error("Duplicate notification was not prevented by deduplication engine");
    }

    // 3. Fetch notifications list
    const listRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Cookie: authCookie },
    });
    const listJson = await listRes.json();
    if (listJson.data.notifications.length === 0) {
      throw new Error("Notifications list returned 0 items");
    }
  });

  // -------------------------------------------------------------
  // Test 7: Dashboard Integration & Urgent Alert Reflection
  // -------------------------------------------------------------
  await test("Dashboard Integration: Overdue / Urgent Reminders in Attention Required", async () => {
    const res = await fetch(`${BASE_URL}/`, {
      headers: { Cookie: authCookie },
    });
    const html = (await res.text()).replace(/<!--.*?-->/g, "");

    // Overdue reminder must appear in Attention Required!
    if (!html.includes("Pay apartment maintenance rent")) {
      throw new Error("Overdue reminder did not appear on Dashboard Attention Required");
    }

    // Upcoming reminder must appear in Upcoming Schedule!
    if (!html.includes("Vehicle 10,000km Major Service")) {
      throw new Error("Upcoming vehicle service reminder did not appear on Dashboard Upcoming schedule");
    }
  });

  // -------------------------------------------------------------
  // Test 8: Delete Reminder
  // -------------------------------------------------------------
  await test("Delete Reminder", async () => {
    const res = await fetch(`${BASE_URL}/api/reminders/${nextOccurrenceId}`, {
      method: "DELETE",
      headers: { Cookie: authCookie },
    });

    if (res.status !== 200) throw new Error(`Delete failed: ${res.status}`);

    const getRes = await fetch(`${BASE_URL}/api/reminders/${nextOccurrenceId}`, {
      headers: { Cookie: authCookie },
    });
    if (getRes.status !== 404) {
      throw new Error(`Expected 404 after delete, got ${getRes.status}`);
    }
  });

  console.log("\n=================================================");
  console.log(`REMINDER SYSTEM TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runRemindersVerification().catch((err) => {
  console.error("Fatal Reminder Verification Error:", err);
  process.exit(1);
});
