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
  const existing = await prisma.user.findFirst({
    where: {
      role: { in: ["super_admin", "admin"] },
    },
  });

  if (existing) {
    return { id: existing.id, email: existing.email };
  }

  // Determine initial admin password from environment or secure setup
  const initialPassword =
    process.env.ADMIN_INITIAL_PASSWORD || "Admin2026!";

  const passwordHash = await bcrypt.hash(initialPassword, 12);
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
