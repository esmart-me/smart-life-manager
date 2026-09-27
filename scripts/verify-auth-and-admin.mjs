// scripts/verify-auth-and-admin.mjs
import assert from "node:assert";
import { PrismaClient } from "@prisma/client";

const BASE_URL = process.env.TEST_APP_URL || "http://localhost:3000";
const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function report(testName, success, details = "") {
  if (success) {
    passed++;
    console.log(`[PASS] ${passed}. ${testName} ${details ? "- " + details : ""}`);
  } else {
    failed++;
    console.error(`[FAIL] ${testName}: ${details}`);
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

async function runTests() {
  console.log("==================================================================");
  console.log("  VERIFY AUTHENTICATION, ADMIN PORTAL & REAL CUSTOMER DATA");
  console.log("==================================================================\n");

  const timestamp = Date.now();
  const aliceClient = new HttpClient("Customer Alice");
  const bobClient = new HttpClient("Customer Bob");
  const adminClient = new HttpClient("Admin");
  const unauthClient = new HttpClient("Unauthenticated");

  const emailAlice = `real_alice_${timestamp}@domain.com`;
  const emailBob = `real_bob_${timestamp}@domain.com`;
  const password = "CustomerSecret2026!#";

  let aliceId = "";
  let bobId = "";
  let aliceDocId = "";
  let aliceRemId = "";

  try {
    // -------------------------------------------------------------
    // SECTION 1: GOOGLE OAUTH CONFIGURATION & ENDPOINTS
    // -------------------------------------------------------------
    console.log("--- SECTION 1: GOOGLE OAUTH ARCHITECTURE ---");

    // 1. Google OAuth Status Check
    try {
      const res = await unauthClient.fetch("/api/auth/google/status");
      assert.strictEqual(res.status, 200, "Status route should return 200");
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.provider, "google");
      assert.ok(data.data.redirectUri.includes("/api/auth/google/callback"), "Redirect URI must match callback");
      report("Google OAuth Status Endpoint", true, `Configured: ${data.data.configured}, URI: ${data.data.redirectUri}`);
    } catch (err) {
      report("Google OAuth Status Endpoint", false, err.message);
    }

    // 2. Google OAuth Initiation without Credentials (JSON Request)
    try {
      const res = await unauthClient.fetch("/api/auth/google?format=json", {
        headers: { Accept: "application/json" },
      });
      assert.strictEqual(res.status, 503, "Unconfigured OAuth should return 503");
      const data = await res.json();
      assert.strictEqual(data.error.code, "GOOGLE_OAUTH_NOT_CONFIGURED");
      assert.ok(data.error.details.requiredEnv.includes("GOOGLE_CLIENT_ID"));
      report("Google OAuth Unconfigured Safety Check (JSON)", true, "Proper 503 with setup instructions");
    } catch (err) {
      report("Google OAuth Unconfigured Safety Check (JSON)", false, err.message);
    }

    // 3. Google OAuth Initiation without Credentials (Browser Redirect)
    try {
      const res = await unauthClient.fetch("/api/auth/google");
      assert.strictEqual(res.status, 307, "Browser navigation should redirect to login");
      const location = res.headers.get("location") || "";
      assert.ok(location.includes("error=google_not_configured"), "Redirect must contain error param");
      report("Google OAuth Graceful Browser Redirect", true, `Redirected to ${location}`);
    } catch (err) {
      report("Google OAuth Graceful Browser Redirect", false, err.message);
    }

    // -------------------------------------------------------------
    // SECTION 2: CUSTOMER AUTHENTICATION (EMAIL/PASS) & ISOLATION
    // -------------------------------------------------------------
    console.log("\n--- SECTION 2: CUSTOMER REGISTRATION, SESSIONS & ISOLATION ---");

    // 4. Register Customer Alice
    try {
      const res = await aliceClient.fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailAlice,
          password,
          firstName: "Alice",
          lastName: "Customer",
        }),
      });
      assert.strictEqual(res.status, 201, "Expected 201 Created");
      const data = await res.json();
      aliceId = data.data.user.id;
      assert.ok(aliceId, "User ID must be assigned");
      assert.ok(aliceClient.cookie, "Session cookie must be set");
      report("Customer Alice Registration", true, `ID: ${aliceId}, Email: ${emailAlice}`);
    } catch (err) {
      report("Customer Alice Registration", false, err.message);
    }

    // 5. Register Customer Bob
    try {
      const res = await bobClient.fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailBob,
          password,
          firstName: "Bob",
          lastName: "Customer",
        }),
      });
      assert.strictEqual(res.status, 201, "Expected 201 Created");
      const data = await res.json();
      bobId = data.data.user.id;
      assert.ok(bobId, "User ID must be assigned");
      assert.ok(bobClient.cookie, "Session cookie must be set");
      report("Customer Bob Registration", true, `ID: ${bobId}, Email: ${emailBob}`);
    } catch (err) {
      report("Customer Bob Registration", false, err.message);
    }

    // 6. Alice creates Document
    try {
      const res = await aliceClient.fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Alice Confidential Passport",
          category: "identity",
          documentNumber: "P998877",
          issuedBy: "State Dept",
        }),
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      aliceDocId = data.data.document.id;
      assert.ok(aliceDocId);
      report("Alice Created Document", true, `Doc ID: ${aliceDocId}`);
    } catch (err) {
      report("Alice Created Document", false, err.message);
    }

    // 7. Alice creates Reminder
    try {
      const res = await aliceClient.fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Alice Annual Insurance Renewal",
          dueDate: new Date(Date.now() + 86400000 * 10).toISOString(),
          category: "finance",
          priority: "high",
        }),
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      aliceRemId = data.data.reminder.id;
      assert.ok(aliceRemId);
      report("Alice Created Reminder", true, `Rem ID: ${aliceRemId}`);
    } catch (err) {
      report("Alice Created Reminder", false, err.message);
    }

    // 8. Bob Accesses Alice's Document -> Expect 403 Forbidden
    try {
      const res = await bobClient.fetch(`/api/documents/${aliceDocId}`);
      assert.strictEqual(res.status, 403, "Bob must receive 403 when requesting Alice's document");
      report("Data Isolation: Document Protected from Cross-Tenant Access", true, "HTTP 403 Forbidden confirmed");
    } catch (err) {
      report("Data Isolation: Document Cross-Tenant Access", false, err.message);
    }

    // 9. Bob Accesses Alice's Reminder -> Expect 403 Forbidden
    try {
      const res = await bobClient.fetch(`/api/reminders/${aliceRemId}`);
      assert.strictEqual(res.status, 403, "Bob must receive 403 when requesting Alice's reminder");
      report("Data Isolation: Reminder Protected from Cross-Tenant Access", true, "HTTP 403 Forbidden confirmed");
    } catch (err) {
      report("Data Isolation: Reminder Cross-Tenant Access", false, err.message);
    }

    // 10. Document List Isolation Check
    try {
      const aliceListRes = await aliceClient.fetch("/api/documents");
      const aliceListData = await aliceListRes.json();
      assert.strictEqual(aliceListData.data.documents.length, 1, "Alice should see 1 document");

      const bobListRes = await bobClient.fetch("/api/documents");
      const bobListData = await bobListRes.json();
      assert.strictEqual(bobListData.data.documents.length, 0, "Bob should see 0 documents");
      report("Data Isolation: List Queries Scoped to User ID", true, "Alice: 1 doc, Bob: 0 docs");
    } catch (err) {
      report("Data Isolation: List Queries Scoped", false, err.message);
    }

    // -------------------------------------------------------------
    // SECTION 3: ADMIN ROLE & PORTAL PROTECTION
    // -------------------------------------------------------------
    console.log("\n--- SECTION 3: ADMIN ROLE & PORTAL PROTECTION ---");

    // 11. Unauthenticated Request to Admin Route
    try {
      const res = await unauthClient.fetch("/admin");
      assert.strictEqual(res.status, 307, "Unauthenticated user should be redirected");
      const location = res.headers.get("location") || "";
      assert.ok(location.includes("/admin/login"), "Must redirect to /admin/login");
      report("Admin Route Guard: Unauthenticated Redirect", true, `Redirected to ${location}`);
    } catch (err) {
      report("Admin Route Guard: Unauthenticated Redirect", false, err.message);
    }

    // 12. Customer Alice Attempts Access to Admin Portal
    try {
      const res = await aliceClient.fetch("/admin");
      assert.strictEqual(res.status, 307, "Customer role should be blocked from /admin");
      const location = res.headers.get("location") || "";
      assert.ok(location.includes("forbidden"), "Must redirect with error=forbidden");
      report("Admin Route Guard: Customer Role Blocked", true, `Redirected to ${location}`);
    } catch (err) {
      report("Admin Route Guard: Customer Role Blocked", false, err.message);
    }

    // 13. Customer Alice Attempts Admin API Call
    try {
      const res = await aliceClient.fetch(`/api/admin/customers/${bobId}`);
      assert.strictEqual(res.status, 403, "Customer role must receive 403 Forbidden on admin API");
      report("Admin API Guard: Customer Blocked from Admin Customer Details", true, "HTTP 403 Forbidden confirmed");
    } catch (err) {
      report("Admin API Guard: Customer Blocked", false, err.message);
    }

    // 14. Admin Authentication
    try {
      const res = await adminClient.fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@smartlifemanager.local",
          password: "Admin2026!",
        }),
      });
      assert.strictEqual(res.status, 200, "Admin login should succeed");
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(adminClient.cookie, "Admin session cookie must be set");
      report("Admin Authentication Successful", true, "Logged in as admin@smartlifemanager.local");
    } catch (err) {
      report("Admin Authentication Successful", false, err.message);
    }

    // 15. Admin Fetches Alice Customer Details
    try {
      const res = await adminClient.fetch(`/api/admin/customers/${aliceId}`);
      assert.strictEqual(res.status, 200, "Admin should successfully fetch customer details");
      const data = await res.json();
      assert.strictEqual(data.success, true);

      // Verify Profile
      assert.strictEqual(data.data.profile.email, emailAlice);
      assert.strictEqual(data.data.profile.role, "user");
      assert.strictEqual(data.data.profile.passwordHash, undefined, "passwordHash MUST NOT be exposed");

      // Verify Subscription
      assert.strictEqual(data.data.subscription.plan, "free");
      assert.strictEqual(data.data.subscription.status, "active");

      // Verify Usage Summary
      assert.strictEqual(data.data.usageSummary.documentsCount, 1, "Should report 1 document");
      assert.strictEqual(data.data.usageSummary.remindersCount, 1, "Should report 1 reminder");

      report(
        "Admin Customer Details Endpoint",
        true,
        `Verified profile, subscription (free/active), and usage summary (1 doc, 1 reminder) with 0 secret leaks`
      );
    } catch (err) {
      report("Admin Customer Details Endpoint", false, err.message);
    }

    // 16. Admin Fetches Bob Customer Details
    try {
      const res = await adminClient.fetch(`/api/admin/customers/${bobId}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.usageSummary.documentsCount, 0, "Bob has 0 documents");
      report("Admin Customer Details for Bob", true, "Usage counts accurately reflect 0 documents");
    } catch (err) {
      report("Admin Customer Details for Bob", false, err.message);
    }

    // 17. Verify Real Database-driven Counts in Admin Portal
    try {
      const totalInDB = await prisma.user.count({
        where: { role: { in: ["user", "customer"] } },
      });
      assert.ok(totalInDB >= 2, `Database holds registered customers (found ${totalInDB})`);
      report("Database Customer Integrity", true, `Confirmed ${totalInDB} customer accounts in DB`);
    } catch (err) {
      report("Database Customer Integrity", false, err.message);
    }

  } finally {
    // -------------------------------------------------------------
    // SECTION 4: POST-TEST TEARDOWN (Zero lingering test records)
    // -------------------------------------------------------------
    console.log("\n--- SECTION 4: TEARDOWN & REPOSITORY PRISTINE STATE ---");
    const testIds = [aliceId, bobId].filter(Boolean);
    if (testIds.length > 0) {
      await prisma.documentFile.deleteMany({ where: { userId: { in: testIds } } });
      await prisma.document.deleteMany({ where: { userId: { in: testIds } } });
      await prisma.reminder.deleteMany({ where: { userId: { in: testIds } } });
      await prisma.userSubscription.deleteMany({ where: { userId: { in: testIds } } });
      await prisma.profile.deleteMany({ where: { userId: { in: testIds } } });
      await prisma.userSetting.deleteMany({ where: { userId: { in: testIds } } });
      await prisma.user.deleteMany({ where: { id: { in: testIds } } });
      console.log(`[TEARDOWN] Safely deleted test accounts: ${emailAlice}, ${emailBob}`);
    }

    const remainingUsers = await prisma.user.findMany({ select: { email: true, role: true } });
    console.log(`[PRISTINE STATE] Database remaining users: ${remainingUsers.length}`);
    remainingUsers.forEach((u) => console.log(`  - [${u.role}] ${u.email}`));
  }

  console.log("\n==================================================================");
  console.log(`TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error("Fatal test failure:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
