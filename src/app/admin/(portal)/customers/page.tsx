import { prisma } from "@/lib/db/prisma";
import { CustomersClient, CustomerDTO } from "@/components/admin/CustomersClient";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    where: {
      role: { in: ["user", "customer"] },
    },
    orderBy: { createdAt: "desc" },
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
          budgets: true,
          familyMembers: true,
          subscriptions: true,
        },
      },
    },
  });

  const initialCustomers: CustomerDTO[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    name:
      u.profile?.displayName ||
      `${u.profile?.firstName || ""} ${u.profile?.lastName || ""}`.trim() ||
      u.email.split("@")[0],
    firstName: u.profile?.firstName || null,
    lastName: u.profile?.lastName || null,
    role: u.role,
    country: u.profile?.country || "US",
    region: u.profile?.region || "US",
    currency: u.profile?.currency || "USD",
    timezone: u.profile?.timezone || "UTC",
    plan: u.userSubscription?.plan || "free",
    planName: u.userSubscription?.planName || "Free Starter",
    billingInterval: u.userSubscription?.billingInterval || "monthly",
    subscriptionStatus: u.userSubscription?.status || "active",
    subscriptionAmount: u.userSubscription?.amount || 0.0,
    currentPeriodEnd: u.userSubscription?.currentPeriodEnd
      ? u.userSubscription.currentPeriodEnd.toISOString()
      : null,
    createdAt: u.createdAt.toISOString(),
    lastActivity: u.updatedAt.toISOString(),
    documentsCount: u._count.documents,
    remindersCount: u._count.reminders,
    paymentsCount: u._count.payments,
    expensesCount: u._count.expenses,
    vehiclesCount: u._count.vehicles,
    budgetsCount: u._count.budgets,
    familyCount: u._count.familyMembers,
  }));

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Customer Directory
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review, search, and inspect registered customer accounts, usage statistics, and active subscriptions.
        </p>
      </div>

      <CustomersClient initialCustomers={initialCustomers} />
    </div>
  );
}
