// src/app/api/admin/payments/verify/route.ts
import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Administrator access denied." } },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { transactionId, action, rejectionReason } = body;

    if (!transactionId || !["verify", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_FAILED", message: "Transaction ID and action ('verify' or 'reject') are required." } },
        { status: 400 }
      );
    }

    const transaction = await prisma.billingTransaction.findFirst({
      where: {
        OR: [
          { id: transactionId },
          { transactionId },
        ],
      },
      include: {
        user: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Transaction not found." } },
        { status: 404 }
      );
    }

    // Idempotency: If already paid and action is verify, return current status safely
    if (transaction.status === "paid" && action === "verify") {
      return NextResponse.json({
        success: true,
        message: "Transaction has already been verified and paid.",
        data: {
          id: transaction.id,
          transactionId: transaction.transactionId,
          status: transaction.status,
          verifiedAt: transaction.verifiedAt,
        },
      });
    }

    if (action === "verify") {
      // 1. Mark transaction as paid and verified
      const updatedTx = await prisma.billingTransaction.update({
        where: { id: transaction.id },
        data: {
          status: "paid",
          verifiedBy: admin.id,
          verifiedAt: new Date(),
          failureReason: null,
        },
      });

      // 2. Activate customer subscription for the verified plan
      const planName = transaction.plan === "family" ? "Family Circle Plus" : "Life Pro Premium";
      const now = new Date();
      const periodEnd = new Date(now);
      if (transaction.billingCycle === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      await prisma.userSubscription.upsert({
        where: { userId: transaction.userId },
        create: {
          userId: transaction.userId,
          plan: transaction.plan,
          planName,
          status: "active",
          billingInterval: transaction.billingCycle || "monthly",
          billingCycle: transaction.billingCycle || "monthly",
          amount: transaction.amount,
          currency: transaction.currency,
          provider: transaction.paymentProvider,
          startedAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
        update: {
          plan: transaction.plan,
          planName,
          status: "active",
          billingInterval: transaction.billingCycle || "monthly",
          billingCycle: transaction.billingCycle || "monthly",
          amount: transaction.amount,
          currency: transaction.currency,
          provider: transaction.paymentProvider,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
        },
      });

      // 3. Dispatch high-priority customer notification
      await prisma.notification.create({
        data: {
          userId: transaction.userId,
          title: "Payment Approved — Premium Activated!",
          message: `Your payment of ${transaction.amount} ${transaction.currency} (UTR: ${transaction.utrNumber || transaction.transactionId}) has been verified. Your ${planName} subscription is now active!`,
          type: "subscription",
          priority: "high",
          category: "payment",
          isRead: false,
        },
      });

      // 4. Log audit event
      await prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          adminEmail: admin.email,
          action: "payment_manually_verified",
          targetType: "payment",
          targetId: transaction.id,
          details: JSON.stringify({
            userId: transaction.userId,
            customerEmail: transaction.user.email,
            plan: transaction.plan,
            amount: transaction.amount,
            currency: transaction.currency,
            utrNumber: transaction.utrNumber,
          }),
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Payment successfully verified and customer subscription activated.",
        data: {
          id: updatedTx.id,
          transactionId: updatedTx.transactionId,
          status: updatedTx.status,
          verifiedAt: updatedTx.verifiedAt,
        },
      });
    } else {
      // Reject payment
      const rejectionNote = typeof rejectionReason === "string" && rejectionReason.trim()
        ? rejectionReason.trim()
        : "Payment verification rejected by administrator.";

      const updatedTx = await prisma.billingTransaction.update({
        where: { id: transaction.id },
        data: {
          status: "failed",
          failureReason: rejectionNote,
          verifiedBy: admin.id,
          verifiedAt: new Date(),
        },
      });

      // Dispatch rejection alert notification to customer
      await prisma.notification.create({
        data: {
          userId: transaction.userId,
          title: "Payment Verification Notice",
          message: `Your payment of ${transaction.amount} ${transaction.currency} (UTR: ${transaction.utrNumber || transaction.transactionId}) could not be verified. Reason: ${rejectionNote}. Please re-check transaction details or contact support.`,
          type: "alert",
          priority: "high",
          category: "payment",
          isRead: false,
        },
      });

      await prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          adminEmail: admin.email,
          action: "payment_manually_rejected",
          targetType: "payment",
          targetId: transaction.id,
          details: JSON.stringify({
            userId: transaction.userId,
            customerEmail: transaction.user.email,
            reason: updatedTx.failureReason,
            utrNumber: transaction.utrNumber,
          }),
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Payment has been marked as failed / rejected.",
        data: {
          id: updatedTx.id,
          transactionId: updatedTx.transactionId,
          status: updatedTx.status,
          failureReason: updatedTx.failureReason,
        },
      });
    }
  } catch (error: any) {
    console.error("[Verify Payment Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to process payment verification" } },
      { status: 500 }
    );
  }
}
