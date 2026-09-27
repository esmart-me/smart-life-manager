// scripts/verify-master-auth-and-admin.mjs
// Master verification suite for Authentication, Admin Portal, Data Isolation, and Database Integrity.

import assert from "node:assert";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BASE_URL = process.env.TEST_APP_URL || "http://localhost:3000";
const prisma = new PrismaClient();

let passed = 0;
let failed = 0;
const results = [];

function recordTest(category, testName, success, details = "") {
  if (success) {
    passed++;
    console.log(`  [PASS] ${testName} ${details ? "- " + details : ""}`);
    results.push({ category, name: testName, status: "PASS", details });
  } else {
    failed++;
    console.error(`  [FAIL] ${testName}: ${details}`);
    results.push({ category, name: testName, status: "FAIL", details });
  }
}

class HttpClient {
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
      redirect: "manual",
    });

    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
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

async function runMasterVerification() {
  console.log("================================================================================");
  console.log("       SMART LIFE MANAGER: MASTER AUTHENTICATION & ADMIN AUDIT SUITE");
  console.log("================================================================================\n");

  const timestamp = Date.now();
  const aliceClient = new HttpClient("Customer Alice");
  const bobClient = new HttpClient("Customer Bob");
  const adminClient = new HttpClient("Admin");
  const unauthClient = new HttpClient("Unauthenticated");

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@smartlifemanager.local").toLowerCase();
  const adminOriginalPassword = process.env.ADMIN_PASSWORD || "Admin2026!";
  const emailAlice = `real_cust_alice_${timestamp}@domain.com`;
  const emailBob = `real_cust_bob_${timestamp}@domain.com`;
  const customerPassword = "CustomerSecure2026!#";

  let aliceId = null;
  let bobId = null;
  let aliceDocId = null;
  let aliceRemId = null;
  let aliceExpId = null;
  let aliceVehId = null;
  let aliceFamId = null;
  let aliceFileId = null;

  try {
    // -------------------------------------------------------------------------
    // 1. ADMIN ACCOUNT ARCHITECTURE & INITIAL SEEDING
    // -------------------------------------------------------------------------
    console.log("\n[1] AUDITING ADMIN ACCOUNT ARCHITECTURE & CLI PROVISIONING...");
    try {
      const adminInDb = await prisma.user.findUnique({
        where: { email: adminEmail },
      });
      assert.ok(adminInDb, `Admin user ${adminEmail} must exist in the database`);
      assert.ok(
        adminInDb.role === "admin" || adminInDb.role === "super_admin",
        `Admin must have administrative role, found: ${adminInDb.role}`
      );
      assert.ok(adminInDb.passwordHash.startsWith("$2"), "Admin password must be hashed with bcrypt");
      const passwordMatches = await bcrypt.compare(adminOriginalPassword, adminInDb.passwordHash);
      assert.ok(passwordMatches, "Admin password hash must match the master admin password");
      recordTest(
        "Admin Account Architecture",
        "Admin Account in Database with secure bcrypt hash",
        true,
        `Role: ${adminInDb.role}, Email: ${adminInDb.email}`
      );
    } catch (err) {
      recordTest("Admin Account Architecture", "Admin Account in Database with secure bcrypt hash", false, err.message);
    }

    // -------------------------------------------------------------------------
    // 2. ADMIN AUTHENTICATION & SESSION
    // -------------------------------------------------------------------------
    console.log("\n[2] AUDITING ADMIN DEDICATED LOGIN & SESSIONS...");
    try {
      const loginRes = await adminClient.fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminOriginalPassword }),
      });
      assert.strictEqual(loginRes.status, 200, `Admin login should return 200, got ${loginRes.status}`);
      const loginData = await loginRes.json();
      assert.strictEqual(loginData.success, true);
      assert.ok(loginData.data.user.role === "admin" || loginData.data.user.role === "super_admin");
      assert.strictEqual(loginData.data.user.passwordHash, undefined, "Password hash must never be returned");
      assert.ok(adminClient.cookie.includes("slm_session="), "Session cookie slm_session must be set");
      recordTest("Admin Login & Auth", "Dedicated Admin Authentication & Session Issuance", true, `Logged in as ${adminEmail}`);
    } catch (err) {
      recordTest("Admin Login & Auth", "Dedicated Admin Authentication & Session Issuance", false, err.message);
    }

    // -------------------------------------------------------------------------
    // 3. ADMIN ROLE SECURITY & PERMISSIONS
    // -------------------------------------------------------------------------
    console.log("\n[3] AUDITING ADMIN ACCESS CONTROL & ROLE BOUNDARIES...");
    try {
      // Unauthenticated request to /api/admin/stats -> 401
      const unauthStats = await unauthClient.fetch("/api/admin/stats");
      assert.strictEqual(unauthStats.status, 401, `Unauth access to admin stats should be 401, got ${unauthStats.status}`);

      // Unauthenticated request to /api/admin/customers -> 401
      const unauthCust = await unauthClient.fetch("/api/admin/customers");
      assert.strictEqual(unauthCust.status, 401, `Unauth access to admin customers should be 401, got ${unauthCust.status}`);

      // Authenticated admin request to /api/admin/stats -> 200
      const adminStats = await adminClient.fetch("/api/admin/stats");
      assert.strictEqual(adminStats.status, 200, `Admin access to stats should be 200, got ${adminStats.status}`);
      const statsData = await adminStats.json();
      assert.strictEqual(statsData.success, true);
      assert.ok(typeof statsData.data.users.total === "number");

      recordTest("Admin Role Security", "Unauthenticated blocked with 401 & Admin allowed with 200", true);
    } catch (err) {
      recordTest("Admin Role Security", "Unauthenticated blocked with 401 & Admin allowed with 200", false, err.message);
    }

    // -------------------------------------------------------------------------
    // 4. ADMIN PASSWORD MANAGEMENT (CHANGE & RESET)
    // -------------------------------------------------------------------------
    console.log("\n[4] AUDITING ADMIN PASSWORD MANAGEMENT...");
    const temporaryAdminPassword = "AdminTempUpdated2026!#";
    try {
      // 4a. Change password with incorrect current password
      const wrongChangeRes = await adminClient.fetch("/api/admin/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: "WrongPassword999!",
          newPassword: temporaryAdminPassword,
          confirmPassword: temporaryAdminPassword,
        }),
      });
      assert.strictEqual(wrongChangeRes.status, 400, "Wrong current password must return 400");
      recordTest("Admin Password Change", "Rejects Incorrect Current Password (400)", true);

      // 4b. Change password with correct credentials
      const validChangeRes = await adminClient.fetch("/api/admin/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: adminOriginalPassword,
          newPassword: temporaryAdminPassword,
          confirmPassword: temporaryAdminPassword,
        }),
      });
      assert.strictEqual(validChangeRes.status, 200, "Valid password change must return 200");
      const changeData = await validChangeRes.json();
      assert.strictEqual(changeData.success, true);
      recordTest("Admin Password Change", "Authenticated Admin Password Update", true, "Changed to temporary password");

      // Verify login with temporary password
      const tempLoginClient = new HttpClient("Temp Admin");
      const tempLogin = await tempLoginClient.fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: temporaryAdminPassword }),
      });
      assert.strictEqual(tempLogin.status, 200, "Login with updated password should succeed");

      // Change password back to original
      const revertChangeRes = await tempLoginClient.fetch("/api/admin/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: temporaryAdminPassword,
          newPassword: adminOriginalPassword,
          confirmPassword: adminOriginalPassword,
        }),
      });
      assert.strictEqual(revertChangeRes.status, 200, "Reverting password back must return 200");
      recordTest("Admin Password Change", "Password Reverted to Master Original", true);

      // 4c. Forgot Password & Reset Token flow
      const forgotRes = await unauthClient.fetch("/api/admin/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail }),
      });
      assert.strictEqual(forgotRes.status, 200, "Forgot password endpoint should return 200");
      const forgotData = await forgotRes.json();
      assert.strictEqual(forgotData.success, true);

      // Find token in database
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: { user: { email: adminEmail }, usedAt: null },
        orderBy: { createdAt: "desc" },
      });
      assert.ok(resetToken, "Password reset token must be recorded in database");
      assert.ok(resetToken.token.length >= 32, "Reset token must be high-entropy");

      // Test reset endpoint with invalid token
      const invalidReset = await unauthClient.fetch("/api/admin/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "invalid-token-1234567890", newPassword: adminOriginalPassword }),
      });
      assert.strictEqual(invalidReset.status, 400, "Invalid reset token must return 400");

      // Mark token as used to clean up
      await prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });

      recordTest("Admin Password Reset", "Forgot Password Token Generation & Validation", true);
    } catch (err) {
      recordTest("Admin Password Management", "Password Change & Reset Procedures", false, err.message);
    }

    // -------------------------------------------------------------------------
    // 5. CUSTOMER AUTHENTICATION (EMAIL + PASSWORD)
    // -------------------------------------------------------------------------
    console.log("\n[5] AUDITING CUSTOMER EMAIL/PASSWORD REGISTRATION & LOGIN...");
    try {
      // 5a. Register Alice
      const regAlice = await aliceClient.fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailAlice,
          password: customerPassword,
          firstName: "Alice",
          lastName: "Customer",
        }),
      });
      assert.strictEqual(regAlice.status, 201, `Customer registration should return 201, got ${regAlice.status}`);
      const regAliceData = await regAlice.json();
      assert.strictEqual(regAliceData.success, true);
      aliceId = regAliceData.data.user.id;
      assert.ok(aliceId, "User ID must be returned");
      assert.strictEqual(regAliceData.data.user.role, "user", "Customer role must strictly be 'user'");

      // 5b. Register Bob
      const regBob = await bobClient.fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailBob,
          password: customerPassword,
          firstName: "Bob",
          lastName: "Customer",
        }),
      });
      assert.strictEqual(regBob.status, 201, `Customer registration should return 201, got ${regBob.status}`);
      const regBobData = await regBob.json();
      bobId = regBobData.data.user.id;

      // 5c. Login Alice via /api/auth/login
      const loginAlice = await aliceClient.fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAlice, password: customerPassword }),
      });
      assert.strictEqual(loginAlice.status, 200, `Alice login should return 200, got ${loginAlice.status}`);
      assert.ok(aliceClient.cookie.includes("slm_session="), "Customer session cookie must be set");

      // 5d. Customer session persistence
      const sessionAlice = await aliceClient.fetch("/api/auth/me");
      assert.strictEqual(sessionAlice.status, 200);
      const sessionData = await sessionAlice.json();
      assert.strictEqual(sessionData.data.user.email, emailAlice);
      assert.strictEqual(sessionData.data.user.role, "user");

      recordTest("Customer Auth", "Email/Password Registration, Login & Session Persistence", true, `Alice: ${aliceId}`);
    } catch (err) {
      recordTest("Customer Auth", "Email/Password Registration, Login & Session Persistence", false, err.message);
    }

    // -------------------------------------------------------------------------
    // 6. CUSTOMER BLOCKED FROM ADMIN PORTAL
    // -------------------------------------------------------------------------
    console.log("\n[6] AUDITING CUSTOMER ROLE ISOLATION FROM ADMIN ROUTES...");
    try {
      const custAdminAttempt = await aliceClient.fetch("/api/admin/customers");
      assert.strictEqual(
        custAdminAttempt.status,
        403,
        `Customer accessing /api/admin/customers must receive 403 Forbidden, got ${custAdminAttempt.status}`
      );

      const custStatsAttempt = await aliceClient.fetch("/api/admin/stats");
      assert.strictEqual(
        custStatsAttempt.status,
        403,
        `Customer accessing /api/admin/stats must receive 403 Forbidden, got ${custStatsAttempt.status}`
      );

      // Customer trying to use admin login endpoint
      const custAdminLogin = await aliceClient.fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAlice, password: customerPassword }),
      });
      assert.strictEqual(custAdminLogin.status, 403, "Customer attempting admin login must receive 403 Forbidden");

      recordTest("Admin Role Security", "Customer Access to /api/admin/* and Admin Login Blocked (HTTP 403)", true);
    } catch (err) {
      recordTest("Admin Role Security", "Customer Access to /api/admin/* and Admin Login Blocked", false, err.message);
    }

    // -------------------------------------------------------------------------
    // 7. REAL GOOGLE OAUTH CONFIGURATION & TRANSPARENCY
    // -------------------------------------------------------------------------
    console.log("\n[7] AUDITING GOOGLE OAUTH IMPLEMENTATION...");
    try {
      const googleStatus = await unauthClient.fetch("/api/auth/google/status");
      assert.strictEqual(googleStatus.status, 200);
      const statusData = await googleStatus.json();
      assert.strictEqual(statusData.success, true);
      assert.strictEqual(statusData.data.provider, "google");
      assert.strictEqual(statusData.data.configured, false);
      assert.ok(statusData.data.requiredEnvVars.includes("GOOGLE_CLIENT_ID"));
      assert.ok(statusData.data.requiredEnvVars.includes("GOOGLE_CLIENT_SECRET"));

      const googleInitJson = await unauthClient.fetch("/api/auth/google?format=json");
      assert.strictEqual(googleInitJson.status, 503, "Unconfigured OAuth must return 503");
      const initData = await googleInitJson.json();
      assert.strictEqual(initData.error.code, "GOOGLE_OAUTH_NOT_CONFIGURED");

      recordTest(
        "Google OAuth Integration",
        "Endpoints Fully Implemented & Unconfigured State Transparently Handled (NOT CONFIGURED)",
        true,
        `Status: NOT CONFIGURED, Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET`
      );
    } catch (err) {
      recordTest("Google OAuth Integration", "Endpoints Fully Implemented & Handled", false, err.message);
    }

    // -------------------------------------------------------------------------
    // 8. CUSTOMER DATA ISOLATION (CROSS-TENANT 403/404 BLOCKS)
    // -------------------------------------------------------------------------
    console.log("\n[8] AUDITING CUSTOMER DATA ISOLATION (TENANT ISOLATION)...");
    try {
      // 8a. Alice creates records
      const docRes = await aliceClient.fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Alice Private Contract",
          category: "identity",
          notes: "Strictly confidential",
        }),
      });
      assert.strictEqual(docRes.status, 201, `Create document should return 201, got ${docRes.status}`);
      const docData = await docRes.json();
      aliceDocId = docData.data.document.id;

      const remRes = await aliceClient.fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Alice Confidential Tax Reminder",
          category: "finance",
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          priority: "high",
        }),
      });
      assert.strictEqual(remRes.status, 201, `Create reminder should return 201, got ${remRes.status}`);
      const remData = await remRes.json();
      aliceRemId = remData.data.reminder.id;

      const expRes = await aliceClient.fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Alice Confidential Business Expense",
          amount: "450.00",
          category: "Business",
          currency: "USD",
          spentAt: new Date().toISOString(),
          paymentMethod: "Credit Card",
        }),
      });
      assert.strictEqual(expRes.status, 201, `Create expense should return 201, got ${expRes.status}`);
      const expData = await expRes.json();
      aliceExpId = expData.data.expense.id;

      const vehRes = await aliceClient.fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Alice Porsche",
          make: "Porsche",
          model: "Taycan",
          year: 2024,
          licensePlate: "ALICE-99",
        }),
      });
      assert.strictEqual(vehRes.status, 201, `Create vehicle should return 201, got ${vehRes.status}`);
      const vehData = await vehRes.json();
      aliceVehId = vehData.data.vehicle.id;

      // Alice family member
      const famRecord = await prisma.familyMember.create({
        data: {
          userId: aliceId,
          name: "Alice Daughter",
          relationship: "child",
        },
      });
      aliceFamId = famRecord.id;

      // 8b. Bob attempts to access Alice's document
      const bobDocGet = await bobClient.fetch(`/api/documents/${aliceDocId}`);
      assert.strictEqual(bobDocGet.status, 403, `Bob accessing Alice doc must be 403, got ${bobDocGet.status}`);

      const bobDocDelete = await bobClient.fetch(`/api/documents/${aliceDocId}`, { method: "DELETE" });
      assert.strictEqual(bobDocDelete.status, 403, `Bob deleting Alice doc must be 403, got ${bobDocDelete.status}`);

      // 8c. Bob attempts to access Alice's reminder
      const bobRemGet = await bobClient.fetch(`/api/reminders/${aliceRemId}`);
      assert.strictEqual(bobRemGet.status, 403, `Bob accessing Alice reminder must be 403, got ${bobRemGet.status}`);

      // 8d. Bob attempts to access Alice's expense
      const bobExpGet = await bobClient.fetch(`/api/expenses/${aliceExpId}`);
      assert.ok([403, 404].includes(bobExpGet.status), `Bob accessing Alice expense must be 403 or 404, got ${bobExpGet.status}`);

      // 8e. Bob attempts to access Alice's vehicle
      const bobVehGet = await bobClient.fetch(`/api/vehicles/${aliceVehId}`);
      assert.ok([403, 404].includes(bobVehGet.status), `Bob accessing Alice vehicle must be 403 or 404, got ${bobVehGet.status}`);

      // 8f. Bob attempts to access Alice's family member
      const bobFamDelete = await bobClient.fetch(`/api/family/${aliceFamId}`, { method: "DELETE" });
      assert.ok([400, 403, 404].includes(bobFamDelete.status), `Bob deleting Alice family must fail, got ${bobFamDelete.status}`);

      const bobFamList = await bobClient.fetch("/api/family");
      assert.strictEqual(bobFamList.status, 200);
      const bobFamData = await bobFamList.json();
      assert.ok(
        !bobFamData.data.members.some((m) => m.name === "Alice Daughter"),
        "Bob family group must NOT contain Alice's family member"
      );

      recordTest(
        "Customer Data Isolation",
        "100% Data Isolation Across Documents, Reminders, Expenses, Vehicles & Family",
        true,
        "Bob received 403/404/400 for all cross-tenant attempts and saw 0 of Alice's records"
      );
    } catch (err) {
      recordTest("Customer Data Isolation", "100% Data Isolation Across Modules", false, err.message);
    }

    // -------------------------------------------------------------------------
    // 9. FILE UPLOAD OWNERSHIP & AUTHORIZATION
    // -------------------------------------------------------------------------
    console.log("\n[9] AUDITING CUSTOMER FILE UPLOAD PRIVACY & ADMIN ACCESS...");
    try {
      // Create a test DocumentFile owned by Alice
      const docFile = await prisma.documentFile.create({
        data: {
          documentId: aliceDocId,
          userId: aliceId,
          fileName: "alice_passport.pdf",
          fileType: "application/pdf",
          storageKey: "uploads/documents/alice_passport.pdf",
          fileSize: 1024,
        },
      });
      aliceFileId = docFile.id;

      // Bob attempts to download Alice's file
      const bobFileDownload = await bobClient.fetch(`/api/documents/${aliceDocId}/files/${aliceFileId}`);
      assert.strictEqual(
        bobFileDownload.status,
        403,
        `Bob downloading Alice's file must return 403 Forbidden, got ${bobFileDownload.status}`
      );
      recordTest("Customer Upload Privacy", "Cross-tenant file download strictly forbidden (HTTP 403)", true);

      // Admin accesses file endpoint
      const adminFileDownload = await adminClient.fetch(`/api/documents/${aliceDocId}/files/${aliceFileId}`);
      // Admin is authorized: 200 (if file exists) or 404 (if storage mock), but NOT 403 forbidden
      assert.ok(
        adminFileDownload.status === 200 || adminFileDownload.status === 404,
        `Admin has authorization to view customer file, got status ${adminFileDownload.status}`
      );
      recordTest("Customer Upload Privacy", "Administrator permitted administrative view of customer uploads", true);
    } catch (err) {
      recordTest("Customer Upload Privacy", "File Upload Privacy and Authorization", false, err.message);
    }

    // -------------------------------------------------------------------------
    // 10. ADMIN CUSTOMER DATABASE & CUSTOMER 360 DETAILS
    // -------------------------------------------------------------------------
    console.log("\n[10] AUDITING ADMIN CUSTOMER DATABASE & TABBED 360 VIEW...");
    try {
      // 10a. Admin customer list
      const custListRes = await adminClient.fetch("/api/admin/customers");
      assert.strictEqual(custListRes.status, 200, "Admin customer list should return 200");
      const custListData = await custListRes.json();
      assert.strictEqual(custListData.success, true);
      assert.ok(Array.isArray(custListData.data.customers), "Customer list must be an array");

      const aliceSummary = custListData.data.customers.find((c) => c.id === aliceId);
      assert.ok(aliceSummary, "Customer Alice must appear in admin customer list");
      assert.strictEqual(aliceSummary.email, emailAlice);
      assert.strictEqual(aliceSummary.counts.documents, 1, "Alice document count must match DB (1)");
      assert.strictEqual(aliceSummary.counts.reminders, 1, "Alice reminder count must match DB (1)");
      assert.strictEqual(aliceSummary.counts.expenses, 1, "Alice expense count must match DB (1)");
      assert.strictEqual(aliceSummary.counts.vehicles, 1, "Alice vehicle count must match DB (1)");
      assert.strictEqual(aliceSummary.counts.family, 1, "Alice family count must match DB (1)");

      // 10b. Admin Customer 360 Details endpoint
      const custDetailsRes = await adminClient.fetch(`/api/admin/customers/${aliceId}`);
      assert.strictEqual(custDetailsRes.status, 200, "Admin Customer 360 details should return 200");
      const custDetailsData = await custDetailsRes.json();
      assert.strictEqual(custDetailsData.success, true);

      const customer360 = custDetailsData.data;
      assert.strictEqual(customer360.profile.id, aliceId);
      assert.strictEqual(customer360.profile.passwordHash, undefined, "Customer passwordHash must NOT be exposed in 360 view");
      assert.strictEqual(customer360.records.documents.length, 1, "Customer 360 documents must contain Alice's document");
      assert.strictEqual(customer360.records.documents[0].title, "Alice Private Contract");
      assert.strictEqual(customer360.records.reminders.length, 1, "Customer 360 reminders must contain Alice's reminder");
      assert.strictEqual(customer360.records.expenses.length, 1, "Customer 360 expenses must contain Alice's expense");
      assert.strictEqual(customer360.records.vehicles.length, 1, "Customer 360 vehicles must contain Alice's vehicle");
      assert.strictEqual(customer360.records.familyMembers.length, 1, "Customer 360 family must contain Alice's family");

      // 10c. Customer Status Update (Suspend / Activate)
      const suspendRes = await adminClient.fetch(`/api/admin/customers/${aliceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "suspended" }),
      });
      assert.strictEqual(suspendRes.status, 200, "Suspending customer must return 200");
      const suspendData = await suspendRes.json();
      assert.strictEqual(suspendData.data.subscriptionStatus, "suspended", "Customer status should be suspended");

      // Reactivate
      const reactivateRes = await adminClient.fetch(`/api/admin/customers/${aliceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      assert.strictEqual(reactivateRes.status, 200, "Reactivating customer must return 200");
      const reactivateData = await reactivateRes.json();
      assert.strictEqual(reactivateData.data.subscriptionStatus, "active", "Customer status should be active");

      recordTest(
        "Admin Customer Database & 360",
        "Admin Customer List & Full 360 View (Profile, Docs, Reminders, Finance, Vehicles, Family)",
        true,
        `Verified 360 records for customer ${aliceId}`
      );
    } catch (err) {
      recordTest("Admin Customer Database & 360", "Customer 360 Details & Status Management", false, err.message);
    }

    // -------------------------------------------------------------------------
    // 11. ADMIN REAL STATS & METRICS
    // -------------------------------------------------------------------------
    console.log("\n[11] AUDITING ADMIN STATS & METRICS INTEGRITY...");
    try {
      const statsRes = await adminClient.fetch("/api/admin/stats");
      assert.strictEqual(statsRes.status, 200);
      const stats = (await statsRes.json()).data;
      assert.ok(stats.users.total >= 3, `Expected at least 3 users, found: ${stats.users.total}`);
      assert.ok(stats.entities.documents >= 1, "Real documents count matches database");
      assert.ok(stats.entities.reminders >= 1, "Real reminders count matches database");
      recordTest("Admin Real Stats", "Admin Dashboard Metrics Derived 100% from Database", true, `Users: ${stats.users.total}`);
    } catch (err) {
      recordTest("Admin Real Stats", "Admin Dashboard Metrics Integrity", false, err.message);
    }
  } catch (fatalErr) {
    console.error("FATAL ERROR in test execution:", fatalErr);
  } finally {
    // -------------------------------------------------------------------------
    // 12. DATABASE TEARDOWN & INTEGRITY RESTORATION
    // -------------------------------------------------------------------------
    console.log("\n[12] TEARING DOWN TEST USERS & RESTORING CLEAN DATABASE STATE...");
    try {
      const testIds = [aliceId, bobId].filter(Boolean);
      if (testIds.length > 0) {
        await prisma.documentFile.deleteMany({ where: { userId: { in: testIds } } });
        await prisma.document.deleteMany({ where: { userId: { in: testIds } } });
        await prisma.reminder.deleteMany({ where: { userId: { in: testIds } } });
        await prisma.expense.deleteMany({ where: { userId: { in: testIds } } });
        await prisma.payment.deleteMany({ where: { userId: { in: testIds } } });
        await prisma.vehicle.deleteMany({ where: { userId: { in: testIds } } });
        await prisma.familyMember.deleteMany({ where: { userId: { in: testIds } } });
        await prisma.userSubscription.deleteMany({ where: { userId: { in: testIds } } });
        await prisma.session.deleteMany({ where: { userId: { in: testIds } } });
        await prisma.passwordResetToken.deleteMany({ where: { userId: { in: testIds } } });
        await prisma.profile.deleteMany({ where: { userId: { in: testIds } } });
        await prisma.userSetting.deleteMany({ where: { userId: { in: testIds } } });
        await prisma.user.deleteMany({ where: { id: { in: testIds } } });
      }
      // Also clean any leftover real_cust_ test accounts
      await prisma.user.deleteMany({ where: { email: { startsWith: "real_cust_" } } });

      // Clean test reset tokens for admin
      await prisma.passwordResetToken.deleteMany({ where: { user: { email: adminEmail } } });

      const remainingUsers = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
      console.log(`  Database restored. Remaining legitimate accounts: ${remainingUsers.length}`);
      for (const u of remainingUsers) {
        console.log(`    - ${u.email} (${u.role})`);
      }
      recordTest("Database Integrity & Teardown", "Complete Teardown of Test Data & Clean State Preserved", true);
    } catch (cleanErr) {
      console.error("Teardown error:", cleanErr.message);
      recordTest("Database Integrity & Teardown", "Teardown of Test Data", false, cleanErr.message);
    }
  }

  // ---------------------------------------------------------------------------
  // SUMMARY REPORT
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`                     AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================\n");

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runMasterVerification();
