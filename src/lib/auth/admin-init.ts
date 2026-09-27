import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

export const DEFAULT_ADMIN_EMAIL = "admin@smartlifemanager.local";
export const DEFAULT_ADMIN_PASSWORD = "Admin2026!";

/**
 * Ensures at least one super_admin account exists in the database.
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

  // Create primary super_admin
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);
  const admin = await prisma.user.create({
    data: {
      email: DEFAULT_ADMIN_EMAIL,
      passwordHash,
      role: "super_admin",
      emailVerified: true,
      profile: {
        create: {
          firstName: "Super",
          lastName: "Admin",
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

  console.log(`[AdminInit] Seeded super_admin: ${admin.email}`);
  return { id: admin.id, email: admin.email };
}
