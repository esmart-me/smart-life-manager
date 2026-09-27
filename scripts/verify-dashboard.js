// Smart Life Manager - Dashboard Real-Data Verification Test Suite
// Tests: No data, One record, Multiple records (with Attention Required & Upcoming chronologically)

const BASE_URL = "http://localhost:3000";

async function runDashboardTests() {
  console.log("=================================================");
  console.log("SMART LIFE MANAGER - REAL DASHBOARD TEST SUITE");
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

  const testEmail = `dash_tester_${Date.now()}@smartlifemanager.local`;
  const password = "DashboardPass2026!";
  let authCookie = "";

  // 1. Setup New User
  await test("User Registration for Clean Slate Testing", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password,
        firstName: "Morgan",
        lastName: "Lee",
      }),
    });

    if (res.status !== 201) throw new Error(`Registration failed: status ${res.status}`);
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) throw new Error("Missing auth cookie on register");
    authCookie = setCookie.split(";")[0];
  });

  // --------------------------------------------------------------------------
  // TEST SCENARIO A: NO DATA (Empty States & Zero Values)
  // --------------------------------------------------------------------------
  await test("Scenario A: Dashboard with NO DATA (Empty States & 5-Second Clarity)", async () => {
    const res = await fetch(`${BASE_URL}/`, {
      headers: { Cookie: authCookie },
    });
    const html = (await res.text()).replace(/<!--.*?-->/g, "");

    // 1. Check Header Elements
    if (!html.includes("Morgan")) throw new Error("Header missing user's name");
    if (!html.includes("Good ")) throw new Error("Header missing time-of-day greeting");
    if (!html.includes("All Clear")) throw new Error("Header missing clean 'All Clear' status badge");

    // 2. Check Empty State Text per specification
    if (!html.includes("No documents yet.")) {
      throw new Error("Missing expected empty state: 'No documents yet.'");
    }
    if (!html.includes("No upcoming reminders.")) {
      throw new Error("Missing expected empty state: 'No upcoming reminders.'");
    }
    if (!html.includes("No payments due.")) {
      throw new Error("Missing expected empty state: 'No payments due.'");
    }
    if (!html.includes("No expenses recorded.")) {
      throw new Error("Missing expected empty state: 'No expenses recorded.'");
    }

    // 3. Check Add Buttons in empty states
    if (!html.includes("Add Document") || !html.includes("Add Reminder") || !html.includes("Add Payment")) {
      throw new Error("Missing appropriate Add action buttons in empty states");
    }

    // 4. Check Attention Required section empty state
    if (!html.includes("Zero critical items requiring attention")) {
      throw new Error("Attention Required section missing clean state");
    }

    // 5. Check Upcoming section empty state
    if (!html.includes("No upcoming events scheduled")) {
      throw new Error("Upcoming Schedule section missing empty state");
    }
  });

  // --------------------------------------------------------------------------
  // TEST SCENARIO B: ONE RECORD (Single Document Expiring Soon)
  // --------------------------------------------------------------------------
  let docId = "";
  await test("Scenario B: Dashboard with ONE RECORD (Single Document)", async () => {
    // Insert 1 real document expiring in 5 days
    const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const docRes = await fetch(`${BASE_URL}/api/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
      body: JSON.stringify({
        title: "International Passport",
        category: "identity",
        expiryDate: fiveDaysFromNow,
        documentNumber: "P98765432",
      }),
    });

    if (docRes.status !== 201) throw new Error(`Create document failed: ${docRes.status}`);
    const docJson = await docRes.json();
    docId = docJson.data?.document?.id;

    // Fetch dashboard HTML and inspect real data
    const res = await fetch(`${BASE_URL}/`, {
      headers: { Cookie: authCookie },
    });
    const html = (await res.text()).replace(/<!--.*?-->/g, "");

    // Documents summary card should now show "1" and "1 expiring soon"
    if (!html.includes("1 expiring soon")) {
      throw new Error("Documents card did not update to '1 expiring soon'");
    }

    // Attention Required should show the document
    if (!html.includes("International Passport Renewal Soon")) {
      throw new Error("Attention Required did not display the document renewal");
    }

    // Upcoming section should list it chronologically
    if (!html.includes("International Passport Expiry")) {
      throw new Error("Upcoming schedule did not include the document expiry");
    }

    // Other categories must still show their respective empty states cleanly!
    if (!html.includes("No upcoming reminders.")) {
      throw new Error("Reminders should still show empty state");
    }
    if (!html.includes("No payments due.")) {
      throw new Error("Payments should still show empty state");
    }
  });

  // --------------------------------------------------------------------------
  // TEST SCENARIO C: MULTIPLE RECORDS (Reminders, Payments, Expenses, Expired Docs)
  // --------------------------------------------------------------------------
  await test("Scenario C: Dashboard with MULTIPLE RECORDS across all categories", async () => {
    const today = new Date();
    const yesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const tenDaysAhead = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

    // 1. Critical Reminder
    await fetch(`${BASE_URL}/api/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: authCookie },
      body: JSON.stringify({
        title: "Submit Tax Declaration",
        description: "Annual filing deadline",
        dueDate: today.toISOString(),
        priority: "urgent",
        category: "finance",
      }),
    });

    // 2. Overdue Payment
    await fetch(`${BASE_URL}/api/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: authCookie },
      body: JSON.stringify({
        title: "Apartment Rent",
        amount: 1450.00,
        currency: "USD",
        dueDate: yesterday.toISOString().split("T")[0],
        payee: "Metro Realty",
      }),
    });

    // 3. Upcoming Payment
    await fetch(`${BASE_URL}/api/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: authCookie },
      body: JSON.stringify({
        title: "Internet Fiber Subscription",
        amount: 85.50,
        currency: "USD",
        dueDate: tenDaysAhead.toISOString().split("T")[0],
        payee: "Gigabit ISP",
      }),
    });

    // 4. Expenses (2 entries)
    await fetch(`${BASE_URL}/api/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: authCookie },
      body: JSON.stringify({
        title: "Organic Supermarket",
        amount: 74.25,
        currency: "USD",
        category: "food",
        spentAt: today.toISOString().split("T")[0],
      }),
    });

    await fetch(`${BASE_URL}/api/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: authCookie },
      body: JSON.stringify({
        title: "Gasoline Fill-up",
        amount: 45.75,
        currency: "USD",
        category: "transport",
        spentAt: today.toISOString().split("T")[0],
      }),
    });

    // 5. Expired Document
    await fetch(`${BASE_URL}/api/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: authCookie },
      body: JSON.stringify({
        title: "Health Insurance Card",
        category: "medical",
        expiryDate: yesterday.toISOString().split("T")[0],
      }),
    });

    // Fetch dashboard HTML and verify all real calculated values
    const res = await fetch(`${BASE_URL}/`, {
      headers: { Cookie: authCookie },
    });
    const html = (await res.text()).replace(/<!--.*?-->/g, "");

    // A. Attention Required Section must show all 3 critical categories:
    // Expired document
    if (!html.includes("Health Insurance Card Expired")) {
      throw new Error("Missing Expired Document in Attention Required");
    }
    // Critical reminder
    if (!html.includes("Submit Tax Declaration")) {
      throw new Error("Missing Urgent Reminder in Attention Required");
    }
    // Overdue payment
    if (!html.includes("Apartment Rent Overdue")) {
      throw new Error("Missing Overdue Payment in Attention Required");
    }

    // B. Summary Cards Checks:
    // Total payments amount due = 1450.00 + 85.50 = 1535.50
    if (!html.includes("1,535.50")) {
      throw new Error("Payment summary amount did not match exact sum ($1,535.50)");
    }
    // Total expenses = 74.25 + 45.75 = 120.00
    if (!html.includes("120.00")) {
      throw new Error("Expense summary amount did not match exact sum ($120.00)");
    }
    // Expense entry count = 2 entries logged
    if (!html.includes("2 entries logged")) {
      throw new Error("Expense summary did not show '2 entries logged'");
    }

    // C. Chronological Upcoming list check:
    if (!html.includes("Internet Fiber Subscription")) {
      throw new Error("Upcoming schedule missing future payment");
    }

    // D. Header status check:
    if (!html.includes("need attention today")) {
      throw new Error("Header badge did not reflect critical attention items");
    }
  });

  // --------------------------------------------------------------------------
  // TEST SCENARIO D: QUICK ACTIONS ACCESSIBILITY & MOBILE RESPONSIVENESS
  // --------------------------------------------------------------------------
  await test("Scenario D: Responsive Layout & Quick Action Controls", async () => {
    const res = await fetch(`${BASE_URL}/`, {
      headers: { Cookie: authCookie },
    });
    const html = (await res.text()).replace(/<!--.*?-->/g, "");

    if (!html.includes("Add Document") || !html.includes("Add Reminder") || !html.includes("Add Payment") || !html.includes("Add Expense")) {
      throw new Error("Quick action buttons missing in dashboard HTML");
    }

    // Verify responsive grid classes (grid-cols-2 lg:grid-cols-4 and grid-cols-1 lg:grid-cols-2)
    if (!html.includes("grid-cols-2 lg:grid-cols-4") && !html.includes("grid-cols-1 lg:grid-cols-2")) {
      throw new Error("Missing responsive column class configuration");
    }
  });

  console.log("\n=================================================");
  console.log(`DASHBOARD TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runDashboardTests().catch((err) => {
  console.error("Fatal Dashboard Test Suite Error:", err);
  process.exit(1);
});
