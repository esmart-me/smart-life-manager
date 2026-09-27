// src/app/api/admin/customers/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  if (!isAdmin(user.role)) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Administrator access required" } },
      { status: 403 }
    );
  }

  try {
    const customers = await prisma.user.findMany({
      where: {
        role: { in: ["user", "customer"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            displayName: true,
            country: true,
            region: true,
            currency: true,
            timezone: true,
          },
        },
        userSubscription: {
          select: {
            plan: true,
            planName: true,
            status: true,
            billingInterval: true,
            amount: true,
            currency: true,
            currentPeriodEnd: true,
          },
        },
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

    const formattedCustomers = customers.map((c) => ({
      id: c.id,
      email: c.email,
      name:
        c.profile?.displayName ||
        `${c.profile?.firstName || ""} ${c.profile?.lastName || ""}`.trim() ||
        c.email.split("@")[0],
      role: c.role,
      country: c.profile?.country || "US",
      region: c.profile?.region || "US",
      currency: c.profile?.currency || "USD",
      plan: c.userSubscription?.plan || "free",
      planName: c.userSubscription?.planName || "Free Starter",
      subscriptionStatus: c.userSubscription?.status || "active",
      billingInterval: c.userSubscription?.billingInterval || "monthly",
      subscriptionAmount: c.userSubscription?.amount || 0.0,
      createdAt: c.createdAt.toISOString(),
      counts: {
        documents: c._count.documents,
        reminders: c._count.reminders,
        payments: c._count.payments,
        expenses: c._count.expenses,
        vehicles: c._count.vehicles,
        budgets: c._count.budgets,
        family: c._count.familyMembers,
      },
    }));

    return NextResponse.json({
      success: true,
      data: {
        customers: formattedCustomers,
        total: formattedCustomers.length,
      },
    });
  } catch (error: unknown) {
    console.error("[Admin Customers API Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch customer directory" } },
      { status: 500 }
    );
  }
}
