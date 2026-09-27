const { PrismaClient } = require("@prisma/client");
const { SignJWT } = require("jose");

async function runRegressionAudit() {
  const prisma = new PrismaClient();
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failedTests++;
    }
  }

  try {
    console.log("=================================================");
    console.log("SMART LIFE MANAGER - CRUD & FORM BUG VERIFICATION");
    console.log("=================================================");

    const user = await prisma.user.findFirst();
    if (!user) {
      throw new Error("No user found in database. Run seed first.");
    }
    console.log(`Target Test User: ${user.email} (${user.id})`);

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

    const baseUrl = "http://localhost:3000";

    // ==========================================
    // 1. BUG 1 & 4: REMINDER SYSTEM TESTS
    // ==========================================
    console.log("\n--- TEST GROUP 1: Reminder System (Create, Edit, Complete, Recurring, Delete) ---");

    // 1.1 Create Reminder
    const remCreateRes = await fetch(`${baseUrl}/api/reminders`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Test Rent Payment Reminder",
        description: "Monthly apartment lease due",
        date: "2026-10-01",
        time: "10:00",
        repeat: "monthly",
        category: "bills",
        priority: "urgent",
        notificationPreference: "both",
      }),
    });
    const remCreateData = await remCreateRes.json();
    assert(remCreateRes.status === 201, "POST /api/reminders returns HTTP 201 Created");
    assert(remCreateData.success === true, "Response payload has success: true");
    assert(remCreateData.data?.reminder?.id !== undefined, "Reminder ID is returned");
    assert(remCreateData.data?.reminder?.isRecurring === true, "Reminder is correctly flagged recurring");
    assert(remCreateData.data?.reminder?.recurrenceRule === "monthly", "Recurrence rule is 'monthly'");

    const reminderId = remCreateData.data?.reminder?.id;

    // Verify in database directly
    const dbRem = await prisma.reminder.findUnique({ where: { id: reminderId } });
    assert(dbRem !== null, "Reminder record verified in database");
    assert(dbRem?.status === "pending", "Initial reminder status is 'pending'");

    // 1.2 Edit Reminder
    const remEditRes = await fetch(`${baseUrl}/api/reminders/${reminderId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        title: "Updated Rent Payment Reminder",
        priority: "high",
        time: "11:30",
      }),
    });
    const remEditData = await remEditRes.json();
    assert(remEditRes.status === 200, "PUT /api/reminders/:id returns HTTP 200 OK");
    assert(remEditData.data?.reminder?.title === "Updated Rent Payment Reminder", "Title successfully updated");

    // 1.3 Toggle Complete on Recurring Reminder (Generates next occurrence)
    const remCompleteRes = await fetch(`${baseUrl}/api/reminders/${reminderId}/complete`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ completed: true }),
    });
    const remCompleteData = await remCompleteRes.json();
    assert(remCompleteRes.status === 200, "PATCH /api/reminders/:id/complete returns HTTP 200 OK");
    assert(remCompleteData.data?.reminder?.status === "completed", "Status marked 'completed'");
    const nextOccurrence = remCompleteData.data?.nextOccurrence || remCompleteData.data?.nextReminder;
    assert(nextOccurrence !== null && nextOccurrence !== undefined, "Next recurring reminder successfully generated");

    const nextReminderId = nextOccurrence?.id;

    // 1.4 Delete Reminders
    const remDeleteRes = await fetch(`${baseUrl}/api/reminders/${reminderId}`, {
      method: "DELETE",
      headers,
    });
    assert(remDeleteRes.status === 200, "DELETE /api/reminders/:id returns HTTP 200 OK");

    if (nextReminderId) {
      await fetch(`${baseUrl}/api/reminders/${nextReminderId}`, {
        method: "DELETE",
        headers,
      });
    }
    const checkDeletedRem = await prisma.reminder.findUnique({ where: { id: reminderId } });
    assert(checkDeletedRem === null, "Reminder successfully deleted from database");

    // ==========================================
    // 2. BUG 2: PAYMENT MANAGEMENT TESTS
    // ==========================================
    console.log("\n--- TEST GROUP 2: Payment System (Create, Edit, Mark Paid, Delete) ---");

    // 2.1 Create Payment
    const payCreateRes = await fetch(`${baseUrl}/api/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Broadband Internet Bill",
        payee: "Telecom Provider",
        amount: 89.99,
        currency: "USD",
        dueDate: "2026-10-15T00:00:00.000Z",
        category: "Internet",
        frequency: "monthly",
        isRecurring: true,
        notes: "Auto-pay setup",
      }),
    });
    const payCreateData = await payCreateRes.json();
    assert(payCreateRes.status === 201, "POST /api/payments returns HTTP 201 Created");
    assert(payCreateData.success === true, "Response payload has success: true");
    assert(payCreateData.data?.payment?.id !== undefined, "Payment ID is returned");
    assert(payCreateData.data?.payment?.isRecurring === true, "Payment marked as recurring");

    const paymentId = payCreateData.data?.payment?.id;

    // Verify in database
    const dbPay = await prisma.payment.findUnique({ where: { id: paymentId } });
    assert(dbPay !== null, "Payment record verified in database");
    assert(dbPay?.amount === 89.99, "Payment amount verified in database");

    // 2.2 Edit Payment
    const payEditRes = await fetch(`${baseUrl}/api/payments/${paymentId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        title: "High-Speed Fiber Bill",
        amount: 99.99,
      }),
    });
    const payEditData = await payEditRes.json();
    assert(payEditRes.status === 200, "PUT /api/payments/:id returns HTTP 200 OK");
    assert(payEditData.data?.payment?.amount === 99.99, "Payment amount updated to 99.99");

    // 2.3 Mark Paid (Generates next occurrence for recurring)
    const payPaidRes = await fetch(`${baseUrl}/api/payments/${paymentId}/pay`, {
      method: "PATCH",
      headers,
    });
    const payPaidData = await payPaidRes.json();
    assert(payPaidRes.status === 200, "PATCH /api/payments/:id/pay returns HTTP 200 OK");
    assert(payPaidData.data?.payment?.isPaid === true, "Payment marked as paid");
    assert(payPaidData.data?.nextPayment !== undefined, "Next recurring payment created");

    const nextPaymentId = payPaidData.data?.nextPayment?.id;

    // 2.4 Delete Payments
    const payDeleteRes = await fetch(`${baseUrl}/api/payments/${paymentId}`, {
      method: "DELETE",
      headers,
    });
    assert(payDeleteRes.status === 200, "DELETE /api/payments/:id returns HTTP 200 OK");
    if (nextPaymentId) {
      await fetch(`${baseUrl}/api/payments/${nextPaymentId}`, {
        method: "DELETE",
        headers,
      });
    }
    const checkDeletedPay = await prisma.payment.findUnique({ where: { id: paymentId } });
    assert(checkDeletedPay === null, "Payment successfully deleted from database");

    // ==========================================
    // 3. BUG 3: DOCUMENT SYSTEM TESTS
    // ==========================================
    console.log("\n--- TEST GROUP 3: Document System (Create, Sync Reminders, Edit, Delete) ---");

    // 3.1 Create Document with Expiry Date and Reminder Milestones
    const docCreateRes = await fetch(`${baseUrl}/api/documents`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "International Passport",
        category: "Passport",
        documentNumber: "P-8837192",
        issuedBy: "Government Department",
        issueDate: "2024-01-01",
        expiryDate: "2029-01-01",
        notes: "Primary travel document",
        reminderMilestones: [90, 30, 7, 1],
      }),
    });
    const docCreateData = await docCreateRes.json();
    assert(docCreateRes.status === 201, "POST /api/documents returns HTTP 201 Created");
    assert(docCreateData.success === true, "Response payload has success: true");
    assert(docCreateData.data?.document?.id !== undefined, "Document ID is returned");

    const documentId = docCreateData.data?.document?.id;

    // Verify document and synced milestone reminders in DB
    const dbDoc = await prisma.document.findUnique({ where: { id: documentId } });
    assert(dbDoc !== null, "Document record verified in database");
    assert(dbDoc?.expiryDate !== null, "Document expiry date verified");

    const linkedReminders = await prisma.reminder.findMany({
      where: { relatedType: "document", relatedId: documentId },
    });
    assert(linkedReminders.length > 0, `Document automatically created ${linkedReminders.length} linked reminder milestones`);

    // 3.2 Edit Document
    const docEditRes = await fetch(`${baseUrl}/api/documents/${documentId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        title: "International Passport (Renewed)",
        notes: "Updated passport notes",
      }),
    });
    const docEditData = await docEditRes.json();
    assert(docEditRes.status === 200, "PUT /api/documents/:id returns HTTP 200 OK");
    assert(docEditData.data?.document?.title === "International Passport (Renewed)", "Document title updated");

    // 3.3 Delete Document
    const docDeleteRes = await fetch(`${baseUrl}/api/documents/${documentId}`, {
      method: "DELETE",
      headers,
    });
    assert(docDeleteRes.status === 200, "DELETE /api/documents/:id returns HTTP 200 OK");

    const checkDeletedDoc = await prisma.document.findUnique({ where: { id: documentId } });
    assert(checkDeletedDoc === null, "Document deleted from database");

    const remainingLinkedReminders = await prisma.reminder.findMany({
      where: { relatedType: "document", relatedId: documentId },
    });
    assert(remainingLinkedReminders.length === 0, "All associated document reminders cascaded and cleaned up");

    // ==========================================
    // 4. VALIDATION & ERROR HANDLING TESTS
    // ==========================================
    console.log("\n--- TEST GROUP 4: Validation & Error Handling (Never stuck loading) ---");

    // 4.1 Reminder missing title
    const invalidRemRes = await fetch(`${baseUrl}/api/reminders`, {
      method: "POST",
      headers,
      body: JSON.stringify({ date: "2026-10-01" }),
    });
    const invalidRemData = await invalidRemRes.json();
    assert(invalidRemRes.status === 400, "Reminder without title rejected with HTTP 400");
    assert(invalidRemData.success === false, "Failure response returned with success: false");
    assert(Boolean(invalidRemData.error?.message), "User-friendly error message provided");

    // 4.2 Payment missing amount
    const invalidPayRes = await fetch(`${baseUrl}/api/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({ title: "No Amount Bill", dueDate: "2026-10-01" }),
    });
    const invalidPayData = await invalidPayRes.json();
    assert(invalidPayRes.status === 400, "Payment without amount rejected with HTTP 400");
    assert(invalidPayData.success === false, "Failure response returned with success: false");

    // 4.3 Document missing title
    const invalidDocRes = await fetch(`${baseUrl}/api/documents`, {
      method: "POST",
      headers,
      body: JSON.stringify({ category: "Passport" }),
    });
    const invalidDocData = await invalidDocRes.json();
    assert(invalidDocRes.status === 400, "Document without title rejected with HTTP 400");
    assert(invalidDocData.success === false, "Failure response returned with success: false");

    // 4.4 Unauthenticated request
    const unauthRes = await fetch(`${baseUrl}/api/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Hacker Attempt", date: "2026-10-01" }),
    });
    assert(unauthRes.status === 401, "Unauthenticated request rejected with HTTP 401");

    console.log("\n=================================================");
    console.log(`SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log("=================================================");

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("FATAL ERROR IN REGRESSION SUITE:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRegressionAudit();
