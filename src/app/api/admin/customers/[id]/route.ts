import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Administrator access denied. Master Administrator privileges required." } },
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
        status: true,
        lastLoginAt: true,
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
    const [docs, rems, pays, exps, vechs, subs, dates, family, billingTxs] = await Promise.all([
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
      prisma.billingTransaction.findMany({
        where: { userId: id },
        orderBy: { paymentDate: "desc" },
        take: 25,
        select: {
          id: true,
          transactionId: true,
          plan: true,
          amount: true,
          currency: true,
          status: true,
          paymentProvider: true,
          paymentDate: true,
          failureReason: true,
          utrNumber: true,
          receiptUrl: true,
          verifiedAt: true,
          verifiedBy: true,
        },
      }),
    ]);

    // Safety verify: do not expose password hashes, tokens, or encryption keys
    const responsePayload = {
      profile: {
        id: customer.id,
        email: customer.email,
        role: customer.role,
        status: customer.status || "active",
        lastLoginAt: customer.lastLoginAt ? customer.lastLoginAt.toISOString() : null,
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
        billingTransactions: billingTxs.map((tx) => ({
          id: tx.id,
          transactionId: tx.transactionId,
          plan: tx.plan,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status,
          paymentProvider: tx.paymentProvider,
          paymentDate: tx.paymentDate.toISOString(),
          failureReason: tx.failureReason,
          utrNumber: tx.utrNumber,
          receiptUrl: tx.receiptUrl,
          verifiedAt: tx.verifiedAt ? tx.verifiedAt.toISOString() : null,
          verifiedBy: tx.verifiedBy,
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
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Administrator access denied. Master Administrator privileges required." } },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  try {
    const customer = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        userSubscription: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Customer not found" } },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      firstName,
      lastName,
      displayName,
      phoneNumber,
      country,
      currency,
      timezone,
      status,
      userStatus,
      emailVerified,
    } = body;

    // 1. Update Profile if relevant fields are passed
    const profileUpdates: Record<string, any> = {};
    if (typeof firstName === "string") profileUpdates.firstName = firstName.trim();
    if (typeof lastName === "string") profileUpdates.lastName = lastName.trim();
    if (typeof displayName === "string") profileUpdates.displayName = displayName.trim();
    if (typeof phoneNumber === "string") profileUpdates.phoneNumber = phoneNumber.trim();
    if (typeof country === "string") profileUpdates.country = country.trim().toUpperCase();
    if (typeof currency === "string") profileUpdates.currency = currency.trim().toUpperCase();
    if (typeof timezone === "string") profileUpdates.timezone = timezone.trim();

    if (Object.keys(profileUpdates).length > 0) {
      await prisma.profile.upsert({
        where: { userId: id },
        update: profileUpdates,
        create: {
          userId: id,
          firstName: profileUpdates.firstName || "",
          lastName: profileUpdates.lastName || "",
          displayName: profileUpdates.displayName || customer.email.split("@")[0],
          phoneNumber: profileUpdates.phoneNumber || null,
          country: profileUpdates.country || "US",
          region: profileUpdates.country || "US",
          currency: profileUpdates.currency || "USD",
          timezone: profileUpdates.timezone || "UTC",
        },
      });
    }

    // 2. Update user status/verification (Never allow changing role to admin or editing passwordHash here)
    const userUpdates: Record<string, any> = {};
    if (typeof emailVerified === "boolean") {
      userUpdates.emailVerified = emailVerified;
    }
    if (typeof userStatus === "string") {
      userUpdates.status = userStatus;
    }
    if (Object.keys(userUpdates).length > 0) {
      await prisma.user.update({
        where: { id },
        data: userUpdates,
      });
    }

    // 3. Update subscription status if specified
    let updatedSubscription = customer.userSubscription;
    if (status && typeof status === "string") {
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

    // 4. Record Audit Log
    const auditAction =
      userStatus === "suspended"
        ? "customer_suspended"
        : userStatus === "active"
        ? "customer_activated"
        : userStatus === "archived"
        ? "customer_archived"
        : "customer_details_edited";

    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: auditAction,
        targetType: "user",
        targetId: id,
        details: JSON.stringify({
          editedFields: Object.keys(profileUpdates),
          userStatus,
          subscriptionStatus: status,
          emailVerified,
        }),
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    // 5. Fetch updated customer state
    const refreshed = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        userSubscription: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Customer details updated successfully.",
      data: {
        id,
        email: refreshed?.email,
        status: refreshed?.status,
        profile: refreshed?.profile,
        subscriptionStatus: refreshed?.userSubscription?.status || "active",
      },
    });
  } catch (error: unknown) {
    console.error("[Admin API] Failed to update customer details:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update customer details" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Administrator access denied. Master Administrator privileges required." } },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  try {
    const customer = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            payments: true,
            billingTransactions: true,
            documents: true,
            reminders: true,
            vehicles: true,
            expenses: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Customer not found" } },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    if (body.confirmText !== "DELETE") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Explicit confirmation required. Please confirm by providing confirmText: 'DELETE'.",
          },
        },
        { status: 400 }
      );
    }

    const hasFinancialRecords =
      customer._count.payments > 0 || customer._count.billingTransactions > 0;

    if (hasFinancialRecords) {
      // Safe Archival (Soft Delete) to preserve financial integrity and audit trail
      await prisma.$transaction([
        prisma.user.update({
          where: { id },
          data: { status: "archived" },
        }),
        prisma.userSubscription.updateMany({
          where: { userId: id },
          data: { status: "canceled" },
        }),
        prisma.adminAuditLog.create({
          data: {
            adminId: admin.id,
            adminEmail: admin.email,
            action: "customer_archived",
            targetType: "user",
            targetId: id,
            details: JSON.stringify({
              reason: "Safe account deletion requested. Archived to preserve financial ledger and tax compliance.",
              paymentsCount: customer._count.payments,
              billingTransactionsCount: customer._count.billingTransactions,
            }),
            ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        mode: "archived",
        message: "Customer account archived safely. Financial history and payment transaction records have been preserved.",
      });
    } else {
      // Safe Hard Deletion (No financial records exist)
      await prisma.$transaction(async (tx) => {
        await tx.documentFile.deleteMany({ where: { document: { userId: id } } });
        await tx.document.deleteMany({ where: { userId: id } });
        await tx.reminder.deleteMany({ where: { userId: id } });
        await tx.expense.deleteMany({ where: { userId: id } });
        await tx.vehicle.deleteMany({ where: { userId: id } });
        await tx.budget.deleteMany({ where: { userId: id } });
        await tx.importantDate.deleteMany({ where: { userId: id } });
        await tx.familyMember.deleteMany({ where: { userId: id } });
        await tx.subscription.deleteMany({ where: { userId: id } });
        await tx.notification.deleteMany({ where: { userId: id } });
        await tx.userSubscription.deleteMany({ where: { userId: id } });
        await tx.profile.deleteMany({ where: { userId: id } });
        await tx.session.deleteMany({ where: { userId: id } });
        await tx.account.deleteMany({ where: { userId: id } });

        await tx.adminAuditLog.create({
          data: {
            adminId: admin.id,
            adminEmail: admin.email,
            action: "customer_hard_deleted",
            targetType: "user",
            targetId: id,
            details: JSON.stringify({
              email: customer.email,
              reason: "Customer account safely hard deleted (no financial records existed).",
            }),
            ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
          },
        });

        await tx.user.delete({ where: { id } });
      });

      return NextResponse.json({
        success: true,
        mode: "deleted",
        message: "Customer account and non-financial records permanently deleted.",
      });
    }
  } catch (error: unknown) {
    console.error("[Admin API] Failed to delete/archive customer:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete/archive customer account" } },
      { status: 500 }
    );
  }
}


