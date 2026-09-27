import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculatePaymentStatus } from "@/lib/finance/calculations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
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

    const status = calculatePaymentStatus(payment.dueDate, payment.isPaid);

    return NextResponse.json({
      success: true,
      data: { payment: { ...payment, status } },
    });
  } catch (error) {
    console.error("[Payment GET ID Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch payment" } },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Payment not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, payee, amount, currency, dueDate, category, frequency, isRecurring, notes, isPaid } = body;

    const dataToUpdate: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim() === "") {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_TITLE", message: "Title cannot be empty" } },
          { status: 400 }
        );
      }
      dataToUpdate.title = title.trim();
    }

    if (amount !== undefined) {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_AMOUNT", message: "Amount must be a positive number" } },
          { status: 400 }
        );
      }
      dataToUpdate.amount = numAmount;
    }

    if (dueDate !== undefined) {
      const cleanDueDate = new Date(dueDate);
      if (isNaN(cleanDueDate.getTime())) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_DUE_DATE", message: "Invalid due date format" } },
          { status: 400 }
        );
      }
      dataToUpdate.dueDate = cleanDueDate;
    }

    if (payee !== undefined) dataToUpdate.payee = payee ? String(payee).trim() : null;
    if (currency !== undefined) dataToUpdate.currency = String(currency).trim();
    if (category !== undefined) dataToUpdate.category = String(category).trim();
    if (notes !== undefined) dataToUpdate.notes = notes ? String(notes).trim() : null;

    if (frequency !== undefined || isRecurring !== undefined) {
      const recurring =
        isRecurring !== undefined
          ? Boolean(isRecurring)
          : Boolean(frequency && frequency !== "none");
      dataToUpdate.isRecurring = recurring;
      dataToUpdate.frequency = recurring ? (frequency || existing.frequency || "monthly") : null;
    }

    if (isPaid !== undefined) {
      const paid = Boolean(isPaid);
      dataToUpdate.isPaid = paid;
      dataToUpdate.paidAt = paid ? (existing.paidAt || new Date()) : null;
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: dataToUpdate,
    });

    const status = calculatePaymentStatus(updated.dueDate, updated.isPaid);

    return NextResponse.json({
      success: true,
      message: "Payment updated successfully",
      data: { payment: { ...updated, status } },
    });
  } catch (error) {
    console.error("[Payment PUT Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_FAILED", message: "Failed to update payment" } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Payment not found" } },
        { status: 404 }
      );
    }

    await prisma.payment.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Payment deleted successfully",
    });
  } catch (error) {
    console.error("[Payment DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_FAILED", message: "Failed to delete payment" } },
      { status: 500 }
    );
  }
}
