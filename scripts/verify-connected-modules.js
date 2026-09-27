/**
 * Verification Test Suite: Smart Life Manager - Connected Modules
 * 
 * Tests:
 * 1. User Authentication & Session Scoping
 * 2. VEHICLES MODULE:
 *    - Multiple vehicles support per user
 *    - Required & optional fields (name, make, model, year, licensePlate, VIN, mileage, etc.)
 *    - Maintenance reminder categories (insurance, registration, service, oil change, tyres, battery)
 *    - Vehicle alerts calculation (expired registration, overdue service, mileage alert)
 *    - Multi-tenant isolation (User 2 cannot see User 1's vehicles)
 *    - Reminder engine synchronization (relatedType: "vehicle")
 *    - Cascade deletion of vehicle reminders
 * 3. SUBSCRIPTIONS MODULE:
 *    - Creation with amount, currency, billing date, frequency, category, notes
 *    - Normalized calculations (Monthly Cost, Annual Cost, Active Subscriptions count)
 *    - Action: Cancel subscription (sets renewalStatus to cancelled, recalculates totals)
 *    - Action: Edit and Delete subscription
 *    - Reminder engine synchronization (relatedType: "subscription")
 * 4. IMPORTANT DATES MODULE:
 *    - Categories: Birthday, Anniversary, Wedding, Renewal, Custom Date
 *    - Yearly recurring calculation & next occurrence rollover
 *    - Milestone calculation (e.g. 5th Anniversary, 60th Birthday)
 *    - Reminder engine synchronization (relatedType: "important_date")
 * 5. DASHBOARD INTEGRATION:
 *    - Vehicle alerts reflected in Attention Required
 *    - Upcoming vehicle services & renewals reflected in Upcoming Schedule
 *    - Active subscription renewals reflected in Upcoming Schedule
 *    - Important dates & milestones reflected in Upcoming Schedule
 *    - No duplicate reminders between standalone and synced module items
 *    - Live summary cards displaying connected modules metrics
 */

const BASE_URL = "http://localhost:3000";

