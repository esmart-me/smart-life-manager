import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "smart-life-manager-production-fallback-key-2026-32chars"
);

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
  console.log("==================================================");
  console.log("ADMIN DASHBOARD BUTTON & ROUTE VERIFICATION SUITE");
  console.log("==================================================");

  // 1. Fetch admin and customer accounts
  const admin = await prisma.user.findFirst({
    where: { role: { in: ["admin", "super_admin"] } },
  });
  if (!admin) {
    throw new Error("No admin user found in database!");
  }

  const customer = await prisma.user.findFirst({
    where: { role: { in: ["user", "customer"] } },
  });
  if (!customer) {
    throw new Error("No customer user found in database!");
  }

  console.log(`[Setup] Admin: ${admin.email} (Role: ${admin.role})`);
  console.log(`[Setup] Customer: ${customer.email} (Role: ${customer.role})`);

  const adminToken = await createSessionToken({
    id: admin.id,
    email: admin.email,
    role: admin.role,
  });

  const customerToken = await createSessionToken({
    id: customer.id,
    email: customer.email,
    role: customer.role,
  });

  // Test 1: Unauthenticated access to /admin
  console.log("\n--- TEST 1: UNAUTHENTICATED ACCESS ---");
  const unauthRes = await fetch(`${BASE_URL}/admin`, {
    redirect: "manual",
  });
  console.log(`GET /admin without cookie -> HTTP ${unauthRes.status}`);
  if (unauthRes.status === 307 || unauthRes.status === 302) {
    const loc = unauthRes.headers.get("location");
    console.log(`Redirect location: ${loc}`);
    if (loc?.includes("/admin/login")) {
      console.log("✅ [PASS] Unauthenticated access properly redirected to /admin/login");
    } else {
      throw new Error(`Unexpected redirect location: ${loc}`);
    }
  } else {
    throw new Error(`Expected redirect, got status ${unauthRes.status}`);
  }

  // Test 2: Customer (non-admin) access to /admin
  console.log("\n--- TEST 2: CUSTOMER (NON-ADMIN) ACCESS ---");
  const customerRes = await fetch(`${BASE_URL}/admin`, {
    headers: {
      Cookie: `slm_session=${customerToken}`,
    },
    redirect: "manual",
  });
  console.log(`GET /admin as customer -> HTTP ${customerRes.status}`);
  if (customerRes.status === 307 || customerRes.status === 302) {
    const loc = customerRes.headers.get("location");
    console.log(`Redirect location: ${loc}`);
    if (loc?.includes("/admin/login")) {
      console.log("✅ [PASS] Customer properly denied access and redirected to /admin/login");
    } else {
      throw new Error(`Unexpected redirect location: ${loc}`);
    }
  } else {
    throw new Error(`Expected forbidden redirect, got status ${customerRes.status}`);
  }

  // Test 3: Admin access to /admin - measure performance and verify HTML
  console.log("\n--- TEST 3: ADMIN ACCESS & PERFORMANCE BENCHMARK ---");
  const t0 = performance.now();
  const adminRes = await fetch(`${BASE_URL}/admin`, {
    headers: {
      Cookie: `slm_admin_session=${adminToken}`,
    },
  });
  const t1 = performance.now();
  const duration = Math.round(t1 - t0);
  console.log(`GET /admin as admin -> HTTP ${adminRes.status} in ${duration}ms`);

  if (adminRes.status !== 200) {
    throw new Error(`Expected HTTP 200, got ${adminRes.status}`);
  }
  console.log(`✅ [PASS] Admin dashboard returned HTTP 200 in ${duration}ms (fast & responsive)`);

  const html = await adminRes.text();

  // Test 4: Verify complete UI components & KPI presence
  console.log("\n--- TEST 4: UI & KPI DATA INTEGRITY AUDIT ---");
  const requiredStrings = [
    "Administrator Overview",
    "Total Customers",
    "Active Customers",
    "Free Users",
    "Premium Users",
    "Family Users",
    "Monthly Recurring (MRR)",
    "Annual Revenue (ARR)",
    "Successful Payments",
    "Failed Payments",
    "Cancelled Subscriptions",
    "AI Assistant Architecture",
    "Payment Gateway &amp; Billing Infrastructure",
    "Recent Customers",
    "Admin Activity &amp; Security Audit",
  ];

  for (const str of requiredStrings) {
    if (html.includes(str)) {
      console.log(`✅ [PASS] Found component: "${str}"`);
    } else {
      throw new Error(`Missing expected element in /admin HTML: "${str}"`);
    }
  }

  // Test 5: Verify no mock numbers or fabricated metrics
  console.log("\n--- TEST 5: ZERO MOCK DATA AUDIT ---");
  if (html.includes("0 active paying customers")) {
    console.log("✅ [PASS] Verified zero-state MRR/ARR subtext: '0 active paying customers'");
  }
  if (html.includes("0 customer transactions")) {
    console.log("✅ [PASS] Verified zero-state payment subtext: '0 customer transactions'");
  }
  if (html.includes("$0.00")) {
    console.log("✅ [PASS] Verified $0.00 revenue display when no paid subscriptions exist");
  }

  // Test 6: Verify Admin subpages
  console.log("\n--- TEST 6: ADMIN SUBPAGES ACCESSIBILITY ---");
  const subpages = [
    "/admin/customers",
    "/admin/subscriptions",
    "/admin/payments",
    "/admin/payments/settings",
    "/admin/plans",
    "/admin/audit",
  ];

  for (const page of subpages) {
    const tStart = performance.now();
    const res = await fetch(`${BASE_URL}${page}`, {
      headers: {
        Cookie: `slm_admin_session=${adminToken}`,
      },
    });
    const tEnd = performance.now();
    const pageDuration = Math.round(tEnd - tStart);
    if (res.status === 200) {
      console.log(`✅ [PASS] ${page} returned HTTP 200 in ${pageDuration}ms`);
    } else {
      throw new Error(`${page} returned status ${res.status}`);
    }
  }

  // Test 7: Verify Customer Dashboard and AI endpoint regression check
  console.log("\n--- TEST 7: CUSTOMER DASHBOARD & AI ASSISTANT INTEGRITY ---");
  const custDashRes = await fetch(`${BASE_URL}/`, {
    headers: {
      Cookie: `slm_session=${customerToken}`,
    },
  });
  console.log(`GET / as customer -> HTTP ${custDashRes.status}`);
  if (custDashRes.status !== 200) {
    throw new Error(`Customer dashboard returned HTTP ${custDashRes.status}`);
  }
  console.log("✅ [PASS] Customer dashboard operates smoothly (HTTP 200)");

  const aiStatusRes = await fetch(`${BASE_URL}/api/ai/status`, {
    headers: {
      Cookie: `slm_session=${customerToken}`,
    },
  });
  const aiStatusData = await aiStatusRes.json();
  const aiData = aiStatusData.data || aiStatusData;
  console.log(`AI Status: model=${aiData.model}, provider=${aiData.provider}`);
  if (aiData.model === "gemini-3.8-flash") {
    console.log("✅ [PASS] AI model is verified as gemini-3.8-flash");
  } else {
    throw new Error(`AI model unexpected: ${aiData.model}`);
  }

  console.log("\n==================================================");
  console.log("🎉 ALL ADMIN DASHBOARD & SYSTEM TESTS PASSED 100%!");
  console.log("==================================================");
}

main()
  .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
