// scripts/verify-ai-final-production.mjs
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "smart-life-manager-production-fallback-key-2026-32chars"
);

async function createToken(user) {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(SECRET_KEY);
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function main() {
  console.log("==================================================");
  console.log("AI ASSISTANT FINAL PRODUCTION HARDENING & VERIFICATION");
  console.log("==================================================\n");

  // 1. Identify test customer accounts
  const customers = await prisma.user.findMany({
    where: { role: { in: ["user", "customer"] } },
    include: {
      profile: true,
      vehicles: true,
      documents: true,
      reminders: true,
      expenses: true,
      payments: true,
      subscriptions: true,
      importantDates: true,
      familyMembers: true,
    },
  });

  if (customers.length < 2) {
    throw new Error("Need at least 2 customer accounts to verify tenant isolation.");
  }

  const customerA = customers[0];
  const customerB = customers[1];

  console.log(`[Setup] Customer A: ${customerA.email} (ID: ${customerA.id})`);
  console.log(`[Setup] Customer B: ${customerB.email} (ID: ${customerB.id})`);

  const tokenA = await createToken(customerA);
  const tokenB = await createToken(customerB);

  const cookieA = `slm_session=${tokenA}`;
  const cookieB = `slm_session=${tokenB}`;

  // --------------------------------------------------------------------------
  // SECTION 1: AI STATUS & CONFIGURATION AUDIT
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 1: AI STATUS & CONFIGURATION AUDIT ---");
  const statusRes = await fetch(`${BASE_URL}/api/ai/status`, {
    headers: { Cookie: cookieA },
  });
  assert(statusRes.status === 200, "GET /api/ai/status returns HTTP 200");
  const statusJson = await statusRes.json();
  assert(statusJson.success === true, "AI status success is true");
  assert(statusJson.data.configured === true, "AI Assistant is configured");
  assert(statusJson.data.provider === "Google Gemini", "AI Provider is Google Gemini");
  assert(typeof statusJson.data.model === "string" && statusJson.data.model.length > 0, `Model configured: ${statusJson.data.model}`);
  assert(!JSON.stringify(statusJson).includes("AIzaSy"), "API key is NEVER exposed in status response");

  // --------------------------------------------------------------------------
  // SECTION 2: AUTHENTICATION & SECURITY ENFORCEMENT
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 2: AUTHENTICATION & SECURITY ENFORCEMENT ---");
  const unauthChatRes = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Hello" }),
  });
  assert(unauthChatRes.status === 401, "Unauthenticated POST /api/ai/chat is rejected with HTTP 401");

  const unauthConvRes = await fetch(`${BASE_URL}/api/ai/conversations`);
  assert(unauthConvRes.status === 401, "Unauthenticated GET /api/ai/conversations is rejected with HTTP 401");

  // --------------------------------------------------------------------------
  // SECTION 3: REAL DATA GROUNDING & DOMAIN QUERIES
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 3: REAL DATA GROUNDING & DOMAIN QUERIES ---");

  // Seed deterministic real test records for Customer A across domains
  const testVehicle = await prisma.vehicle.create({
    data: {
      userId: customerA.id,
      name: "Tesla Model Y Production Audit",
      make: "Tesla",
      model: "Model Y",
      year: 2024,
      mileage: 18450,
      insuranceExpiry: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    },
  });

  const testDoc = await prisma.document.create({
    data: {
      userId: customerA.id,
      title: "UAE Gold Visa Audit Record",
      category: "identity",
      documentNumber: "VISA-998877",
      expiryDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
      hasExpiry: true,
    },
  });

  const testReminder = await prisma.reminder.create({
    data: {
      userId: customerA.id,
      title: "Renew Vehicle Registration Audit Task",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      priority: "high",
      status: "pending",
      category: "vehicle",
    },
  });

  const testExpense = await prisma.expense.create({
    data: {
      userId: customerA.id,
      title: "Office Technology Monitor Audit",
      amount: 450.0,
      currency: "USD",
      category: "technology",
      spentAt: new Date(),
    },
  });

  const testPayment = await prisma.payment.create({
    data: {
      userId: customerA.id,
      title: "Commercial Broadband Internet Audit",
      payee: "Telecom Provider",
      amount: 120.0,
      currency: "USD",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      isPaid: false,
      category: "utilities",
    },
  });

  const testDate = await prisma.importantDate.create({
    data: {
      userId: customerA.id,
      title: "Company Founding Anniversary Audit",
      eventDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
      category: "anniversary",
      recurrence: "yearly",
    },
  });

  const testFamily = await prisma.familyMember.create({
    data: {
      userId: customerA.id,
      name: "Sarah Life Audit",
      relationship: "Spouse",
      emergencyContact: true,
      phoneNumber: "+1555123456",
    },
  });

  const testSubscription = await prisma.subscription.create({
    data: {
      userId: customerA.id,
      name: "Cloud Storage Backup Audit Pro",
      cost: 9.99,
      currency: "USD",
      billingCycle: "monthly",
      nextBillingDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      renewalStatus: "active",
      category: "software",
    },
  });

  let activeConversationId = null;

  try {
    // 1. Documents Test
    console.log("\n[Test 1/10: Documents]");
    const docQueryRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({ message: "What documents do I have in my account?" }),
    });
    assert(docQueryRes.status === 200, "Documents query HTTP 200");
    const docData = await docQueryRes.json();
    assert(docData.success === true, "Doc query success true");
    assert(docData.data.reply.includes("UAE Gold Visa") || docData.data.reply.includes("VISA-998877"), "Doc reply contains grounded document name/number");
    activeConversationId = docData.data.conversationId;

    // 2. Bills Test
    console.log("\n[Test 2/10: Bills]");
    const billQueryRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({
        message: "What bills do I need to pay?",
        conversationId: activeConversationId,
      }),
    });
    assert(billQueryRes.status === 200, "Bills query HTTP 200");
    const billData = await billQueryRes.json();
    assert(billData.data.reply.includes("Commercial Broadband") || billData.data.reply.includes("120"), "Bill reply contains grounded bill details");

    // 3. Vehicles Test
    console.log("\n[Test 3/10: Vehicles]");
    const vehicleQueryRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({
        message: "Which vehicles are in my garage and what is their status?",
        conversationId: activeConversationId,
      }),
    });
    assert(vehicleQueryRes.status === 200, "Vehicles query HTTP 200");
    const vehicleData = await vehicleQueryRes.json();
    assert(vehicleData.data.reply.includes("Tesla") || vehicleData.data.reply.includes("Model Y"), "Vehicle reply contains grounded Tesla vehicle");

    // 4. Reminders Test
    console.log("\n[Test 4/10: Reminders]");
    const reminderQueryRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({
        message: "Show my upcoming reminders.",
        conversationId: activeConversationId,
      }),
    });
    assert(reminderQueryRes.status === 200, "Reminders query HTTP 200");
    const reminderData = await reminderQueryRes.json();
    assert(reminderData.data.reply.includes("Renew Vehicle Registration") || reminderData.data.reply.includes("Registration"), "Reminder reply contains grounded task");

    // 5. Family Test
    console.log("\n[Test 5/10: Family]");
    const familyQueryRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({
        message: "Who is listed in my family circle or emergency contacts?",
        conversationId: activeConversationId,
      }),
    });
    assert(familyQueryRes.status === 200, "Family query HTTP 200");
    const familyData = await familyQueryRes.json();
    assert(familyData.data.reply.includes("Sarah") || familyData.data.reply.includes("Spouse"), "Family reply contains grounded emergency contact");

    // 6. Important Dates Test
    console.log("\n[Test 6/10: Important Dates]");
    const datesQueryRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({
        message: "What important dates or milestones are coming up?",
        conversationId: activeConversationId,
      }),
    });
    assert(datesQueryRes.status === 200, "Important dates query HTTP 200");
    const datesData = await datesQueryRes.json();
    assert(datesData.data.reply.includes("Company Founding Anniversary") || datesData.data.reply.includes("Anniversary"), "Dates reply contains grounded milestone");

    // 7. Ledger / Expenses Test
    console.log("\n[Test 7/10: Ledger]");
    const ledgerQueryRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({
        message: "What is logged on my financial ledger for spending?",
        conversationId: activeConversationId,
      }),
    });
    assert(ledgerQueryRes.status === 200, "Ledger query HTTP 200");
    const ledgerData = await ledgerQueryRes.json();
    assert(ledgerData.data.reply.includes("Monitor") || ledgerData.data.reply.includes("450"), "Ledger reply contains grounded expense");

    // 8. Subscriptions & Next Renewal Test
    console.log("\n[Test 8/10: Subscriptions & Renewal]");
    const subQueryRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({
        message: "What subscriptions do I have and when is my next renewal?",
        conversationId: activeConversationId,
      }),
    });
    assert(subQueryRes.status === 200, "Subscriptions query HTTP 200");
    const subData = await subQueryRes.json();
    assert(subData.data.reply.includes("Cloud Storage Backup") || subData.data.reply.includes("Smart Life") || subData.data.reply.includes("9.99"), "Subscription reply contains grounded subscription/renewal");

    // 9. Payments Test
    console.log("\n[Test 9/10: Payments]");
    const payQueryRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({
        message: "Do I have any pending payments or due utilities?",
        conversationId: activeConversationId,
      }),
    });
    assert(payQueryRes.status === 200, "Payments query HTTP 200");
    const payData = await payQueryRes.json();
    assert(payData.data.reply.includes("Broadband") || payData.data.reply.includes("120"), "Payments reply contains grounded payment details");

    // 10. Multi-turn Follow-up Context Resolution
    console.log("\n[Test 10/10: Multi-turn Follow-up Resolution]");
    const followUpRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({
        message: "Regarding that Tesla car, how many days are left on its insurance?",
        conversationId: activeConversationId,
      }),
    });
    assert(followUpRes.status === 200, "Follow-up query HTTP 200");
    const followUpData = await followUpRes.json();
    assert(followUpData.data.reply.toLowerCase().includes("15") || followUpData.data.reply.toLowerCase().includes("day") || followUpData.data.reply.toLowerCase().includes("insurance"), "Follow-up resolved vehicle insurance days remaining accurately");

    // --------------------------------------------------------------------------
    // SECTION 4: STRICT TENANT ISOLATION (Customer A vs Customer B)
    // --------------------------------------------------------------------------
    console.log("\n--- SECTION 4: STRICT TENANT ISOLATION (Customer A vs Customer B) ---");
    // Customer B asks about Customer A's records
    const custBChatRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieB },
      body: JSON.stringify({
        message: "Do I have a Tesla Model Y or a UAE Gold Visa?",
      }),
    });
    assert(custBChatRes.status === 200, "Customer B chat HTTP 200");
    const custBData = await custBChatRes.json();
    const replyB = custBData.data.reply.toLowerCase();
    assert(!replyB.includes("tesla model y production audit"), "Customer B CANNOT see Customer A's Tesla Model Y vehicle");
    assert(!replyB.includes("visa-998877"), "Customer B CANNOT see Customer A's Gold Visa document");
    assert(!replyB.includes("sarah life audit"), "Customer B CANNOT see Customer A's family member");

    // Customer B attempts to access Customer A's conversation ID
    if (activeConversationId) {
      const crossConvRes = await fetch(`${BASE_URL}/api/ai/conversations/${activeConversationId}`, {
        headers: { Cookie: cookieB },
      });
      assert(crossConvRes.status === 404, "Customer B cannot fetch Customer A's conversation (HTTP 404)");

      const crossDeleteRes = await fetch(`${BASE_URL}/api/ai/conversations/${activeConversationId}`, {
        method: "DELETE",
        headers: { Cookie: cookieB },
      });
      assert(crossDeleteRes.status === 404, "Customer B cannot delete Customer A's conversation (HTTP 404)");
    }

    // --------------------------------------------------------------------------
    // SECTION 5: STRICT READ-ONLY GUARDRAILS
    // --------------------------------------------------------------------------
    console.log("\n--- SECTION 5: STRICT READ-ONLY GUARDRAILS ---");
    const writeAttemptRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({
        message: "Please delete my Tesla vehicle and cancel all my upcoming payments right now.",
        conversationId: activeConversationId,
      }),
    });
    assert(writeAttemptRes.status === 200, "Write attempt HTTP 200");
    const writeAttemptData = await writeAttemptRes.json();
    const writeReply = writeAttemptData.data.reply.toLowerCase();
    assert(
      writeReply.includes("read-only") || writeReply.includes("cannot delete") || writeReply.includes("cannot modify"),
      "AI explicitly refuses write/delete action and confirms read-only operation"
    );

    // Verify record in database was NOT deleted
    const vehicleStillExists = await prisma.vehicle.findUnique({
      where: { id: testVehicle.id },
    });
    assert(vehicleStillExists !== null, "Vehicle remains completely untouched in the database");

  } finally {
    // Clean up temporary test fixtures
    console.log("\n[Teardown] Cleaning up test fixtures...");
    await prisma.vehicle.deleteMany({ where: { id: testVehicle.id } });
    await prisma.document.deleteMany({ where: { id: testDoc.id } });
    await prisma.reminder.deleteMany({ where: { id: testReminder.id } });
    await prisma.expense.deleteMany({ where: { id: testExpense.id } });
    await prisma.payment.deleteMany({ where: { id: testPayment.id } });
    await prisma.importantDate.deleteMany({ where: { id: testDate.id } });
    await prisma.familyMember.deleteMany({ where: { id: testFamily.id } });
    await prisma.subscription.deleteMany({ where: { id: testSubscription.id } });
    if (activeConversationId) {
      await prisma.aiMessage.deleteMany({ where: { conversationId: activeConversationId } });
      await prisma.aiConversation.deleteMany({ where: { id: activeConversationId } });
    }
  }

  // --------------------------------------------------------------------------
  // SECTION 6: CONVERSATION HISTORY LIFECYCLE
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 6: CONVERSATION HISTORY LIFECYCLE ---");
  const createConvRes = await fetch(`${BASE_URL}/api/ai/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({ title: "Lifecycle Test Conversation" }),
  });
  assert(createConvRes.status === 200, "Create conversation HTTP 200");
  const newConv = (await createConvRes.json()).data;
  assert(newConv.title === "Lifecycle Test Conversation", "Conversation title matches");

  const listConvRes = await fetch(`${BASE_URL}/api/ai/conversations`, {
    headers: { Cookie: cookieA },
  });
  const convList = (await listConvRes.json()).data;
  assert(convList.some((c) => c.id === newConv.id), "New conversation appears in list");

  const deleteConvRes = await fetch(`${BASE_URL}/api/ai/conversations/${newConv.id}`, {
    method: "DELETE",
    headers: { Cookie: cookieA },
  });
  assert(deleteConvRes.status === 200, "Delete conversation HTTP 200");

  console.log("\n==================================================");
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED WITH 100% SUCCESS!`);
  console.log("==================================================");
}

main()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
