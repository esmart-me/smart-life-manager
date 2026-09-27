// Smart Life Manager - Verification & Compliance Test Suite

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=================================================");
  console.log("SMART LIFE MANAGER - VERIFICATION TEST SUITE");
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

  // 1. Health check & Database connection
  await test("Database Connection & Health Check (/api/health)", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    if (json.status !== "healthy") throw new Error(`Health status: ${json.status}`);
    if (!json.database?.connected) throw new Error("Database is not connected");
  });

  // 2. Unauthenticated route protection
  await test("Unauthorized Access Protection (Redirect to /login)", async () => {
    const res = await fetch(`${BASE_URL}/`, { redirect: "manual" });
    // In Next.js App Router, requireUser() triggers redirect (status 307 or 308)
    if (res.status !== 307 && res.status !== 308 && res.status !== 302) {
      throw new Error(`Expected redirect status (307/308/302), got ${res.status}`);
    }
    const location = res.headers.get("location");
    if (!location || !location.includes("/login")) {
      throw new Error(`Expected redirect to /login, got ${location}`);
    }
  });

  // 3. User Login & Session Cookie Creation
  let sessionCookie = "";
  await test("Authentication Structure - Login & Session Cookie (/api/auth/login)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "demo@smartlifemanager.local",
        password: "SmartLife2026!",
      }),
    });

    if (!res.ok) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    if (!json.success || !json.data?.user) throw new Error("Login failed");

    const rawCookies = res.headers.get("set-cookie");
    if (!rawCookies || !rawCookies.includes("slm_session")) {
      throw new Error("Missing slm_session cookie");
    }

    // Extract cookie value for subsequent authenticated calls
    sessionCookie = rawCookies.split(";")[0];
  });

  // 4. Authenticated /api/auth/me Endpoint
  await test("Session Verification (/api/auth/me)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    if (!json.success || json.data?.user?.email !== "demo@smartlifemanager.local") {
      throw new Error("Returned incorrect user session");
    }
  });

  // 5. Dashboard HTML Rendering
  await test("Dashboard Shell & Navigation Rendering (/)", async () => {
    const res = await fetch(`${BASE_URL}/`, {
      headers: { Cookie: sessionCookie },
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const html = await res.text();

    if (!html.includes("Smart Life")) throw new Error("Missing Smart Life title");
    if (!html.includes("Quick Actions")) throw new Error("Missing Quick Actions section");
    if (!html.includes("Attention Required")) throw new Error("Missing Attention Required section");
    if (!html.includes("Upcoming Schedule")) throw new Error("Missing Upcoming Schedule section");
    if (!html.includes("Mobile Navigation")) throw new Error("Missing Mobile navigation accessibility markup");
  });

  // 6. Navigation Routes Verification
  const routes = [
    { path: "/documents", text: "Documents &amp; Expiries" },
    { path: "/reminders", text: "Reminders &amp; Tasks" },
    { path: "/finance", text: "Finance &amp; Bills" },
    { path: "/more", text: "More Hub" },
    { path: "/settings", text: "Settings &amp; Preferences" },
  ];

  for (const r of routes) {
    await test(`Navigation Route (${r.path})`, async () => {
      const res = await fetch(`${BASE_URL}${r.path}`, {
        headers: { Cookie: sessionCookie },
      });
      if (!res.ok) throw new Error(`Status ${res.status} on ${r.path}`);
      const html = await res.text();
      // Look for plain or escaped text
      const cleanTarget = r.text.replace("&amp;", "&");
      if (!html.includes(r.text) && !html.includes(cleanTarget)) {
        throw new Error(`Route ${r.path} rendered without target heading: ${r.text}`);
      }
    });
  }

  // 7. Settings PUT update verification
  await test("User Settings Mutation (/api/user/settings)", async () => {
    const updateRes = await fetch(`${BASE_URL}/api/user/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        profile: {
          firstName: "Alexander",
          lastName: "Morgan",
          displayName: "Alex M.",
          currency: "USD",
          timezone: "America/New_York",
        },
        settings: {
          theme: "dark",
          reminderDaysBefore: 7,
          emailNotifications: true,
          pushNotifications: true,
        },
      }),
    });

    if (!updateRes.ok) throw new Error(`Status ${updateRes.status}`);
    const updateJson = await updateRes.json();
    if (!updateJson.success) throw new Error("Settings update failed");

    // Fetch back and assert
    const getRes = await fetch(`${BASE_URL}/api/user/settings`, {
      headers: { Cookie: sessionCookie },
    });
    const getJson = await getRes.json();
    if (getJson.data?.settings?.theme !== "dark") {
      throw new Error("Theme setting was not persisted in database");
    }
    if (getJson.data?.settings?.reminderDaysBefore !== 7) {
      throw new Error("reminderDaysBefore setting was not persisted");
    }
  });

  // 8. Logout Verification
  await test("Logout & Session Termination (/api/auth/logout)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: sessionCookie },
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const rawCookies = res.headers.get("set-cookie");
    if (!rawCookies || (!rawCookies.includes("slm_session=;") && !rawCookies.includes("Max-Age=0"))) {
      throw new Error("Logout did not invalidate session cookie");
    }
  });

  console.log("\n=================================================");
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal Test Suite Error:", err);
  process.exit(1);
});
