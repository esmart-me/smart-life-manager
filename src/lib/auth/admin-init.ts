import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

export const INITIAL_ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || "admin@smartlifemanager.local";

/**
 * Ensures at least one super_admin account exists in the database.
 * Does not overwrite existing passwords or credentials.
 * Production deployments should provision administrators via `npm run admin:create`
 * or by setting `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD` in the secure server environment.
 */
export async function ensureSuperAdmin(): Promise<{ id: string; email: string }> {
  // If specific ADMIN_EMAIL is designated in env, ensure that user has super_admin role
  if (process.env.ADMIN_EMAIL) {
    const designatedEmail = process.env.ADMIN_EMAIL.toLowerCase().trim();
    const designatedUser = await prisma.user.findUnique({ where: { email: designatedEmail } });
    if (designatedUser && designatedUser.role !== "super_admin") {
      await prisma.user.update({
        where: { id: designatedUser.id },
        data: { role: "super_admin" },
      });
      console.log(`[AdminInit] Elevated designated administrator account: ${designatedUser.email}`);
    }
  }

  const existing = await prisma.user.findFirst({
    where: {
      role: { in: ["super_admin", "admin"] },
    },
  });

  if (existing) {
    return { id: existing.id, email: existing.email };
  }

  // Require explicit ADMIN_INITIAL_PASSWORD from environment; no hardcoded default password allowed
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!initialPassword || initialPassword.trim().length < 8) {
    console.error(
      "[AdminInit Error]: Cannot initialize administrator. ADMIN_INITIAL_PASSWORD environment variable must be set with at least 8 characters."
    );
    throw new Error(
      "ADMIN_INITIAL_PASSWORD must be configured in environment variables to bootstrap the administrator account."
    );
  }

  const passwordHash = await bcrypt.hash(initialPassword.trim(), 12);
  const admin = await prisma.user.create({
    data: {
      email: INITIAL_ADMIN_EMAIL.toLowerCase().trim(),
      passwordHash,
      role: "super_admin",
      emailVerified: true,
      profile: {
        create: {
          firstName: "System",
          lastName: "Administrator",
          displayName: "System Administrator",
          timezone: "UTC",
          country: "US",
          region: "US",
          currency: "USD",
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

  console.log(`[AdminInit] Initialized administrator account: ${admin.email}`);
  return { id: admin.id, email: admin.email };
}
