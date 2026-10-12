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

  try {
    const cards = await prisma.creditCard.findMany({
      where: { userId: user.id },
      include: {
        emis: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: { cards },
    });
  } catch (err: unknown) {
    console.error("[Get Credit Cards Error]:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to retrieve credit cards" } },
      { status: 500 }
    );
  }
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
    const {
      cardName,
      bank,
      network = "Visa",
      lastFour,
      creditLimit,
      currentBalance = 0,
      statementDay = 1,
      dueDay = 20,
      minimumDue = 0,
      totalDue = 0,
      currency = "USD",
      notes,
    } = body;

    if (!cardName || !bank || !lastFour || creditLimit === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "cardName, bank, lastFour, and creditLimit are required",
          },
        },
        { status: 400 }
      );
    }

    // Sanitize lastFour: MUST only be 4 digits
    const cleanLastFour = String(lastFour).replace(/\D/g, "").slice(-4);
    if (cleanLastFour.length !== 4) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "lastFour must contain exactly 4 digits",
          },
        },
        { status: 400 }
      );
    }

    const card = await prisma.creditCard.create({
      data: {
        userId: user.id,
        cardName: String(cardName).trim(),
        bank: String(bank).trim(),
        network: String(network).trim() || "Visa",
        lastFour: cleanLastFour,
        creditLimit: Math.max(0, Number(creditLimit)),
        currentBalance: Math.max(0, Number(currentBalance || 0)),
        statementDay: Math.min(31, Math.max(1, Number(statementDay || 1))),
        dueDay: Math.min(31, Math.max(1, Number(dueDay || 20))),
        minimumDue: Math.max(0, Number(minimumDue || 0)),
        totalDue: Math.max(0, Number(totalDue || 0)),
        currency: String(currency || "USD").toUpperCase(),
        notes: notes ? String(notes).trim() : null,
      },
      include: {
        emis: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { card },
    });
  } catch (err: unknown) {
    console.error("[Create Credit Card Error]:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create credit card" } },
      { status: 500 }
    );
  }
}
