// src/app/admin/(portal)/customers/page.tsx
// Secure Admin Customer Directory Page — Central Control Plane Only.
// ZERO private record counts (no documents, expenses, vehicles, reminders, budgets, or family members).

import { prisma } from "@/lib/db/prisma";
import { CustomersClient, CustomerDTO } from "@/components/admin/CustomersClient";
import { requireAdmin } from "@/lib/auth/session";
import { isSupabaseServerAdminConfigured } from "@/lib/supabase/config";
import { createServerAdminSupabaseClient } from "@/lib/supabase/server";

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
    },
  });

  // Query central device telemetry if Supabase is configured
  const deviceCountsMap = new Map<string, number>();
  const appVersionMap = new Map<string, string>();
  if (isSupabaseServerAdminConfigured()) {
    try {
      const client = createServerAdminSupabaseClient();
      if (client) {
        const { data: devices } = await client
          .from("devices")
          .select("customer_id, app_version");
        if (devices) {
          for (const d of devices) {
            const count = deviceCountsMap.get(d.customer_id) || 0;
            deviceCountsMap.set(d.customer_id, count + 1);
            if (d.app_version) appVersionMap.set(d.customer_id, d.app_version);
          }
        }
      }
    } catch {}
  }

  const initialCustomers: CustomerDTO[] = users.map((u) => {
    const plan = u.userSubscription?.plan || "basic";
    const isPremium = plan === "premium" || plan === "pro" || plan === "family";
    const expDate = u.userSubscription?.currentPeriodEnd;
    const isExpired = expDate ? new Date(expDate).getTime() < Date.now() : false;

    return {
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
      plan,
      planName: u.userSubscription?.planName || (plan === "premium" ? "Premium Tier" : "Free Starter"),
      billingInterval: u.userSubscription?.billingInterval || "monthly",
      subscriptionStatus: isExpired ? "expired" : (u.userSubscription?.status || "active"),
      subscriptionAmount: u.userSubscription?.amount || 0.0,
      currentPeriodEnd: expDate ? expDate.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
      status: u.status || "active",
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      lastActivity: u.updatedAt.toISOString(),
      deviceCount: deviceCountsMap.get(u.id) || 1,
      appVersion: appVersionMap.get(u.id) || "1.0.0",
      premiumEnabled: isPremium && !isExpired && (u.userSubscription?.status === "active"),
    };
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Customer Directory
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review, search, and manage registered customer accounts, central licensing, and device telemetry.
        </p>
      </div>

      <CustomersClient initialCustomers={initialCustomers} />
    </div>
  );
}
