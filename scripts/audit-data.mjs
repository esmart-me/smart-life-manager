// scripts/audit-data.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== DATABASE DATA AUDIT ===");

  const users = await prisma.user.findMany({
    include: {
      profile: true,
      userSubscription: true,
      billingTransactions: true,
      _count: {
        select: {
          documents: true,
          reminders: true,
          payments: true,
          expenses: true,
          vehicles: true,
          budgets: true,
          familyMembers: true,
          subscriptions: true,
        },
      },
    },
  });

  console.log(`\nTotal Users in DB: ${users.length}`);
  for (const u of users) {
    console.log(`- ID: ${u.id}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  Role: ${u.role}`);
    console.log(`  Created: ${u.createdAt.toISOString()}`);
    console.log(`  Profile: ${u.profile?.displayName || "None"} (${u.profile?.country || "None"})`);
    console.log(`  UserSubscription: ${u.userSubscription ? JSON.stringify(u.userSubscription) : "None"}`);
    console.log(`  BillingTransactions count: ${u.billingTransactions.length}`);
    console.log(`  Counts: docs=${u._count.documents}, rems=${u._count.reminders}, pays=${u._count.payments}, exps=${u._count.expenses}, vehs=${u._count.vehicles}, subs=${u._count.subscriptions}`);
  }

  const allTxs = await prisma.billingTransaction.findMany();
  console.log(`\nTotal Billing Transactions in DB: ${allTxs.length}`);
  for (const tx of allTxs) {
    console.log(`- TX: ${tx.transactionId}, User: ${tx.userId}, Plan: ${tx.plan}, Amount: ${tx.currency} ${tx.amount}, Status: ${tx.status}, Date: ${tx.paymentDate.toISOString()}`);
  }

  const allPlans = await prisma.planConfig.findMany();
  console.log(`\nTotal PlanConfigs in DB: ${allPlans.length}`);
  for (const p of allPlans) {
    console.log(`- Plan: ${p.plan}, Name: ${p.name}, Price: $${p.monthlyPrice}/mo, $${p.yearlyPrice}/yr, Active: ${p.isActive}`);
  }

  const regionalPricing = await prisma.planRegionalPricing.findMany();
  console.log(`\nTotal PlanRegionalPricings in DB: ${regionalPricing.length}`);

  const customerPayments = await prisma.payment.findMany();
  console.log(`\nTotal Customer Bill Payments in DB: ${customerPayments.length}`);

  console.log("\n=== AUDIT COMPLETE ===");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
