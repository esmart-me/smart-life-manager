import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

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
    const {
      cardId,
      merchant,
      totalAmount,
      monthlyEmi,
      interestRate = 0,
      tenureMonths,
      paidMonths = 0,
      startDate,
      notes,
    } = body;

    if (!cardId || !merchant || totalAmount === undefined || monthlyEmi === undefined || !tenureMonths) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "cardId, merchant, totalAmount, monthlyEmi, and tenureMonths are required",
          },
        },
        { status: 400 }
      );
    }

    // Verify card belongs to user
    const card = await prisma.creditCard.findFirst({
      where: { id: cardId, userId: user.id },
    });

    if (!card) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Credit card not found" } },
        { status: 404 }
      );
    }

    const emi = await prisma.creditCardEmi.create({
      data: {
        cardId,
        userId: user.id,
        merchant: String(merchant).trim(),
        totalAmount: Math.max(0, Number(totalAmount)),
        monthlyEmi: Math.max(0, Number(monthlyEmi)),
        interestRate: interestRate !== undefined && interestRate !== null ? Number(interestRate) : null,
        tenureMonths: Math.max(1, Number(tenureMonths)),
        paidMonths: Math.max(0, Number(paidMonths || 0)),
        startDate: startDate ? new Date(startDate) : new Date(),
        status: Number(paidMonths || 0) >= Number(tenureMonths) ? "completed" : "active",
        notes: notes ? String(notes).trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: { emi },
    });
  } catch (err: unknown) {
    console.error("[Create Credit Card EMI Error]:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create credit card EMI" } },
      { status: 500 }
    );
  }
}
