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
          vehicles: true,
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
    country: u.profile?.country || "US",
    currency: u.profile?.currency || "USD",
    plan: u.userSubscription?.plan || "free",
    subscriptionStatus: u.userSubscription?.status || "active",
    createdAt: u.createdAt.toISOString(),
    lastActivity: u.updatedAt.toISOString(),
    documentsCount: u._count.documents,
    vehiclesCount: u._count.vehicles,
  }));

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Customer Directory
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review, search, and monitor registered customer accounts and their active regional preferences.
        </p>
      </div>

      <CustomersClient initialCustomers={initialCustomers} />
    </div>
  );
}
