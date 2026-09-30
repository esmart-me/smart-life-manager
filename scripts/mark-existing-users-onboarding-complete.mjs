// scripts/mark-existing-users-onboarding-complete.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking existing users and user settings...");
  const users = await prisma.user.findMany({
    include: { settings: true }
  });

  console.log(`Found ${users.length} total users in database.`);

  let updatedCount = 0;
  for (const user of users) {
    if (user.settings) {
      await prisma.userSetting.update({
        where: { id: user.settings.id },
        data: {
          onboardingCompleted: true,
          onboardingStep: 10,
        },
      });
      updatedCount++;
    } else {
      await prisma.userSetting.create({
        data: {
          userId: user.id,
          onboardingCompleted: true,
          onboardingStep: 10,
        },
      });
      updatedCount++;
    }
  }

  console.log(`Successfully set onboardingCompleted: true for ${updatedCount} existing users.`);
}

main()
  .catch((err) => {
    console.error("Error updating existing users:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
