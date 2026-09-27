// src/app/api/admin/customers/[id]/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

  const { id } = await context.params;

  try {
    const customer = await prisma.user.findUnique({
      where: { id },
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
            avatarUrl: true,
          },
        },
        userSubscription: {
          select: {
            id: true,
            plan: true,
            planName: true,
            status: true,
            billingInterval: true,
            amount: true,
            currency: true,
            provider: true,
            startedAt: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
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

    if (!customer) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Customer account not found" } },
        { status: 404 }
      );
    }

    // Safety verify: do not expose passwords or sensitive tokens
    const responsePayload = {
      profile: {
        id: customer.id,
        email: customer.email,
        role: customer.role,
        emailVerified: customer.emailVerified,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
        displayName:
          customer.profile?.displayName ||
          `${customer.profile?.firstName || ""} ${customer.profile?.lastName || ""}`.trim() ||
          customer.email.split("@")[0],
        firstName: customer.profile?.firstName || null,
        lastName: customer.profile?.lastName || null,
        country: customer.profile?.country || "US",
        region: customer.profile?.region || "US",
        currency: customer.profile?.currency || "USD",
        timezone: customer.profile?.timezone || "UTC",
        avatarUrl: customer.profile?.avatarUrl || null,
      },
      subscription: customer.userSubscription
        ? {
            id: customer.userSubscription.id,
            plan: customer.userSubscription.plan,
            planName: customer.userSubscription.planName || "Free Starter",
            status: customer.userSubscription.status,
            billingInterval: customer.userSubscription.billingInterval,
            amount: customer.userSubscription.amount,
            currency: customer.userSubscription.currency,
            provider: customer.userSubscription.provider,
            startedAt: customer.userSubscription.startedAt.toISOString(),
            currentPeriodEnd: customer.userSubscription.currentPeriodEnd
              ? customer.userSubscription.currentPeriodEnd.toISOString()
              : null,
            cancelAtPeriodEnd: customer.userSubscription.cancelAtPeriodEnd,
          }
        : {
            plan: "free",
            planName: "Free Starter",
            status: "active",
            billingInterval: "monthly",
            amount: 0.0,
            currency: "USD",
            provider: "standard",
            startedAt: customer.createdAt.toISOString(),
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
          },
      usageSummary: {
        documentsCount: customer._count.documents,
        remindersCount: customer._count.reminders,
        paymentsCount: customer._count.payments,
        expensesCount: customer._count.expenses,
        vehiclesCount: customer._count.vehicles,
        budgetsCount: customer._count.budgets,
        familyCount: customer._count.familyMembers,
        recurringSubscriptionsCount: customer._count.subscriptions,
      },
    };

    return NextResponse.json({
      success: true,
      data: responsePayload,
    });
  } catch (error: unknown) {
    console.error("[Admin API] Failed to fetch customer details:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to retrieve customer details" } },
      { status: 500 }
    );
  }
}
