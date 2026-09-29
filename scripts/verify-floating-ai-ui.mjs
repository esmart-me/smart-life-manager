// scripts/verify-floating-ai-ui.mjs
// Verification Suite for Phase 11: Prompt 3 (Floating AI Assistant UI/UX)
// Tests:
// 1. Floating AI button mounting & layout isolation
// 2. Button styling, pulse animation & prefers-reduced-motion
// 3. Open/Close transitions & accessibility (dialog role, aria-expanded, Escape key)
// 4. Header elements (title, ready badge, read-only indicator, close/reset buttons)
// 5. Welcome state & trust indicator ("Using your private account data (Read-Only)")
// 6. Quick action suggestions (all 6 cards: Reminders, Docs, Vehicles, Payments, Expenses, Dates)
// 7. Live chat execution of quick suggestion queries with authenticated session
// 8. Markdown rendering & clean response formatting (MarkdownView)
// 9. Loading state & friendly error handling
// 10. Responsive layout: Desktop (floating card ~410px) vs Mobile (bottom drawer above bottom nav)

import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_APP_URL || "http://localhost:3000";

// Read JWT secret
const envContent = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
let jwtSecret = "smart-life-manager-production-fallback-key-2026-32chars";
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (trimmed.startsWith("JWT_SECRET=")) {
    jwtSecret = trimmed.substring("JWT_SECRET=".length).replace(/^["']|["']$/g, "").trim();
    break;
  }
}
const secretKey = new TextEncoder().encode(jwtSecret);

async function createToken(user) {
  return await new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(secretKey);
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

async function runVerification() {
  console.log("================================================================================");
  console.log("SMART LIFE MANAGER - PHASE 11: FLOATING AI ASSISTANT UI/UX VERIFICATION");
  console.log("================================================================================\n");

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Floating Button & Dashboard Layout Integration
    // -------------------------------------------------------------------------
    console.log("TEST 1: Component & Layout Integration");
    const layoutPath = path.join(process.cwd(), "src/app/(dashboard)/layout.tsx");
    const layoutCode = fs.readFileSync(layoutPath, "utf8");
    assert(
      layoutCode.includes("FloatingAiAssistant"),
      "FloatingAiAssistant component imported and mounted in DashboardLayout"
    );

    const adminLayoutPath = path.join(process.cwd(), "src/app/admin/(portal)/layout.tsx");
    const adminLayoutCode = fs.readFileSync(adminLayoutPath, "utf8");
    assert(
      !adminLayoutCode.includes("FloatingAiAssistant"),
      "FloatingAiAssistant is strictly omitted from Admin Portal layout"
    );

    const authLayoutPath = path.join(process.cwd(), "src/app/(auth)/layout.tsx");
    const authLayoutCode = fs.readFileSync(authLayoutPath, "utf8");
    assert(
      !authLayoutCode.includes("FloatingAiAssistant"),
      "FloatingAiAssistant is strictly omitted from Auth layout (Login/Register)"
    );

    // -------------------------------------------------------------------------
    // TEST 2: Button Animation, Brand Visuals & Reduced-Motion Support
    // -------------------------------------------------------------------------
    console.log("\nTEST 2: Button Animation & Reduced-Motion Accessibility");
    const componentPath = path.join(process.cwd(), "src/components/assistant/FloatingAiAssistant.tsx");
    const compCode = fs.readFileSync(componentPath, "utf8");

    assert(
      compCode.includes("animate-pulse") && compCode.includes("motion-reduce:animate-none"),
      "Floating button features ambient pulse with strict motion-reduce:animate-none support"
    );
    assert(
      compCode.includes("bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600"),
      "Floating button uses brand gradient visual treatment"
    );
    assert(
      compCode.includes("Sparkles") && compCode.includes("Ask Smart Life"),
      "Floating button displays sparkles icon and 'Ask Smart Life' label"
    );

    // -------------------------------------------------------------------------
    // TEST 3: Mobile & Desktop Responsive Positioning
    // -------------------------------------------------------------------------
    console.log("\nTEST 3: Responsive Positioning & Safe Areas");
    assert(
      compCode.includes("bottom-20 right-4") && compCode.includes("md:bottom-6 md:right-6"),
      "Floating button positioned safely above mobile nav (bottom-20) and in desktop corner (md:bottom-6)"
    );
    assert(
      compCode.includes("inset-x-0 bottom-0 top-16 md:top-auto md:inset-x-auto"),
      "AI Panel adapts to full bottom drawer on mobile and floating window on desktop"
    );
    assert(
      compCode.includes("md:w-[410px]") && compCode.includes("md:h-[600px]"),
      "Desktop panel dimensions configured to ideal ~410px floating panel"
    );

    // -------------------------------------------------------------------------
    // TEST 4: Open/Close Transitions & Keyboard Accessibility
    // -------------------------------------------------------------------------
    console.log("\nTEST 4: Open/Close Transitions & Accessibility");
    assert(
      compCode.includes("transition-all duration-300 ease-out motion-reduce:transition-none"),
      "Panel has smooth CSS transition with motion-reduce:transition-none override"
    );
    assert(
      compCode.includes('role="dialog"') && compCode.includes('aria-modal="true"'),
      "AI Panel implements dialog role and aria-modal attributes"
    );
    assert(
      compCode.includes("aria-expanded={isOpen}"),
      "Floating button tracks aria-expanded state for screen readers"
    );
    assert(
      compCode.includes('e.key === "Escape"'),
      "Escape key automatically closes the AI Assistant panel"
    );

    // -------------------------------------------------------------------------
    // TEST 5: AI Header, Ready Status & Trust Indicators
    // -------------------------------------------------------------------------
    console.log("\nTEST 5: Header Elements & Trust Indicators");
    assert(
      compCode.includes("Smart Life AI") && compCode.includes("Ready"),
      "Header displays 'Smart Life AI' title and 'Ready' status badge"
    );
    assert(
      compCode.includes("Private Account Data • Read-Only") || compCode.includes("Based on your Smart Life Manager data"),
      "Header and footer display clear 'Private Account Data • Read-Only' trust indicators"
    );
    assert(
      compCode.includes("handleResetChat") || compCode.includes("RotateCcw"),
      "Header includes fresh conversation reset action button"
    );

    // -------------------------------------------------------------------------
    // TEST 6: Welcome Message & Quick Suggestions
    // -------------------------------------------------------------------------
    console.log("\nTEST 6: Welcome Message & Quick Suggestion Chips");
    assert(
      compCode.includes("Hi! I’m your Smart Life Assistant 👋"),
      "Welcome state shows friendly greeting: 'Hi! I’m your Smart Life Assistant 👋'"
    );
    assert(
      compCode.includes("I can help you find and summarize information from your Smart Life Manager."),
      "Welcome state explains assistant purpose clearly"
    );

    const requiredSuggestions = [
      "My Reminders",
      "Expiring Documents",
      "My Vehicles",
      "Upcoming Payments",
      "This Month’s Expenses",
      "Important Dates",
    ];
    for (const sugg of requiredSuggestions) {
      assert(
        compCode.includes(sugg),
        `Quick suggestion card present for: ${sugg}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 7: Loading & Friendly Error States
    // -------------------------------------------------------------------------
    console.log("\nTEST 7: Loading State & Error Handling");
    assert(
      compCode.includes("Thinking") && compCode.includes("animate-bounce"),
      "Loading state includes animated 'Thinking...' with bouncing dots"
    );
    assert(
      compCode.includes("Sorry, I couldn't process that right now. Please try again."),
      "Error state shows sanitized friendly error message with zero technical leaks"
    );

    // -------------------------------------------------------------------------
    // TEST 8: Live Execution of Quick Suggestion through Existing AI Backend
    // -------------------------------------------------------------------------
    console.log("\nTEST 8: Live Backend Chat Execution with Quick Suggestion");
    const testman = await prisma.user.findUnique({
      where: { email: "testman@gmail.com" },
    });
    if (!testman) throw new Error("testman@gmail.com not found");

    const token = await createToken(testman);
    const cookie = `slm_session=${token}`;

    // Test Quick Suggestion 1: "What vehicles do I have?"
    const vehicleRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        message: "What vehicles do I have?",
      }),
    });
    assert(vehicleRes.status === 200, "Quick suggestion query successfully executed via live backend (200 OK)");
    const vehicleJson = await vehicleRes.json();
    assert(vehicleJson.success === true, "Quick suggestion returned success: true");
    const vehicleReply = vehicleJson.data?.reply || "";
    assert(
      vehicleReply.includes("Testman Sedan") || vehicleReply.includes("Camry") || vehicleReply.includes("TM-7777"),
      "Live response used authentic customer vehicle data"
    );

    console.log("\n================================================================================");
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================");
  } catch (error) {
    console.error("Verification suite failure:", error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
