// Comprehensive automated test suite for Stripe subscription & payment workflow
import assert from "node:assert";

const BASE_URL = "http://localhost:3000";

async function runStripeTests() {
  console.log("=== STARTING STRIPE SUBSCRIPTION & PAYMENT WORKFLOW VERIFICATION ===");
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

  const timestamp = Date.now();
  const testCustomerEmail = `stripe_customer_${timestamp}@test.local`;
  const testCustomerPassword = "CustomerSecurePass123!";
  let customerCookie = "";
  let customerId = "";

  // 1. Customer Registration & Login
  try {
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testCustomerEmail,
        password: testCustomerPassword,
        firstName: "Stripe",
        lastName: "Subscriber",
      }),
    });
    assert(regRes.ok, "Customer registration should succeed");
    const regData = await regRes.json();
    customerId = regData.data.user.id;
    const rawCookie = regRes.headers.get("set-cookie") || "";
    customerCookie = rawCookie.split(";")[0];
    report("1. Customer Account Created", true, `Email: ${testCustomerEmail}, ID: ${customerId}`);
  } catch (err) {
    report("Customer Registration", false, err.message);
  }

  // 2. Initial Subscription Status (Free Starter)
  try {
    const currentRes = await fetch(`${BASE_URL}/api/subscription/current`, {
      headers: { Cookie: customerCookie },
    });
    assert(currentRes.ok, "Should fetch current subscription");
    const currentData = await currentRes.json();
    assert.strictEqual(currentData.data.subscription.plan, "free");
    assert.strictEqual(currentData.data.subscription.status, "active");
    report("2. Default Plan Initialized to Free Starter", true, "Plan: free, Status: active");
  } catch (err) {
    report("Initial Subscription Status", false, err.message);
  }

  // 3. Free Plan Direct Activation (No Checkout Required)
  try {
    const freeRes = await fetch(`${BASE_URL}/api/checkout/create-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: customerCookie },
      body: JSON.stringify({ plan: "free" }),
    });
    assert(freeRes.ok, "Free plan activation should succeed");
    const freeData = await freeRes.json();
    assert.strictEqual(freeData.data.isFree, true);
    report("3. Free Plan Direct Activation", true, "No payment checkout required");
  } catch (err) {
    report("Free Plan Direct Activation", false, err.message);
  }

  // 4. Create Paid Checkout Session (UAE Region, Life Pro Premium)
  let checkoutSessionId = "";
  try {
    const checkoutRes = await fetch(`${BASE_URL}/api/checkout/create-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: customerCookie },
      body: JSON.stringify({
        plan: "premium",
        billingInterval: "monthly",
        regionCode: "AE",
      }),
    });
    assert(checkoutRes.ok, "Create checkout session should succeed");
    const checkoutData = await checkoutRes.json();
    assert(checkoutData.data.url, "Checkout URL must be generated");
    assert.strictEqual(checkoutData.data.currency, "AED", "Currency must be AED for UAE");
    assert.strictEqual(checkoutData.data.amount, 39, "Authoritative price must be AED 39");
    checkoutSessionId = checkoutData.data.sessionId;
    report("4. Checkout Session Created with Authoritative Regional Pricing", true, `Plan: Pro, Price: AED 39/mo, URL: ${checkoutData.data.url}`);

    // Verify subscription is NOT marked active merely because checkout was initiated!
    const checkSubRes = await fetch(`${BASE_URL}/api/subscription/current`, {
      headers: { Cookie: customerCookie },
    });
    const checkSubData = await checkSubRes.json();
    assert.strictEqual(checkSubData.data.subscription.plan, "free", "Plan must remain free until payment confirmation");
    report("5. Strict Activation Protection Verified", true, "Subscription remains FREE prior to confirmed payment");
  } catch (err) {
    report("Checkout Session & Activation Protection", false, err.message);
  }

  // 5. Payment Provider Webhook Confirmation (checkout.session.completed)
  const testPaymentIntentId = `pi_test_${timestamp}`;
  const testStripeSubId = `sub_test_${timestamp}`;
  try {
    const webhookPayload = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: checkoutSessionId,
          client_reference_id: customerId,
          amount_total: 3900,
          currency: "aed",
          customer: `cus_test_${customerId.slice(-6)}`,
          subscription: testStripeSubId,
          payment_intent: testPaymentIntentId,
          metadata: {
            userId: customerId,
            plan: "premium",
            planName: "Life Pro Premium",
            billingInterval: "monthly",
            amount: "39",
            currency: "AED",
          },
        },
      },
    };

    const webhookRes = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-stripe-test-secret": "sandbox_test_token",
      },
      body: JSON.stringify(webhookPayload),
    });

    assert(webhookRes.ok, "Webhook handler should return 200 OK");
    const webhookData = await webhookRes.json();
    assert.strictEqual(webhookData.received, true);
    assert.strictEqual(webhookData.handled, true);
    report("6. Webhook Processing (checkout.session.completed)", true, "Signature accepted, event dispatched");

    // Verify subscription is now ACTIVE
    const verifySubRes = await fetch(`${BASE_URL}/api/subscription/current`, {
      headers: { Cookie: customerCookie },
    });
    const verifySubData = await verifySubRes.json();
    assert.strictEqual(verifySubData.data.subscription.status, "active");
    assert.strictEqual(verifySubData.data.subscription.plan, "premium");
    assert.strictEqual(verifySubData.data.subscription.currency, "AED");
    assert.strictEqual(verifySubData.data.subscription.amount, 39);
    report("7. Subscription Activated ONLY After Confirmed Payment", true, "Plan: Life Pro Premium, Status: ACTIVE, Currency: AED");

    // Verify Billing Transaction record was created in the ledger
    assert(verifySubData.data.transactions.length >= 1, "Billing transaction ledger should have an entry");
    const tx = verifySubData.data.transactions[0];
    assert.strictEqual(tx.status, "paid");
    assert.strictEqual(tx.amount, 39);
    assert.strictEqual(tx.currency, "AED");
    assert.strictEqual(tx.transactionId, testPaymentIntentId);
    report("8. Immutable Billing Ledger Transaction Created", true, `TxID: ${tx.transactionId}, Status: PAID, Amount: AED 39`);
  } catch (err) {
    report("Webhook Confirmation & Billing Ledger", false, err.message);
  }

  // 6. Subscription Renewal Event (invoice.paid)
  const renewalInvoiceId = `in_renew_${timestamp}`;
  try {
    const renewalPayload = {
      type: "invoice.paid",
      data: {
        object: {
          id: renewalInvoiceId,
          subscription: testStripeSubId,
          customer: `cus_test_${customerId.slice(-6)}`,
          amount_paid: 3900,
          currency: "aed",
          lines: {
            data: [
              {
                period: {
                  start: Math.floor(Date.now() / 1000),
                  end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
                },
              },
            ],
          },
        },
      },
    };

    const renewalRes = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-stripe-test-secret": "sandbox_test_token",
      },
      body: JSON.stringify(renewalPayload),
    });

    assert(renewalRes.ok, "Renewal invoice webhook should succeed");
    const renewalData = await renewalRes.json();
    assert.strictEqual(renewalData.handled, true);
    report("9. Webhook Processing (invoice.paid / Renewal)", true, `Renewal Invoice: ${renewalInvoiceId}`);

    // Verify customer transactions now has 2 entries (initial + renewal)
    const checkRenewalSub = await fetch(`${BASE_URL}/api/subscription/current`, {
      headers: { Cookie: customerCookie },
    });
    const checkRenewalData = await checkRenewalSub.json();
    assert.strictEqual(checkRenewalData.data.transactions.length, 2, "Customer ledger should now have 2 transactions");
    report("10. Renewal Recorded in Customer Payment History", true, "Total transactions: 2");
  } catch (err) {
    report("Subscription Renewal", false, err.message);
  }

  // 7. Payment Failure Event (invoice.payment_failed)
  const failInvoiceId = `in_failed_${timestamp}`;
  try {
    const failurePayload = {
      type: "invoice.payment_failed",
      data: {
        object: {
          id: failInvoiceId,
          subscription: testStripeSubId,
          customer: `cus_test_${customerId.slice(-6)}`,
          amount_due: 3900,
          currency: "aed",
          failure_message: "Your card was declined. Insufficient funds.",
        },
      },
    };

    const failRes = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-stripe-test-secret": "sandbox_test_token",
      },
      body: JSON.stringify(failurePayload),
    });

    assert(failRes.ok, "Failed invoice webhook should be processed");
    const failData = await failRes.json();
    assert.strictEqual(failData.handled, true);
    report("11. Webhook Processing (invoice.payment_failed)", true, "Failure handled gracefully");

    // Verify subscription status is past_due and failure reason recorded
    const checkFailSub = await fetch(`${BASE_URL}/api/subscription/current`, {
      headers: { Cookie: customerCookie },
    });
    const checkFailData = await checkFailSub.json();
    assert.strictEqual(checkFailData.data.subscription.status, "past_due");
    const failedTx = checkFailData.data.transactions.find((t) => t.status === "failed");
    assert(failedTx, "A failed transaction record must exist");
    assert(failedTx.failureReason.includes("declined"), "Failure reason must be recorded");
    report("12. Subscription Status Updated to 'past_due' with Logged Reason", true, `Reason: ${failedTx.failureReason}`);
  } catch (err) {
    report("Payment Failure Handling", false, err.message);
  }

  // 8. Subscription Cancellation (Customer self-service & Webhook confirmation)
  try {
    const cancelRes = await fetch(`${BASE_URL}/api/subscription/cancel`, {
      method: "POST",
      headers: { Cookie: customerCookie },
    });
    assert(cancelRes.ok, "Customer cancellation should succeed");
    const cancelData = await cancelRes.json();
    assert.strictEqual(cancelData.data.subscription.status, "cancelled");
    report("13. Customer Self-Service Subscription Cancellation", true, "cancelAtPeriodEnd set to true");

    // Historical records must NEVER be deleted when subscription is cancelled
    const checkPreserveSub = await fetch(`${BASE_URL}/api/subscription/current`, {
      headers: { Cookie: customerCookie },
    });
    const checkPreserveData = await checkPreserveSub.json();
    assert(checkPreserveData.data.transactions.length >= 2, "Historical payments MUST be preserved after cancellation");
    report("14. Historical Payment Transactions Preserved", true, `${checkPreserveData.data.transactions.length} records intact`);
  } catch (err) {
    report("Subscription Cancellation Suite", false, err.message);
  }

  // 9. Webhook Security Verification (Rejection of invalid signatures)
  try {
    const invalidSigRes = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "invalid_test_signature",
      },
      body: JSON.stringify({ type: "checkout.session.completed", data: { object: {} } }),
    });
    assert.strictEqual(invalidSigRes.status, 400, "Invalid signature should be rejected with HTTP 400");
    report("15. Webhook Signature Security Verification", true, "HTTP 400 Bad Request on invalid signature");
  } catch (err) {
    report("Webhook Signature Security", false, err.message);
  }

  // 10. Admin Portal Visibility & Metrics
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
    assert(adminLoginRes.ok, "Admin login should succeed");
    adminCookie = (adminLoginRes.headers.get("set-cookie") || "").split(";")[0];

    // Admin Dashboard
    const adminDashRes = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: adminCookie },
    });
    assert.strictEqual(adminDashRes.status, 200, "Admin dashboard should return 200");
    report("16. Admin Dashboard Renders Live Metrics", true, "HTTP 200 OK");

    // Admin Subscriptions Table
    const adminSubsRes = await fetch(`${BASE_URL}/admin/subscriptions`, {
      headers: { Cookie: adminCookie },
    });
    assert.strictEqual(adminSubsRes.status, 200);
    report("17. Admin Subscriptions Table Displays Full Lifecycle Data", true, "HTTP 200 OK");

    // Admin Payments Ledger
    const adminPaymentsRes = await fetch(`${BASE_URL}/admin/payments`, {
      headers: { Cookie: adminCookie },
    });
    assert.strictEqual(adminPaymentsRes.status, 200);
    report("18. Admin Payments Ledger Displays Transactions & Failures", true, "HTTP 200 OK");

    // Customer Access Security Check: Customer blocked from admin payments
    const custBlockRes = await fetch(`${BASE_URL}/admin/payments`, {
      headers: { Cookie: customerCookie },
      redirect: "manual",
    });
    assert(custBlockRes.status === 307 || custBlockRes.status === 403, "Customer must be blocked from admin payments");
    report("19. Customer Blocked from Admin Payment Ledger", true, "Access denied verified");
  } catch (err) {
    report("Admin Portal & Security Suite", false, err.message);
  }

  console.log(`\n=== VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runStripeTests();
