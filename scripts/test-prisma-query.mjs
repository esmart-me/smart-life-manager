import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:C:/Users/ThinkPad-E16/AppData/Roaming/smart-life-manager/prisma/dev.db'
    }
  }
});

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      lastLoginAt: true,
    }
  });
  console.log(`✅ Prisma successfully queried all ${users.length} users from AppData dev.db with status & lastLoginAt!`);
  console.log('Sample user record:', JSON.stringify(users[0], null, 2));
}

main()
  .catch((err) => {
    console.error('❌ Prisma query failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
