const { PrismaClient } = require("@prisma/client");
const { SignJWT } = require("jose");

async function testQuickModalEndpoints() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst();
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

    const headers = {
      "Content-Type": "application/json",
      Cookie: "slm_session=" + token,
    };

    console.log("--- 1. Testing Reminder Payload from QuickCreateModal ---");
    const reminderPayload = {
      title: "Doctor Appointment (QuickModal)",
      dueDate: "2026-10-15T14:30",
      priority: "high",
      category: "general",
    };
    const t0 = Date.now();
    const remRes = await fetch("http://localhost:3000/api/reminders", {
      method: "POST",
      headers,
      body: JSON.stringify(reminderPayload),
    });
    console.log(`Reminder status: ${remRes.status} in ${Date.now() - t0}ms`);
    const remData = await remRes.json();
    console.log("Reminder response:", remData);

    console.log("\n--- 2. Testing Payment Payload from QuickCreateModal ---");
    const paymentPayload = {
      title: "DEWA Electricity (QuickModal)",
      amount: 450.75,
      currency: "USD",
      dueDate: "2026-10-20",
      payee: "DEWA Authority",
      category: "Electricity",
    };
    const t1 = Date.now();
    const payRes = await fetch("http://localhost:3000/api/payments", {
      method: "POST",
      headers,
      body: JSON.stringify(paymentPayload),
    });
    console.log(`Payment status: ${payRes.status} in ${Date.now() - t1}ms`);
    const payData = await payRes.json();
    console.log("Payment response:", payData);

    console.log("\n--- 3. Testing Document Payload from QuickCreateModal ---");
    const docPayload = {
      title: "Vehicle Registration Card (QuickModal)",
      category: "identity",
      expiryDate: "2026-11-30",
      documentNumber: "DXB-998877",
    };
    const t2 = Date.now();
    const docRes = await fetch("http://localhost:3000/api/documents", {
      method: "POST",
      headers,
      body: JSON.stringify(docPayload),
    });
    console.log(`Document status: ${docRes.status} in ${Date.now() - t2}ms`);
    const docData = await docRes.json();
    console.log("Document response:", docData);

    // Clean up created records
    if (remData?.data?.reminder?.id) {
      await prisma.reminder.delete({ where: { id: remData.data.reminder.id } });
      console.log("\nCleaned up test reminder.");
    }
    if (payData?.data?.payment?.id) {
      await prisma.payment.delete({ where: { id: payData.data.payment.id } });
      console.log("Cleaned up test payment.");
    }
    if (docData?.data?.document?.id) {
      await prisma.document.delete({ where: { id: docData.data.document.id } });
      console.log("Cleaned up test document.");
    }
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testQuickModalEndpoints();
