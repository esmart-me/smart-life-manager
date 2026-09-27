const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Smart Life Manager database...");

  const demoEmail = "demo@smartlifemanager.local";
  const passwordHash = await bcrypt.hash("SmartLife2026!", 12);

  const existing = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!existing) {
    const user = await prisma.user.create({
      data: {
        email: demoEmail,
        passwordHash,
        role: "user",
        profile: {
          create: {
            firstName: "Alex",
            lastName: "Morgan",
            displayName: "Alex Morgan",
            timezone: "America/New_York",
            currency: "USD",
          },
        },
        settings: {
          create: {
            theme: "system",
            emailNotifications: true,
            pushNotifications: true,
            reminderDaysBefore: 3,
            weeklyDigest: true,
            securityAlerts: true,
          },
        },
      },
    });

    console.log(`Created demo user: ${user.email} (ID: ${user.id})`);
  } else {
    console.log("Demo user already exists.");
  }

  console.log("Database seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
