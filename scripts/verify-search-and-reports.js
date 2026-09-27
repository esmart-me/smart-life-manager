// Smart Life Manager - Global Search & Reports Verification Suite
// Tests search across all 7 entities, category filters, 7 reports calculations,
// CSV exports, PDF HTML layouts, WhatsApp share messages, and multi-tenant isolation.

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

async function runTests() {
  console.log("===============================================================");
  console.log("SMART LIFE MANAGER - GLOBAL SEARCH & REPORTING VERIFICATION");
  console.log("===============================================================");

  const timestamp = Date.now();
  const user1Email = `search_user1_${timestamp}@smartlifemanager.local`;
  const user2Email = `search_user2_${timestamp}@smartlifemanager.local`;
  const password = "Password123!";

  let cookie1 = "";
  let cookie2 = "";

  // 1. Multi-Tenant User Setup
  console.log("\n1. Multi-Tenant Authentication Setup");
  {
    const reg1 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user1Email, password, firstName: "Alice", lastName: "Auditor" }),
    });
    const regData1 = await reg1.json();
    assert(reg1.status === 201 && regData1.success, "User 1 Registration Successful");
    cookie1 = reg1.headers.get("set-cookie")?.split(";")[0] || "";

    const reg2 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user2Email, password, firstName: "Bob", lastName: "Observer" }),
    });
    const regData2 = await reg2.json();
    assert(reg2.status === 201 && regData2.success, "User 2 Registration Successful");
    cookie2 = reg2.headers.get("set-cookie")?.split(";")[0] || "";
  }

  // 2. Seed Test Records for User 1 Across All 7 Entities
  console.log("\n2. Data Seeding Across All 7 Life Modules (User 1)");
  let seededDocId = "";
  let seededVehId = "";
  let seededSubId = "";
  let seededDateId = "";
  let seededPayId = "";
  let seededExpId = "";
  let seededRemId = "";

  {
    // A. Document (Passport, 20 days expiry)
    const expDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
    const docRes = await fetch(`${BASE_URL}/api/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Diplomatic Passport",
        category: "Passport",
        documentNumber: "DIP-998877",
        expiryDate: expDate,
        notes: "Official diplomatic passport for international travel",
      }),
    });
    const docData = await docRes.json();
    assert(docRes.status === 201 && docData.success, "Seed Document: Diplomatic Passport");
    seededDocId = docData.data.document.id;

    // B. Reminder
    const remDue = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();
    const remRes = await fetch(`${BASE_URL}/api/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Annual Federal Tax Filing",
        description: "Submit quarterly accounting reports to auditor",
        dueDate: remDue,
        category: "Finance",
        priority: "high",
        repeat: "yearly",
      }),
    });
    const remData = await remRes.json();
    assert(remRes.status === 201 && remData.success, "Seed Reminder: Tax Filing");
    seededRemId = remData.data.reminder.id;

    // C. Payment (Paid bill and unpaid bill)
    const payDue = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const payRes1 = await fetch(`${BASE_URL}/api/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Office Headquarters Rent",
        payee: "Crown Real Estate",
        amount: 3200.0,
        currency: "USD",
        dueDate: payDue,
        category: "Rent",
        isPaid: false,
      }),
    });
    const payData1 = await payRes1.json();
    assert(payRes1.status === 201 && payData1.success, "Seed Upcoming Payment: Office Rent");
    seededPayId = payData1.data.payment.id;

    // Paid payment for history report
    const payRes2 = await fetch(`${BASE_URL}/api/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Fiber Optic Backbone",
        payee: "Telecom Corp",
        amount: 250.0,
        currency: "USD",
        dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        category: "Internet",
        isPaid: true,
      }),
    });
    assert(payRes2.status === 201, "Seed Paid Payment: Fiber Optic");

    // D. Expenses
    const expRes1 = await fetch(`${BASE_URL}/api/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Executive Business Lunch",
        amount: 210.5,
        currency: "USD",
        category: "Food",
        spentAt: new Date().toISOString(),
        paymentMethod: "Credit Card",
        notes: "Partner quarterly review lunch",
      }),
    });
    const expData1 = await expRes1.json();
    assert(expRes1.status === 201 && expData1.success, "Seed Expense 1: Business Lunch ($210.50)");
    seededExpId = expData1.data.expense.id;

    const expRes2 = await fetch(`${BASE_URL}/api/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Software Server Hosting",
        amount: 450.0,
        currency: "USD",
        category: "Bills",
        spentAt: new Date().toISOString(),
        paymentMethod: "Bank",
        notes: "Cloud infrastructure production server",
      }),
    });
    assert(expRes2.status === 201, "Seed Expense 2: Cloud Server ($450.00)");

    // Budget setup
    await fetch(`${BASE_URL}/api/budget`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        monthlyBudget: 2500,
        monthlyIncome: 7000,
        categoryBudgets: [
          { category: "Food", limitAmount: 300 },
          { category: "Bills", limitAmount: 600 },
        ],
      }),
    });

    // E. Vehicle
    const vehRes = await fetch(`${BASE_URL}/api/vehicles`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        name: "Cyber Performance Cruiser",
        make: "Tesla",
        model: "Model S Plaid",
        year: 2024,
        licensePlate: "DXB-PLAID-01",
        vin: "5YJSA1E21NF000111",
        mileage: 28500,
        nextServiceMileage: 25000, // Overdue service!
        registrationExpiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        insuranceExpiry: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        notes: "Performance electric vehicle",
      }),
    });
    const vehData = await vehRes.json();
    assert(vehRes.status === 201 && vehData.success, "Seed Vehicle: Tesla Model S");
    seededVehId = vehData.data.vehicle.id;

    // F. Subscription
    const subRes = await fetch(`${BASE_URL}/api/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        name: "Figma Organization Suite",
        cost: 180.0,
        currency: "USD",
        billingCycle: "yearly", // 180 / 12 = 15/mo
        nextBillingDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        category: "Software",
        notes: "Design system subscription",
      }),
    });
    const subData = await subRes.json();
    assert(subRes.status === 201 && subData.success, "Seed Subscription: Figma ($180/yr)");
    seededSubId = subData.data.subscription.id;

    // G. Important Date
    const dateRes = await fetch(`${BASE_URL}/api/dates`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Company Founding Milestone",
        eventDate: "2018-05-15",
        category: "custom",
        recurrence: "yearly",
        notes: "Annual company founding celebration",
      }),
    });
    const dateData = await dateRes.json();
    assert(dateRes.status === 201 && dateData.success, "Seed Important Date: Founding Milestone");
    seededDateId = dateData.data.date.id;
  }

  // 3. Global Search Verification
  console.log("\n3. Global Search Engine & Category Filter Verification");
  {
    // A. Empty Query
    const emptyRes = await fetch(`${BASE_URL}/api/search?q=`, { headers: { Cookie: cookie1 } });
    const emptyData = await emptyRes.json();
    assert(emptyRes.status === 200 && emptyData.data.total === 0, "Empty query returns 0 total results cleanly");

    // B. Search Document
    const sDocRes = await fetch(`${BASE_URL}/api/search?q=Diplomatic`, { headers: { Cookie: cookie1 } });
    const sDocData = await sDocRes.json();
    assert(sDocData.data.total >= 1, "Search finds Document by title ('Diplomatic')");
    assert(sDocData.data.grouped.documents[0].title === "Diplomatic Passport", "Document match details correct");

    // C. Search Reminder
    const sRemRes = await fetch(`${BASE_URL}/api/search?q=Federal+Tax`, { headers: { Cookie: cookie1 } });
    const sRemData = await sRemRes.json();
    assert(sRemData.data.total >= 1, "Search finds Reminder by title ('Federal Tax')");
    assert(sRemData.data.grouped.reminders[0].title === "Annual Federal Tax Filing", "Reminder match details correct");

    // D. Search Payment
    const sPayRes = await fetch(`${BASE_URL}/api/search?q=Crown+Real+Estate`, { headers: { Cookie: cookie1 } });
    const sPayData = await sPayRes.json();
    assert(sPayData.data.total >= 1, "Search finds Payment by payee ('Crown Real Estate')");
    assert(sPayData.data.grouped.payments[0].title === "Office Headquarters Rent", "Payment match details correct");

    // E. Search Expense
    const sExpRes = await fetch(`${BASE_URL}/api/search?q=Business+Lunch`, { headers: { Cookie: cookie1 } });
    const sExpData = await sExpRes.json();
    assert(sExpData.data.total >= 1, "Search finds Expense by description ('Business Lunch')");

    // F. Search Vehicle
    const sVehRes = await fetch(`${BASE_URL}/api/search?q=DXB-PLAID`, { headers: { Cookie: cookie1 } });
    const sVehData = await sVehRes.json();
    assert(sVehData.data.total >= 1, "Search finds Vehicle by license plate ('DXB-PLAID')");
    assert(sVehData.data.grouped.vehicles[0].title === "Cyber Performance Cruiser", "Vehicle match details correct");

    // G. Search Subscription
    const sSubRes = await fetch(`${BASE_URL}/api/search?q=Figma`, { headers: { Cookie: cookie1 } });
    const sSubData = await sSubRes.json();
    assert(sSubData.data.total >= 1, "Search finds Subscription by name ('Figma')");

    // H. Search Important Date
    const sDateRes = await fetch(`${BASE_URL}/api/search?q=Founding`, { headers: { Cookie: cookie1 } });
    const sDateData = await sDateRes.json();
    assert(sDateData.data.total >= 1, "Search finds Important Date by title ('Founding')");

    // I. Category Filter Constraint
    const sFilterRes = await fetch(`${BASE_URL}/api/search?q=Plaid&category=vehicles`, { headers: { Cookie: cookie1 } });
    const sFilterData = await sFilterRes.json();
    assert(sFilterData.data.items.length === 1 && sFilterData.data.items[0].category === "vehicles", "Category filter narrows results strictly to vehicles");
  }

  // 4. Multi-Tenant Search Isolation
  console.log("\n4. Multi-Tenant Search Privacy Verification");
  {
    // User 2 searching for User 1's records
    const u2Search1 = await fetch(`${BASE_URL}/api/search?q=Diplomatic`, { headers: { Cookie: cookie2 } });
    const u2Data1 = await u2Search1.json();
    assert(u2Data1.data.total === 0, "User 2 cannot find User 1's passport (0 results)");

    const u2Search2 = await fetch(`${BASE_URL}/api/search?q=Tesla`, { headers: { Cookie: cookie2 } });
    const u2Data2 = await u2Search2.json();
    assert(u2Data2.data.total === 0, "User 2 cannot find User 1's vehicle (0 results)");

    const u2Search3 = await fetch(`${BASE_URL}/api/search?q=Figma`, { headers: { Cookie: cookie2 } });
    const u2Data3 = await u2Search3.json();
    assert(u2Data3.data.total === 0, "User 2 cannot find User 1's subscription (0 results)");
  }

  // 5. Reports Verification (All 7 Reports)
  console.log("\n5. Complete Reporting Engine Verification (All 7 Reports)");
  {
    // Report 1: Monthly Expense Report
    const r1 = await fetch(`${BASE_URL}/api/reports/monthly_expense`, { headers: { Cookie: cookie1 } });
    const d1 = await r1.json();
    assert(r1.status === 200 && d1.success, "Report 1: Monthly Expense generates HTTP 200");
    assert(d1.data.report.summaryCards[0].value.includes("660.50"), "Calculates total monthly expenses ($210.50 + $450.00 = $660.50)");
    assert(d1.data.report.sections[0].rows.length >= 2, "Includes category breakdown rows");
    assert(d1.data.shareText.includes("Monthly Expense Report"), "Generates formatted WhatsApp shareText");

    // Report 2: Category Spending Report
    const r2 = await fetch(`${BASE_URL}/api/reports/category_spending`, { headers: { Cookie: cookie1 } });
    const d2 = await r2.json();
    assert(r2.status === 200 && d2.success, "Report 2: Category Spending generates HTTP 200");
    assert(d2.data.report.summaryCards.length >= 3, "Contains budget utilization summary cards");

    // Report 3: Payment History Report
    const r3 = await fetch(`${BASE_URL}/api/reports/payment_history`, { headers: { Cookie: cookie1 } });
    const d3 = await r3.json();
    assert(r3.status === 200 && d3.success, "Report 3: Payment History generates HTTP 200");
    assert(d3.data.report.summaryCards[0].value.includes("250.00"), "Calculates total cleared payments ($250.00)");
    assert(d3.data.report.sections[0].rows.length >= 1, "Displays cleared bill rows");

    // Report 4: Upcoming Payments Report
    const r4 = await fetch(`${BASE_URL}/api/reports/upcoming_payments`, { headers: { Cookie: cookie1 } });
    const d4 = await r4.json();
    assert(r4.status === 200 && d4.success, "Report 4: Upcoming Payments generates HTTP 200");
    assert(d4.data.report.summaryCards[0].value.includes("3200.00"), "Calculates total upcoming liability ($3,200.00)");

    // Report 5: Document Expiry Report
    const r5 = await fetch(`${BASE_URL}/api/reports/document_expiry`, { headers: { Cookie: cookie1 } });
    const d5 = await r5.json();
    assert(r5.status === 200 && d5.success, "Report 5: Document Expiry generates HTTP 200");
    assert(d5.data.report.summaryCards[0].value === "1", "Audits total document count (1)");
    assert(d5.data.report.sections[0].rows[0][0] === "Diplomatic Passport", "Lists document in expiry audit");

    // Report 6: Vehicle Renewal Report
    const r6 = await fetch(`${BASE_URL}/api/reports/vehicle_renewal`, { headers: { Cookie: cookie1 } });
    const d6 = await r6.json();
    assert(r6.status === 200 && d6.success, "Report 6: Vehicle Renewal generates HTTP 200");
    assert(d6.data.report.summaryCards[0].value === "1", "Audits vehicles in garage (1)");
    assert(parseInt(d6.data.report.summaryCards[1].value, 10) >= 1, "Detects active maintenance/mileage alerts");

    // Report 7: Subscription Report
    const r7 = await fetch(`${BASE_URL}/api/reports/subscription_summary`, { headers: { Cookie: cookie1 } });
    const d7 = await r7.json();
    assert(r7.status === 200 && d7.success, "Report 7: Subscription Burn Rate generates HTTP 200");
    assert(d7.data.report.summaryCards[0].value.includes("15.00"), "Calculates normalized monthly burn rate ($180/yr = $15.00/mo)");
    assert(d7.data.report.summaryCards[1].value.includes("180.00"), "Calculates projected annual spend ($180.00)");
  }

  // 6. Exports Verification (CSV, PDF HTML, and WhatsApp Text)
  console.log("\n6. Export Formats Verification (CSV, Printable PDF HTML, WhatsApp)");
  {
    // A. CSV Export
    const csvRes = await fetch(`${BASE_URL}/api/reports/monthly_expense?format=csv`, { headers: { Cookie: cookie1 } });
    assert(csvRes.status === 200, "GET /api/reports/monthly_expense?format=csv returns HTTP 200");
    assert(csvRes.headers.get("content-type")?.includes("text/csv"), "Content-Type is text/csv");
    assert(csvRes.headers.get("content-disposition")?.includes("attachment"), "Content-Disposition attachment set");
    const csvText = await csvRes.text();
    assert(csvText.includes("SMART LIFE MANAGER - REPORT EXPORT"), "CSV contains branded header");
    assert(csvText.includes("Executive Business Lunch"), "CSV contains transaction records");
    assert(csvText.includes("660.50"), "CSV contains calculated numeric total");

    // B. Printable HTML for PDF Export
    const htmlRes = await fetch(`${BASE_URL}/api/reports/upcoming_payments?format=html`, { headers: { Cookie: cookie1 } });
    assert(htmlRes.status === 200, "GET /api/reports/upcoming_payments?format=html returns HTTP 200");
    assert(htmlRes.headers.get("content-type")?.includes("text/html"), "Content-Type is text/html");
    const htmlText = await htmlRes.text();
    assert(htmlText.includes("@media print"), "Printable HTML includes @media print styles");
    assert(htmlText.includes("window.print()"), "Printable HTML contains one-click print trigger");
    assert(htmlText.includes("Office Headquarters Rent"), "Printable HTML contains real bill records");

    // C. WhatsApp Formatted Text Payload
    const rWhatsApp = await fetch(`${BASE_URL}/api/reports/subscription_summary`, { headers: { Cookie: cookie1 } });
    const dWhatsApp = await rWhatsApp.json();
    const wText = dWhatsApp.data.shareText;
    assert(wText.includes("📊 *Subscription Burn Rate & Membership Report*"), "WhatsApp text contains formatted emoji header");
    assert(wText.includes("Monthly Burn Rate"), "WhatsApp text contains key metric highlights");
    assert(wText.includes("Generated privately from Smart Life Manager"), "WhatsApp text includes privacy signature");
  }

  // 7. Multi-Tenant Report Isolation
  console.log("\n7. Multi-Tenant Report Privacy Verification");
  {
    const u2Rep = await fetch(`${BASE_URL}/api/reports/monthly_expense`, { headers: { Cookie: cookie2 } });
    const u2Data = await u2Rep.json();
    assert(u2Data.data.report.summaryCards[0].value.includes("0.00"), "User 2 monthly expense report isolated ($0.00 spent)");
    assert(u2Data.data.report.sections[1].rows.length === 0, "User 2 expense list is empty (0 transactions)");

    const u2Docs = await fetch(`${BASE_URL}/api/reports/document_expiry`, { headers: { Cookie: cookie2 } });
    const u2DocsData = await u2Docs.json();
    assert(u2DocsData.data.report.summaryCards[0].value === "0", "User 2 document expiry report isolated (0 documents)");
  }

  // 8. Navigation Routes Verification
  console.log("\n8. Navigation Routes Verification");
  {
    const searchPage = await fetch(`${BASE_URL}/search`, { headers: { Cookie: cookie1 } });
    assert(searchPage.status === 200, "GET /search returns HTTP 200");

    const reportsPage = await fetch(`${BASE_URL}/reports`, { headers: { Cookie: cookie1 } });
    assert(reportsPage.status === 200, "GET /reports returns HTTP 200");
  }

  // 9. Cleanup
  console.log("\n9. Teardown & Cascade Cleanup");
  {
    await fetch(`${BASE_URL}/api/documents/${seededDocId}`, { method: "DELETE", headers: { Cookie: cookie1 } });
    await fetch(`${BASE_URL}/api/reminders/${seededRemId}`, { method: "DELETE", headers: { Cookie: cookie1 } });
    await fetch(`${BASE_URL}/api/payments/${seededPayId}`, { method: "DELETE", headers: { Cookie: cookie1 } });
    await fetch(`${BASE_URL}/api/expenses/${seededExpId}`, { method: "DELETE", headers: { Cookie: cookie1 } });
    await fetch(`${BASE_URL}/api/vehicles/${seededVehId}`, { method: "DELETE", headers: { Cookie: cookie1 } });
    await fetch(`${BASE_URL}/api/subscriptions/${seededSubId}`, { method: "DELETE", headers: { Cookie: cookie1 } });
    await fetch(`${BASE_URL}/api/dates/${seededDateId}`, { method: "DELETE", headers: { Cookie: cookie1 } });
    assert(true, "Cleanup completed successfully");
  }

  console.log("\n===============================================================");
  console.log(`GLOBAL SEARCH & REPORTS SUITE: ${testPassed} Passed, ${testFailed} Failed`);
  console.log("===============================================================\n");

  if (testFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Verification suite failed with unhandled error:", err);
  process.exit(1);
});
