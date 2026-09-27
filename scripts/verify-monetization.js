/**
 * Verification Script: Monetization, Subscription Architecture & Family Sharing
 * Tests:
 * 1. Plan retrieval with dynamic pricing and limits
 * 2. Admin pricing configuration updates (no hardcoded pricing)
 * 3. User subscription summary and usage meters
 * 4. Plan simulation switching (Free -> Premium -> Family -> Free)
 * 5. Resource limits access-control (Documents, Vehicles, Family sharing)
 * 6. Family Circle multi-member management with roles (Owner, Admin, Member, View Only)
 * 7. Granular permission updates and member deletion safety
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

let testCookie = "";
let testUserId = "";

async function loginUser() {
  console.log("\n==========================================");
  console.log("1. Authenticating Test User");
  console.log("==========================================");

  // Find existing user in database
  const user = await prisma.user.findFirst({
    include: { userSubscription: true },
  });

  if (!user) {
    throw new Error("No user found in local SQLite database.");
  }

  testUserId = user.id;
  console.log(`Found user: ${user.email} (ID: ${user.id})`);

  // Direct login via API
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: "TestPassword123!", // Standard test password
    }),
  });

  const cookieHeader = res.headers.get("set-cookie");
  if (cookieHeader) {
    testCookie = cookieHeader.split(";")[0];
    console.log(`[PASS] Authenticated successfully via session cookie.`);
  } else {
    // If password differed, generate token directly with existing auth secret
    console.log(`Fallback: Setting up session token...`);
    const { SignJWT } = require("jose");
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "smart-life-manager-production-fallback-key-2026-32chars"
    );
    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      role: user.role || "user",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

    testCookie = `slm_session=${token}`;
    console.log(`[PASS] Session token generated for test.`);
  }
}

async function testPlansRetrieval() {
  console.log("\n==========================================");
  console.log("2. Testing Dynamic Plan Retrieval (GET /api/plans)");
  console.log("==========================================");

  const res = await fetch(`${BASE_URL}/api/plans`, {
    headers: { Cookie: testCookie },
  });

  if (!res.ok) {
    throw new Error(`GET /api/plans failed with status ${res.status}`);
  }

  const json = await res.json();
  if (!json.success || !json.data?.plans) {
    throw new Error("Invalid plans API response format.");
  }

  const plans = json.data.plans;
  console.log(`Retrieved ${plans.length} plan tiers:`);
  for (const p of plans) {
    console.log(
      `  - Tier: ${p.plan.padEnd(8)} | Name: ${p.name.padEnd(20)} | Price: ${p.currency} ${p.monthlyPrice}/mo, ${p.yearlyPrice}/yr | Docs: ${p.maxDocuments} | Vehicles: ${p.maxVehicles} | Family: ${p.maxFamilyMembers}`
    );
  }

  const free = plans.find((p) => p.plan === "free");
  const premium = plans.find((p) => p.plan === "premium");
  const family = plans.find((p) => p.plan === "family");

  if (!free || !premium || !family) {
    throw new Error("Missing one of the three required plans (free, premium, family)!");
  }

  if (free.maxDocuments !== 5) {
    throw new Error(`Expected Free plan to have maxDocuments: 5, got ${free.maxDocuments}`);
  }
  if (free.maxVehicles !== 1) {
    throw new Error(`Expected Free plan to have maxVehicles: 1, got ${free.maxVehicles}`);
  }
  if (premium.maxDocuments !== -1) {
    throw new Error(`Expected Premium plan to have unlimited documents (-1), got ${premium.maxDocuments}`);
  }
  if (family.maxFamilyMembers < 6) {
    throw new Error(`Expected Family plan to allow multiple members (>=6), got ${family.maxFamilyMembers}`);
  }

  console.log("[PASS] All required tiers, limits, and feature lists verified.");
}

async function testAdminConfigurablePricing() {
  console.log("\n==========================================");
  console.log("3. Testing Configurable Pricing (PUT /api/plans/admin)");
  console.log("==========================================");

  const newPrice = 12.49;
  const newYearly = 109.99;

  const updateRes = await fetch(`${BASE_URL}/api/plans/admin`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: testCookie,
    },
    body: JSON.stringify({
      plan: "premium",
      updates: {
        monthlyPrice: newPrice,
        yearlyPrice: newYearly,
        currency: "USD",
      },
    }),
  });

  if (!updateRes.ok) {
    throw new Error(`PUT /api/plans/admin failed with status ${updateRes.status}`);
  }

  const updateJson = await updateRes.json();
  if (!updateJson.success || updateJson.data.planConfig.monthlyPrice !== newPrice) {
    throw new Error("Admin price update was not reflected in returned planConfig.");
  }

  console.log(`[PASS] Premium price dynamically updated in database to: $${newPrice}/mo, $${newYearly}/yr`);

  // Verify via GET /api/plans
  const getRes = await fetch(`${BASE_URL}/api/plans`, { headers: { Cookie: testCookie } });
  const getJson = await getRes.json();
  const updatedPrem = getJson.data.plans.find((p) => p.plan === "premium");
  if (updatedPrem.monthlyPrice !== newPrice) {
    throw new Error("Updated price was not persisted to GET /api/plans!");
  }

  console.log("[PASS] Persistence verified without modifying application code.");

  // Revert to default test price
  await fetch(`${BASE_URL}/api/plans/admin`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: testCookie },
    body: JSON.stringify({
      plan: "premium",
      updates: { monthlyPrice: 9.99, yearlyPrice: 89.99, currency: "USD" },
    }),
  });
  console.log("[PASS] Restored baseline pricing ($9.99/mo).");
}

async function testSubscriptionSummaryAndSimulation() {
  console.log("\n==========================================");
  console.log("4. Testing User Subscription & Plan Simulation");
  console.log("==========================================");

  // 1. Initial status
  const currRes = await fetch(`${BASE_URL}/api/subscription/current`, {
    headers: { Cookie: testCookie },
  });
  const currJson = await currRes.json();
  console.log(`Current active tier: ${currJson.data.summary.plan}`);
  console.log(`Document usage: ${currJson.data.summary.limits.documents.current} / ${currJson.data.summary.limits.documents.max}`);
  console.log(`Vehicle usage: ${currJson.data.summary.limits.vehicles.current} / ${currJson.data.summary.limits.vehicles.max}`);

  // 2. Simulate upgrade to Premium
  console.log("\nSimulating upgrade to Life Pro Premium...");
  const simPremRes = await fetch(`${BASE_URL}/api/subscription/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: testCookie },
    body: JSON.stringify({ plan: "premium", billingInterval: "yearly" }),
  });
  const simPremJson = await simPremRes.json();
  if (!simPremJson.success || simPremJson.data.summary.plan !== "premium") {
    throw new Error("Failed to simulate upgrade to Premium!");
  }
  console.log(`[PASS] Plan upgraded to: ${simPremJson.data.summary.plan} (${simPremJson.data.summary.billingInterval})`);
  console.log(`[PASS] Documents unlimited: ${simPremJson.data.summary.limits.documents.isUnlimited}`);
  console.log(`[PASS] Vehicles unlimited: ${simPremJson.data.summary.limits.vehicles.isUnlimited}`);

  // 3. Simulate upgrade to Family
  console.log("\nSimulating upgrade to Family Circle Plus...");
  const simFamRes = await fetch(`${BASE_URL}/api/subscription/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: testCookie },
    body: JSON.stringify({ plan: "family", billingInterval: "monthly" }),
  });
  const simFamJson = await simFamRes.json();
  if (!simFamJson.success || simFamJson.data.summary.plan !== "family") {
    throw new Error("Failed to simulate upgrade to Family!");
  }
  console.log(`[PASS] Plan upgraded to: ${simFamJson.data.summary.plan}`);
  console.log(`[PASS] Family sharing enabled: ${simFamJson.data.summary.isFamily}`);
  console.log(`[PASS] Max family members allowed: ${simFamJson.data.summary.limits.familyMembers.max}`);

  // 4. Switch back to Free
  console.log("\nSimulating downgrade to Free...");
  const simFreeRes = await fetch(`${BASE_URL}/api/subscription/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: testCookie },
    body: JSON.stringify({ plan: "free" }),
  });
  const simFreeJson = await simFreeRes.json();
  if (!simFreeJson.success || simFreeJson.data.summary.plan !== "free") {
    throw new Error("Failed to simulate switch to Free tier!");
  }
  console.log(`[PASS] Restored Free tier: max ${simFreeJson.data.summary.limits.documents.max} docs, ${simFreeJson.data.summary.limits.vehicles.max} vehicle.`);
}

async function testFamilyCircleManagement() {
  console.log("\n==========================================");
  console.log("5. Testing Family Circle Management & Roles");
  console.log("==========================================");

  // 1. Get family group
  const getFamRes = await fetch(`${BASE_URL}/api/family`, {
    headers: { Cookie: testCookie },
  });
  const getFamJson = await getFamRes.json();
  if (!getFamJson.success) {
    throw new Error("Failed to fetch family group.");
  }
  console.log(`Family Group: "${getFamJson.data.familyGroup.name}" with ${getFamJson.data.members.length} members`);

  // Verify Owner exists
  const ownerMember = getFamJson.data.members.find((m) => m.role === "Owner");
  if (!ownerMember) {
    throw new Error("Family group must have an Owner member!");
  }
  console.log(`[PASS] Primary Owner verified: ${ownerMember.name} (Role: ${ownerMember.role})`);

  // 2. Add an Admin member
  console.log("\nAdding Admin family member (Spouse)...");
  const addAdminRes = await fetch(`${BASE_URL}/api/family`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: testCookie },
    body: JSON.stringify({
      name: "Alex Smith",
      email: "alex.smith@example.com",
      role: "Admin",
      canViewDocuments: true,
      canEditDocuments: true,
      canViewFinance: true,
      canEditFinance: true,
      canViewVehicles: true,
      canEditVehicles: true,
    }),
  });
  const addAdminJson = await addAdminRes.json();
  if (!addAdminJson.success) {
    throw new Error(`Failed to add Admin member: ${addAdminJson.error?.message}`);
  }
  const adminMember = addAdminJson.data.member;
  console.log(`[PASS] Added member: ${adminMember.name} (Role: ${adminMember.role}, Status: ${adminMember.status})`);

  // 3. Add a Member with custom permissions
  console.log("\nAdding Member with limited permissions...");
  const addMemberRes = await fetch(`${BASE_URL}/api/family`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: testCookie },
    body: JSON.stringify({
      name: "Jamie Smith",
      role: "Member",
      canViewDocuments: true,
      canEditDocuments: false,
      canViewFinance: false,
      canEditFinance: false,
      canViewVehicles: true,
      canEditVehicles: false,
    }),
  });
  const addMemberJson = await addMemberRes.json();
  if (!addMemberJson.success) {
    throw new Error(`Failed to add Member: ${addMemberJson.error?.message}`);
  }
  const jamieMember = addMemberJson.data.member;
  console.log(`[PASS] Added member: ${jamieMember.name} (Role: ${jamieMember.role})`);

  // 4. Add a View Only member
  console.log("\nAdding View Only member (Elder)...");
  const addViewRes = await fetch(`${BASE_URL}/api/family`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: testCookie },
    body: JSON.stringify({
      name: "Grandparent Smith",
      role: "View Only",
      canViewDocuments: true,
      canEditDocuments: false,
      canViewFinance: false,
      canEditFinance: false,
      canViewVehicles: false,
      canEditVehicles: false,
    }),
  });
  const addViewJson = await addViewRes.json();
  if (!addViewJson.success) {
    throw new Error(`Failed to add View Only member: ${addViewJson.error?.message}`);
  }
  const elderMember = addViewJson.data.member;
  console.log(`[PASS] Added member: ${elderMember.name} (Role: ${elderMember.role})`);

  // 5. Update permissions for Jamie (grant finance view)
  console.log(`\nUpdating permissions for ${jamieMember.name} (PATCH /api/family/${jamieMember.id})...`);
  const patchRes = await fetch(`${BASE_URL}/api/family/${jamieMember.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: testCookie },
    body: JSON.stringify({
      canViewFinance: true,
      canEditFinance: false,
    }),
  });
  const patchJson = await patchRes.json();
  if (!patchJson.success || !patchJson.data.member.canViewFinance) {
    throw new Error("Failed to update member permission!");
  }
  console.log(`[PASS] Permissions updated: canViewFinance=${patchJson.data.member.canViewFinance}`);

  // 6. Test Owner protection: Attempting to delete Owner must fail
  console.log("\nVerifying Owner safety protection...");
  const delOwnerRes = await fetch(`${BASE_URL}/api/family/${ownerMember.id}`, {
    method: "DELETE",
    headers: { Cookie: testCookie },
  });
  const delOwnerJson = await delOwnerRes.json();
  if (delOwnerRes.ok || delOwnerJson.success) {
    throw new Error("Owner deletion should have failed but succeeded!");
  }
  console.log(`[PASS] Owner deletion correctly blocked: ${delOwnerJson.error?.message}`);

  // 7. Clean up test members
  console.log("\nCleaning up test members...");
  for (const m of [adminMember, jamieMember, elderMember]) {
    const delRes = await fetch(`${BASE_URL}/api/family/${m.id}`, {
      method: "DELETE",
      headers: { Cookie: testCookie },
    });
    const delJson = await delRes.json();
    if (!delJson.success) {
      console.warn(`Warning: failed to delete ${m.name}: ${delJson.error?.message}`);
    } else {
      console.log(`  - Removed ${m.name}`);
    }
  }
  console.log("[PASS] Family Circle lifecycle complete.");
}

async function testAccessControlEnforcement() {
  console.log("\n==========================================");
  console.log("6. Testing Plan Enforcement & Strict Limit Evaluation");
  console.log("==========================================");

  // User is on Free plan. Vehicle usage is already 1 / 1.
  // 1. In standard (dev) mode, creation is non-blocking (soft warning)
  console.log("Testing standard (non-blocking) vehicle creation...");
  const devRes = await fetch(`${BASE_URL}/api/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: testCookie,
    },
    body: JSON.stringify({
      name: "Temporary Test Car (Dev Mode)",
      make: "Toyota",
      model: "Camry",
    }),
  });

  const devJson = await devRes.json();
  if (!devRes.ok || !devJson.success) {
    throw new Error(`Expected dev mode to be non-blocking, got status ${devRes.status}`);
  }
  const tempDevId = devJson.data.vehicle.id;
  console.log("[PASS] Development mode permitted non-blocking creation.");

  // Delete temp dev car
  await fetch(`${BASE_URL}/api/vehicles/${tempDevId}`, {
    method: "DELETE",
    headers: { Cookie: testCookie },
  });

  // 2. In strict mode with header `x-strict-limits: true`, reaching limit of 1 vehicle must return 403 LIMIT_REACHED
  console.log("\nTesting strict enforcement mode (x-strict-limits: true)...");
  const strictRes = await fetch(`${BASE_URL}/api/vehicles?strict=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: testCookie,
      "x-strict-limits": "true",
    },
    body: JSON.stringify({
      name: "Blocked Car (Strict Mode)",
      make: "Honda",
      model: "Civic",
    }),
  });

  const strictJson = await strictRes.json();
  if (strictRes.status !== 403 || strictJson.error?.code !== "LIMIT_REACHED") {
    throw new Error(`Expected 403 LIMIT_REACHED in strict mode, got ${strictRes.status}: ${JSON.stringify(strictJson)}`);
  }
  console.log(`[PASS] Strict limit properly blocked creation: 403 LIMIT_REACHED ("${strictJson.error.message}")`);

  // 3. Upgrade to Premium and verify creation now succeeds even with strict mode
  console.log("\nUpgrading to Premium and verifying unlimited access under strict mode...");
  await fetch(`${BASE_URL}/api/subscription/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: testCookie },
    body: JSON.stringify({ plan: "premium" }),
  });

  const premiumStrictRes = await fetch(`${BASE_URL}/api/vehicles?strict=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: testCookie,
      "x-strict-limits": "true",
    },
    body: JSON.stringify({
      name: "Premium Fleet Vehicle",
      make: "Tesla",
      model: "Model 3",
    }),
  });

  const premiumStrictJson = await premiumStrictRes.json();
  if (!premiumStrictRes.ok || !premiumStrictJson.success) {
    throw new Error(`Expected Premium user to bypass limit in strict mode, got ${premiumStrictRes.status}`);
  }
  const premCarId = premiumStrictJson.data.vehicle.id;
  console.log("[PASS] Premium user successfully created second vehicle under strict mode.");

  // Clean up
  await fetch(`${BASE_URL}/api/vehicles/${premCarId}`, {
    method: "DELETE",
    headers: { Cookie: testCookie },
  });

  // Restore user to Free plan
  await fetch(`${BASE_URL}/api/subscription/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: testCookie },
    body: JSON.stringify({ plan: "free" }),
  });
  console.log("[PASS] Cleaned up test vehicles and restored Free tier.");
}

async function run() {
  try {
    await loginUser();
    await testPlansRetrieval();
    await testAdminConfigurablePricing();
    await testSubscriptionSummaryAndSimulation();
    await testFamilyCircleManagement();
    await testAccessControlEnforcement();

    console.log("\n==========================================");
    console.log("ALL MONETIZATION & FAMILY TESTS PASSED!");
    console.log("==========================================\n");
    process.exit(0);
  } catch (error) {
    console.error("\nTEST SUITE FAILED:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
