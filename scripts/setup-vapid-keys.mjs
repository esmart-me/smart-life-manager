// scripts/setup-vapid-keys.mjs
import webpush from "web-push";
import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env");
let envContent = fs.readFileSync(envPath, "utf8");

if (!envContent.includes("VAPID_PUBLIC_KEY") && !envContent.includes("VAPID_PRIVATE_KEY")) {
  console.log("Generating standard VAPID keys for Web Push...");
  const vapidKeys = webpush.generateVAPIDKeys();

  const vapidBlock = `
# Web Push VAPID Credentials (Phase 12)
NEXT_PUBLIC_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"
VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"
VAPID_SUBJECT="mailto:support@smartlifemanager.local"
`;

  fs.appendFileSync(envPath, vapidBlock, "utf8");
  console.log("VAPID keys generated and appended to .env successfully.");
  console.log("Public Key:", vapidKeys.publicKey);
} else {
  console.log("VAPID keys already exist in .env.");
}
