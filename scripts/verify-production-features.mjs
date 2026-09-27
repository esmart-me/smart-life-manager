// End-to-end verification script for Smart Life Manager production upgrade
import assert from "node:assert";

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== STARTING SMART LIFE MANAGER PRODUCTION FEATURES VERIFICATION ===");
  let passed = 0;
  let failed = 0;

  function report(name, success, info = "") {
    if (success) {
      console.log(`[PASS] ${name} ${info}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} ${info}`);
      failed++;
    }
  }

  // TEST 1: Regional Plans API (India, UAE, US, UK, etc.)
  try {
    const resIN = await fetch(`${BASE_URL}/api/plans?region=IN`);
    const dataIN = await resIN.json();
    assert(resIN.ok, "Plans API for IN should return 200");
    assert.strictEqual(dataIN.data.selectedRegion.countryCode, "IN", "Region should be IN");
    assert.strictEqual(dataIN.data.selectedRegion.currencyCode, "INR", "Currency should be INR");
    const proIN = dataIN.data.plans.find((p) => p.plan === "premium");
    assert(proIN.monthlyPrice > 0, "Pro monthly price should exist in INR");
    report("1. Regional Pricing (India - INR ₹)", true, `Pro: ₹${proIN.monthlyPrice}/mo`);

    const resAE = await fetch(`${BASE_URL}/api/plans?region=AE`);
    const dataAE = await resAE.json();
    assert.strictEqual(dataAE.data.selectedRegion.countryCode, "AE");
    assert.strictEqual(dataAE.data.selectedRegion.currencyCode, "AED");
    const proAE = dataAE.data.plans.find((p) => p.plan === "premium");
    report("2. Regional Pricing (UAE - AED)", true, `Pro: AED ${proAE.monthlyPrice}/mo`);

    const resUS = await fetch(`${BASE_URL}/api/plans?region=US`);
    const dataUS = await resUS.json();
    assert.strictEqual(dataUS.data.selectedRegion.countryCode, "US");
    assert.strictEqual(dataUS.data.selectedRegion.currencyCode, "USD");
    const proUS = dataUS.data.plans.find((p) => p.plan === "premium");
    report("3. Regional Pricing (USA - USD $)", true, `Pro: $${proUS.monthlyPrice}/mo`);
  } catch (err) {
    report("Regional Pricing API", false, err.message);
  }

  // TEST 2: Customer Login vs Admin Portal Rejection
  let customerCookie = "";
  const testCustomerEmail = `customer_${Date.now()}@test.local`;
  const testPassword = "CustomerSecurePass123!";

  try {
    // Register temporary customer
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testCustomerEmail,
        password: testPassword,
        firstName: "Test",
        lastName: "Customer",
      }),
    });
    const regData = await regRes.json();
    assert(regRes.ok, "Customer registration should succeed");
    const rawCookie = regRes.headers.get("set-cookie") || "";
    customerCookie = rawCookie.split(";")[0];
    report("4. Customer Registration", true, `Email: ${testCustomerEmail}`);

    // Try logging in customer to admin portal endpoint
    const adminLoginAttempt = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testCustomerEmail,
        password: testPassword,
      }),
    });
    assert.strictEqual(adminLoginAttempt.status, 403, "Customer should be rejected with 403 at /api/admin/auth/login");
    report("5. Admin Portal blocks customer credentials", true, "HTTP 403 Forbidden verified");

    // Try accessing admin API with customer cookie
    const adminApiAttempt = await fetch(`${BASE_URL}/api/admin/plans/regional`, {
      headers: { Cookie: customerCookie },
    });
    assert.strictEqual(adminApiAttempt.status, 403, "Customer cookie accessing admin API should be rejected with 403");
    report("6. Admin API protected from customer sessions", true, "HTTP 403 Forbidden verified");
  } catch (err) {
    report("Customer vs Admin Access Control", false, err.message);
  }

  // TEST 3: Admin Login & Portal Access
  let adminCookie = "";
  try {
    const adminLoginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@smartlifemanager.local",
        password: "Admin2026!",
      }),
    });
    assert(adminLoginRes.ok, "Admin login should return 200 OK");
    const adminData = await adminLoginRes.json();
    assert.strictEqual(adminData.data.user.role, "super_admin", "Admin role should be super_admin");
    const rawAdminCookie = adminLoginRes.headers.get("set-cookie") || "";
    adminCookie = rawAdminCookie.split(";")[0];
    report("7. Admin Authentication (admin@smartlifemanager.local)", true, `Role: ${adminData.data.user.role}`);

    // Admin Dashboard Page
    const dashRes = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: adminCookie },
      redirect: "manual",
    });
    assert.strictEqual(dashRes.status, 200, "Admin dashboard should return 200 for authenticated admin");
    report("8. Admin Portal Dashboard Route (/admin)", true, "HTTP 200 OK");

    // Admin Customers Page
    const custRes = await fetch(`${BASE_URL}/admin/customers`, {
      headers: { Cookie: adminCookie },
      redirect: "manual",
    });
    assert.strictEqual(custRes.status, 200, "Admin customers route should return 200");
    report("9. Admin Customers Directory Route (/admin/customers)", true, "HTTP 200 OK");

    // Admin Subscriptions Page
    const subRes = await fetch(`${BASE_URL}/admin/subscriptions`, {
      headers: { Cookie: adminCookie },
      redirect: "manual",
    });
    assert.strictEqual(subRes.status, 200, "Admin subscriptions route should return 200");
    report("10. Admin Subscriptions Management Route (/admin/subscriptions)", true, "HTTP 200 OK");

    // Admin Payments Ledger Page
    const payRes = await fetch(`${BASE_URL}/admin/payments`, {
      headers: { Cookie: adminCookie },
      redirect: "manual",
    });
    assert.strictEqual(payRes.status, 200, "Admin payments ledger route should return 200");
    report("11. Admin Payments Ledger Route (/admin/payments)", true, "HTTP 200 OK");

    // Admin Plans & Regional Pricing Page
    const planRes = await fetch(`${BASE_URL}/admin/plans`, {
      headers: { Cookie: adminCookie },
      redirect: "manual",
    });
    assert.strictEqual(planRes.status, 200, "Admin plans route should return 200");
    report("12. Admin Plans & Regional Pricing Route (/admin/plans)", true, "HTTP 200 OK");

    // Admin Audit Log Page
    const auditRes = await fetch(`${BASE_URL}/admin/audit`, {
      headers: { Cookie: adminCookie },
      redirect: "manual",
    });
    assert.strictEqual(auditRes.status, 200, "Admin audit trail route should return 200");
    report("13. Admin Audit Trail Route (/admin/audit)", true, "HTTP 200 OK");
  } catch (err) {
    report("Admin Portal Access Suite", false, err.message);
  }

  // TEST 4: Admin Updates Regional Pricing with Audit Trail
  try {
    const updateRes = await fetch(`${BASE_URL}/api/admin/plans/regional`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        plan: "premium",
        regionCode: "AE",
        monthlyPrice: 39,
        yearlyPrice: 390,
      }),
    });
    assert(updateRes.ok, "Admin regional pricing update should succeed");
    const updateData = await updateRes.json();
    const updatedPlan = Array.isArray(updateData.data.updated)
      ? updateData.data.updated.find((p) => p.plan === "premium")
      : updateData.data.updated;
    assert.strictEqual(updatedPlan.monthlyPrice, 39);
    report("14. Admin Regional Price Update & Audit Log", true, "UAE Pro set to AED 39/mo");

    // Verify change is reflected in public pricing API
    const verifyAeRes = await fetch(`${BASE_URL}/api/plans?region=AE`);
    const verifyAeData = await verifyAeRes.json();
    const updatedPro = verifyAeData.data.plans.find((p) => p.plan === "premium");
    assert.strictEqual(updatedPro.monthlyPrice, 39, "Public pricing should reflect new authoritative admin price");
    report("15. Real-Time Price Reflection on Public API", true, "Authoritative pricing verified");
  } catch (err) {
    report("Admin Price Update Suite", false, err.message);
  }

  // TEST 5: Customer Data Management ("Clear My Data" and "Delete My Account")
  try {
    // 5a. Populate some test customer data (a vehicle)
    const vehRes = await fetch(`${BASE_URL}/api/vehicles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: customerCookie,
      },
      body: JSON.stringify({
        name: "Test Audit Vehicle",
        make: "Toyota",
        model: "Camry",
        year: 2024,
      }),
    });
    assert(vehRes.ok, "Creating test vehicle should succeed");
    report("16. Customer creates test data", true, "Vehicle created");

    // 5b. Clear personal data with invalid confirmation (should fail)
    const invalidClear = await fetch(`${BASE_URL}/api/user/clear-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: customerCookie },
      body: JSON.stringify({ confirmation: "WRONG" }),
    });
    assert.strictEqual(invalidClear.status, 400, "Invalid confirmation should return 400");
    report("17. Clear Data safety check rejects invalid confirmation", true, "Requires exact 'CLEAR'");

    // 5c. Clear personal data with valid confirmation
    const validClear = await fetch(`${BASE_URL}/api/user/clear-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: customerCookie },
      body: JSON.stringify({ confirmation: "CLEAR" }),
    });
    assert(validClear.ok, "Clear data with 'CLEAR' should return 200");
    const clearResult = await validClear.json();
    assert.strictEqual(clearResult.data.cleared.vehicles, 1, "Should have cleared 1 vehicle");
    report("18. Customer 'Clear My Data' executes safely", true, "Data removed, account preserved");

    // Verify vehicle list is now empty for customer
    const checkVeh = await fetch(`${BASE_URL}/api/vehicles`, {
      headers: { Cookie: customerCookie },
    });
    const checkVehData = await checkVeh.json();
    assert.strictEqual(checkVehData.data.vehicles.length, 0, "Customer vehicle list should now be empty");
    report("19. Customer data verified cleared from database", true, "0 vehicles remain");

    // 5d. Delete account with incorrect password (should fail)
    const wrongPassDelete = await fetch(`${BASE_URL}/api/user/delete-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: customerCookie },
      body: JSON.stringify({ confirmation: "DELETE", password: "wrongpassword" }),
    });
    assert.strictEqual(wrongPassDelete.status, 401, "Wrong password should return 401");
    report("20. Delete Account requires valid password authentication", true, "HTTP 401 on wrong password");

    // 5e. Delete account with correct confirmation & password
    const validDelete = await fetch(`${BASE_URL}/api/user/delete-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: customerCookie },
      body: JSON.stringify({ confirmation: "DELETE", password: testPassword }),
    });
    assert(validDelete.ok, "Delete account should return 200");
    report("21. Customer 'Delete My Account' executes safely", true, "Account destroyed and session invalidated");

    // 5f. Verify session is no longer valid
    const sessionCheck = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: customerCookie },
    });
    assert.strictEqual(sessionCheck.status, 401, "Deleted user session should return 401");
    report("22. Deleted customer session rejected immediately", true, "HTTP 401 Unauthorized");
  } catch (err) {
    report("Customer Data Lifecycle Suite", false, err.message);
  }

  console.log(`\n=== VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
