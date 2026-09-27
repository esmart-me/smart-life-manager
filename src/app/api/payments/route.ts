import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const payments = await prisma.payment.findMany({
    where: { userId: user.id },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json({ success: true, data: { payments } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { title, payee, amount, currency, dueDate, category, isPaid } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TITLE", message: "Payment title is required" } },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_AMOUNT", message: "A valid positive payment amount is required" } },
        { status: 400 }
      );
    }

    if (!dueDate) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DUE_DATE", message: "Due date is required" } },
        { status: 400 }
      );
    }

    const cleanDueDate = new Date(dueDate);
    if (isNaN(cleanDueDate.getTime())) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DUE_DATE", message: "Invalid due date format" } },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        title: title.trim(),
        payee: payee ? String(payee).trim() : null,
        amount: numAmount,
        currency: currency || "USD",
        dueDate: cleanDueDate,
        category: category || "bill",
        isPaid: Boolean(isPaid),
        paidAt: isPaid ? new Date() : null,
      },
    });

    return NextResponse.json(
      { success: true, message: "Payment saved successfully", data: { payment } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Payments POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_FAILED", message: "Failed to create payment" } },
      { status: 500 }
    );
  }
}
