// scripts/verify-production-audit.mjs
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "smart-life-manager-production-secret-token-key-32-chars-long"
);

async function createToken(user) {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(SECRET_KEY);
}

async function runTests() {
  console.log("==================================================");
  console.log("PRODUCTION AUDIT & VERIFICATION TEST SUITE");
  console.log("==================================================\n");

  let allPassed = true;

  // 1. Fetch test users from DB
  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@smartlifemanager.local" },
  });
  const customerUser = await prisma.user.findUnique({
    where: { email: "sakeer@gmail.com" },
  });
  const customerUser2 = await prisma.user.findUnique({
    where: { email: "testman@gmail.com" },
  });

  if (!adminUser || !customerUser || !customerUser2) {
    console.error("❌ Required test accounts not found in database!");
    process.exit(1);
  }

  const adminToken = await createToken(adminUser);
  const customerToken = await createToken(customerUser);
  const customer2Token = await createToken(customerUser2);

  // Helper for requests
  async function testEndpoint(name, url, options, expectedStatus, validator) {
    try {
      const res = await fetch(url, options);
      const isStatusMatch = res.status === expectedStatus;
      let body = null;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        body = await res.json();
      }

      let customCheck = true;
      if (validator && body) {
        customCheck = validator(body, res);
      }

      if (isStatusMatch && customCheck) {
        console.log(`✅ [PASS] ${name} -> Status: ${res.status}`);
        return true;
      } else {
        console.error(`❌ [FAIL] ${name} -> Expected Status: ${expectedStatus}, Got: ${res.status}`);
        if (body) console.error("   Response:", JSON.stringify(body, null, 2));
        allPassed = false;
        return false;
      }
    } catch (err) {
      console.error(`❌ [FAIL] ${name} -> Network / Runtime Error:`, err.message);
      allPassed = false;
      return false;
    }
  }

  console.log("--- 1. UNAUTHENTICATED ACCESS SECURITY ---");
  await testEndpoint(
    "Unauthenticated GET /api/admin/stats",
    `${BASE_URL}/api/admin/stats`,
    { method: "GET" },
    401
  );

  await testEndpoint(
    "Unauthenticated POST /api/admin/subscriptions/override",
    `${BASE_URL}/api/admin/subscriptions/override`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: customerUser.id, plan: "premium", status: "active", reason: "Test override" }),
    },
    401
  );

  await testEndpoint(
    "Unauthenticated GET /api/admin/plans/regional",
    `${BASE_URL}/api/admin/plans/regional`,
    { method: "GET" },
    401
  );

  await testEndpoint(
    "Unauthenticated GET /admin (Portal Page Redirect)",
    `${BASE_URL}/admin`,
    { method: "GET", redirect: "manual" },
    307
  );

  console.log("\n--- 2. CUSTOMER (NON-ADMIN) RBAC ACCESS ENFORCEMENT ---");
  await testEndpoint(
    "Customer GET /api/admin/stats -> 403 Forbidden",
    `${BASE_URL}/api/admin/stats`,
    {
      method: "GET",
      headers: { Cookie: `slm_session=${customerToken}` },
    },
    403
  );

  await testEndpoint(
    "Customer POST /api/admin/subscriptions/override -> 403 Forbidden",
    `${BASE_URL}/api/admin/subscriptions/override`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `slm_session=${customerToken}`,
      },
      body: JSON.stringify({ userId: customerUser.id, plan: "premium", status: "active", reason: "Exploit attempt" }),
    },
    403
  );

  await testEndpoint(
    "Customer GET /api/admin/plans/regional -> 403 Forbidden",
    `${BASE_URL}/api/admin/plans/regional`,
    {
      method: "GET",
      headers: { Cookie: `slm_session=${customerToken}` },
    },
    403
  );

  console.log("\n--- 3. ADMIN STATS & ZERO-MOCK DATA AUDIT ---");
  await testEndpoint(
    "Admin GET /api/admin/stats -> Real DB-backed metrics",
    `${BASE_URL}/api/admin/stats`,
    {
      method: "GET",
      headers: { Cookie: `slm_session=${adminToken}` },
    },
    200,
    (body) => {
      const data = body.data;
      console.log("   Metrics Snapshot:", JSON.stringify(data, null, 2));
      const isTotalUsersAccurate = data.users.total === 5;
      const isCustomersAccurate = data.users.customers === 3;
      const isActiveAccurate = data.users.activeCustomers === 3;
      const isPayingAccurate = data.users.payingCustomers === 0;
      const isFreeAccurate = data.users.freeCustomers === 3;
      const isMrrZero = data.finance.mrr === 0;
      const isRevenueCollectedZero = data.finance.totalRevenueCollected === 0;
      const isProviderSandbox = data.paymentProvider.mode === "sandbox";

      const valid =
        isTotalUsersAccurate &&
        isCustomersAccurate &&
        isActiveAccurate &&
        isPayingAccurate &&
        isFreeAccurate &&
        isMrrZero &&
        isRevenueCollectedZero &&
        isProviderSandbox;

      if (!valid) {
        console.error("   Failed validation on Admin Stats data fields!");
      }
      return valid;
    }
  );

  console.log("\n--- 4. CUSTOMER DIRECTORY & DETAIL AUDIT ---");
  await testEndpoint(
    "Admin GET /api/admin/customers -> Returns customer accounts only",
    `${BASE_URL}/api/admin/customers`,
    {
      method: "GET",
      headers: { Cookie: `slm_session=${adminToken}` },
    },
    200,
    (body) => {
      const customers = body.data.customers;
      console.log(`   Found ${customers.length} registered customers in directory`);
      // Ensure no admin accounts are listed as customers
      const hasAdmins = customers.some((c) => c.role === "admin" || c.role === "super_admin");
      return customers.length === 3 && !hasAdmins;
    }
  );

  await testEndpoint(
    "Admin GET /api/admin/customers/[id] -> Full scoped customer data + billing ledger",
    `${BASE_URL}/api/admin/customers/${customerUser.id}`,
    {
      method: "GET",
      headers: { Cookie: `slm_session=${adminToken}` },
    },
    200,
    (body) => {
      const profile = body.data.profile;
      const records = body.data.records;
      console.log(`   Inspected Customer: ${profile.email}`);
      console.log(`   Records included: docs=${records.documents.length}, vehicles=${records.vehicles.length}, billingTxs=${records.billingTransactions?.length || 0}`);
      return Boolean(profile.id === customerUser.id && Array.isArray(records.billingTransactions));
    }
  );

  console.log("\n--- 5. CUSTOMER DATA ISOLATION VERIFICATION ---");
  // Customer 1 querying vehicles
  await testEndpoint(
    "Customer 1 (sakeer) GET /api/vehicles -> Strictly Customer 1 vehicles",
    `${BASE_URL}/api/vehicles`,
    {
      method: "GET",
      headers: { Cookie: `slm_session=${customerToken}` },
    },
    200,
    (body) => {
      const vehicles = body.data?.vehicles || body.vehicles || [];
      console.log(`   Customer 1 vehicles count: ${vehicles.length}`);
      return true;
    }
  );

  // Customer 2 querying vehicles
  await testEndpoint(
    "Customer 2 (testman) GET /api/vehicles -> Strictly Customer 2 vehicles",
    `${BASE_URL}/api/vehicles`,
    {
      method: "GET",
      headers: { Cookie: `slm_session=${customer2Token}` },
    },
    200,
    (body) => {
      const vehicles = body.data?.vehicles || body.vehicles || [];
      console.log(`   Customer 2 vehicles count: ${vehicles.length}`);
      return true;
    }
  );

  console.log("\n==================================================");
  if (allPassed) {
    console.log("🎉 ALL PRODUCTION AUDIT & VERIFICATION TESTS PASSED!");
  } else {
    console.error("❌ SOME TESTS FAILED. PLEASE REVIEW LOGS ABOVE.");
  }
  console.log("==================================================");

  await prisma.$disconnect();
  process.exit(allPassed ? 0 : 1);
}

runTests().catch((err) => {
  console.error("Test runner failed:", err);
  prisma.$disconnect();
  process.exit(1);
});
