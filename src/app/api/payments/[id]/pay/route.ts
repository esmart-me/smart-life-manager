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
    const newPaidCount = (payment.paidTenureMonths ?? 0) + 1;
    const isLoanClosed = Boolean(
      payment.totalTenureMonths && newPaidCount >= payment.totalTenureMonths
    );

    // 1. Mark current payment as paid and increment tenure
    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: {
        isPaid: true,
        paidAt: now,
        paidTenureMonths: newPaidCount,
      },
    });

    let nextPayment = null;

    // 2. If recurring and loan not completed/closed, generate next occurrence correctly!
    if (
      payment.isRecurring &&
      payment.frequency &&
      payment.frequency !== "none" &&
      !isLoanClosed
    ) {
      const anchorDay = payment.dueDate.getDate();
      const nextDueDate = calculateNextOccurrence(payment.dueDate, payment.frequency, anchorDay);

      // Check if next due date exceeds loan closing date cutoff
      const isPastClosingDate = payment.loanClosingDate && nextDueDate > payment.loanClosingDate;

      if (!isPastClosingDate) {
        // Duplicate Prevention Check: verify next recurring payment doesn't already exist
        const existingNext = await prisma.payment.findFirst({
          where: {
            userId: user.id,
            title: payment.title,
            dueDate: nextDueDate,
            isPaid: false,
          },
        });

        if (!existingNext) {
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
              // Propagate Loan/EMI metadata
              loanCategory: payment.loanCategory,
              bankName: payment.bankName,
              accountRef: payment.accountRef,
              principalAmount: payment.principalAmount,
              interestRate: payment.interestRate,
              totalTenureMonths: payment.totalTenureMonths,
              paidTenureMonths: newPaidCount,
              loanStartDate: payment.loanStartDate,
              loanClosingDate: payment.loanClosingDate,
              reminderLeadDays: payment.reminderLeadDays,
            },
          });
        } else {
          nextPayment = existingNext;
        }
      }
    }

    const currentStatus = isLoanClosed ? "Closed" : calculatePaymentStatus(updatedPayment.dueDate, true);
    const nextStatus = nextPayment
      ? calculatePaymentStatus(nextPayment.dueDate, false)
      : null;

    const message = isLoanClosed
      ? `Final EMI paid! Loan "${payment.title}" is now fully completed.`
      : nextPayment
      ? "Payment marked as paid and next recurring cycle scheduled"
      : "Payment marked as paid";

    return NextResponse.json({
      success: true,
      message,
      data: {
        payment: { ...updatedPayment, status: currentStatus },
        nextPayment: nextPayment ? { ...nextPayment, status: nextStatus } : null,
        isLoanClosed,
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
