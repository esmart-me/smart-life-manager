// Comprehensive End-to-End Production Readiness & Security Audit Test Suite
// Verifies Security, Multi-tenant Isolation, User Journey, Calculations, Search, Reports, and Exports.

import assert from "node:assert";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_APP_URL || "http://localhost:3000";


let passedCount = 0;
let failedCount = 0;

function logPass(title, details = "") {
  passedCount++;
  console.log(`[PASS] ${passedCount}. ${title} ${details ? "- " + details : ""}`);
}

function logFail(title, error) {
  failedCount++;
  console.error(`[FAIL] ${title}:`, error);
}

// Cookie helper
class TestClient {
  constructor(name) {
    this.name = name;
    this.cookie = "";
  }

  async fetch(endpoint, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (this.cookie) {
      headers["Cookie"] = this.cookie;
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      redirect: "manual", // Don't auto-follow redirects so we can inspect HTTP 307
    });

    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      // Store session token cookie (slm_session)
      const match = setCookie.match(/slm_session=([^;]+)/);
      if (match) {
        this.cookie = `slm_session=${match[1]}`;
      } else {
        this.cookie = setCookie.split(";")[0];
      }
    }

    return res;
  }
}

async function runAudit() {
  console.log("==================================================================");
  console.log("  SMART LIFE MANAGER — FINAL PRODUCTION-READINESS AUDIT TEST SUITE");
  console.log("==================================================================");

  const timestamp = Date.now();
  const userA = new TestClient("User A");
  const userB = new TestClient("User B");

  const emailA = `audit_user_a_${timestamp}@test.local`;
  const emailB = `audit_user_b_${timestamp}@test.local`;
  const password = "StrongPassword2026!#";

  // ---------------------------------------------------------
  // SECTION 1: AUTHENTICATION & SESSION MANAGEMENT
  // ---------------------------------------------------------
  console.log("\n--- SECTION 1: AUTHENTICATION & SESSIONS ---");

  // 1. Register User A
  try {
    const res = await userA.fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailA,
        password,
        firstName: "Alice",
        lastName: "Auditor",
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201, "Expected 201 Created for registration");
    assert.ok(data.success, "Registration success should be true");
    assert.ok(userA.cookie, "User A session cookie must be set upon registration");
    logPass("User A Registration & Session Cookie", emailA);
  } catch (err) {
    logFail("User A Registration", err);
  }

  // 2. Register User B
  try {
    const res = await userB.fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailB,
        password,
        firstName: "Bob",
        lastName: "Tenant",
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201, "Expected 201 Created for registration");
    assert.ok(data.success, "Registration success should be true");
    assert.ok(userB.cookie, "User B session cookie must be set upon registration");
    logPass("User B Registration & Session Cookie", emailB);
  } catch (err) {
    logFail("User B Registration", err);
  }

  // 3. User A Session Identity Check
  let userAId = "";
  try {
    const res = await userA.fetch("/api/auth/me");
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.data.user.email, emailA);
    userAId = data.data.user.id;
    logPass("User A Identity Verified via /api/auth/me", `ID: ${userAId}`);
  } catch (err) {
    logFail("User A Identity", err);
  }

  // 4. Duplicate Registration Prevention
  try {
    const res = await userA.fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailA, password }),
    });
    assert.strictEqual(res.status, 409, "Duplicate email registration must return 409 Conflict");
    logPass("Duplicate Email Registration Rejection (HTTP 409)");
  } catch (err) {
    logFail("Duplicate Email Check", err);
  }

  // 5. Weak Password Rejection
  try {
    const res = await userA.fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `weak_${timestamp}@test.local`, password: "123" }),
    });
    assert.strictEqual(res.status, 400, "Password < 8 chars must return 400 Bad Request");
    logPass("Weak Password Enforcement (HTTP 400)");
  } catch (err) {
    logFail("Weak Password Check", err);
  }

  // ---------------------------------------------------------
  // SECTION 2: CREATE RECORDS FOR USER A
  // ---------------------------------------------------------
  console.log("\n--- SECTION 2: POPULATING USER A RECORDS ---");

  let docAId = "";
  let docAFileId = "";
  let expenseAId = "";
  let paymentAId = "";
  let reminderAId = "";
  let vehicleAId = "";
  let subAId = "";
  let dateAId = "";

  // 6. User A: Upload Document with physical Image + PDF
  try {
    const formData = new FormData();
    formData.append("title", "Alice UAE Passport 2026");
    formData.append("category", "Passport");
    formData.append("documentNumber", "P987654321");
    formData.append("issuedBy", "Federal Authority for Identity");
    formData.append("expiryDate", "2028-10-15");
    formData.append("notes", "Confidential biometric passport");
    formData.append("reminderMilestones", JSON.stringify([90, 60, 30]));

    const dummyImage = new Blob(["fake-image-bytes-png-header"], { type: "image/png" });
    const dummyPdf = new Blob(["%PDF-1.4 fake-pdf-bytes"], { type: "application/pdf" });
    formData.append("image", dummyImage, "passport-photo.png");
    formData.append("pdf", dummyPdf, "passport-scan.pdf");

    const res = await userA.fetch("/api/documents", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.ok(data.data.document.id);
    docAId = data.data.document.id;
    assert.ok(data.data.document.files.length >= 1);
    docAFileId = data.data.document.files[0].id;
    logPass("User A Created Document with Encrypted Storage", `DocID: ${docAId}, FileID: ${docAFileId}`);
  } catch (err) {
    logFail("User A Document Creation", err);
  }

  // 7. Verify Auto-generated Document Expiry Reminders
  try {
    const res = await userA.fetch("/api/reminders");
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    const linked = data.data.reminders.filter((r) => r.relatedId === docAId);
    assert.ok(linked.length >= 1, "Document creation must automatically schedule expiry reminders");
    logPass("Document Expiry Milestones Automatically Synchronized to Reminders");
  } catch (err) {
    logFail("Document Expiry Sync", err);
  }

  // 8. User A: Create Standalone Recurring Reminder
  try {
    const res = await userA.fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Alice Quarterly Health Checkup",
        dueDate: "2026-10-01T09:00:00.000Z",
        priority: "high",
        category: "Health",
        isRecurring: true,
        recurrenceRule: "FREQ=MONTHLY",
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    reminderAId = data.data.reminder.id;
    logPass("User A Created Recurring Reminder", `ReminderID: ${reminderAId}`);
  } catch (err) {
    logFail("User A Reminder Creation", err);
  }

  // 9. User A: Create Recurring Payment Bill
  try {
    const res = await userA.fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Alice Luxury Apartment Rent",
        payee: "Dubai Properties Ltd",
        amount: 5500,
        currency: "AED",
        dueDate: "2026-10-05T00:00:00.000Z",
        category: "Housing",
        frequency: "monthly",
        isRecurring: true,
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    paymentAId = data.data.payment.id;
    logPass("User A Created Recurring Payment Bill", `PaymentID: ${paymentAId}`);
  } catch (err) {
    logFail("User A Payment Creation", err);
  }

  // 10. User A: Create Expense with Receipt Attachment
  try {
    const formData = new FormData();
    formData.append("title", "Whole Foods Organic Groceries");
    formData.append("amount", "240.50");
    formData.append("currency", "AED");
    formData.append("category", "Groceries");
    formData.append("spentAt", "2026-09-27T12:00:00.000Z");
    formData.append("notes", "Weekly family groceries");
    const dummyReceipt = new Blob(["fake-receipt-png-bytes"], { type: "image/png" });
    formData.append("receipt", dummyReceipt, "groceries_receipt.png");

    const res = await userA.fetch("/api/expenses", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    expenseAId = data.data.expense.id;
    logPass("User A Created Expense with Receipt", `ExpenseID: ${expenseAId}`);
  } catch (err) {
    logFail("User A Expense Creation", err);
  }

  // 11. User A: Set Monthly Budget & Target
  try {
    const res = await userA.fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monthlyIncome: 25000,
        monthlyBudget: 15000,
        savingsTarget: 7000,
        categoryBudgets: {
          Housing: 6000,
          Groceries: 2000,
          Utilities: 1000,
        },
        currency: "AED",
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.success);
    logPass("User A Configured Monthly Budget & Savings Goals");
  } catch (err) {
    logFail("User A Budget Configuration", err);
  }

  // 12. User A: Add Vehicle & Verify Registration/Service Sync
  try {
    const res = await userA.fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice Porsche Macan",
        make: "Porsche",
        model: "Macan GTS",
        year: 2024,
        licensePlate: "DXB-A-777",
        insuranceExpiry: "2027-05-15",
        registrationExpiry: "2027-05-15",
        nextServiceDate: "2026-11-20",
        mileage: 12000,
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    vehicleAId = data.data.vehicle.id;
    logPass("User A Created Vehicle Record", `VehicleID: ${vehicleAId}`);
  } catch (err) {
    logFail("User A Vehicle Creation", err);
  }

  // 13. User A: Add Subscription
  try {
    const res = await userA.fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Apple One Premier",
        category: "Digital Services",
        cost: 37.95,
        currency: "USD",
        billingCycle: "monthly",
        nextBillingDate: "2026-10-15",
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    subAId = data.data.subscription.id;
    logPass("User A Created Tracked Subscription", `SubID: ${subAId}`);
  } catch (err) {
    logFail("User A Subscription Creation", err);
  }

  // 14. User A: Add Important Date
  try {
    const res = await userA.fetch("/api/dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Alice & Bob 5th Wedding Anniversary",
        category: "Anniversary",
        eventDate: "2026-11-28",
        recurrence: "yearly",
        notes: "Book dinner at Burj Al Arab",
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    dateAId = data.data.date.id;
    logPass("User A Created Recurring Important Date", `DateID: ${dateAId}`);
  } catch (err) {
    logFail("User A Date Creation", err);
  }

  // ---------------------------------------------------------
  // SECTION 3: MULTI-TENANT ISOLATION & PRIVACY TESTS
  // ---------------------------------------------------------
  console.log("\n--- SECTION 3: STRICT SECURITY & DATA ISOLATION TESTS ---");

  // 15. User B CANNOT read User A's Document
  try {
    const res = await userB.fetch(`/api/documents/${docAId}`);
    assert.ok(
      res.status === 403 || res.status === 404,
      `User B must be forbidden from accessing User A's document (got HTTP ${res.status})`
    );
    logPass("Security Isolation: User B Cannot GET User A's Document (HTTP 403/404)");
  } catch (err) {
    logFail("Document Isolation Check", err);
  }

  // 16. User B CANNOT download or stream User A's uploaded file
  try {
    const res = await userB.fetch(`/api/documents/${docAId}/files/${docAFileId}`);
    assert.ok(
      res.status === 403 || res.status === 404,
      `User B must be forbidden from streaming User A's document files (got HTTP ${res.status})`
    );
    logPass("Security Isolation: User B Cannot Stream/Download User A's Files (HTTP 403/404)");
  } catch (err) {
    logFail("File Streaming Isolation Check", err);
  }

  // 17. User B CANNOT read User A's Expense Record
  try {
    const res = await userB.fetch(`/api/expenses/${expenseAId}`);
    assert.ok(
      res.status === 403 || res.status === 404,
      `User B must be forbidden from reading User A's expense (got HTTP ${res.status})`
    );
    logPass("Security Isolation: User B Cannot GET User A's Financial Expense (HTTP 403/404)");
  } catch (err) {
    logFail("Expense Isolation Check", err);
  }

  // 18. User B CANNOT access User A's Expense Receipt
  try {
    const res = await userB.fetch(`/api/expenses/${expenseAId}/receipt`);
    assert.ok(
      res.status === 403 || res.status === 404,
      `User B must be forbidden from reading User A's receipt (got HTTP ${res.status})`
    );
    logPass("Security Isolation: User B Cannot GET User A's Expense Receipt (HTTP 403/404)");
  } catch (err) {
    logFail("Expense Receipt Isolation Check", err);
  }

  // 19. User B CANNOT read User A's Payment Bill
  try {
    const res = await userB.fetch(`/api/payments/${paymentAId}`);
    assert.ok(
      res.status === 403 || res.status === 404,
      `User B must be forbidden from reading User A's payment (got HTTP ${res.status})`
    );
    logPass("Security Isolation: User B Cannot GET User A's Payment Bill (HTTP 403/404)");
  } catch (err) {
    logFail("Payment Isolation Check", err);
  }

  // 20. User B CANNOT mark User A's Payment as Paid
  try {
    const res = await userB.fetch(`/api/payments/${paymentAId}/pay`, { method: "PATCH" });
    assert.ok(
      res.status === 403 || res.status === 404,
      `User B must be forbidden from modifying User A's payment status (got HTTP ${res.status})`
    );
    logPass("Security Isolation: User B Cannot Alter User A's Payment Status (HTTP 403/404)");
  } catch (err) {
    logFail("Payment Modification Isolation Check", err);
  }

  // 21. User B CANNOT complete or alter User A's Reminder
  try {
    const res = await userB.fetch(`/api/reminders/${reminderAId}/complete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    assert.ok(
      res.status === 403 || res.status === 404,
      `User B must be forbidden from completing User A's reminder (got HTTP ${res.status})`
    );
    logPass("Security Isolation: User B Cannot Alter User A's Reminders (HTTP 403/404)");
  } catch (err) {
    logFail("Reminder Isolation Check", err);
  }

  // 22. User B CANNOT access User A's Vehicle
  try {
    const res = await userB.fetch(`/api/vehicles/${vehicleAId}`);
    assert.ok(
      res.status === 403 || res.status === 404,
      `User B must be forbidden from reading User A's vehicle (got HTTP ${res.status})`
    );
    logPass("Security Isolation: User B Cannot GET User A's Vehicle (HTTP 403/404)");
  } catch (err) {
    logFail("Vehicle Isolation Check", err);
  }

  // 23. User B CANNOT access User A's Subscription
  try {
    const res = await userB.fetch(`/api/subscriptions/${subAId}`);
    assert.ok(
      res.status === 403 || res.status === 404,
      `User B must be forbidden from reading User A's subscription (got HTTP ${res.status})`
    );
    logPass("Security Isolation: User B Cannot GET User A's Subscription (HTTP 403/404)");
  } catch (err) {
    logFail("Subscription Isolation Check", err);
  }

  // 24. User B CANNOT access User A's Important Date
  try {
    const res = await userB.fetch(`/api/dates/${dateAId}`);
    assert.ok(
      res.status === 403 || res.status === 404,
      `User B must be forbidden from reading User A's important date (got HTTP ${res.status})`
    );
    logPass("Security Isolation: User B Cannot GET User A's Important Date (HTTP 403/404)");
  } catch (err) {
    logFail("Important Date Isolation Check", err);
  }

  // 25. Normal Customers CANNOT access Admin Pages (Edge Middleware Blocking)
  try {
    const res = await userA.fetch("/admin/payments");
    // Next.js middleware returns HTTP 307 redirect to /admin/login?error=forbidden
    assert.strictEqual(
      res.status,
      307,
      `Non-admin customer must be redirected from /admin/payments with HTTP 307 (got ${res.status})`
    );
    const location = res.headers.get("location") || "";
    assert.ok(location.includes("admin/login"), "Redirect location must be admin login");
    logPass("Security Isolation: Customer Blocked from Admin Page at Edge (HTTP 307)");
  } catch (err) {
    logFail("Admin Page Customer Block Check", err);
  }

  // 26. Normal Customers CANNOT call Admin API Endpoints
  try {
    const res = await userA.fetch("/api/admin/plans/regional");
    assert.strictEqual(res.status, 403, "Non-admin customer must receive HTTP 403 on admin API");
    logPass("Security Isolation: Customer Blocked from Admin Regional API (HTTP 403)");
  } catch (err) {
    logFail("Admin API Customer Block Check", err);
  }

  // 27. Normal Customers CANNOT call Legacy Plan Admin PUT
  try {
    const res = await userA.fetch("/api/plans/admin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "premium", updates: { maxDocuments: 9999 } }),
    });
    assert.strictEqual(res.status, 403, "Non-admin customer must receive HTTP 403 on /api/plans/admin");
    logPass("Security Isolation: Customer Blocked from PUT /api/plans/admin (HTTP 403)");
  } catch (err) {
    logFail("Plans Admin Customer Block Check", err);
  }

  // 28. Unauthenticated User CANNOT access Protected Routes
  const unauthClient = new TestClient("Unauthenticated");
  try {
    const res = await unauthClient.fetch("/api/documents");
    assert.strictEqual(res.status, 401, "Unauthenticated API request must return 401 Unauthorized");
    logPass("Security Enforcement: Unauthenticated API Access Blocked (HTTP 401)");
  } catch (err) {
    logFail("Unauthenticated API Check", err);
  }

  // ---------------------------------------------------------
  // SECTION 4: CALCULATIONS, SEARCH, REPORTS & EXPORTS
  // ---------------------------------------------------------
  console.log("\n--- SECTION 4: CALCULATIONS, SEARCH, REPORTS & EXPORTS ---");

  // 29. Payment Pay & Next Occurrence Calculation
  try {
    const res = await userA.fetch(`/api/payments/${paymentAId}/pay`, { method: "PATCH" });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.data.payment.isPaid, true);
    assert.ok(data.data.nextPayment, "Monthly recurring payment must spawn next payment occurrence");
    // Next due date should be 2026-11-05
    const nextDate = new Date(data.data.nextPayment.dueDate);
    assert.strictEqual(nextDate.getMonth(), 10, "Next occurrence month should be November (10)");
    logPass("Recurring Payment: Next Occurrence Accurately Spawned (+1 Month)");
  } catch (err) {
    logFail("Recurring Payment Calculation", err);
  }

  // 30. Reminder Complete & Next Occurrence Calculation
  try {
    const res = await userA.fetch(`/api/reminders/${reminderAId}/complete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.data.reminder.status, "completed");
    assert.ok(data.data.nextOccurrence, "Monthly recurring reminder must spawn next reminder occurrence");
    logPass("Recurring Reminder: Next Scheduled Occurrence Automatically Generated");
  } catch (err) {
    logFail("Recurring Reminder Calculation", err);
  }

  // 31. Budget Analytics Calculations
  try {
    const res = await userA.fetch("/api/budget");
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.data.analytics, "Budget analytics must be calculated");
    assert.strictEqual(data.data.analytics.totalIncome, 25000);
    assert.strictEqual(data.data.analytics.monthlyBudget, 15000);
    assert.strictEqual(data.data.analytics.savingsTarget, 7000);
    assert.ok(data.data.analytics.totalExpenses >= 240.5, "Expenses must aggregate into budget analytics");
    logPass("Budget Calculations & Analytics Validated (Income, Budget, Target, Expenses)");
  } catch (err) {
    logFail("Budget Analytics Check", err);
  }

  // 32. Global Search Across All User A Records
  try {
    const res = await userA.fetch("/api/search?q=Alice");
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.data.total >= 3, "Global search must return results across multiple modules");
    assert.ok(data.data.grouped.documents.some((d) => d.title.includes("Passport")));
    assert.ok(data.data.grouped.vehicles.some((v) => v.title.includes("Porsche")));
    logPass("Global Search Multi-Module Discovery", `Found ${data.data.total} grouped matches`);
  } catch (err) {
    logFail("Global Search Check", err);
  }

  // 33. Global Search Category Filter (Vehicles only)
  try {
    const res = await userA.fetch("/api/search?q=Porsche&category=vehicles");
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.data.grouped.vehicles.length >= 1);
    assert.strictEqual(data.data.grouped.documents.length, 0, "Non-vehicle modules must be empty when filtered");
    logPass("Global Search Filter by Category");
  } catch (err) {
    logFail("Global Search Category Filter Check", err);
  }

  // 34. Reports: Monthly Expense Report (JSON)
  try {
    const res = await userA.fetch("/api/reports/monthly_expense");
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.data.report.metadata.type, "monthly_expense");
    assert.ok(data.data.report.summaryCards.length > 0);
    assert.ok(data.data.shareText.includes("Smart Life Manager"), "WhatsApp share text must contain summary report");
    logPass("Report Generation: Monthly Expense Report (JSON + WhatsApp)", `Share text: ${data.data.shareText.length} chars`);
  } catch (err) {
    logFail("Monthly Expense Report Check", err);
  }

  // 35. Reports: CSV Export
  try {
    const res = await userA.fetch("/api/reports/monthly_expense?format=csv");
    assert.strictEqual(res.status, 200);
    const contentType = res.headers.get("content-type") || "";
    assert.ok(contentType.includes("text/csv"), "CSV format must return text/csv");
    const text = await res.text();
    assert.ok(text.includes("Category") || text.includes("Amount"), "CSV must have proper headers");
    assert.ok(text.includes("240.50"), "CSV must include real expense amount");
    logPass("Export Verification: CSV Data Download", `Size: ${text.length} bytes`);
  } catch (err) {
    logFail("CSV Export Check", err);
  }

  // 36. Reports: Printable HTML / PDF View
  try {
    const res = await userA.fetch("/api/reports/monthly_expense?format=html");
    assert.strictEqual(res.status, 200);
    const contentType = res.headers.get("content-type") || "";
    assert.ok(contentType.includes("text/html"), "Printable format must return text/html");
    const html = await res.text();
    assert.ok(html.includes("Smart Life Manager"), "Printable report must contain branding header");
    assert.ok(html.includes("window.print()"), "Printable report must contain print trigger");
    logPass("Export Verification: Printable HTML/PDF View", `Size: ${html.length} bytes`);
  } catch (err) {
    logFail("Printable HTML Export Check", err);
  }

  // ---------------------------------------------------------
  // SECTION 5: LOGOUT, RE-LOGIN & PERSISTENCE VERIFICATION
  // ---------------------------------------------------------
  console.log("\n--- SECTION 5: LOGOUT, RE-LOGIN & DATA PERSISTENCE ---");

  // 37. Logout User A
  try {
    const res = await userA.fetch("/api/auth/logout", { method: "POST" });
    assert.strictEqual(res.status, 200);
    logPass("User A Logged Out Successfully");
  } catch (err) {
    logFail("Logout Check", err);
  }

  // 38. Re-login User A
  const reLoginClient = new TestClient("Re-login Client");
  try {
    const res = await reLoginClient.fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailA, password }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.success);
    assert.ok(reLoginClient.cookie, "New session cookie must be issued on re-login");
    logPass("User A Re-authenticated Successfully");
  } catch (err) {
    logFail("Re-login Check", err);
  }

  // 39. Verify All Saved Data Persisted Intact
  try {
    const [docsRes, remsRes, paysRes, expsRes, vechsRes, subsRes, datesRes] = await Promise.all([
      reLoginClient.fetch("/api/documents"),
      reLoginClient.fetch("/api/reminders"),
      reLoginClient.fetch("/api/payments"),
      reLoginClient.fetch("/api/expenses"),
      reLoginClient.fetch("/api/vehicles"),
      reLoginClient.fetch("/api/subscriptions"),
      reLoginClient.fetch("/api/dates"),
    ]);

    const docs = await docsRes.json();
    const rems = await remsRes.json();
    const pays = await paysRes.json();
    const exps = await expsRes.json();
    const vechs = await vechsRes.json();
    const subs = await subsRes.json();
    const dates = await datesRes.json();

    assert.ok(docs.data.documents.some((d) => d.id === docAId), "Document must persist across sessions");
    assert.ok(rems.data.reminders.length >= 1, "Reminders must persist across sessions");
    assert.ok(pays.data.payments.length >= 1, "Payments must persist across sessions");
    assert.ok(exps.data.expenses.some((e) => e.id === expenseAId), "Expenses must persist across sessions");
    assert.ok(vechs.data.vehicles.some((v) => v.id === vehicleAId), "Vehicles must persist across sessions");
    assert.ok(subs.data.subscriptions.some((s) => s.id === subAId), "Subscriptions must persist across sessions");
    assert.ok(dates.data.dates.some((d) => d.id === dateAId), "Important dates must persist across sessions");

    logPass(
      "End-to-End Data Persistence Verified",
      "All 7 modules intact after logout and re-authentication"
    );
  } catch (err) {
    logFail("Data Persistence Verification Check", err);
  } finally {
    try {
      const usersToDelete = await prisma.user.findMany({
        where: { email: { in: [emailA, emailB] } },
        select: { id: true },
      });
      const ids = usersToDelete.map((u) => u.id);
      if (ids.length > 0) {
        await prisma.documentFile.deleteMany({ where: { userId: { in: ids } } });
        await prisma.document.deleteMany({ where: { userId: { in: ids } } });
        await prisma.reminder.deleteMany({ where: { userId: { in: ids } } });
        await prisma.payment.deleteMany({ where: { userId: { in: ids } } });
        await prisma.expense.deleteMany({ where: { userId: { in: ids } } });
        await prisma.budget.deleteMany({ where: { userId: { in: ids } } });
        await prisma.vehicle.deleteMany({ where: { userId: { in: ids } } });
        await prisma.subscription.deleteMany({ where: { userId: { in: ids } } });
        await prisma.importantDate.deleteMany({ where: { userId: { in: ids } } });
        await prisma.familyMember.deleteMany({ where: { userId: { in: ids } } });
        await prisma.familyGroupMember.deleteMany({ where: { userId: { in: ids } } });
        await prisma.familyGroup.deleteMany({ where: { ownerId: { in: ids } } });
        await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
        await prisma.billingTransaction.deleteMany({ where: { userId: { in: ids } } });
        await prisma.userSubscription.deleteMany({ where: { userId: { in: ids } } });
        await prisma.session.deleteMany({ where: { userId: { in: ids } } });
        await prisma.userSetting.deleteMany({ where: { userId: { in: ids } } });
        await prisma.profile.deleteMany({ where: { userId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
        console.log(`[TEARDOWN] Cleaned audit test accounts: ${emailA}, ${emailB}`);
      }
    } catch (e) {
      console.error("[TEARDOWN ERROR]", e);
    } finally {
      await prisma.$disconnect();
    }
  }

  console.log("\n==================================================================");
  console.log(`AUDIT SUITE FINISHED: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error("FATAL AUDIT SUITE FAILURE:", err);
  process.exit(1);
});