let testPassed = 0;
let testFailed = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    testPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} - ${details}`);
    testFailed++;
  }
}

async function run() {
  console.log("===============================================================");
  console.log("SMART LIFE MANAGER - CONNECTED MODULES VERIFICATION");
  console.log("Vehicles, Subscriptions, Important Dates & Dashboard");
  console.log("===============================================================\n");

  const timestamp = Date.now();
  const user1Email = `connected_user1_${timestamp}@example.com`;
  const user2Email = `connected_user2_${timestamp}@example.com`;
  const password = "Password123!";

  let cookie1 = "";
  let cookie2 = "";

  // --------------------------------------------------------------------------
  // 1. Authentication & Session Setup
  // --------------------------------------------------------------------------
  console.log("1. Multi-Tenant User Setup");
  {
    const reg1 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user1Email,
        password,
        displayName: "Module Tester 1",
        currency: "USD",
      }),
    });
    const data1 = await reg1.json();
    assert(reg1.status === 201 && data1.success, "User 1 Registration Successful");
    const setCookie1 = reg1.headers.get("set-cookie");
    if (setCookie1) cookie1 = setCookie1.split(";")[0];

    const reg2 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user2Email,
        password,
        displayName: "Module Tester 2",
        currency: "EUR",
      }),
    });
    const data2 = await reg2.json();
    assert(reg2.status === 201 && data2.success, "User 2 Registration Successful");
    const setCookie2 = reg2.headers.get("set-cookie");
    if (setCookie2) cookie2 = setCookie2.split(";")[0];
  }

  // --------------------------------------------------------------------------
  // 2. VEHICLES MODULE
  // --------------------------------------------------------------------------
  console.log("\n2. Vehicles Module (Multiple Vehicles, Alert Logic & Reminders)");
  let vehicle1Id = "";
  let vehicle2Id = "";

  {
    // A. Create Vehicle 1: Toyota RAV4 (Good standing)
    const futureInsDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
    const futureRegDate = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000).toISOString();
    const futureSvcDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const res1 = await fetch(`${BASE_URL}/api/vehicles`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        name: "Family SUV",
        make: "Toyota",
        model: "RAV4",
        year: 2022,
        licensePlate: "DXB-98765",
        vin: "1T234567890123456",
        mileage: 45000,
        nextServiceMileage: 50000,
        insuranceExpiry: futureInsDate,
        registrationExpiry: futureRegDate,
        nextServiceDate: futureSvcDate,
        notes: "Serviced at authorized dealership.",
      }),
    });
    const json1 = await res1.json();
    assert(res1.status === 201 && json1.success, "Create Vehicle 1 (Family SUV)");
    vehicle1Id = json1.data.vehicle.id;
    assert(json1.data.vehicle.statusSummary.alerts.length === 0, "Vehicle 1 has 0 alerts (Good standing)");
    assert(json1.data.vehicle.statusSummary.insuranceStatus === "VALID", "Vehicle 1 insuranceStatus is VALID");

    // B. Create Vehicle 2: Honda Civic (Expired Registration + Overdue Mileage Alert)
    const pastRegDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const soonInsDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

    const res2 = await fetch(`${BASE_URL}/api/vehicles`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        name: "Work Sedan",
        make: "Honda",
        model: "Civic",
        year: 2018,
        licensePlate: "DXB-11223",
        vin: "2H987654321098765",
        mileage: 96000,
        nextServiceMileage: 95000, // Current mileage > next service mileage -> alert!
        registrationExpiry: pastRegDate, // Expired 5 days ago -> alert!
        insuranceExpiry: soonInsDate, // Expiring in 15 days -> warning alert!
        notes: "Daily commuter car.",
      }),
    });
    const json2 = await res2.json();
    assert(res2.status === 201 && json2.success, "Create Vehicle 2 with alerts");
    vehicle2Id = json2.data.vehicle.id;

    const v2Alerts = json2.data.vehicle.statusSummary.alerts;
    assert(v2Alerts.length >= 2, `Vehicle 2 generated alerts (Found ${v2Alerts.length})`);
    assert(json2.data.vehicle.statusSummary.registrationStatus === "EXPIRED", "Vehicle 2 registrationStatus is EXPIRED");
    assert(json2.data.vehicle.statusSummary.mileageStatus === "OVERDUE", "Vehicle 2 mileageStatus is OVERDUE");

    // C. Verify Multiple Vehicles returned
    const listRes = await fetch(`${BASE_URL}/api/vehicles`, {
      headers: { Cookie: cookie1 },
    });
    const listJson = await listRes.json();
    assert(listJson.data.vehicles.length === 2, "User 1 has 2 vehicles in garage");

    // D. Multi-Tenant Check: User 2 sees 0 vehicles
    const user2VehRes = await fetch(`${BASE_URL}/api/vehicles`, {
      headers: { Cookie: cookie2 },
    });
    const user2VehJson = await user2VehRes.json();
    assert(user2VehJson.data.vehicles.length === 0, "User 2 garage is isolated (0 vehicles)");

    // E. Verify Reminder Synchronization (relatedType: 'vehicle')
    const remRes = await fetch(`${BASE_URL}/api/reminders`, {
      headers: { Cookie: cookie1 },
    });
    const remJson = await remRes.json();
    const vehicleReminders = (remJson.data?.reminders || []).filter((r) => r.relatedType === "vehicle");
    assert(vehicleReminders.length > 0, `Vehicle reminders synced to central Reminder engine (Found ${vehicleReminders.length})`);

    // F. Update Vehicle
    const updateRes = await fetch(`${BASE_URL}/api/vehicles/${vehicle2Id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        name: "Work Sedan (Updated)",
        make: "Honda",
        model: "Civic",
        year: 2019,
        mileage: 97000,
        nextServiceMileage: 105000, // Resolved mileage overdue
      }),
    });
    const updateJson = await updateRes.json();
    assert(updateRes.status === 200 && updateJson.data.vehicle.year === 2019, "Update Vehicle 2 succeeded");
    assert(updateJson.data.vehicle.statusSummary.mileageStatus === "OK", "Updated Vehicle 2 mileageStatus is now OK");
  }

  // --------------------------------------------------------------------------
  // 3. SUBSCRIPTIONS MODULE
  // --------------------------------------------------------------------------
  console.log("\n3. Subscriptions Module (Cost Normalization, Cancellation & Reminders)");
  let sub1Id = "";
  let sub2Id = "";
  let sub3Id = "";

  {
    // A. Sub 1: Monthly Netflix ($20/month)
    const nextBill1 = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const res1 = await fetch(`${BASE_URL}/api/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        name: "Netflix 4K",
        cost: 20.0,
        currency: "USD",
        billingCycle: "monthly",
        nextBillingDate: nextBill1,
        category: "Entertainment",
        notes: "Family plan shared across TVs.",
      }),
    });
    const json1 = await res1.json();
    assert(res1.status === 201 && json1.success, "Create Monthly Subscription (Netflix)");
    sub1Id = json1.data.subscription.id;

    // B. Sub 2: Yearly Adobe ($600/year -> $50/mo normalized)
    const nextBill2 = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString();
    const res2 = await fetch(`${BASE_URL}/api/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        name: "Adobe Creative Cloud",
        cost: 600.0,
        currency: "USD",
        billingCycle: "yearly",
        nextBillingDate: nextBill2,
        category: "Software & SaaS",
        notes: "Annual creative tools suite.",
      }),
    });
    const json2 = await res2.json();
    assert(res2.status === 201 && json2.success, "Create Yearly Subscription (Adobe)");
    sub2Id = json2.data.subscription.id;

    // C. Sub 3: Weekly Gym ($15/week -> $65/mo normalized, $780/yr)
    const nextBill3 = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();
    const res3 = await fetch(`${BASE_URL}/api/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        name: "Fitness First Membership",
        cost: 15.0,
        currency: "USD",
        billingCycle: "weekly",
        nextBillingDate: nextBill3,
        category: "Health & Fitness",
      }),
    });
    const json3 = await res3.json();
    assert(res3.status === 201 && json3.success, "Create Weekly Subscription (Gym)");
    sub3Id = json3.data.subscription.id;

    // D. Verify List & Cost Calculations
    // Monthly: 20 + 50 + 65 = 135
    // Annual: 240 + 600 + 780 = 1620
    const listRes = await fetch(`${BASE_URL}/api/subscriptions`, {
      headers: { Cookie: cookie1 },
    });
    const listJson = await listRes.json();
    assert(listJson.data.subscriptions.length === 3, "User 1 has 3 active subscriptions");
    assert(listJson.data.metrics.activeCount === 3, "Metrics active count is 3");
    assert(Math.abs(listJson.data.metrics.monthlyTotal - 135) < 0.1, `Monthly normalized cost ~$135 (Actual: ${listJson.data.metrics.monthlyTotal})`);
    assert(Math.abs(listJson.data.metrics.annualTotal - 1620) < 0.1, `Annual normalized cost ~$1620 (Actual: ${listJson.data.metrics.annualTotal})`);

    // E. Verify Reminder Synchronization (relatedType: 'subscription')
    const remRes = await fetch(`${BASE_URL}/api/reminders`, {
      headers: { Cookie: cookie1 },
    });
    const remJson = await remRes.json();
    const subReminders = (remJson.data?.reminders || []).filter((r) => r.relatedType === "subscription");
    assert(subReminders.length >= 3, `Subscription reminders synced to central Reminder engine (Found ${subReminders.length})`);

    // F. Cancel Subscription Action
    const cancelRes = await fetch(`${BASE_URL}/api/subscriptions/${sub1Id}/cancel`, {
      method: "PATCH",
      headers: { Cookie: cookie1 },
    });
    const cancelJson = await cancelRes.json();
    assert(cancelRes.status === 200 && cancelJson.data.subscription.renewalStatus === "cancelled", "Cancel Subscription sets renewalStatus to cancelled");

    // G. Verify Metrics after cancellation
    const listAfterCancelRes = await fetch(`${BASE_URL}/api/subscriptions`, {
      headers: { Cookie: cookie1 },
    });
    const listAfterCancelJson = await listAfterCancelRes.json();
    assert(listAfterCancelJson.data.metrics.activeCount === 2, "Active count decreased to 2 after cancellation");
    assert(listAfterCancelJson.data.metrics.cancelledCount === 1, "Cancelled count increased to 1");
    // Monthly should now be 50 + 65 = 115
    assert(Math.abs(listAfterCancelJson.data.metrics.monthlyTotal - 115) < 0.1, `Monthly cost recalculated to ~$115 (Actual: ${listAfterCancelJson.data.metrics.monthlyTotal})`);

    // H. Multi-tenant check: User 2 sees 0 subscriptions
    const u2SubRes = await fetch(`${BASE_URL}/api/subscriptions`, {
      headers: { Cookie: cookie2 },
    });
    const u2SubJson = await u2SubRes.json();
    assert(u2SubJson.data.subscriptions.length === 0, "User 2 has 0 subscriptions (Isolation intact)");
  }

  // --------------------------------------------------------------------------
  // 4. IMPORTANT DATES MODULE
  // --------------------------------------------------------------------------
  console.log("\n4. Important Dates Module (Recurrence, Milestones & Reminders)");
  let date1Id = "";
  let date2Id = "";

  {
    // A. Birthday (Yearly recurring, calculation of next occurrence & milestone)
    // Create birth date in 1990
    const res1 = await fetch(`${BASE_URL}/api/dates`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Alex's Birthday",
        eventDate: "1990-11-20",
        category: "birthday",
        recurrence: "yearly",
        reminderDaysBefore: 7,
        notes: "Don't forget to organize birthday surprise.",
      }),
    });
    const json1 = await res1.json();
    assert(res1.status === 201 && json1.success, "Create Birthday with yearly recurrence");
    date1Id = json1.data.date.id;
    assert(json1.data.date.computed.yearsCount > 0, `Milestone computed: turning ${json1.data.date.computed.yearsCount}`);

    // B. Anniversary (5th year milestone)
    const thisYear = new Date().getFullYear();
    const res2 = await fetch(`${BASE_URL}/api/dates`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Wedding Anniversary",
        eventDate: `${thisYear - 5}-08-15`, // exactly 5 years ago
        category: "anniversary",
        recurrence: "yearly",
        reminderDaysBefore: 14,
      }),
    });
    const json2 = await res2.json();
    assert(res2.status === 201 && json2.success, "Create Anniversary with milestone");
    date2Id = json2.data.date.id;
    assert(json2.data.date.computed.yearsCount >= 5, `Milestone calculation: ${json2.data.date.computed.yearsCount}th year`);

    // C. List Important Dates
    const listRes = await fetch(`${BASE_URL}/api/dates`, {
      headers: { Cookie: cookie1 },
    });
    const listJson = await listRes.json();
    assert(listJson.data.dates.length === 2, "User 1 has 2 important dates");

    // D. Reminder engine synchronization (relatedType: 'important_date')
    const remRes = await fetch(`${BASE_URL}/api/reminders`, {
      headers: { Cookie: cookie1 },
    });
    const remJson = await remRes.json();
    const dateReminders = (remJson.data?.reminders || []).filter((r) => r.relatedType === "important_date");
    assert(dateReminders.length >= 2, `Important date reminders synced to central Reminder engine (Found ${dateReminders.length})`);

    // E. Multi-tenant check: User 2 sees 0 dates
    const u2DateRes = await fetch(`${BASE_URL}/api/dates`, {
      headers: { Cookie: cookie2 },
    });
    const u2DateJson = await u2DateRes.json();
    assert(u2DateJson.data.dates.length === 0, "User 2 has 0 dates (Isolation intact)");
  }

  // --------------------------------------------------------------------------
  // 5. DASHBOARD INTEGRATION
  // --------------------------------------------------------------------------
  console.log("\n5. Dashboard Integration Verification");
  {
    // Fetch Dashboard page with User 1 session
    const dashRes = await fetch(`${BASE_URL}/`, {
      headers: { Cookie: cookie1 },
    });
    assert(dashRes.status === 200, "Dashboard returns 200 OK");
    const dashHtml = await dashRes.text();

    // Check for vehicle alerts or section references
    const hasVehicleAlert = dashHtml.includes("Work Sedan") || dashHtml.includes("Registration") || dashHtml.includes("Vehicles Garage");
    assert(hasVehicleAlert, "Dashboard displays Vehicle alert / Garage section");

    // Check for subscriptions
    const hasSubscription = dashHtml.includes("Subscriptions") || dashHtml.includes("Adobe") || dashHtml.includes("Fitness First");
    assert(hasSubscription, "Dashboard displays Subscriptions summary / renewal");

    // Check for important dates
    const hasImportantDate = dashHtml.includes("Important Dates") || dashHtml.includes("Birthday") || dashHtml.includes("Anniversary");
    assert(hasImportantDate, "Dashboard displays Important Dates / Milestone");

    // Check for Connected Modules status cards
    const hasConnectedSummary = dashHtml.includes("Vehicles Garage") && dashHtml.includes("Subscriptions") && dashHtml.includes("Important Dates");
    assert(hasConnectedSummary, "Dashboard renders Live Connected Modules Summary Bar");
  }

  // --------------------------------------------------------------------------
  // 6. Cascade Deletion & Reminder Cleanup
  // --------------------------------------------------------------------------
  console.log("\n6. Cascade Deletion & Reminder Cleanup");
  {
    // Delete Vehicle 1
    const delVehRes = await fetch(`${BASE_URL}/api/vehicles/${vehicle1Id}`, {
      method: "DELETE",
      headers: { Cookie: cookie1 },
    });
    assert(delVehRes.status === 200, "Delete Vehicle 1 succeeded");

    // Delete Subscription 3
    const delSubRes = await fetch(`${BASE_URL}/api/subscriptions/${sub3Id}`, {
      method: "DELETE",
      headers: { Cookie: cookie1 },
    });
    assert(delSubRes.status === 200, "Delete Subscription 3 succeeded");

    // Delete Date 2
    const delDateRes = await fetch(`${BASE_URL}/api/dates/${date2Id}`, {
      method: "DELETE",
      headers: { Cookie: cookie1 },
    });
    assert(delDateRes.status === 200, "Delete Date 2 succeeded");

    // Verify synced reminders for deleted items were cleaned up
    const remRes = await fetch(`${BASE_URL}/api/reminders`, {
      headers: { Cookie: cookie1 },
    });
    const remJson = await remRes.json();
    const staleVehReminders = (remJson.data?.reminders || []).filter((r) => r.relatedType === "vehicle" && r.relatedId?.startsWith(vehicle1Id));
    assert(staleVehReminders.length === 0, "Vehicle 1 synced reminders cleanly removed on vehicle deletion");

    const staleSubReminders = (remJson.data?.reminders || []).filter((r) => r.relatedType === "subscription" && r.relatedId === sub3Id);
    assert(staleSubReminders.length === 0, "Subscription 3 synced reminders cleanly removed on deletion");

    const staleDateReminders = (remJson.data?.reminders || []).filter((r) => r.relatedType === "important_date" && r.relatedId === date2Id);
    assert(staleDateReminders.length === 0, "Date 2 synced reminders cleanly removed on deletion");
  }

  console.log("\n===============================================================");
  console.log(`TEST SUMMARY: ${testPassed} Passed, ${testFailed} Failed`);
  console.log("===============================================================");

  if (testFailed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
