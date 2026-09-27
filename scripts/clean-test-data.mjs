// scripts/clean-test-data.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanTestData() {
  console.log("=== Safe Customer & Test Data Cleanup ===");

  // 1. Identify all users
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Total users in database: ${allUsers.length}`);

  // 2. Identify admin accounts to strictly preserve
  const adminUsers = allUsers.filter(
    (u) => u.email === "admin@smartlifemanager.local" || u.role === "super_admin" || u.role === "admin"
  );
  console.log(`Admin accounts to PRESERVE (${adminUsers.length}):`);
  adminUsers.forEach((a) => console.log(`  - [${a.role}] ${a.email} (${a.id})`));

  if (adminUsers.length === 0) {
    throw new Error("ABORT: No admin account found! Halting cleanup to prevent lock-out.");
  }

  // 3. Find test and demo users to remove
  // Legitimate customers would NOT have test patterns in their emails.
  const targetUsersToDelete = allUsers.filter(
    (u) => !adminUsers.some((a) => a.id === u.id)
  );

  console.log(`Target users to remove (${targetUsersToDelete.length}):`);
  targetUsersToDelete.forEach((u) => console.log(`  - ${u.email} (${u.id})`));

  if (targetUsersToDelete.length === 0) {
    console.log("No test or demo users to clean up. Database is already clean.");
    return;
  }

  const targetIds = targetUsersToDelete.map((u) => u.id);

  // 4. Clean associated data for these users
  console.log("Removing associated data for test users...");
  const delFiles = await prisma.documentFile.deleteMany({ where: { userId: { in: targetIds } } });
  console.log(`Deleted ${delFiles.count} DocumentFiles`);

  const delDocs = await prisma.document.deleteMany({ where: { userId: { in: targetIds } } });
  console.log(`Deleted ${delDocs.count} Documents`);

  const delReminders = await prisma.reminder.deleteMany({ where: { userId: { in: targetIds } } });
  console.log(`Deleted ${delReminders.count} Reminders`);

  const delPayments = await prisma.payment.deleteMany({ where: { userId: { in: targetIds } } });
  console.log(`Deleted ${delPayments.count} Payments`);

  const delExpenses = await prisma.expense.deleteMany({ where: { userId: { in: targetIds } } });
  console.log(`Deleted ${delExpenses.count} Expenses`);

  const delBudgets = await prisma.budget.deleteMany({ where: { userId: { in: targetIds } } });
  console.log(`Deleted ${delBudgets.count} Budgets`);

  const delVehicles = await prisma.vehicle.deleteMany({ where: { userId: { in: targetIds } } });
  console.log(`Deleted ${delVehicles.count} Vehicles`);

  const delSubscriptions = await prisma.subscription.deleteMany({ where: { userId: { in: targetIds } } });
  console.log(`Deleted ${delSubscriptions.count} Subscriptions`);

  const delImportantDates = await prisma.importantDate.deleteMany({ where: { userId: { in: targetIds } } });
  console.log(`Deleted ${delImportantDates.count} ImportantDates`);

  const delFamilyGroupMembers = await prisma.familyGroupMember.deleteMany({ where: { userId: { in: targetIds } } });
  console.log(`Deleted ${delFamilyGroupMembers.count} FamilyGroupMembers`);

  const delFamilyGroups = await prisma.familyGroup.deleteMany({ where: { ownerId: { in: targetIds } } });
  console.log(`Deleted ${delFamilyGroups.count} FamilyGroups`);

  const delFamilyMembers = await prisma.familyMember.deleteMany({ where: { userId: { in: targetIds } } });
  console.log(`Deleted ${delFamilyMembers.count} FamilyMembers`);

  const delNotifications = await prisma.notification.deleteMany({ where: { userId: { in: targetIds } } });
  console.log(`Deleted ${delNotifications.count} Notifications`);

  const delBillingTx = await prisma.billingTransaction.deleteMany({ where: { userId: { in: targetIds } } });
  console.log(`Deleted ${delBillingTx.count} BillingTransactions`);

  const delUserSubs = await prisma.userSubscription.deleteMany({ where: { userId: { in: targetIds } } });
  console.log(`Deleted ${delUserSubs.count} UserSubscriptions`);

  const delSessions = await prisma.session.deleteMany({ where: { userId: { in: targetIds } } });
  console.log(`Deleted ${delSessions.count} Sessions`);

  const delTokens = await prisma.passwordResetToken.deleteMany({ where: { userId: { in: targetIds } } });
  console.log(`Deleted ${delTokens.count} PasswordResetTokens`);

  const delSettings = await prisma.userSetting.deleteMany({ where: { userId: { in: targetIds } } });
  console.log(`Deleted ${delSettings.count} UserSettings`);

  const delProfiles = await prisma.profile.deleteMany({ where: { userId: { in: targetIds } } });
  console.log(`Deleted ${delProfiles.count} Profiles`);

  // 5. Delete users
  const delUsers = await prisma.user.deleteMany({ where: { id: { in: targetIds } } });
  console.log(`Successfully deleted ${delUsers.count} test/demo user accounts.`);

  // 6. Record in Admin Audit Log
  const primaryAdmin = adminUsers[0];
  await prisma.adminAuditLog.create({
    data: {
      adminId: primaryAdmin.id,
      adminEmail: primaryAdmin.email,
      action: "customer_data_cleared",
      targetType: "user",
      targetId: "all_test_demo_records",
      details: JSON.stringify({
        deletedCount: delUsers.count,
        preservedAdmin: primaryAdmin.email,
        timestamp: new Date().toISOString(),
      }),
      ipAddress: "127.0.0.1",
    },
  });
  console.log("Logged customer_data_cleared to AdminAuditLog.");

  // 7. Verify remaining users
  const remaining = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
  });
  console.log(`Remaining accounts in database (${remaining.length}):`);
  remaining.forEach((r) => console.log(`  - [${r.role}] ${r.email} (${r.id})`));
}

cleanTestData()
  .catch((err) => {
    console.error("Cleanup error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
