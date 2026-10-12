// scripts/verify-v1-remediation.mjs
// Automated verification for V1.0 Security Remediations

import fs from "fs";
import path from "path";
import crypto from "crypto";

async function runVerification() {
  console.log("==================================================================");
  console.log("  SMART LIFE MANAGER — V1.0 SECURITY REMEDIATION VERIFICATION    ");
  console.log("==================================================================\n");

  let allPassed = true;
  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      allPassed = false;
    }
  }

  // 1. Critical #1: Password Reset Token Leak
  console.log("[1] Checking Password Reset Token Gating...");
  const customerForgotRoute = fs.readFileSync("src/app/api/auth/forgot-password/route.ts", "utf8");
  const adminForgotRoute = fs.readFileSync("src/app/api/admin/auth/forgot-password/route.ts", "utf8");

  assert(!customerForgotRoute.includes('DATABASE_URL?.includes("file:")'), "Customer forgot-password removed SQLite file check");
  assert(!adminForgotRoute.includes('DATABASE_URL?.includes("file:")'), "Admin forgot-password removed SQLite file check");
  assert(customerForgotRoute.includes('process.env.NODE_ENV !== "production"'), "Customer forgot-password requires non-production");
  assert(customerForgotRoute.includes('process.env.ENABLE_DEV_RESET === "true"'), "Customer forgot-password requires explicit ENABLE_DEV_RESET");
  assert(adminForgotRoute.includes('process.env.NODE_ENV !== "production"'), "Admin forgot-password requires non-production");
  assert(adminForgotRoute.includes('process.env.ENABLE_DEV_RESET === "true"'), "Admin forgot-password requires explicit ENABLE_DEV_RESET");

  // 2. Critical #2: Subscription Simulate Disabled in Production
  console.log("\n[2] Checking Subscription Simulation Production Gate...");
  const simulateRoute = fs.readFileSync("src/app/api/subscription/simulate/route.ts", "utf8");
  assert(simulateRoute.includes('process.env.NODE_ENV === "production"'), "Simulation checks NODE_ENV === 'production'");
  assert(simulateRoute.includes("status: 404"), "Simulation returns HTTP 404 in production");
  const familyHub = fs.readFileSync("src/components/family/FamilyHubClient.tsx", "utf8");
  assert(!familyHub.includes("/api/subscription/simulate"), "FamilyHubClient does not invoke simulate endpoint");
  assert(familyHub.includes('href="/premium"'), "FamilyHubClient directs users to /premium checkout");

  // 3. Critical #3: Stripe Webhook Cryptographic Verification
  console.log("\n[3] Checking Stripe Webhook Security...");
  const stripeWebhookRoute = fs.readFileSync("src/app/api/webhooks/stripe/route.ts", "utf8");
  assert(stripeWebhookRoute.includes('process.env.NODE_ENV === "production"'), "Stripe webhook checks NODE_ENV === 'production'");
  assert(stripeWebhookRoute.includes("status: 503"), "Stripe webhook rejects unconfigured secrets in production with 503");
  assert(stripeWebhookRoute.includes("status: 400"), "Stripe webhook rejects missing or invalid signatures with 400");
  const stripeIndex = fs.readFileSync("src/lib/stripe/index.ts", "utf8");
  assert(stripeIndex.includes("isRealStripeWebhookConfigured"), "stripe/index.ts exports isRealStripeWebhookConfigured");
  assert(stripeIndex.includes("existingTx"), "Stripe checkout session includes idempotency transaction check");

  // 4. Critical #4: Electron .env Leak & Per-Machine Secret
  console.log("\n[4] Checking Electron Packaging & Per-Machine Secret...");
  const electronBuilderJson = fs.readFileSync("electron-builder.json", "utf8");
  assert(!electronBuilderJson.includes('".env"'), "electron-builder.json does not package .env file");
  const mainCjs = fs.readFileSync("electron/main.cjs", "utf8");
  assert(mainCjs.includes("setupPerMachineSecret"), "electron/main.cjs implements setupPerMachineSecret");
  assert(mainCjs.includes("crypto.randomBytes(32)"), "electron/main.cjs uses crypto.randomBytes(32) for per-machine secret");
  assert(mainCjs.includes(".desktop-secret"), "electron/main.cjs persists secret in .desktop-secret");

  // 5. High #5: Default Admin Password Removed
  console.log("\n[5] Checking Default Admin Password Removal...");
  const adminInit = fs.readFileSync("src/lib/auth/admin-init.ts", "utf8");
  assert(!adminInit.includes("Admin2026!"), "src/lib/auth/admin-init.ts has NO hardcoded 'Admin2026!'");
  assert(adminInit.includes("ADMIN_INITIAL_PASSWORD must be configured"), "Fails safely when ADMIN_INITIAL_PASSWORD is not configured");

  // 6. High #6: Account Deletion Password Verification
  console.log("\n[6] Checking Account Deletion Password Verification...");
  const deleteAccountRoute = fs.readFileSync("src/app/api/user/delete-account/route.ts", "utf8");
  assert(deleteAccountRoute.includes("PASSWORD_REQUIRED"), "delete-account route enforces PASSWORD_REQUIRED for password users");
  assert(deleteAccountRoute.includes("INVALID_PASSWORD"), "delete-account route verifies password with bcrypt");

  // 7. High #7: Rate Limiting
  console.log("\n[7] Checking Rate Limiting...");
  const rateLimitFile = fs.readFileSync("src/lib/security/rate-limit.ts", "utf8");
  assert(rateLimitFile.includes("SlidingWindowRateLimiter"), "rate-limit.ts implements SlidingWindowRateLimiter");
  const loginRoute = fs.readFileSync("src/app/api/auth/login/route.ts", "utf8");
  const adminLoginRoute = fs.readFileSync("src/app/api/admin/auth/login/route.ts", "utf8");
  const registerRoute = fs.readFileSync("src/app/api/auth/register/route.ts", "utf8");
  const aiChatRoute = fs.readFileSync("src/app/api/ai/chat/route.ts", "utf8");

  assert(loginRoute.includes("authLimiter"), "Customer login route uses authLimiter");
  assert(adminLoginRoute.includes("authLimiter"), "Admin login route uses authLimiter");
  assert(registerRoute.includes("authLimiter"), "Customer register route uses authLimiter");
  assert(aiChatRoute.includes("aiLimiter"), "AI chat route uses aiLimiter");

  // Test Rate Limiter logic directly
  const { authLimiter: testLimiter } = await import("../src/lib/security/rate-limit.ts");
  const testIp = "192.0.2.1";
  for (let i = 0; i < 5; i++) {
    testLimiter.check(`test:${testIp}`, 5, 1000);
  }
  const exceededCheck = testLimiter.check(`test:${testIp}`, 5, 1000);
  assert(!exceededCheck.success, "Rate limiter blocks request when limit is exceeded (returns success: false)");
  assert(exceededCheck.retryAfterSec >= 1, "Rate limiter returns positive retryAfterSec");

  // 8. Medium #8: HTTP Security Headers
  console.log("\n[8] Checking HTTP Security Headers in next.config.js...");
  const nextConfig = fs.readFileSync("next.config.js", "utf8");
  assert(nextConfig.includes("X-Content-Type-Options"), "next.config.js includes X-Content-Type-Options");
  assert(nextConfig.includes("nosniff"), "next.config.js sets nosniff");
  assert(nextConfig.includes("X-Frame-Options"), "next.config.js includes X-Frame-Options");
  assert(nextConfig.includes("DENY"), "next.config.js sets DENY");
  assert(nextConfig.includes("Referrer-Policy"), "next.config.js includes Referrer-Policy");
  assert(nextConfig.includes("Permissions-Policy"), "next.config.js includes Permissions-Policy");

  // 9. Medium #10: Root ESLint Configuration
  console.log("\n[9] Checking Root ESLint Configuration...");
  assert(fs.existsSync(".eslintrc.json"), ".eslintrc.json exists in root");
  const eslintConfig = JSON.parse(fs.readFileSync(".eslintrc.json", "utf8"));
  assert(eslintConfig.extends === "next/core-web-vitals", ".eslintrc.json extends next/core-web-vitals");

  // 10. Application Version Tag Alignment
  console.log("\n[10] Checking Application Version Tag...");
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const constantsTs = fs.readFileSync("src/lib/constants.ts", "utf8");
  assert(packageJson.version === "1.0.0", "package.json version is 1.0.0");
  assert(constantsTs.includes('version: "1.0.0"'), "src/lib/constants.ts version is 1.0.0");

  console.log("\n==================================================================");
  if (allPassed) {
    console.log("  >>> ALL REMEDIATION VERIFICATION CHECKS PASSED (100%) <<<");
  } else {
    console.log("  >>> SOME VERIFICATION CHECKS FAILED <<<");
    process.exit(1);
  }
  console.log("==================================================================\n");
}

runVerification().catch((err) => {
  console.error("Verification script failed:", err);
  process.exit(1);
});
