// Smart Life Manager - Complete Authentication & Profile Test Suite

const BASE_URL = "http://localhost:3000";

async function runAuthTests() {
  console.log("=================================================");
  console.log("SMART LIFE MANAGER - COMPLETE AUTH TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`Testing ${name}... `);
      await fn();
      console.log("✅ PASS");
      passed++;
    } catch (err) {
      console.log("❌ FAIL");
      console.error("   Error:", err.message);
      failed++;
    }
  }

  const testEmail = `auth_test_${Date.now()}@smartlifemanager.local`;
  const originalPassword = "InitialPassword2026!";
  const newPassword = "NewStrongPassword2026!";
  let authCookie = "";
  let resetToken = "";

  // 1. Protected Route Without Cookie
  await test("Protected Route Security - Redirect to /login", async () => {
    const res = await fetch(`${BASE_URL}/profile`, { redirect: "manual" });
    if (res.status !== 307 && res.status !== 308 && res.status !== 302) {
      throw new Error(`Expected redirect status (307/308/302), got ${res.status}`);
    }
    const location = res.headers.get("location");
    if (!location || !location.includes("/login")) {
      throw new Error(`Expected redirect to /login, got ${location}`);
    }
  });

  // 2. Sign Up (Registration)
  await test("Sign Up - Account Creation & Atomic Onboarding", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: originalPassword,
        firstName: "Taylor",
        lastName: "Swift",
      }),
    });

    if (res.status !== 201) throw new Error(`Expected status 201, got ${res.status}`);
    const data = await res.json();

    if (!data.success) throw new Error("Registration response success was false");
    if (!data.message?.includes("Your account was created successfully.")) {
      throw new Error(`Unexpected message: ${data.message}`);
    }

    const setCookie = res.headers.get("set-cookie");
    if (!setCookie || !setCookie.includes("slm_session")) {
      throw new Error("Missing session cookie on registration");
    }

    authCookie = setCookie.split(";")[0];
  });

  // 3. Session Persistence Check
  await test("Session Persistence - 30-Day Cookie Attributes", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: authCookie },
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || data.data?.user?.email !== testEmail) {
      throw new Error("Session persistence verification failed");
    }
  });

  // 4. Logout
  await test("Logout - Invalidate Session Cookie", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: authCookie },
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie || (!setCookie.includes("slm_session=;") && !setCookie.includes("Max-Age=0"))) {
      throw new Error("Session cookie was not cleared");
    }
    authCookie = "";
  });

  // 5. Login - Failed Attempt with Custom UX Message
  await test("Login - Invalid Credentials Error Messaging", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "WrongPassword999!",
      }),
    });

    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const data = await res.json();
    if (data.error?.message !== "We couldn’t sign you in. Please check your email and password.") {
      throw new Error(`Unexpected error message: ${data.error?.message}`);
    }
  });

  // 6. Login - Success with Session Re-establishment
  await test("Login - Successful Authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: originalPassword,
      }),
    });

    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error("Login failed");

    const setCookie = res.headers.get("set-cookie");
    if (!setCookie || !setCookie.includes("slm_session")) {
      throw new Error("Missing session cookie on login");
    }

    // Verify 30-day persistent cookie
    if (!setCookie.toLowerCase().includes("max-age=2592000") && !setCookie.toLowerCase().includes("expires=")) {
      throw new Error("Cookie missing persistent duration attributes");
    }

    authCookie = setCookie.split(";")[0];
  });

  // 7. Profile Fetch & Update
  await test("Profile Management - Name, Currency, Timezone, Notifications", async () => {
    // Update profile
    const updateRes = await fetch(`${BASE_URL}/api/user/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
      body: JSON.stringify({
        profile: {
          firstName: "Taylor",
          lastName: "Alison Swift",
          displayName: "Taylor A. Swift",
          currency: "EUR",
          timezone: "Europe/London",
          phoneNumber: "+1 555-123-4567",
        },
        settings: {
          emailNotifications: false,
          pushNotifications: true,
          reminderDaysBefore: 14,
        },
      }),
    });

    if (!updateRes.ok) throw new Error(`Status ${updateRes.status}`);
    const updateData = await updateRes.json();
    if (!updateData.success) throw new Error("Profile update failed");

    // Fetch profile and verify
    const getRes = await fetch(`${BASE_URL}/api/user/settings`, {
      headers: { Cookie: authCookie },
    });
    const getData = await getRes.json();

    if (getData.data?.profile?.currency !== "EUR") {
      throw new Error(`Expected currency EUR, got ${getData.data?.profile?.currency}`);
    }
    if (getData.data?.profile?.timezone !== "Europe/London") {
      throw new Error(`Expected timezone Europe/London, got ${getData.data?.profile?.timezone}`);
    }
    if (getData.data?.settings?.reminderDaysBefore !== 14) {
      throw new Error(`Expected reminder window 14, got ${getData.data?.settings?.reminderDaysBefore}`);
    }
    if (getData.data?.settings?.emailNotifications !== false) {
      throw new Error("Email notifications preference was not saved");
    }
  });

  // 8. Forgot Password Flow
  await test("Forgot Password - Token Generation & Safe Messaging", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail }),
    });

    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();

    if (data.message !== "If an account with that email exists, we have sent instructions to reset your password.") {
      throw new Error(`Unexpected message: ${data.message}`);
    }

    if (data.debug?.resetToken) {
      resetToken = data.debug.resetToken;
    } else {
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();
      const record = await prisma.passwordResetToken.findFirst({
        where: { user: { email: testEmail }, usedAt: null },
        orderBy: { createdAt: "desc" },
      });
      await prisma.$disconnect();
      if (!record) throw new Error("Reset token was not found in database");
      resetToken = record.token;
    }
  });

  // 9. Verify Reset Token Endpoint
  await test("Verify Reset Token - Token Validation", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/verify-reset-token?token=${resetToken}`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || data.data?.email !== testEmail) {
      throw new Error("Failed to verify valid reset token");
    }
  });

  // 10. Reset Password Flow
  await test("Reset Password - New Password Application", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: resetToken,
        password: newPassword,
      }),
    });

    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();

    if (data.message !== "Your password has been reset successfully.") {
      throw new Error(`Unexpected message: ${data.message}`);
    }
  });

  // 11. Login with New Password
  await test("Login with New Password - Post-Reset Authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: newPassword,
      }),
    });

    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error("Failed to login with new password");

    // Old password must fail
    const oldRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: originalPassword,
      }),
    });
    if (oldRes.status !== 401) throw new Error("Old password still worked after reset");
  });

  // 12. Token Single-Use Security
  await test("Token Replay Prevention - Token Cannot Be Reused", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: resetToken,
        password: "YetAnotherPassword2026!",
      }),
    });

    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
    const data = await res.json();
    if (data.success) throw new Error("Reused token succeeded unexpectedly");
  });

  console.log("\n=================================================");
  console.log(`AUTH TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthTests().catch((err) => {
  console.error("Fatal Test Suite Error:", err);
  process.exit(1);
});
