// scripts/verify-ai-foundation.mjs
// Comprehensive Verification Suite for Phase 11: AI Assistant Foundation
// Tests:
// 1. Zero Key Leakage (No NEXT_PUBLIC_ keys, getAiConfigStatus returns safe metadata)
// 2. Unauthenticated API rejection (401 Unauthorized across all endpoints)
// 3. Strict Tenant Isolation (User A vs User B conversation access, deletion, chat hijacking)
// 4. Grounded Context Builder (Scoping strictly to authenticated user, no password/token leaks)
// 5. Zero-Mock Policy (503 Service Unavailable when unconfigured, no fake replies)
// 6. Admin AI status card and metrics
// 7. Database integrity (Real users and relationships preserved)

import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import fs from "fs";
import path from "path";
import ts from "typescript";

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_APP_URL || "http://localhost:3000";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "smart-life-manager-production-fallback-key-2026-32chars"
);

async function createTestSessionCookie(user) {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(JWT_SECRET);

  return `slm_session=${token}`;
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function loadContextBuilder() {
  const tsCode = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/context-builder.ts"), "utf8");
  // Replace the alias import with direct prisma instance
  const modifiedCode = tsCode.replace(
    'import { prisma } from "@/lib/db/prisma";',
    'const { PrismaClient } = require("@prisma/client"); const prisma = new PrismaClient();'
  );
  const jsCode = ts.transpileModule(modifiedCode, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  const m = { exports: {} };
  const fn = new Function("module", "exports", "require", jsCode);
  fn(m, m.exports, (mod) => {
    if (mod === "@prisma/client") return { PrismaClient };
    return require(mod);
  });
  return m.exports;
}

async function runVerification() {
  console.log("================================================================================");
  console.log("SMART LIFE MANAGER - PHASE 11: AI ASSISTANT FOUNDATION VERIFICATION");
  console.log("================================================================================\n");

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Database Integrity & Existing Legitimate Users
    // -------------------------------------------------------------------------
    console.log("TEST SUITE 1: User & Database Integrity");
    const testman = await prisma.user.findUnique({
      where: { email: "testman@gmail.com" },
      include: { profile: true },
    });
    const sakeer = await prisma.user.findUnique({
      where: { email: "sakeer@gmail.com" },
      include: { profile: true },
    });
    const admin = await prisma.user.findUnique({
      where: { email: "admin@smartlifemanager.local" },
    });

    assert(!!testman, "Legitimate customer testman@gmail.com exists in database");
    assert(!!sakeer, "Legitimate customer sakeer@gmail.com exists in database");
    assert(!!admin, "Legitimate admin admin@smartlifemanager.local exists in database");

    if (!testman || !sakeer || !admin) {
      throw new Error("Required test users not found in database.");
    }

    // -------------------------------------------------------------------------
    // TEST 2: Key Security & Environment Protection
    // -------------------------------------------------------------------------
    console.log("\nTEST SUITE 2: Key Security & Environment Protection");
    const publicEnvCheck = Object.keys(process.env).filter((k) =>
      k.startsWith("NEXT_PUBLIC_") &&
      (k.includes("KEY") || k.includes("SECRET") || k.includes("GEMINI") || k.includes("AI_"))
    );
    assert(
      publicEnvCheck.length === 0,
      `No AI API keys or secrets exposed via NEXT_PUBLIC_ variables (Checked: ${publicEnvCheck.join(", ") || "None"})`
    );

    // Verify safe status retrieval
    const testmanCookie = await createTestSessionCookie(testman);
    const authStatus = await fetch(`${BASE_URL}/api/ai/status`, {
      headers: { Cookie: testmanCookie },
    });
    assert(authStatus.status === 200, "GET /api/ai/status succeeded for authenticated customer (200 OK)");
    const authStatusData = await authStatus.json();
    assert(authStatusData.success === true, "GET /api/ai/status response JSON has success: true");
    assert(
      !("apiKey" in authStatusData.data) && !("key" in authStatusData.data),
      "GET /api/ai/status strictly omits API key from JSON response"
    );
    assert(
      authStatusData.data.provider === "Google Gemini",
      `AI Provider is Google Gemini (Got: ${authStatusData.data.provider})`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Context Isolation Layer (Direct Module Testing)
    // -------------------------------------------------------------------------
    console.log("\nTEST SUITE 3: Context Builder & Tenant Isolation");
    const contextBuilder = await loadContextBuilder();
    const detectRelevantModules = contextBuilder.detectRelevantModules;
    const buildCustomerContext = contextBuilder.buildCustomerContext;

    // Test query relevance detection
    const vehicleMod = detectRelevantModules("How is my car doing?");
    assert(
      vehicleMod.includeVehicles === true,
      "detectRelevantModules correctly flags includeVehicles for car/vehicle query"
    );
    const financeMod = detectRelevantModules("What bills are due this month?");
    assert(
      financeMod.includeFinance === true,
      "detectRelevantModules correctly flags includeFinance for bills/payments query"
    );

    // Ensure testman has a test vehicle and sakeer has a different test vehicle to verify isolation
    let testmanVehicle = await prisma.vehicle.findFirst({ where: { userId: testman.id } });
    if (!testmanVehicle) {
      testmanVehicle = await prisma.vehicle.create({
        data: {
          userId: testman.id,
          name: "Testman Sedan",
          make: "Toyota",
          model: "Camry",
          year: 2022,
          licensePlate: "TM-7777",
        },
      });
    }

    let sakeerVehicle = await prisma.vehicle.findFirst({ where: { userId: sakeer.id } });
    if (!sakeerVehicle) {
      sakeerVehicle = await prisma.vehicle.create({
        data: {
          userId: sakeer.id,
          name: "Sakeer SUV",
          make: "Honda",
          model: "CR-V",
          year: 2024,
          licensePlate: "SK-9999",
        },
      });
    }

    const testmanContext = await buildCustomerContext(testman.id, "my vehicles");
    assert(
      testmanContext.includes("Testman Sedan") || testmanContext.includes("Camry") || testmanContext.includes("TM-7777"),
      "Testman context contains Testman's vehicle"
    );
    assert(
      !testmanContext.includes("Sakeer SUV") && !testmanContext.includes("SK-9999"),
      "Testman context STRICTLY EXCLUDES Sakeer's vehicle"
    );
    assert(
      !testmanContext.includes("$2a$") && !testmanContext.includes("passwordHash"),
      "Context contains zero password hashes or bcrypt tokens"
    );

    const sakeerContext = await buildCustomerContext(sakeer.id, "my vehicles");
    assert(
      sakeerContext.includes("Sakeer SUV") || sakeerContext.includes("CR-V") || sakeerContext.includes("SK-9999"),
      "Sakeer context contains Sakeer's vehicle"
    );
    assert(
      !sakeerContext.includes("Testman Sedan") && !sakeerContext.includes("TM-7777"),
      "Sakeer context STRICTLY EXCLUDES Testman's vehicle"
    );

    // -------------------------------------------------------------------------
    // TEST 4: Live HTTP Endpoint & Cross-Tenant Security
    // -------------------------------------------------------------------------
    console.log("\nTEST SUITE 4: Live HTTP Endpoints & Cross-Tenant Security");
    const sakeerCookie = await createTestSessionCookie(sakeer);

    // 4.1: Unauthenticated rejection (401)
    const unauthStatus = await fetch(`${BASE_URL}/api/ai/status`);
    assert(unauthStatus.status === 401, "GET /api/ai/status rejected unauthenticated request with 401");

    const unauthChat = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });
    assert(unauthChat.status === 401, "POST /api/ai/chat rejected unauthenticated request with 401");

    const unauthConvs = await fetch(`${BASE_URL}/api/ai/conversations`);
    assert(unauthConvs.status === 401, "GET /api/ai/conversations rejected unauthenticated request with 401");

    // 4.2: Testman creates a conversation
    const createConvRes = await fetch(`${BASE_URL}/api/ai/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: testmanCookie,
      },
      body: JSON.stringify({ title: "[TEST] Private Testman Thread" }),
    });
    assert(createConvRes.status === 200, "Testman created private conversation via API (200 OK)");
    const createConvJson = await createConvRes.json();
    const testmanConvId = createConvJson.data?.id;
    assert(!!testmanConvId, `Conversation created with ID: ${testmanConvId}`);

    // 4.3: Testman can fetch their own conversation
    const testmanGetRes = await fetch(`${BASE_URL}/api/ai/conversations/${testmanConvId}`, {
      headers: { Cookie: testmanCookie },
    });
    assert(testmanGetRes.status === 200, "Testman can access their own conversation (200 OK)");

    // 4.4: Cross-tenant read protection: Sakeer tries to fetch Testman's conversation
    const sakeerGetRes = await fetch(`${BASE_URL}/api/ai/conversations/${testmanConvId}`, {
      headers: { Cookie: sakeerCookie },
    });
    assert(
      sakeerGetRes.status === 404,
      "Sakeer CANNOT access Testman's conversation (Received 404 Not Found)"
    );

    // 4.5: Cross-tenant delete protection: Sakeer tries to delete Testman's conversation
    const sakeerDeleteRes = await fetch(`${BASE_URL}/api/ai/conversations/${testmanConvId}`, {
      method: "DELETE",
      headers: { Cookie: sakeerCookie },
    });
    assert(
      sakeerDeleteRes.status === 404,
      "Sakeer CANNOT delete Testman's conversation (Received 404 Not Found)"
    );

    // 4.6: Cross-tenant hijacking protection: Sakeer tries to send a message into Testman's conversation
    const sakeerHijackRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sakeerCookie,
      },
      body: JSON.stringify({
        message: "Hijacking attempt",
        conversationId: testmanConvId,
      }),
    });
    assert(
      sakeerHijackRes.status === 404,
      "Sakeer CANNOT hijack or send message into Testman's conversation (Received 404 Not Found)"
    );

    // 4.7: Testman cleans up their conversation
    const testmanDeleteRes = await fetch(`${BASE_URL}/api/ai/conversations/${testmanConvId}`, {
      method: "DELETE",
      headers: { Cookie: testmanCookie },
    });
    assert(testmanDeleteRes.status === 200, "Testman can delete their own conversation (200 OK)");

    // -------------------------------------------------------------------------
    // TEST 5: Zero-Mock Policy & Graceful Unconfigured Handling
    // -------------------------------------------------------------------------
    console.log("\nTEST SUITE 5: Zero-Mock Policy & Unconfigured Handling");
    const chatRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: testmanCookie,
      },
      body: JSON.stringify({ message: "What are my upcoming bills?" }),
    });

    if (authStatusData.data.configured) {
      console.log("  [INFO] GEMINI_API_KEY is configured. AI responded.");
      assert(chatRes.status === 200, "POST /api/ai/chat succeeded with configured AI key (200 OK)");
    } else {
      assert(
        chatRes.status === 503,
        "POST /api/ai/chat returns HTTP 503 Service Unavailable when GEMINI_API_KEY is unconfigured (Zero-Mock Enforced)"
      );
      const chatJson = await chatRes.json();
      assert(
        chatJson.error?.code === "AI_NOT_CONFIGURED",
        `Clean error code returned: ${chatJson.error?.code}`
      );
      assert(
        !chatJson.data?.reply,
        "Zero-Mock Enforced: No hardcoded or fake response returned to customer"
      );
    }

    // -------------------------------------------------------------------------
    // TEST 6: Admin Portal & System Telemetry
    // -------------------------------------------------------------------------
    console.log("\nTEST SUITE 6: Admin Portal & AI Telemetry");
    const adminCookie = await createTestSessionCookie(admin);
    const adminRes = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: adminCookie },
    });
    assert(adminRes.status === 200, "Admin can access Admin Dashboard (200 OK)");
    const adminHtml = await adminRes.text();
    assert(
      adminHtml.includes("AI Assistant Architecture"),
      "Admin Dashboard contains AI Assistant Architecture status section"
    );
    assert(
      adminHtml.includes("Google Gemini"),
      "Admin Dashboard displays AI Provider: Google Gemini"
    );
    assert(
      !adminHtml.includes("AIzaSy") && !adminHtml.includes("gemini_key_"),
      "Admin Dashboard strictly conceals API key credentials"
    );

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log("\n================================================================================");
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Verification suite encountered an unhandled exception:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
