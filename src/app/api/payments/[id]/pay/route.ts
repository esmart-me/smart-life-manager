import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateNextOccurrence, calculatePaymentStatus } from "@/lib/finance/calculations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment || payment.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Payment not found" } },
        { status: 404 }
      );
    }

    const now = new Date();

    // 1. Mark current payment as paid
    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: {
        isPaid: true,
        paidAt: now,
      },
    });

    let nextPayment = null;

    // 2. If recurring, generate next occurrence correctly!
    if (payment.isRecurring && payment.frequency && payment.frequency !== "none") {
      const nextDueDate = calculateNextOccurrence(payment.dueDate, payment.frequency);

      nextPayment = await prisma.payment.create({
        data: {
          userId: user.id,
          title: payment.title,
          payee: payment.payee,
          amount: payment.amount,
          currency: payment.currency,
          dueDate: nextDueDate,
          category: payment.category,
          isRecurring: true,
          frequency: payment.frequency,
          notes: payment.notes,
          isPaid: false,
          paidAt: null,
        },
      });
    }

    const currentStatus = calculatePaymentStatus(updatedPayment.dueDate, true);
    const nextStatus = nextPayment
      ? calculatePaymentStatus(nextPayment.dueDate, false)
      : null;

    return NextResponse.json({
      success: true,
      message: nextPayment
        ? "Payment marked as paid and next recurring cycle scheduled"
        : "Payment marked as paid",
      data: {
        payment: { ...updatedPayment, status: currentStatus },
        nextPayment: nextPayment ? { ...nextPayment, status: nextStatus } : null,
      },
    });
  } catch (error) {
    console.error("[Payment Pay PATCH Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "PAY_FAILED", message: "Failed to mark payment as paid" } },
      { status: 500 }
    );
  }
}
