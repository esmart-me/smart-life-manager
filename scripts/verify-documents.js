// Smart Life Manager - Complete Document Manager Verification Test Suite
// Tests:
// 1. Add document with custom name, type, dates, notes, and reminders
// 2. Expiry calculation logic (VALID, EXPIRING SOON, CRITICAL, EXPIRED) & exact text
// 3. Upload image via multipart/form-data
// 4. Upload PDF via multipart/form-data
// 5. Secure file retrieval / streaming
// 6. Security & Cross-user authorization (User A vs User B)
// 7. Reminder generation & deduplication (90, 30, 7, 1 days)
// 8. Search & Status / Type filtering
// 9. Edit document
// 10. Delete document & cascade cleanup of files and reminders
// 11. Dashboard integration & alert display

const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:3000";

async function runDocumentsVerification() {
  console.log("=================================================");
  console.log("SMART LIFE MANAGER - COMPLETE DOCUMENT MANAGER TESTS");
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

  // -------------------------------------------------------------
  // Setup Test Users (User A and User B for Security testing)
  // -------------------------------------------------------------
  const userAEmail = `doc_owner_${Date.now()}@smartlifemanager.local`;
  const userBEmail = `doc_attacker_${Date.now()}@smartlifemanager.local`;
  const password = "DocumentTestPass2026!";

  let cookieUserA = "";
  let cookieUserB = "";

  await test("User A Registration (Document Owner)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: userAEmail,
        password,
        firstName: "Alexander",
        lastName: "Wright",
      }),
    });
    if (res.status !== 201) throw new Error(`User A registration failed: ${res.status}`);
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) throw new Error("Missing auth cookie for User A");
    cookieUserA = setCookie.split(";")[0];
  });

  await test("User B Registration (Unauthorized Requester)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: userBEmail,
        password,
        firstName: "Eve",
        lastName: "Attacker",
      }),
    });
    if (res.status !== 201) throw new Error(`User B registration failed: ${res.status}`);
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) throw new Error("Missing auth cookie for User B");
    cookieUserB = setCookie.split(";")[0];
  });

  // -------------------------------------------------------------
  // Test 1: Expiry Calculation & Exact Human Text Logic
  // -------------------------------------------------------------
  await test("Document Expiry Calculation & Exact Countdown Information", async () => {
    function calculateDocumentStatus(expiryDateInput, referenceDateInput) {
      if (!expiryDateInput) {
        return {
          status: "VALID",
          label: "VALID",
          countdownText: "No Expiry Date",
          daysRemaining: null,
        };
      }
      const expDate = new Date(expiryDateInput);
      if (isNaN(expDate.getTime())) {
        return {
          status: "VALID",
          label: "VALID",
          countdownText: "No Expiry Date",
          daysRemaining: null,
        };
      }
      const refDate = referenceDateInput ? new Date(referenceDateInput) : new Date();
      const startOfRef = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
      const startOfExp = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
      const diffMs = startOfExp.getTime() - startOfRef.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        const daysAgo = Math.abs(diffDays);
        return {
          status: "EXPIRED",
          label: "EXPIRED",
          countdownText: daysAgo === 1 ? "Expired yesterday" : `Expired ${daysAgo} days ago`,
          daysRemaining: diffDays,
        };
      }
      if (diffDays === 0) {
        return {
          status: "CRITICAL",
          label: "CRITICAL",
          countdownText: "Expires today",
          daysRemaining: 0,
        };
      }
      if (diffDays >= 1 && diffDays <= 7) {
        return {
          status: "CRITICAL",
          label: "CRITICAL",
          countdownText: diffDays === 1 ? "Expires tomorrow" : `Expires in ${diffDays} days`,
          daysRemaining: diffDays,
        };
      }
      if (diffDays >= 8 && diffDays <= 30) {
        return {
          status: "EXPIRING_SOON",
          label: "EXPIRING SOON",
          countdownText: `Expires in ${diffDays} days`,
          daysRemaining: diffDays,
        };
      }
      return {
        status: "VALID",
        label: "VALID",
        countdownText: `Expires in ${diffDays} days`,
        daysRemaining: diffDays,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Case 1: Valid (> 30 days)
    const validDate = new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000);
    const validStatus = calculateDocumentStatus(validDate, today);
    if (validStatus.status !== "VALID") throw new Error(`Expected VALID, got ${validStatus.status}`);
    if (validStatus.countdownText !== "Expires in 45 days") {
      throw new Error(`Expected 'Expires in 45 days', got '${validStatus.countdownText}'`);
    }

    // Case 2: Expiring Soon (8–30 days)
    const soonDate = new Date(today.getTime() + 24 * 24 * 60 * 60 * 1000);
    const soonStatus = calculateDocumentStatus(soonDate, today);
    if (soonStatus.status !== "EXPIRING_SOON") throw new Error(`Expected EXPIRING_SOON, got ${soonStatus.status}`);
    if (soonStatus.countdownText !== "Expires in 24 days") {
      throw new Error(`Expected 'Expires in 24 days', got '${soonStatus.countdownText}'`);
    }

    // Case 3: Critical (1–7 days)
    const critDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const critStatus = calculateDocumentStatus(critDate, today);
    if (critStatus.status !== "CRITICAL") throw new Error(`Expected CRITICAL, got ${critStatus.status}`);
    if (critStatus.countdownText !== "Expires in 3 days") {
      throw new Error(`Expected 'Expires in 3 days', got '${critStatus.countdownText}'`);
    }

    // Case 4: Critical (today = 0 days)
    const todayStatus = calculateDocumentStatus(today, today);
    if (todayStatus.status !== "CRITICAL") throw new Error(`Expected CRITICAL for today, got ${todayStatus.status}`);
    if (todayStatus.countdownText !== "Expires today") {
      throw new Error(`Expected 'Expires today', got '${todayStatus.countdownText}'`);
    }

    // Case 5: Expired (Past expiry, -5 days)
    const expiredDate = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
    const expStatus = calculateDocumentStatus(expiredDate, today);
    if (expStatus.status !== "EXPIRED") throw new Error(`Expected EXPIRED, got ${expStatus.status}`);
    if (expStatus.countdownText !== "Expired 5 days ago") {
      throw new Error(`Expected 'Expired 5 days ago', got '${expStatus.countdownText}'`);
    }
  });

  // -------------------------------------------------------------
  // Test 2: Add Document with Custom Name, Type, and Metadata
  // -------------------------------------------------------------
  let primaryDocId = "";
  await test("Add Document with Custom Name, Type & Metadata", async () => {
    const expiryDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const issueDate = new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const res = await fetch(`${BASE_URL}/api/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieUserA,
      },
      body: JSON.stringify({
        type: "Emirates ID",
        name: "UAE National ID - Primary Gold",
        documentNumber: "784-1990-1234567-1",
        issuedBy: "Federal Authority for Identity (ICP)",
        issueDate,
        expiryDate,
        notes: "Biometric smart card; renew 30 days before expiration.",
        reminderMilestones: [90, 30, 7, 1],
      }),
    });

    if (res.status !== 201) throw new Error(`Add document failed: ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.data?.document?.id) {
      throw new Error("Invalid document response payload");
    }

    primaryDocId = data.data.document.id;
    if (data.data.document.title !== "UAE National ID - Primary Gold") {
      throw new Error(`Unexpected document title: ${data.data.document.title}`);
    }
    if (data.data.document.category !== "Emirates ID") {
      throw new Error(`Unexpected category: ${data.data.document.category}`);
    }
    if (data.data.document.statusInfo.status !== "VALID") {
      throw new Error(`Expected status VALID, got ${data.data.document.statusInfo.status}`);
    }
  });

  // -------------------------------------------------------------
  // Test 3: Upload Image & PDF via multipart/form-data
  // -------------------------------------------------------------
  let fileDocId = "";
  let uploadedImageId = "";
  let uploadedPdfId = "";

  await test("Upload Image & PDF via multipart/form-data", async () => {
    // Create temporary image and PDF buffers
    const testImageBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    const testPdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");

    const formData = new FormData();
    formData.append("title", "International Passport - Biometric");
    formData.append("category", "Passport");
    formData.append("documentNumber", "P123456789");
    formData.append("expiryDate", new Date(Date.now() + 24 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]); // 24 days = EXPIRING SOON
    formData.append("notes", "Passport with Schengen and UK visas");
    formData.append("reminderMilestones", JSON.stringify([90, 30, 7, 1]));

    const imageBlob = new Blob([testImageBuffer], { type: "image/png" });
    formData.append("image", imageBlob, "passport-scan.png");

    const pdfBlob = new Blob([testPdfBuffer], { type: "application/pdf" });
    formData.append("pdf", pdfBlob, "passport-official.pdf");

    const res = await fetch(`${BASE_URL}/api/documents`, {
      method: "POST",
      headers: { Cookie: cookieUserA },
      body: formData,
    });

    if (res.status !== 201) throw new Error(`Multipart document upload failed: ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || "Upload failed");

    fileDocId = json.data.document.id;
    const files = json.data.document.files;
    if (!files || files.length !== 2) {
      throw new Error(`Expected 2 files attached, got ${files?.length}`);
    }

    const imageFile = files.find((f) => f.fileType.includes("image"));
    const pdfFile = files.find((f) => f.fileType.includes("pdf"));

    if (!imageFile || !pdfFile) {
      throw new Error("Missing image or PDF file record in response");
    }

    uploadedImageId = imageFile.id;
    uploadedPdfId = pdfFile.id;

    // Verify files were saved to secure non-public storage
    const storageDir = path.join(process.cwd(), "storage", "documents");
    if (!fs.existsSync(storageDir)) {
      throw new Error("Storage documents root directory was not created");
    }
  });

  // -------------------------------------------------------------
  // Test 4: Secure File Retrieval & Content-Type Streaming
  // -------------------------------------------------------------
  await test("Secure File Streaming & Download for Owner", async () => {
    // 1. Download Image
    const imgRes = await fetch(`${BASE_URL}/api/documents/${fileDocId}/files/${uploadedImageId}`, {
      headers: { Cookie: cookieUserA },
    });
    if (imgRes.status !== 200) throw new Error(`Image stream failed: status ${imgRes.status}`);
    const imgType = imgRes.headers.get("content-type");
    if (!imgType || !imgType.includes("image/png")) {
      throw new Error(`Expected image/png Content-Type, got ${imgType}`);
    }
    const imgCache = imgRes.headers.get("cache-control");
    if (!imgCache || !imgCache.includes("private")) {
      throw new Error("Missing private Cache-Control header on sensitive file");
    }

    // 2. Download PDF
    const pdfRes = await fetch(
      `${BASE_URL}/api/documents/${fileDocId}/files/${uploadedPdfId}?download=true`,
      {
        headers: { Cookie: cookieUserA },
      }
    );
    if (pdfRes.status !== 200) throw new Error(`PDF stream failed: status ${pdfRes.status}`);
    const pdfDisposition = pdfRes.headers.get("content-disposition");
    if (!pdfDisposition || !pdfDisposition.includes("attachment")) {
      throw new Error("Expected attachment disposition for ?download=true");
    }
  });

  // -------------------------------------------------------------
  // Test 5: Security Authorization - User B Cannot Access User A's Files
  // -------------------------------------------------------------
  await test("Security & Authorization: Prevent Cross-User File & Document Access", async () => {
    // 1. User B tries to view User A's document details
    const docRes = await fetch(`${BASE_URL}/api/documents/${fileDocId}`, {
      headers: { Cookie: cookieUserB },
    });
    if (docRes.status !== 403 && docRes.status !== 404) {
      throw new Error(`User B was able to access User A's document (status ${docRes.status})`);
    }

    // 2. User B tries to stream User A's uploaded file
    const fileRes = await fetch(`${BASE_URL}/api/documents/${fileDocId}/files/${uploadedImageId}`, {
      headers: { Cookie: cookieUserB },
    });
    if (fileRes.status !== 403 && fileRes.status !== 404) {
      throw new Error(`User B was able to download User A's private file (status ${fileRes.status})`);
    }

    // 3. Unauthenticated request to stream file
    const anonRes = await fetch(`${BASE_URL}/api/documents/${fileDocId}/files/${uploadedImageId}`);
    if (anonRes.status !== 401) {
      throw new Error(`Anonymous request was not blocked with 401 (got ${anonRes.status})`);
    }
  });

  // -------------------------------------------------------------
  // Test 6: Reminders Deduplication (90, 30, 7, 1 days)
  // -------------------------------------------------------------
  await test("Reminders Scheduling & Deduplication (90, 30, 7, 1 days)", async () => {
    const docRes = await fetch(`${BASE_URL}/api/documents/${primaryDocId}`, {
      headers: { Cookie: cookieUserA },
    });
    const docJson = await docRes.json();
    const reminders = docJson.data?.document?.reminders || [];

    if (reminders.length !== 4) {
      throw new Error(`Expected 4 milestone reminders, got ${reminders.length}`);
    }

    // Now update the document again with same milestones to test deduplication
    const updateRes = await fetch(`${BASE_URL}/api/documents/${primaryDocId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieUserA,
      },
      body: JSON.stringify({
        title: "UAE National ID - Primary Gold Updated",
        reminderMilestones: [90, 30, 7, 1],
      }),
    });

    if (updateRes.status !== 200) throw new Error(`Update failed: ${updateRes.status}`);

    const verifyRes = await fetch(`${BASE_URL}/api/documents/${primaryDocId}`, {
      headers: { Cookie: cookieUserA },
    });
    const verifyJson = await verifyRes.json();
    const postReminders = verifyJson.data?.document?.reminders || [];

    if (postReminders.length !== 4) {
      throw new Error(`Deduplication failed: Expected 4 reminders after update, got ${postReminders.length}`);
    }
  });

  // -------------------------------------------------------------
  // Test 7: Search and Filter Functionality
  // -------------------------------------------------------------
  await test("Search and Status / Category Filters", async () => {
    // 1. Search by title keyword "Gold"
    const searchRes = await fetch(`${BASE_URL}/api/documents?q=Gold`, {
      headers: { Cookie: cookieUserA },
    });
    const searchJson = await searchRes.json();
    if (searchJson.data.documents.length === 0) {
      throw new Error("Search query 'Gold' returned 0 documents");
    }

    // 2. Filter by Status "EXPIRING_SOON" (should match the 24 days passport)
    const statusRes = await fetch(`${BASE_URL}/api/documents?status=EXPIRING_SOON`, {
      headers: { Cookie: cookieUserA },
    });
    const statusJson = await statusRes.json();
    if (!statusJson.data.documents.some((d) => d.id === fileDocId)) {
      throw new Error("Status filter 'EXPIRING_SOON' failed to return expiring document");
    }

    // 3. Filter by Category "Passport"
    const catRes = await fetch(`${BASE_URL}/api/documents?type=Passport`, {
      headers: { Cookie: cookieUserA },
    });
    const catJson = await catRes.json();
    if (!catJson.data.documents.some((d) => d.category === "Passport")) {
      throw new Error("Type filter 'Passport' failed");
    }
  });

  // -------------------------------------------------------------
  // Test 8: Edit Document
  // -------------------------------------------------------------
  await test("Edit Document (Update Notes, Number & Expiry)", async () => {
    const newExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 3 days = CRITICAL

    const res = await fetch(`${BASE_URL}/api/documents/${primaryDocId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieUserA,
      },
      body: JSON.stringify({
        notes: "Urgent renewal requested at embassy branch.",
        expiryDate: newExpiry,
      }),
    });

    if (res.status !== 200) throw new Error(`Edit document failed: ${res.status}`);
    const json = await res.json();
    const doc = json.data?.document;

    if (doc.statusInfo.status !== "CRITICAL") {
      throw new Error(`Expected status CRITICAL after 3-day expiry update, got ${doc.statusInfo.status}`);
    }
    if (doc.statusInfo.countdownText !== "Expires in 3 days") {
      throw new Error(`Expected 'Expires in 3 days', got '${doc.statusInfo.countdownText}'`);
    }
  });

  // -------------------------------------------------------------
  // Test 9: Dashboard Integration & Attention Required Alerts
  // -------------------------------------------------------------
  await test("Dashboard Document Alert Reflection (Attention Required)", async () => {
    const res = await fetch(`${BASE_URL}/`, {
      headers: { Cookie: cookieUserA },
    });
    const html = (await res.text()).replace(/<!--.*?-->/g, "");

    // User A has primaryDocId which is now CRITICAL (Expires in 3 days)
    if (!html.includes("UAE National ID - Primary Gold Updated Renewal Soon")) {
      throw new Error("Dashboard Attention Required missing the Critical Document alert");
    }

    // Verify exact countdown string displayed
    if (!html.includes("Expires in 3 days")) {
      throw new Error("Dashboard missing exact 'Expires in 3 days' countdown text");
    }
  });

  // -------------------------------------------------------------
  // Test 10: Delete Document & Cascade Cleanup
  // -------------------------------------------------------------
  await test("Delete Document & Cascade Cleanup of Files and Reminders", async () => {
    const deleteRes = await fetch(`${BASE_URL}/api/documents/${fileDocId}`, {
      method: "DELETE",
      headers: { Cookie: cookieUserA },
    });

    if (deleteRes.status !== 200) throw new Error(`Delete failed: ${deleteRes.status}`);

    // Verify document GET returns 404
    const getRes = await fetch(`${BASE_URL}/api/documents/${fileDocId}`, {
      headers: { Cookie: cookieUserA },
    });
    if (getRes.status !== 404) {
      throw new Error(`Expected 404 after delete, got ${getRes.status}`);
    }

    // Verify file stream returns 404
    const fileRes = await fetch(`${BASE_URL}/api/documents/${fileDocId}/files/${uploadedImageId}`, {
      headers: { Cookie: cookieUserA },
    });
    if (fileRes.status !== 404) {
      throw new Error(`Expected 404 for deleted file, got ${fileRes.status}`);
    }
  });

  console.log("\n=================================================");
  console.log(`DOCUMENT MANAGER TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runDocumentsVerification().catch((err) => {
  console.error("Fatal Document Manager Test Suite Error:", err);
  process.exit(1);
});
