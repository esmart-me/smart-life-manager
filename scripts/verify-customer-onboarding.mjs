import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "smart-life-manager-production-fallback-key-2026-32chars"
);

let testSuccess = 0;
let testFailures = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    testSuccess++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    testFailures++;
  }
}

async function createSessionToken(user) {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

async function main() {
  console.log("=== STARTING CUSTOMER ONBOARDING & AUDIT VERIFICATION ===");

  // TEST 1: Verify existing users have onboardingCompleted: true
  console.log("\n[Test 1] Verifying existing user onboarding state in database...");
  const existingUsers = await prisma.user.findMany({
    include: { settings: true },
  });
  assert(existingUsers.length > 0, `Found ${existingUsers.length} total users in DB`);
  const incompleteExisting = existingUsers.filter(u => u.settings?.onboardingCompleted !== true);
  assert(incompleteExisting.length === 0, `All ${existingUsers.length} pre-existing users have onboardingCompleted: true`);

  // TEST 2: Existing user login and /api/user/onboarding endpoint
  console.log("\n[Test 2] Testing existing user via GET /api/user/onboarding...");
  const admin = await prisma.user.findFirst({
    where: { role: { in: ["admin", "super_admin"] } },
  });
  assert(Boolean(admin), `Found admin user in database: ${admin?.email}`);
  const adminToken = await createSessionToken(admin);
  const adminCookie = `slm_session=${adminToken}`;
  const adminPortalCookie = `slm_admin_session=${adminToken}`;

  const adminOnboardingRes = await fetch(`${BASE_URL}/api/user/onboarding`, {
    headers: { Cookie: adminCookie },
  });
  assert(adminOnboardingRes.ok, "GET /api/user/onboarding returned 200 OK for admin");
  const adminOnboardingData = await adminOnboardingRes.json();
  assert(adminOnboardingData.data?.onboardingCompleted === true, "Existing user has onboardingCompleted === true (will NOT see modal)");

  // TEST 3: Create a brand new user and verify onboardingCompleted starts as false
  console.log("\n[Test 3] Testing newly registered customer onboarding lifecycle...");
  const newEmail = `newcustomer_${Date.now()}@example.com`;
  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: newEmail,
      password: "SecurePassword123!",
      firstName: "Sarah",
      lastName: "Jenkins",
    }),
  });
  const registerCookies = registerRes.headers.get("set-cookie") || "";
  const registerData = await registerRes.json();
  assert(registerRes.ok, `Registration succeeded for ${newEmail}`);

  // Fetch onboarding state for new user
  const newOnboardingRes = await fetch(`${BASE_URL}/api/user/onboarding`, {
    headers: { Cookie: registerCookies },
  });
  assert(newOnboardingRes.ok, "GET /api/user/onboarding returned 200 OK for new user");
  const newOnboardingData = await newOnboardingRes.json();
  assert(newOnboardingData.data?.onboardingCompleted === false, "New customer onboardingCompleted is FALSE");
  assert(newOnboardingData.data?.onboardingStep === 1, "New customer onboardingStep starts at 1");

  // TEST 4: Advance step via POST /api/user/onboarding
  console.log("\n[Test 4] Updating onboarding step progress (Step 1 -> Step 4)...");
  const stepUpdateRes = await fetch(`${BASE_URL}/api/user/onboarding`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: registerCookies,
    },
    body: JSON.stringify({ step: 4 }),
  });
  assert(stepUpdateRes.ok, "POST /api/user/onboarding returned 200 OK for step update");
  const stepUpdateData = await stepUpdateRes.json();
  assert(stepUpdateData.data?.onboardingStep === 4, "onboardingStep successfully saved as 4");
  assert(stepUpdateData.data?.onboardingCompleted === false, "onboardingCompleted remains false while navigating steps");

  // TEST 5: Complete onboarding via POST /api/user/onboarding
  console.log("\n[Test 5] Completing onboarding (Finish / Skip)...");
  const completeRes = await fetch(`${BASE_URL}/api/user/onboarding`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: registerCookies,
    },
    body: JSON.stringify({ step: 10, completed: true }),
  });
  assert(completeRes.ok, "POST /api/user/onboarding returned 200 OK for completion");
  const completeData = await completeRes.json();
  assert(completeData.data?.onboardingCompleted === true, "onboardingCompleted is now TRUE");

  // Verify subsequent GET returns completed
  const verifyCompletedRes = await fetch(`${BASE_URL}/api/user/onboarding`, {
    headers: { Cookie: registerCookies },
  });
  const verifyCompletedData = await verifyCompletedRes.json();
  assert(verifyCompletedData.data?.onboardingCompleted === true, "Subsequent GET confirms onboardingCompleted is true (modal will never show again)");

  // TEST 6: Unauthorized access to /api/user/onboarding
  console.log("\n[Test 6] Testing security isolation (unauthenticated requests)...");
  const anonRes = await fetch(`${BASE_URL}/api/user/onboarding`);
  assert(anonRes.status === 401, "Unauthenticated GET /api/user/onboarding returns 401 Unauthorized");
  const anonPostRes = await fetch(`${BASE_URL}/api/user/onboarding`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed: true }),
  });
  assert(anonPostRes.status === 401, "Unauthenticated POST /api/user/onboarding returns 401 Unauthorized");

  // TEST 7: Verify Admin Stats dynamic Stripe and real metrics
  console.log("\n[Test 7] Verifying Admin Stats real data and dynamic Stripe status...");
  const adminStatsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Cookie: adminPortalCookie },
  });
  assert(adminStatsRes.ok, "GET /api/admin/stats returned 200 OK");
  const adminStats = await adminStatsRes.json();
  assert(adminStats.success === true, "adminStats.success is true");
  assert(typeof adminStats.data?.paymentProvider?.mode === "string", `Payment provider mode: ${adminStats.data?.paymentProvider?.mode}`);
  assert(typeof adminStats.data?.paymentProvider?.status === "string", `Payment provider status: ${adminStats.data?.paymentProvider?.status}`);
  assert(typeof adminStats.data?.users?.total === "number", `Total users in DB: ${adminStats.data?.users?.total}`);
  assert(typeof adminStats.data?.finance?.mrr === "number", `MRR calculated from real DB: $${adminStats.data?.finance?.mrr}`);

  // Cleanup test user
  await prisma.user.delete({ where: { email: newEmail } }).catch(() => {});

  console.log(`\n==================================================`);
  console.log(`SUMMARY: ${testSuccess} passed, ${testFailures} failed`);
  console.log(`==================================================`);

  if (testFailures > 0) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("Test execution error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
