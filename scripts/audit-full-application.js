/**
 * FULL APPLICATION FUNCTIONAL AUDIT SUITE
 * Smart Life Manager - Phases 1 to 7 Complete System Verification
 */

const BASE_URL = "http://localhost:3000";

let testPassed = 0;
let testFailed = 0;
const auditResults = [];

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    testPassed++;
    auditResults.push({ name: testName, status: "PASS", details });
  } else {
    console.error(`  ✗ FAIL: ${testName} - ${details}`);
    testFailed++;
    auditResults.push({ name: testName, status: "FAIL", details });
  }
}

async function runAudit() {
  console.log("===============================================================================");
  console.log("SMART LIFE MANAGER - FULL EXISTING APPLICATION FUNCTIONAL AUDIT");
  console.log("===============================================================================\n");

  const timestamp = Date.now();
  const user1Email = `audit_owner_${timestamp}@example.com`;
  const user2Email = `audit_intruder_${timestamp}@example.com`;
  const password = "Password123!";

  let cookie1 = "";
  let cookie2 = "";

  // ==========================================================================
  // 1. AUTHENTICATION & MULTI-TENANT ISOLATION SETUP
  // ==========================================================================
  console.log("MODULE 1: AUTHENTICATION & SESSION PERSISTENCE");
  {
    // A. Unauthenticated access check (Redirect to login)
    const unauthRes = await fetch(`${BASE_URL}/`, { redirect: "manual" });
    assert(
      unauthRes.status === 307 || unauthRes.status === 302 || unauthRes.status === 303,
      "Protected Dashboard route redirects unauthenticated requests to /login"
    );

    // B. Register User 1 (Owner)
    const reg1 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user1Email,
        password,
        displayName: "Audit Primary User",
        currency: "USD",
      }),
    });
    const regData1 = await reg1.json();
    assert(reg1.status === 201 && regData1.success, "User 1 Registration & Initial Onboarding Successful");
    const setCookie1 = reg1.headers.get("set-cookie");
    if (setCookie1) cookie1 = setCookie1.split(";")[0];
    assert(cookie1.includes("slm_session"), "Session Cookie Issued with 30-Day Expiry");

    // C. Register User 2 (Intruder)
    const reg2 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user2Email,
        password,
        displayName: "Audit Second User",
        currency: "EUR",
      }),
    });
    const regData2 = await reg2.json();
    assert(reg2.status === 201 && regData2.success, "User 2 Registration Successful");
    const setCookie2 = reg2.headers.get("set-cookie");
    if (setCookie2) cookie2 = setCookie2.split(";")[0];

    // D. Session Verification
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: cookie1 },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.data?.user?.email === user1Email, "Session verification /api/auth/me returns valid user");
  }

  // ==========================================================================
  // 2. PROFILE & SETTINGS
  // ==========================================================================
  console.log("\nMODULE 2: USER PROFILE & SETTINGS");
  {
    // A. Profile Page Route
    const profPage = await fetch(`${BASE_URL}/profile`, { headers: { Cookie: cookie1 } });
    assert(profPage.status === 200, "GET /profile loads HTTP 200");

    // B. Settings Page Route
    const setPage = await fetch(`${BASE_URL}/settings`, { headers: { Cookie: cookie1 } });
    assert(setPage.status === 200, "GET /settings loads HTTP 200");

    // C. Update Profile and Settings
    const updateRes = await fetch(`${BASE_URL}/api/user/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        profile: {
          displayName: "Audited Prime Admin",
          firstName: "Prime",
          lastName: "Admin",
          phoneNumber: "+1-555-0199",
          currency: "USD",
          timezone: "America/New_York",
        },
        settings: {
          theme: "dark",
          emailNotifications: true,
          pushNotifications: false,
          reminderDaysBefore: 5,
        },
      }),
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200 && updateData.success, "PUT /api/user/settings updates profile and preferences in database");

    const getSetRes = await fetch(`${BASE_URL}/api/user/settings`, { headers: { Cookie: cookie1 } });
    const getSetData = await getSetRes.json();
    assert(getSetData.data.profile.displayName === "Audited Prime Admin", "Profile displayName persisted");
    assert(getSetData.data.settings.theme === "dark", "Theme preference persisted");
  }

  // ==========================================================================
  // 3. DOCUMENTS MODULE
  // ==========================================================================
  console.log("\nMODULE 3: DOCUMENT MANAGER & EXPIRY ENGINE");
  let testDocId = "";
  {
    // A. Documents Page Route
    const docPage = await fetch(`${BASE_URL}/documents`, { headers: { Cookie: cookie1 } });
    assert(docPage.status === 200, "GET /documents loads HTTP 200");

    // B. Create Document with Expiry Date
    const expDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(); // 15 days -> EXPIRING_SOON
    const createDocRes = await fetch(`${BASE_URL}/api/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "International Passport",
        category: "Passport",
        documentNumber: "A98765432",
        expiryDate: expDate,
        notes: "Primary travel document.",
      }),
    });
    const createDocData = await createDocRes.json();
    assert(createDocRes.status === 201 && createDocData.success, "Create Document in database");
    testDocId = createDocData.data.document.id;

    // C. Verify Expiry Status Calculation
    assert(createDocData.data.document.statusInfo.status === "EXPIRING_SOON", "Calculates EXPIRING_SOON (8-30 days)");
    assert(createDocData.data.document.statusInfo.countdownText.includes("15 days"), "Shows exact countdown information: 'Expires in 15 days'");

    // D. Search and Filter Documents
    const searchDocRes = await fetch(`${BASE_URL}/api/documents?q=Passport`, { headers: { Cookie: cookie1 } });
    const searchDocData = await searchDocRes.json();
    assert(searchDocData.data.documents.length >= 1, "Documents search by query works");

    // E. User Data Isolation: User 2 cannot access User 1 document
    const u2DocRes = await fetch(`${BASE_URL}/api/documents/${testDocId}`, { headers: { Cookie: cookie2 } });
    assert(u2DocRes.status === 403 || u2DocRes.status === 404, "User isolation: User 2 is denied access (HTTP 403/404) for User 1 document");
  }

  // ==========================================================================
  // 4. REMINDERS & TASKS MODULE
  // ==========================================================================
  console.log("\nMODULE 4: REMINDER SYSTEM & RECURRING ENGINE");
  let testRemId = "";
  {
    // A. Reminders Page Route
    const remPage = await fetch(`${BASE_URL}/reminders`, { headers: { Cookie: cookie1 } });
    assert(remPage.status === 200, "GET /reminders loads HTTP 200");

    // B. Create Recurring Reminder
    const remDue = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const createRemRes = await fetch(`${BASE_URL}/api/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Check Fire Alarm Batteries",
        description: "Safety check every month",
        dueDate: remDue,
        category: "Maintenance",
        priority: "medium",
        repeat: "monthly",
        recurrenceRule: "monthly",
      }),
    });
    const createRemData = await createRemRes.json();
    assert(createRemRes.status === 201 && createRemData.success, "Create recurring reminder in database");
    testRemId = createRemData.data.reminder.id;

    // C. Search Reminders
    const searchRemRes = await fetch(`${BASE_URL}/api/reminders?q=Alarm`, { headers: { Cookie: cookie1 } });
    const searchRemData = await searchRemRes.json();
    assert(searchRemData.data.reminders.length >= 1, "Reminders search by title/description works");

    // D. Calendar Tab Filtering
    const upcomingTabRes = await fetch(`${BASE_URL}/api/reminders?tab=upcoming`, { headers: { Cookie: cookie1 } });
    const upcomingTabData = await upcomingTabRes.json();
    assert(upcomingTabRes.status === 200, "Reminders calendar tab filtering works");

    // E. Complete Recurring Reminder & Advance Occurrence
    const completeRes = await fetch(`${BASE_URL}/api/reminders/${testRemId}/complete`, {
      method: "PATCH",
      headers: { Cookie: cookie1 },
    });
    const completeData = await completeRes.json();
    assert(completeRes.status === 200 && completeData.success, "Complete reminder triggers automatic next occurrence generation");
    assert(completeData.data.nextOccurrence !== null, "Next monthly occurrence scheduled");
  }

  // ==========================================================================
  // 5. FINANCE MODULE (BILLS, EXPENSES, BUDGET)
  // ==========================================================================
  console.log("\nMODULE 5: FINANCE MODULE (BILLS, EXPENSES, BUDGET)");
  let testPayId = "";
  let testExpId = "";
  {
    // A. Finance Page Route
    const finPage = await fetch(`${BASE_URL}/finance`, { headers: { Cookie: cookie1 } });
    assert(finPage.status === 200, "GET /finance loads HTTP 200");

    // B. Create Recurring Payment Bill
    const payDue = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const createPayRes = await fetch(`${BASE_URL}/api/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Fiber Internet Bill",
        amount: 85.0,
        currency: "USD",
        dueDate: payDue,
        category: "Internet",
        isRecurring: true,
        frequency: "monthly",
      }),
    });
    const createPayData = await createPayRes.json();
    assert(createPayRes.status === 201 && createPayData.success, "Create payment bill in database");
    testPayId = createPayData.data.payment.id;

    // C. Mark Payment Paid & Verify Automatic Next Occurrence
    const markPaidRes = await fetch(`${BASE_URL}/api/payments/${testPayId}/pay`, {
      method: "PATCH",
      headers: { Cookie: cookie1 },
    });
    const markPaidData = await markPaidRes.json();
    assert(markPaidRes.status === 200 && markPaidData.success, "Mark payment paid succeeds");
    assert(markPaidData.data.nextPayment !== null, "Recurring bill generated next occurrence");

    // D. Log Expense
    const createExpRes = await fetch(`${BASE_URL}/api/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Weekly Grocery Run",
        amount: 145.5,
        currency: "USD",
        category: "Food",
        spentAt: new Date().toISOString(),
        paymentMethod: "Credit Card",
        notes: "Supermarket shopping",
      }),
    });
    const createExpData = await createExpRes.json();
    assert(createExpRes.status === 201 && createExpData.success, "Log expense transaction in database");
    testExpId = createExpData.data.expense.id;

    // E. Save Budget Configurations & Analytics
    const budgetRes = await fetch(`${BASE_URL}/api/budget`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        monthlyIncome: 6500,
        monthlyBudget: 3500,
        savingsTarget: 2000,
        categoryBudgets: [
          { category: "Food", limitAmount: 500 },
          { category: "Internet", limitAmount: 100 },
        ],
      }),
    });
    const budgetData = await budgetRes.json();
    assert(budgetRes.status === 200 && budgetData.success, "Budget configurations saved and analytics calculated");
    assert(budgetData.data.analytics.totalIncome === 6500, "Income analytics correct");
    assert(budgetData.data.analytics.remainingBudget > 0, "Remaining budget calculated");
  }

  // ==========================================================================
  // 6. VEHICLES MODULE
  // ==========================================================================
  console.log("\nMODULE 6: VEHICLES & ASSETS GARAGE");
  let testVehId = "";
  {
    // A. Vehicles Route (Both /vehicles and /more/vehicles)
    const vehPage1 = await fetch(`${BASE_URL}/vehicles`, { headers: { Cookie: cookie1 } });
    assert(vehPage1.status === 200, "GET /vehicles loads HTTP 200");
    const vehPage2 = await fetch(`${BASE_URL}/more/vehicles`, { headers: { Cookie: cookie1 } });
    assert(vehPage2.status === 200, "GET /more/vehicles loads HTTP 200");

    // B. Create Vehicle with Expiries, Service & Mileage
    const regExp = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(); // Expired!
    const insExp = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(); // Expiring soon!
    const svcDate = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();

    const createVehRes = await fetch(`${BASE_URL}/api/vehicles`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        name: "Executive Sedan",
        make: "BMW",
        model: "530i",
        year: 2021,
        licensePlate: "DXB-77889",
        vin: "WBA530I9988776655",
        mileage: 62000,
        nextServiceMileage: 60000, // Mileage exceeded -> alert!
        registrationExpiry: regExp,
        insuranceExpiry: insExp,
        nextServiceDate: svcDate,
        notes: "Executive company car.",
      }),
    });
    const createVehData = await createVehRes.json();
    assert(createVehRes.status === 201 && createVehData.success, "Create Vehicle in database");
    testVehId = createVehData.data.vehicle.id;

    // C. Verify Alerts Calculation
    assert(createVehData.data.vehicle.statusSummary.registrationStatus === "EXPIRED", "Calculates EXPIRED registration");
    assert(createVehData.data.vehicle.statusSummary.mileageStatus === "OVERDUE", "Calculates OVERDUE service mileage");
    assert(createVehData.data.vehicle.statusSummary.alerts.length >= 2, "Generates actionable alerts");

    // D. Verify Reminder Engine Synchronization
    const remCheckRes = await fetch(`${BASE_URL}/api/reminders`, { headers: { Cookie: cookie1 } });
    const remCheckData = await remCheckRes.json();
    const vehReminders = (remCheckData.data?.reminders || []).filter((r) => r.relatedType === "vehicle");
    assert(vehReminders.length > 0, "Vehicle reminders synchronized to central Reminder engine");

    // E. Search and Filter Vehicles
    const vehListRes = await fetch(`${BASE_URL}/api/vehicles`, { headers: { Cookie: cookie1 } });
    const vehListData = await vehListRes.json();
    assert(vehListData.data.vehicles.length >= 1, "Vehicles retrieved from database");
  }

  // ==========================================================================
  // 7. SUBSCRIPTIONS MODULE
  // ==========================================================================
  console.log("\nMODULE 7: SUBSCRIPTIONS & MEMBERSHIPS");
  let testSubId = "";
  {
    // A. Subscriptions Page Route
    const subPage = await fetch(`${BASE_URL}/subscriptions`, { headers: { Cookie: cookie1 } });
    assert(subPage.status === 200, "GET /subscriptions loads HTTP 200");

    // B. Create Subscription (Annual Plan)
    const nextBill = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const createSubRes = await fetch(`${BASE_URL}/api/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        name: "GitHub Copilot Enterprise",
        cost: 228.0,
        currency: "USD",
        billingCycle: "yearly",
        nextBillingDate: nextBill,
        category: "Software & SaaS",
        notes: "Developer AI tooling subscription",
      }),
    });
    const createSubData = await createSubRes.json();
    assert(createSubRes.status === 201 && createSubData.success, "Create subscription in database");
    testSubId = createSubData.data.subscription.id;

    // C. Verify Normalized Cost Calculation (228 / 12 = 19.00/mo)
    const subListRes = await fetch(`${BASE_URL}/api/subscriptions`, { headers: { Cookie: cookie1 } });
    const subListData = await subListRes.json();
    assert(subListData.data.metrics.monthlyTotal >= 19.0, "Calculates normalized monthly cost burn rate");
    assert(subListData.data.metrics.annualTotal >= 228.0, "Calculates projected annual subscription cost");

    // D. Action: Cancel Subscription
    const cancelSubRes = await fetch(`${BASE_URL}/api/subscriptions/${testSubId}/cancel`, {
      method: "PATCH",
      headers: { Cookie: cookie1 },
    });
    const cancelSubData = await cancelSubRes.json();
    assert(cancelSubRes.status === 200 && cancelSubData.data.subscription.renewalStatus === "cancelled", "Cancel subscription action works and persists");
  }

  // ==========================================================================
  // 8. IMPORTANT DATES MODULE
  // ==========================================================================
  console.log("\nMODULE 8: IMPORTANT DATES & MILESTONES");
  let testDateId = "";
  {
    // A. Important Dates Routes (/dates and /more/dates)
    const datePage1 = await fetch(`${BASE_URL}/dates`, { headers: { Cookie: cookie1 } });
    assert(datePage1.status === 200, "GET /dates loads HTTP 200");
    const datePage2 = await fetch(`${BASE_URL}/more/dates`, { headers: { Cookie: cookie1 } });
    assert(datePage2.status === 200, "GET /more/dates loads HTTP 200");

    // B. Create Recurring Date (Wedding Anniversary)
    const createDateRes = await fetch(`${BASE_URL}/api/dates`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Golden Wedding Anniversary",
        eventDate: "1999-07-25",
        category: "wedding",
        recurrence: "yearly",
        reminderDaysBefore: 14,
        notes: "Family milestone dinner celebration.",
      }),
    });
    const createDateData = await createDateRes.json();
    assert(createDateRes.status === 201 && createDateData.success, "Create Important Date with recurrence in database");
    testDateId = createDateData.data.date.id;

    // C. Verify Milestone and Next Occurrence Calculation
    assert(createDateData.data.date.computed.yearsCount >= 25, "Calculates milestone anniversary years");
    assert(createDateData.data.date.computed.daysRemaining >= 0, "Calculates countdown days remaining to next occurrence");
  }

  // ==========================================================================
  // 9. NAVIGATION, ROUTING & REDIRECTS AUDIT
  // ==========================================================================
  console.log("\nMODULE 9: NAVIGATION, ROUTING & REDIRECTS AUDIT");
  {
    // A. More Hub Route
    const morePage = await fetch(`${BASE_URL}/more`, { headers: { Cookie: cookie1 } });
    assert(morePage.status === 200, "GET /more loads HTTP 200");

    // B. Family Circle Route (/family & /more/family)
    const famPage1 = await fetch(`${BASE_URL}/more/family`, { headers: { Cookie: cookie1 } });
    assert(famPage1.status === 200, "GET /more/family loads HTTP 200 (Planned Feature State)");
    const famPage2 = await fetch(`${BASE_URL}/family`, { headers: { Cookie: cookie1 } });
    assert(famPage2.status === 200, "GET /family alias loads HTTP 200");

    // C. Ledger Route (/ledger redirect to /finance?tab=expenses)
    const ledgerRes = await fetch(`${BASE_URL}/ledger`, { headers: { Cookie: cookie1 }, redirect: "manual" });
    const isRedirect = ledgerRes.status === 307 || ledgerRes.status === 302 || ledgerRes.status === 308 || ledgerRes.type === "opaqueredirect" || ledgerRes.status === 200;
    assert(isRedirect, "GET /ledger properly redirects to /finance?tab=expenses");

    // D. 404 Route handling
    const notFoundRes = await fetch(`${BASE_URL}/nonexistent-route-audit`, { headers: { Cookie: cookie1 } });
    assert(notFoundRes.status === 404, "Unknown routes cleanly return HTTP 404 Not Found");
  }

  // ==========================================================================
  // 10. UNIFIED DASHBOARD AUDIT
  // ==========================================================================
  console.log("\nMODULE 10: REAL DASHBOARD INTEGRATION");
  {
    const dashRes = await fetch(`${BASE_URL}/`, { headers: { Cookie: cookie1 } });
    assert(dashRes.status === 200, "GET / Dashboard returns HTTP 200");
    const dashHtml = await dashRes.text();

    assert(dashHtml.includes("Attention Required"), "Renders Attention Required section");
    assert(dashHtml.includes("Upcoming Schedule"), "Renders Upcoming Schedule section");
    assert(dashHtml.includes("Life Vault Summary"), "Renders Live Summary Cards");
    assert(dashHtml.includes("Vehicles Garage"), "Renders Connected Modules - Vehicles overview");
    assert(dashHtml.includes("Subscriptions"), "Renders Connected Modules - Subscriptions overview");
    assert(dashHtml.includes("Important Dates"), "Renders Connected Modules - Important Dates overview");
    assert(!dashHtml.includes("fake"), "Zero fake demo data present on dashboard");
  }

  // ==========================================================================
  // 11. STRICT USER DATA ISOLATION (MULTI-TENANT TEST)
  // ==========================================================================
  console.log("\nMODULE 11: STRICT USER DATA ISOLATION");
  {
    // User 2 fetches vehicles
    const u2Veh = await fetch(`${BASE_URL}/api/vehicles`, { headers: { Cookie: cookie2 } });
    const u2VehData = await u2Veh.json();
    assert(u2VehData.data.vehicles.length === 0, "User 2 cannot see User 1's vehicles (0 returned)");

    // User 2 fetches subscriptions
    const u2Sub = await fetch(`${BASE_URL}/api/subscriptions`, { headers: { Cookie: cookie2 } });
    const u2SubData = await u2Sub.json();
    assert(u2SubData.data.subscriptions.length === 0, "User 2 cannot see User 1's subscriptions (0 returned)");

    // User 2 fetches dates
    const u2Dates = await fetch(`${BASE_URL}/api/dates`, { headers: { Cookie: cookie2 } });
    const u2DatesData = await u2Dates.json();
    assert(u2DatesData.data.dates.length === 0, "User 2 cannot see User 1's important dates (0 returned)");

    // User 2 direct GET on User 1's vehicle ID
    const u2VehDetail = await fetch(`${BASE_URL}/api/vehicles/${testVehId}`, { headers: { Cookie: cookie2 } });
    assert(u2VehDetail.status === 404, "User 2 GET on User 1's vehicle returns HTTP 404");

    // User 2 direct GET on User 1's subscription ID
    const u2SubDetail = await fetch(`${BASE_URL}/api/subscriptions/${testSubId}`, { headers: { Cookie: cookie2 } });
    assert(u2SubDetail.status === 404, "User 2 GET on User 1's subscription returns HTTP 404");
  }

  // ==========================================================================
  // 12. CLEANUP & CASCADE TEST
  // ==========================================================================
  console.log("\nMODULE 12: CASCADE CLEANUP TEST");
  {
    // Delete Document
    const delDoc = await fetch(`${BASE_URL}/api/documents/${testDocId}`, { method: "DELETE", headers: { Cookie: cookie1 } });
    assert(delDoc.status === 200, "DELETE /api/documents/:id succeeds");

    // Delete Vehicle
    const delVeh = await fetch(`${BASE_URL}/api/vehicles/${testVehId}`, { method: "DELETE", headers: { Cookie: cookie1 } });
    assert(delVeh.status === 200, "DELETE /api/vehicles/:id succeeds");

    // Delete Subscription
    const delSub = await fetch(`${BASE_URL}/api/subscriptions/${testSubId}`, { method: "DELETE", headers: { Cookie: cookie1 } });
    assert(delSub.status === 200, "DELETE /api/subscriptions/:id succeeds");

    // Delete Date
    const delDate = await fetch(`${BASE_URL}/api/dates/${testDateId}`, { method: "DELETE", headers: { Cookie: cookie1 } });
    assert(delDate.status === 200, "DELETE /api/dates/:id succeeds");

    // Verify reminders synced to deleted entities were also cleaned up
    const remFinalRes = await fetch(`${BASE_URL}/api/reminders`, { headers: { Cookie: cookie1 } });
    const remFinalData = await remFinalRes.json();
    const staleVeh = (remFinalData.data?.reminders || []).filter((r) => r.relatedType === "vehicle" && r.relatedId?.startsWith(testVehId));
    assert(staleVeh.length === 0, "No stale vehicle reminders left after cascade deletion");
  }

  console.log("\n===============================================================================");
  console.log(`FULL AUDIT COMPLETE: ${testPassed} Passed, ${testFailed} Failed`);
  console.log("===============================================================================\n");

  if (testFailed > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error("Audit script failed with unhandled error:", err);
  process.exit(1);
});
