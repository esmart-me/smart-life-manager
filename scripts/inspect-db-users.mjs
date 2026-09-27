// scripts/inspect-db-users.mjs
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function inspect() {
  const users = await prisma.user.findMany({
    include: {
      profile: true,
      userSubscription: true,
      _count: {
        select: {
          documents: true,
          reminders: true,
          payments: true,
          expenses: true,
          vehicles: true,
          subscriptions: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Total users found: ${users.length}`);
  const testPatterns = ['test', 'attacker', 'owner', 'diag', 'newuser', 'connected_user', 'finance_user', 'demo@', 'inspector'];
  const realUsers = users.filter(u => !testPatterns.some(p => u.email.toLowerCase().includes(p)));
  console.log(`Potential genuine/real users: ${realUsers.length}`);
  realUsers.forEach(u => console.log('REAL USER:', u.id, u.email, u.role, u.createdAt));

  const testUsers = users.filter(u => testPatterns.some(p => u.email.toLowerCase().includes(p)));
  console.log(`Automated test/demo users: ${testUsers.length}`);
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
