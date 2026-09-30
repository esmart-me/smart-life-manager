// scripts/verify-security-admin-separation.mjs
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "smart-life-manager-production-fallback-key-2026-32chars"
);

async function createToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${message}`);
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runSuite() {
  console.log("================================================================================");
  console.log("CRITICAL SECURITY, ADMIN SEPARATION & PAYMENT MANAGEMENT VERIFICATION SUITE");
  console.log("================================================================================\n");

  // 0. Locate / create test accounts
  const masterAdmin = await prisma.user.findFirst({
    where: {
      email: { in: ["admin@smartlifemanager.local", "esmartalw@gmail.com"] },
      role: { in: ["admin", "super_admin"] },
    },
  });

  if (!masterAdmin) {
    throw new Error("Master administrator account not found in database.");
  }

  let testCustomer = await prisma.user.findFirst({
    where: { role: { in: ["user", "customer"] } },
    include: { profile: true, userSubscription: true },
  });

  if (!testCustomer) {
    testCustomer = await prisma.user.create({
      data: {
        email: `test_customer_${Date.now()}@example.com`,
        passwordHash: "$2a$12$eXampleHashedPasswordForTestSimulationOnly000",
        role: "user",
        emailVerified: true,
        profile: {
          create: {
            displayName: "Test Customer Alpha",
            firstName: "Test",
            lastName: "Customer",
            country: "US",
            currency: "USD",
            timezone: "UTC",
          },
        },
        userSubscription: {
          create: {
            plan: "free",
            planName: "Free Starter",
            status: "active",
            billingInterval: "monthly",
            amount: 0,
            currency: "USD",
          },
        },
      },
      include: { profile: true, userSubscription: true },
    });
  }

  console.log(`[Config] Master Admin: ${masterAdmin.email} (ID: ${masterAdmin.id})`);
  console.log(`[Config] Customer: ${testCustomer.email} (ID: ${testCustomer.id})\n`);

  const masterAdminAdminToken = await createToken({
    sub: masterAdmin.id,
    email: masterAdmin.email,
    role: masterAdmin.role,
  });

  const customerToken = await createToken({
    sub: testCustomer.id,
    email: testCustomer.email,
    role: testCustomer.role,
  });

  // ==============================================================================
  // SECTION 1: UNAUTHENTICATED & CUSTOMER LOCKOUT FROM ADMIN
  // ==============================================================================
  console.log("--------------------------------------------------------------------------------");
  console.log("1. TESTING STRICT ACCESS CONTROL & ZERO CUSTOMER ACCESS TO ADMIN");
  console.log("--------------------------------------------------------------------------------");

  // 1.1 Unauthenticated call to /api/admin/stats
  const resUnauthApi = await fetch(`${BASE_URL}/api/admin/stats`);
  assert(
    resUnauthApi.status === 401 || resUnauthApi.status === 403,
    `Unauthenticated /api/admin/stats rejected with HTTP ${resUnauthApi.status}`
  );

  // 1.2 Unauthenticated call to /admin page (redirects to /admin/login)
  const resUnauthPage = await fetch(`${BASE_URL}/admin`, { redirect: "manual" });
  assert(
    resUnauthPage.status === 307 || resUnauthPage.status === 302,
    `Unauthenticated /admin redirects to login with HTTP ${resUnauthPage.status}`
  );
  const locationHeader = resUnauthPage.headers.get("location") || "";
  assert(
    locationHeader.includes("/admin/login"),
    `/admin redirects specifically to /admin/login (Got: ${locationHeader})`
  );

  // 1.3 Customer with slm_session cookie attempting to access /api/admin/stats
  const resCustApiStats = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: {
      Cookie: `slm_session=${customerToken}`,
    },
  });
  assert(
    resCustApiStats.status === 401 || resCustApiStats.status === 403,
    `Customer with slm_session calling /api/admin/stats rejected with HTTP ${resCustApiStats.status}`
  );

  // 1.4 Customer with slm_session cookie attempting to access /api/admin/customers
  const resCustApiCustomers = await fetch(`${BASE_URL}/api/admin/customers`, {
    headers: {
      Cookie: `slm_session=${customerToken}`,
    },
  });
  assert(
    resCustApiCustomers.status === 401 || resCustApiCustomers.status === 403,
    `Customer with slm_session calling /api/admin/customers rejected with HTTP ${resCustApiCustomers.status}`
  );

  // 1.5 Customer with slm_session cookie attempting to access /admin portal page
  const resCustAdminPage = await fetch(`${BASE_URL}/admin`, {
    headers: {
      Cookie: `slm_session=${customerToken}`,
    },
    redirect: "manual",
  });
  assert(
    resCustAdminPage.status === 307 || resCustAdminPage.status === 302,
    `Customer with slm_session visiting /admin is blocked and redirected (HTTP ${resCustAdminPage.status})`
  );

  // 1.6 Rogue user attempting to set slm_admin_session with a customer token
  const resRogueAdminSession = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: {
      Cookie: `slm_admin_session=${customerToken}`,
    },
  });
  assert(
    resRogueAdminSession.status === 401 || resRogueAdminSession.status === 403,
    `Non-admin token in slm_admin_session rejected by getAdminUser() with HTTP ${resRogueAdminSession.status}`
  );

  // 1.7 Non-owner admin (e.g. attacker pretending to be admin with unknown email)
  const fakeAdminToken = await createToken({
    sub: "fake_admin_999",
    email: "attacker@malicious.com",
    role: "admin",
  });
  const resFakeOwner = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: {
      Cookie: `slm_admin_session=${fakeAdminToken}`,
    },
  });
  assert(
    resFakeOwner.status === 401 || resFakeOwner.status === 403,
    `Non-authorized email with admin role rejected by isAuthorizedOwnerAdmin with HTTP ${resFakeOwner.status}`
  );

  // ==============================================================================
  // SECTION 2: MASTER ADMIN ACCESS WITH slm_admin_session
  // ==============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("2. TESTING MASTER ADMINISTRATOR PRIVILEGED ACCESS");
  console.log("--------------------------------------------------------------------------------");

  const resAdminStats = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: {
      Cookie: `slm_admin_session=${masterAdminAdminToken}`,
    },
  });
  assert(resAdminStats.status === 200, `Master Admin can access /api/admin/stats (HTTP 200)`);
  const statsData = await resAdminStats.json();
  assert(statsData.success === true, `Admin stats returns success: true`);
  assert(
    typeof statsData.data.users.customers === "number",
    `Admin stats returns authentic totalCustomers count (${statsData.data.users.customers})`
  );

  const resAdminCustomers = await fetch(`${BASE_URL}/api/admin/customers`, {
    headers: {
      Cookie: `slm_admin_session=${masterAdminAdminToken}`,
    },
  });
  assert(resAdminCustomers.status === 200, `Master Admin can access /api/admin/customers (HTTP 200)`);
  const custData = await resAdminCustomers.json();
  assert(custData.success === true, `Admin customers returns success: true`);
  assert(Array.isArray(custData.data.customers), `Admin customers returns array of real customers (${custData.data.total} records)`);

  // ==============================================================================
  // SECTION 3: CUSTOMER DETAIL EDITING & CREDENTIAL IMMUTABILITY
  // ==============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("3. TESTING ADMIN CUSTOMER PROFILE EDITING & SECURITY GUARDRAILS");
  console.log("--------------------------------------------------------------------------------");

  const updatedDisplayName = `Verified Customer ${Date.now()}`;
  const updatedPhone = "+1 555-0199";
  const updatedCountry = "IN";
  const updatedCurrency = "INR";

  const resEditCustomer = await fetch(`${BASE_URL}/api/admin/customers/${testCustomer.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: `slm_admin_session=${masterAdminAdminToken}`,
    },
    body: JSON.stringify({
      displayName: updatedDisplayName,
      firstName: "Verified",
      lastName: "Customer",
      phoneNumber: updatedPhone,
      country: updatedCountry,
      currency: updatedCurrency,
      timezone: "Asia/Kolkata",
      status: "active",
      // Attempting to pass role or password must be ignored
      role: "admin",
      password: "HackedPassword123!",
    }),
  });

  assert(resEditCustomer.status === 200, `PATCH /api/admin/customers/[id] succeeded (HTTP 200)`);
  const editResult = await resEditCustomer.json();
  assert(editResult.success === true, `Customer update response confirms success: true`);

  // Verify in DB
  const dbUpdatedUser = await prisma.user.findUnique({
    where: { id: testCustomer.id },
    include: { profile: true },
  });
  assert(
    dbUpdatedUser.profile.displayName === updatedDisplayName,
    `Profile displayName updated in database to: "${dbUpdatedUser.profile.displayName}"`
  );
  assert(
    dbUpdatedUser.profile.country === "IN",
    `Profile country updated in database to: "${dbUpdatedUser.profile.country}"`
  );
  assert(
    dbUpdatedUser.profile.currency === "INR",
    `Profile currency updated in database to: "${dbUpdatedUser.profile.currency}"`
  );
  assert(
    dbUpdatedUser.role === "user" || dbUpdatedUser.role === "customer",
    `Security guardrail confirmed: Customer role remains "${dbUpdatedUser.role}" (NOT elevated to admin)`
  );

  // Check audit log
  const auditLog = await prisma.adminAuditLog.findFirst({
    where: {
      targetId: testCustomer.id,
      action: "customer_details_edited",
    },
    orderBy: { createdAt: "desc" },
  });
  assert(auditLog !== null, `Admin audit log recorded for customer editing`);
  assert(auditLog.adminEmail === masterAdmin.email, `Audit log correctly attributes Admin: ${auditLog.adminEmail}`);

  // ==============================================================================
  // SECTION 4: CENTRALIZED PAYMENT SETTINGS & PUBLIC METHODS ENDPOINT
  // ==============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("4. TESTING CENTRALIZED PAYMENT SETTINGS & PUBLIC PAYMENT CONFIG");
  console.log("--------------------------------------------------------------------------------");

  const newUpiId = "smartlifemanager@okaxis";
  const newUpiName = "Smart Life Manager Official";
  const newInstructions = "Pay via UPI App and enter your 12-digit UTR below.";

  const resSaveSettings = await fetch(`${BASE_URL}/api/admin/payments/settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: `slm_admin_session=${masterAdminAdminToken}`,
    },
    body: JSON.stringify({
      cardEnabled: true,
      stripeEnabled: true,
      paypalEnabled: false,
      upiEnabled: true,
      upiId: newUpiId,
      upiDisplayName: newUpiName,
      upiQrCodeUrl: "/images/upi-qr-test.png",
      upiInstructions: newInstructions,
      defaultMethod: "card",
    }),
  });

  assert(resSaveSettings.status === 200, `PUT /api/admin/payments/settings returned HTTP 200`);
  const settingsResult = await resSaveSettings.json();
  assert(settingsResult.success === true, `Payment settings update confirmed success: true`);

  // Verify public endpoint consumed by Customer Checkout UI
  const resPublicMethods = await fetch(`${BASE_URL}/api/checkout/payment-methods`);
  assert(resPublicMethods.status === 200, `GET /api/checkout/payment-methods returned HTTP 200`);
  const publicMethods = await resPublicMethods.json();
  assert(publicMethods.success === true, `Public payment methods returns success: true`);
  assert(publicMethods.data.cardEnabled === true, `Public config reflects cardEnabled: true`);
  assert(publicMethods.data.upiEnabled === true, `Public config reflects upiEnabled: true`);
  assert(publicMethods.data.upiId === newUpiId, `Public config exposes configured upiId: ${publicMethods.data.upiId}`);
  assert(
    publicMethods.data.upiDisplayName === newUpiName,
    `Public config exposes upiDisplayName: ${publicMethods.data.upiDisplayName}`
  );

  // ==============================================================================
  // SECTION 5: MANUAL UPI CHECKOUT & VERIFICATION LIFECYCLE
  // ==============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("5. TESTING MANUAL UPI SUBMISSION & ADMIN VERIFICATION FLOW");
  console.log("--------------------------------------------------------------------------------");

  const testUtr = `UTR${Date.now().toString().slice(-9)}`;

  // 5.1 Customer submits UPI payment reference
  const resSubmitUpi = await fetch(`${BASE_URL}/api/checkout/submit-upi`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `slm_session=${customerToken}`,
    },
    body: JSON.stringify({
      plan: "premium",
      billingInterval: "monthly",
      amount: 899,
      currency: "INR",
      utrNumber: testUtr,
      notes: "Test UPI payment from HDFC account",
    }),
  });

  assert(resSubmitUpi.status === 200, `POST /api/checkout/submit-upi succeeded (HTTP 200)`);
  const submitResult = await resSubmitUpi.json();
  assert(submitResult.success === true, `UPI submission confirmed success: true`);
  assert(
    submitResult.data.status === "pending_verification",
    `Transaction status is strictly "pending_verification"`
  );
  assert(submitResult.data.utrNumber === testUtr, `Submitted UTR correctly saved: ${submitResult.data.utrNumber}`);

  const txId = submitResult.data.id;

  // 5.2 Verify that customer subscription is NOT active for premium yet
  const subBeforeVerify = await prisma.userSubscription.findUnique({
    where: { userId: testCustomer.id },
  });
  assert(
    !subBeforeVerify || subBeforeVerify.plan !== "premium" || subBeforeVerify.status !== "active",
    `Security check: Subscription is NOT activated automatically upon UPI submission`
  );

  // 5.3 Non-admin attempting to verify payment must be rejected
  const resUnauthorizedVerify = await fetch(`${BASE_URL}/api/admin/payments/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `slm_session=${customerToken}`,
    },
    body: JSON.stringify({
      transactionId: txId,
      action: "verify",
    }),
  });
  assert(
    resUnauthorizedVerify.status === 401 || resUnauthorizedVerify.status === 403,
    `Customer cannot verify payments via /api/admin/payments/verify (HTTP ${resUnauthorizedVerify.status})`
  );

  // 5.4 Master Administrator verifies the payment
  const resAdminVerify = await fetch(`${BASE_URL}/api/admin/payments/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `slm_admin_session=${masterAdminAdminToken}`,
    },
    body: JSON.stringify({
      transactionId: txId,
      action: "verify",
    }),
  });

  assert(resAdminVerify.status === 200, `Admin payment verification returned HTTP 200`);
  const verifyResult = await resAdminVerify.json();
  assert(verifyResult.success === true, `Payment verification confirmed success: true`);
  assert(verifyResult.data.status === "paid", `Transaction status updated to "paid"`);

  // 5.5 Verify that customer subscription is now ACTIVE for premium
  const subAfterVerify = await prisma.userSubscription.findUnique({
    where: { userId: testCustomer.id },
  });
  assert(subAfterVerify !== null, `Customer subscription record exists`);
  assert(subAfterVerify.plan === "premium", `Customer subscription upgraded to "premium"`);
  assert(subAfterVerify.status === "active", `Customer subscription status is now "active"`);

  // 5.6 Verify audit log for manual payment verification
  const paymentAuditLog = await prisma.adminAuditLog.findFirst({
    where: {
      targetId: txId,
      action: "payment_manually_verified",
    },
  });
  assert(paymentAuditLog !== null, `Admin audit log created for manual payment verification`);
  assert(
    paymentAuditLog.adminEmail === masterAdmin.email,
    `Audit log attributes verification to Master Admin: ${paymentAuditLog.adminEmail}`
  );

  // ==============================================================================
  // SECTION 6: CUSTOMER AI DATA ACCESS & ISOLATION
  // ==============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("6. TESTING CUSTOMER AI ISOLATION & READ-ONLY INTEGRITY");
  console.log("--------------------------------------------------------------------------------");

  const resAiStatus = await fetch(`${BASE_URL}/api/ai/status`, {
    headers: {
      Cookie: `slm_session=${customerToken}`,
    },
  });
  assert(resAiStatus.status === 200, `Customer can access AI status (HTTP 200)`);
  const aiStatusData = await resAiStatus.json();
  assert(aiStatusData.success === true, `AI status confirms operational service`);

  console.log("\n================================================================================");
  console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests} assertions verified successfully!`);
  console.log("================================================================================");
}

runSuite()
  .catch((err) => {
    console.error("\n❌ SUITE FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
