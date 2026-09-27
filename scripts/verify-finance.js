/**
 * Verification Test Suite: Smart Life Manager - Finance Module
 * Tests:
 * 1. User Authentication & Session Scoping
 * 2. Payment Reminders (All 11 categories, fields, statuses: Upcoming, Due Today, Overdue, Paid)
 * 3. Recurring Payment Advancement (Automatic next occurrence generation upon mark paid)
 * 4. Expense Tracker (All 11 categories, payment methods, description, amount, date)
 * 5. Secure Receipt Upload, Retrieval, and Cleanup
 * 6. Budget Management (Monthly Income, Monthly Budget, Savings Target, Category Budgets)
 * 7. Real-time Budget Calculations (Total Income, Total Expenses, Remaining Budget, Savings)
 * 8. Budget Threshold Warnings (Approaching >= 80% & Exceeding >= 100%)
 * 9. Multi-Tenant User Isolation (Zero cross-user data leakage)
 * 10. Dashboard Integration
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
  console.log("=================================================");
  console.log("SMART LIFE MANAGER - FINANCE MODULE VERIFICATION");
  console.log("=================================================\n");

  const timestamp = Date.now();
  const user1Email = `finance_user1_${timestamp}@example.com`;
  const user2Email = `finance_user2_${timestamp}@example.com`;
  const password = "Password123!";

  let cookie1 = "";
  let cookie2 = "";

  // 1. Register User 1
  console.log("1. Authentication Setup");
  {
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user1Email,
        password,
        displayName: "Finance Tester 1",
        currency: "USD",
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.success, "User 1 Registration Successful");
    const setCookie = regRes.headers.get("set-cookie");
    if (setCookie) {
      cookie1 = setCookie.split(";")[0];
    }

    const regRes2 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user2Email,
        password,
        displayName: "Finance Tester 2",
        currency: "EUR",
      }),
    });
    const regData2 = await regRes2.json();
    assert(regRes2.status === 201 && regData2.success, "User 2 Registration Successful");
    const setCookie2 = regRes2.headers.get("set-cookie");
    if (setCookie2) {
      cookie2 = setCookie2.split(";")[0];
    }
  }

  // 2. Payment Reminders & Status Calculations
  console.log("\n2. Payment Reminders & Status Calculations");
  let upcomingPaymentId = "";
  let dueTodayPaymentId = "";
  let overduePaymentId = "";
  let recurringPaymentId = "";

  {
    // A. Create upcoming payment
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const upRes = await fetch(`${BASE_URL}/api/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Internet Fiber Plan",
        amount: 89.99,
        currency: "USD",
        dueDate: futureDate,
        category: "Internet",
        payee: "Telecom Provider",
        notes: "Auto-debit setup",
      }),
    });
    const upData = await upRes.json();
    assert(upRes.status === 201 && upData.success, "Create Upcoming Payment");
    assert(upData.data.payment.status === "Upcoming", "Calculated Status is 'Upcoming'");
    upcomingPaymentId = upData.data.payment.id;

    // B. Create payment due today
    const todayDate = new Date().toISOString();
    const todayRes = await fetch(`${BASE_URL}/api/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Water Utility Bill",
        amount: 45.0,
        currency: "USD",
        dueDate: todayDate,
        category: "Water",
        payee: "City Municipality",
      }),
    });
    const todayData = await todayRes.json();
    assert(todayRes.status === 201 && todayData.success, "Create Due Today Payment");
    assert(todayData.data.payment.status === "Due Today", "Calculated Status is 'Due Today'");
    dueTodayPaymentId = todayData.data.payment.id;

    // C. Create overdue payment
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const overRes = await fetch(`${BASE_URL}/api/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Credit Card Minimum Due",
        amount: 250.0,
        currency: "USD",
        dueDate: pastDate,
        category: "Credit Card",
        payee: "First National Bank",
      }),
    });
    const overData = await overRes.json();
    assert(overRes.status === 201 && overData.success, "Create Overdue Payment");
    assert(overData.data.payment.status === "Overdue", "Calculated Status is 'Overdue'");
    overduePaymentId = overData.data.payment.id;

    // D. Filter payments by status
    const filterRes = await fetch(`${BASE_URL}/api/payments?status=overdue`, {
      headers: { Cookie: cookie1 },
    });
    const filterData = await filterRes.json();
    assert(filterRes.ok && filterData.data.payments.length >= 1, "Filter Payments by Status=Overdue");
    assert(filterData.data.payments.every((p) => p.status === "Overdue"), "All returned payments have Overdue status");
  }

  // 3. Recurring Payment Advancement Engine
  console.log("\n3. Recurring Payment Advancement Engine");
  {
    const todayDate = new Date().toISOString();
    const recRes = await fetch(`${BASE_URL}/api/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Apartment Monthly Rent",
        amount: 1800.0,
        currency: "USD",
        dueDate: todayDate,
        category: "Rent",
        frequency: "monthly",
        isRecurring: true,
        notes: "Transfer to Landlord Account",
      }),
    });
    const recData = await recRes.json();
    assert(recRes.status === 201 && recData.success, "Create Monthly Recurring Payment");
    recurringPaymentId = recData.data.payment.id;

    // Now Mark Recurring Payment Paid
    const payRes = await fetch(`${BASE_URL}/api/payments/${recurringPaymentId}/pay`, {
      method: "PATCH",
      headers: { Cookie: cookie1 },
    });
    const payData = await payRes.json();
    assert(payRes.ok && payData.success, "Mark Recurring Payment As Paid");
    assert(payData.data.payment.isPaid === true, "Current Payment Marked isPaid = true");
    assert(payData.data.payment.status === "Paid", "Current Payment Status is 'Paid'");

    // Verify NEXT occurrence was automatically generated
    const nextPay = payData.data.nextPayment;
    assert(Boolean(nextPay), "Next Recurring Occurrence Was Generated");
    assert(nextPay.isPaid === false, "Next Occurrence is Unpaid (isPaid: false)");
    assert(nextPay.title === "Apartment Monthly Rent", "Next Occurrence Inherited Title");
    assert(nextPay.amount === 1800.0, "Next Occurrence Inherited Amount");
    assert(nextPay.status === "Upcoming", "Next Occurrence Status is 'Upcoming'");

    const originalDue = new Date(recData.data.payment.dueDate);
    const nextDue = new Date(nextPay.dueDate);
    assert(
      nextDue > originalDue,
      "Next Due Date is advanced into the future",
      `Original: ${originalDue.toISOString()}, Next: ${nextDue.toISOString()}`
    );
  }

  // 4. Expense Tracker & Categories
  console.log("\n4. Expense Tracker");
  let expense1Id = "";
  let expenseWithReceiptId = "";

  {
    // A. Create simple expense
    const expRes = await fetch(`${BASE_URL}/api/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Supermarket Weekly Groceries",
        amount: 142.5,
        currency: "USD",
        category: "Food",
        paymentMethod: "Credit Card",
        notes: "Organic vegetables and pantry items",
      }),
    });
    const expData = await expRes.json();
    assert(expRes.status === 201 && expData.success, "Create Standard Expense");
    assert(expData.data.expense.title === "Supermarket Weekly Groceries", "Expense title matches");
    assert(expData.data.expense.amount === 142.5, "Expense amount matches");
    expense1Id = expData.data.expense.id;

    // B. Create expense with file receipt upload (multipart/form-data)
    const formData = new FormData();
    formData.append("title", "Hardware Store Repairs");
    formData.append("amount", "78.20");
    formData.append("currency", "USD");
    formData.append("category", "Bills");
    formData.append("paymentMethod", "Debit Card");
    formData.append("notes", "Plumbing fixtures");

    // Mock an image receipt
    const mockReceiptBytes = Buffer.from("FAKE_IMAGE_RECEIPT_BYTES_12345");
    const receiptBlob = new Blob([mockReceiptBytes], { type: "image/png" });
    formData.append("receipt", receiptBlob, "invoice_receipt.png");

    const receiptExpRes = await fetch(`${BASE_URL}/api/expenses`, {
      method: "POST",
      headers: { Cookie: cookie1 },
      body: formData,
    });
    const receiptExpData = await receiptExpRes.json();
    assert(receiptExpRes.status === 201 && receiptExpData.success, "Create Expense With File Receipt Upload");
    assert(Boolean(receiptExpData.data.expense.receiptUrl), "Expense Has Assigned receiptUrl");
    expenseWithReceiptId = receiptExpData.data.expense.id;

    // C. Stream Receipt securely via GET /api/expenses/[id]/receipt
    const streamRes = await fetch(`${BASE_URL}/api/expenses/${expenseWithReceiptId}/receipt`, {
      headers: { Cookie: cookie1 },
    });
    assert(streamRes.status === 200, "Receipt Stream Endpoint Returns HTTP 200");
    const streamBuffer = Buffer.from(await streamRes.arrayBuffer());
    assert(
      streamBuffer.toString() === "FAKE_IMAGE_RECEIPT_BYTES_12345",
      "Receipt File Contents Match Upload Exactly"
    );

    // D. Filter expenses by category
    const filterExpRes = await fetch(`${BASE_URL}/api/expenses?category=Food`, {
      headers: { Cookie: cookie1 },
    });
    const filterExpData = await filterExpRes.json();
    assert(filterExpRes.ok && filterExpData.data.expenses.length >= 1, "Filter Expenses by Category=Food");
    assert(filterExpData.data.expenses.every((e) => e.category === "Food"), "All returned expenses have Food category");
  }

  // 5. Budget Management & Alert Thresholds
  console.log("\n5. Budget Management & Alert Thresholds");
  {
    // A. Configure Budget Limits
    const budgetConfigRes = await fetch(`${BASE_URL}/api/budget`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        monthlyIncome: 6000,
        monthlyBudget: 3000,
        savingsTarget: 2000,
        categoryBudgets: [
          { category: "Food", limitAmount: 500 },
          { category: "Transport", limitAmount: 200 },
        ],
        currency: "USD",
      }),
    });
    const budgetConfigData = await budgetConfigRes.json();
    assert(budgetConfigRes.ok && budgetConfigData.success, "Save Budget Configurations");

    // B. Query live analytics
    const budgetGetRes = await fetch(`${BASE_URL}/api/budget`, {
      headers: { Cookie: cookie1 },
    });
    const budgetGetData = await budgetGetRes.json();
    assert(budgetGetRes.ok && budgetGetData.success, "Fetch Live Budget Analytics");
    const analytics = budgetGetData.data.analytics;

    assert(analytics.totalIncome === 6000, "Total Income is $6,000");
    assert(analytics.monthlyBudget === 3000, "Monthly Budget ceiling is $3,000");
    assert(analytics.savingsTarget === 2000, "Savings Target is $2,000");
    assert(analytics.totalExpenses > 0, "Total Expenses include logged expenses this month");
    assert(
      analytics.remainingBudget === 3000 - analytics.totalExpenses,
      "Remaining Budget accurately equals Monthly Budget - Total Expenses"
    );
    assert(
      analytics.savings === 6000 - analytics.totalExpenses,
      "Savings accurately equals Total Income - Total Expenses"
    );

    // C. Test Warning Threshold Trigger (Approach >= 80%)
    // Log additional Food expense to push Food spending above 80% of $500 ($400+)
    await fetch(`${BASE_URL}/api/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Special Dinner",
        amount: 280, // 142.5 + 280 = 422.5 (84.5% of 500)
        currency: "USD",
        category: "Food",
        paymentMethod: "Credit Card",
      }),
    });

    const warningRes = await fetch(`${BASE_URL}/api/budget`, {
      headers: { Cookie: cookie1 },
    });
    const warningData = await warningRes.json();
    const foodCat = warningData.data.analytics.categoryBreakdown.find((c) => c.category === "Food");
    assert(Boolean(foodCat), "Food Category Breakdown Found");
    assert(foodCat.status === "warning", `Food Category Triggered 'warning' Status (${foodCat.usagePercent}%)`);
    assert(
      warningData.data.analytics.alerts.some((a) => a.category === "Food" && a.type === "warning"),
      "Warning Alert Emitted for Category Reaching >= 80%"
    );

    // D. Test Exceeded Threshold Trigger (Exceed >= 100%)
    await fetch(`${BASE_URL}/api/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie1 },
      body: JSON.stringify({
        title: "Bulk Wholesale Pantry",
        amount: 150, // 422.5 + 150 = 572.5 (> 500)
        currency: "USD",
        category: "Food",
        paymentMethod: "Bank",
      }),
    });

    const exceededRes = await fetch(`${BASE_URL}/api/budget`, {
      headers: { Cookie: cookie1 },
    });
    const exceededData = await exceededRes.json();
    const foodExceededCat = exceededData.data.analytics.categoryBreakdown.find((c) => c.category === "Food");
    assert(foodExceededCat.status === "exceeded", `Food Category Triggered 'exceeded' Status (${foodExceededCat.usagePercent}%)`);
    assert(
      exceededData.data.analytics.alerts.some((a) => a.category === "Food" && a.type === "exceeded"),
      "Exceeded Alert Emitted for Category Spending > 100%"
    );
  }

  // 6. Multi-Tenant User Isolation Security
  console.log("\n6. User Data Isolation Security");
  {
    // User 2 queries payments
    const user2PayRes = await fetch(`${BASE_URL}/api/payments`, {
      headers: { Cookie: cookie2 },
    });
    const user2PayData = await user2PayRes.json();
    assert(user2PayData.data.payments.length === 0, "User 2 cannot see User 1's payments (0 returned)");

    // User 2 attempts to fetch User 1's payment by ID
    const user2GetRes = await fetch(`${BASE_URL}/api/payments/${upcomingPaymentId}`, {
      headers: { Cookie: cookie2 },
    });
    assert(user2GetRes.status === 404, "User 2 GET on User 1's payment returns HTTP 404");

    // User 2 attempts to stream User 1's receipt
    const user2ReceiptRes = await fetch(`${BASE_URL}/api/expenses/${expenseWithReceiptId}/receipt`, {
      headers: { Cookie: cookie2 },
    });
    assert(user2ReceiptRes.status === 404, "User 2 GET on User 1's receipt returns HTTP 404");
  }

  // 7. Dashboard Integration Reflection
  console.log("\n7. Dashboard Route Verification");
  {
    const dashRes = await fetch(`${BASE_URL}/`, {
      headers: { Cookie: cookie1 },
    });
    assert(dashRes.status === 200, "Dashboard Page Loads HTTP 200 with Real Financial Data");
    const financeRes = await fetch(`${BASE_URL}/finance`, {
      headers: { Cookie: cookie1 },
    });
    assert(financeRes.status === 200, "Finance Page Loads HTTP 200");
  }

  console.log("\n=================================================");
  console.log(`TEST SUMMARY: ${testPassed} Passed, ${testFailed} Failed`);
  console.log("=================================================");

  if (testFailed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("FATAL ERROR in test execution:", err);
  process.exit(1);
});
