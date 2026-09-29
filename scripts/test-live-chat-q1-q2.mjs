// scripts/test-live-chat-q1-q2.mjs
import fs from "fs";
import path from "path";
import { SignJWT } from "jose";

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

async function run() {
  console.log("Generating session token for customer testman@gmail.com...");
  const token = await new SignJWT({
    sub: "cmuk5jxs8003dv86cvaprw6uk",
    email: "testman@gmail.com",
    role: "user",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(secretKey);

  const cookie = `slm_session=${token}`;

  // 1. Question 1
  console.log("\n--- Sending Question 1 ---");
  console.log('Query: "Hello, introduce yourself as my Smart Life Manager assistant."');
  try {
    const q1Res = await fetch("http://localhost:3000/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        message: "Hello, introduce yourself as my Smart Life Manager assistant.",
      }),
    });

    console.log("Q1 HTTP Status:", q1Res.status);
    const d1 = await q1Res.json();
    console.log("Q1 Response Payload:\n", JSON.stringify(d1, null, 2));
    const convId = d1.data?.conversationId;

    // 2. Question 2
    console.log("\n--- Sending Question 2 (with authorized grounding) ---");
    console.log('Query: "Do I have any expired documents or upcoming renewals?"');
    const q2Res = await fetch("http://localhost:3000/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        message: "Do I have any expired documents or upcoming renewals?",
        conversationId: convId || undefined,
      }),
    });

    console.log("Q2 HTTP Status:", q2Res.status);
    const d2 = await q2Res.json();
    console.log("Q2 Response Payload:\n", JSON.stringify(d2, null, 2));
  } catch (err) {
    console.error("Live test error:", err.message);
  }
}

run();
