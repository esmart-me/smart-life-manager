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

    // Concurrently fetch this customer's actual module records (strictly scoped to userId)
    const [docs, rems, pays, exps, vechs, subs, dates, family] = await Promise.all([
      prisma.document.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          title: true,
          category: true,
          documentNumber: true,
          expiryDate: true,
          createdAt: true,
          files: { select: { id: true, fileName: true, fileType: true, fileSize: true } },
        },
      }),
      prisma.reminder.findMany({
        where: { userId: id },
        orderBy: { dueDate: "asc" },
        take: 25,
        select: {
          id: true,
          title: true,
          dueDate: true,
          priority: true,
          status: true,
          category: true,
        },
      }),
      prisma.payment.findMany({
        where: { userId: id },
        orderBy: { dueDate: "desc" },
        take: 25,
        select: {
          id: true,
          title: true,
          amount: true,
          currency: true,
          dueDate: true,
          isPaid: true,
          category: true,
        },
      }),
      prisma.expense.findMany({
        where: { userId: id },
        orderBy: { spentAt: "desc" },
        take: 25,
        select: {
          id: true,
          title: true,
          amount: true,
          currency: true,
          category: true,
          spentAt: true,
        },
      }),
      prisma.vehicle.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          name: true,
          make: true,
          model: true,
          year: true,
          licensePlate: true,
        },
      }),
      prisma.subscription.findMany({
        where: { userId: id },
        orderBy: { nextBillingDate: "asc" },
        take: 15,
        select: {
          id: true,
          name: true,
          cost: true,
          currency: true,
          billingCycle: true,
          nextBillingDate: true,
          renewalStatus: true,
        },
      }),
      prisma.importantDate.findMany({
        where: { userId: id },
        orderBy: { eventDate: "asc" },
        take: 15,
        select: {
          id: true,
          title: true,
          eventDate: true,
          category: true,
          recurrence: true,
        },
      }),
      prisma.familyMember.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          name: true,
          relationship: true,
          emergencyContact: true,
        },
      }),
    ]);

    // Safety verify: do not expose password hashes, tokens, or encryption keys
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
      records: {
        documents: docs.map((d) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          documentNumber: d.documentNumber,
          expiryDate: d.expiryDate ? d.expiryDate.toISOString() : null,
          createdAt: d.createdAt.toISOString(),
          filesCount: d.files.length,
        })),
        reminders: rems.map((r) => ({
          id: r.id,
          title: r.title,
          dueDate: r.dueDate.toISOString(),
          priority: r.priority,
          status: r.status,
          category: r.category,
        })),
        payments: pays.map((p) => ({
          id: p.id,
          title: p.title,
          amount: p.amount,
          currency: p.currency,
          dueDate: p.dueDate.toISOString(),
          isPaid: p.isPaid,
          category: p.category,
        })),
        expenses: exps.map((e) => ({
          id: e.id,
          title: e.title,
          amount: e.amount,
          currency: e.currency,
          category: e.category,
          spentAt: e.spentAt.toISOString(),
        })),
        vehicles: vechs.map((v) => ({
          id: v.id,
          name: v.name,
          make: v.make,
          model: v.model,
          year: v.year,
          licensePlate: v.licensePlate,
        })),
        subscriptions: subs.map((s) => ({
          id: s.id,
          name: s.name,
          cost: s.cost,
          currency: s.currency,
          billingCycle: s.billingCycle,
          nextBillingDate: s.nextBillingDate.toISOString(),
          renewalStatus: s.renewalStatus,
        })),
        importantDates: dates.map((d) => ({
          id: d.id,
          title: d.title,
          eventDate: d.eventDate.toISOString(),
          category: d.category,
          recurrence: d.recurrence,
        })),
        familyMembers: family.map((f) => ({
          id: f.id,
          name: f.name,
          relationship: f.relationship,
          emergencyContact: f.emergencyContact,
        })),
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

export async function PATCH(
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
      include: { userSubscription: true },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Customer not found" } },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { status, role } = body;

    let updatedSubscription = customer.userSubscription;
    if (status) {
      if (customer.userSubscription) {
        updatedSubscription = await prisma.userSubscription.update({
          where: { userId: id },
          data: { status },
        });
      } else {
        updatedSubscription = await prisma.userSubscription.create({
          data: {
            userId: id,
            plan: "free",
            planName: "Free Starter",
            status,
            billingInterval: "monthly",
            amount: 0.0,
            currency: "USD",
          },
        });
      }
    }

    let updatedRole = customer.role;
    if (role && (role === "user" || role === "admin")) {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role },
      });
      updatedRole = updatedUser.role;
    }

    await prisma.adminAuditLog.create({
      data: {
        adminId: user.id,
        adminEmail: user.email,
        action: "customer_status_updated",
        targetType: "user",
        targetId: id,
        details: JSON.stringify({ status, role }),
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id,
        email: customer.email,
        role: updatedRole,
        subscriptionStatus: updatedSubscription?.status || "active",
      },
    });
  } catch (error: unknown) {
    console.error("[Admin API] Failed to update customer status:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update customer status" } },
      { status: 500 }
    );
  }
}

