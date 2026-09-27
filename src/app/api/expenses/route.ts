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

  const expenses = await prisma.expense.findMany({
    where: { userId: user.id },
    orderBy: { spentAt: "desc" },
  });

  return NextResponse.json({ success: true, data: { expenses } });
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
    const { title, amount, currency, category, spentAt, merchant, paymentMethod, notes } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TITLE", message: "Expense title is required" } },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_AMOUNT", message: "A valid positive expense amount is required" } },
        { status: 400 }
      );
    }

    const cleanSpentAt = spentAt ? new Date(spentAt) : new Date();

    const expense = await prisma.expense.create({
      data: {
        userId: user.id,
        title: title.trim(),
        amount: numAmount,
        currency: currency || "USD",
        category: category || "general",
        spentAt: cleanSpentAt,
        merchant: merchant ? String(merchant).trim() : null,
        paymentMethod: paymentMethod || "card",
        notes: notes ? String(notes).trim() : null,
      },
    });

    return NextResponse.json(
      { success: true, message: "Expense saved successfully", data: { expense } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Expenses POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_FAILED", message: "Failed to create expense" } },
      { status: 500 }
    );
  }
}
