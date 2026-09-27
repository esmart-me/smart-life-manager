// scripts/create-admin.mjs
// Dedicated CLI tool to provision or update legitimate system administrators safely
// Usage: node scripts/create-admin.mjs --email admin@domain.com --password "SecurePass123!"

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email" && args[i + 1]) {
      options.email = args[i + 1];
      i++;
    } else if (args[i] === "--password" && args[i + 1]) {
      options.password = args[i + 1];
      i++;
    } else if (args[i] === "--name" && args[i + 1]) {
      options.name = args[i + 1];
      i++;
    }
  }
  return options;
}

async function createAdmin() {
  const args = parseArgs();
  const email = (args.email || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = args.password || process.env.ADMIN_PASSWORD;
  const displayName = args.name || "System Administrator";

  console.log("=== Smart Life Manager: Administrator Provisioning Tool ===");

  if (!email || !email.includes("@")) {
    console.error("ERROR: A valid admin email must be specified via --email <email> or ADMIN_EMAIL env var.");
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error("ERROR: A secure password of at least 8 characters must be specified via --password <pass>.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Check if account already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (existingUser) {
    console.log(`Account ${email} already exists. Upgrading to super_admin and updating password...`);
    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: "super_admin",
        passwordHash,
        emailVerified: true,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: updated.id,
        adminEmail: updated.email,
        action: "admin_credentials_updated_via_cli",
        targetType: "user",
        targetId: updated.id,
        details: JSON.stringify({ email: updated.email, role: updated.role, method: "cli_provisioner" }),
        ipAddress: "127.0.0.1",
      },
    });

    console.log(`SUCCESS: Administrator ${updated.email} updated successfully (ID: ${updated.id}).`);
  } else {
    console.log(`Creating new super_admin account for ${email}...`);
    const nameParts = displayName.split(" ");
    const firstName = nameParts[0] || "System";
    const lastName = nameParts.slice(1).join(" ") || "Admin";

    const newAdmin = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "super_admin",
        emailVerified: true,
        profile: {
          create: {
            firstName,
            lastName,
            displayName,
            country: "US",
            region: "US",
            currency: "USD",
            timezone: "UTC",
          },
        },
        settings: {
          create: {
            theme: "dark",
            emailNotifications: true,
            pushNotifications: true,
            reminderDaysBefore: 1,
            weeklyDigest: true,
            securityAlerts: true,
          },
        },
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: newAdmin.id,
        adminEmail: newAdmin.email,
        action: "admin_created_via_cli",
        targetType: "user",
        targetId: newAdmin.id,
        details: JSON.stringify({ email: newAdmin.email, role: newAdmin.role, method: "cli_provisioner" }),
        ipAddress: "127.0.0.1",
      },
    });

    console.log(`SUCCESS: Super Administrator ${newAdmin.email} created successfully (ID: ${newAdmin.id}).`);
  }

  console.log("Authorization: super_admin permissions granted.");
  console.log("Admin Portal URL: /admin/login");
}

createAdmin()
  .catch((err) => {
    console.error("FATAL ERROR provisioning admin:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
