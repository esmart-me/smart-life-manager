import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const existing = await prisma.creditCard.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Credit card not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      cardName,
      bank,
      network,
      lastFour,
      creditLimit,
      currentBalance,
      statementDay,
      dueDay,
      minimumDue,
      totalDue,
      currency,
      notes,
    } = body;

    let cleanLastFour = existing.lastFour;
    if (lastFour !== undefined) {
      cleanLastFour = String(lastFour).replace(/\D/g, "").slice(-4);
      if (cleanLastFour.length !== 4) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "lastFour must be 4 digits" } },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.creditCard.update({
      where: { id },
      data: {
        ...(cardName !== undefined ? { cardName: String(cardName).trim() } : {}),
        ...(bank !== undefined ? { bank: String(bank).trim() } : {}),
        ...(network !== undefined ? { network: String(network).trim() } : {}),
        ...(lastFour !== undefined ? { lastFour: cleanLastFour } : {}),
        ...(creditLimit !== undefined ? { creditLimit: Math.max(0, Number(creditLimit)) } : {}),
        ...(currentBalance !== undefined ? { currentBalance: Math.max(0, Number(currentBalance)) } : {}),
        ...(statementDay !== undefined ? { statementDay: Math.min(31, Math.max(1, Number(statementDay))) } : {}),
        ...(dueDay !== undefined ? { dueDay: Math.min(31, Math.max(1, Number(dueDay))) } : {}),
        ...(minimumDue !== undefined ? { minimumDue: Math.max(0, Number(minimumDue)) } : {}),
        ...(totalDue !== undefined ? { totalDue: Math.max(0, Number(totalDue)) } : {}),
        ...(currency !== undefined ? { currency: String(currency).toUpperCase() } : {}),
        ...(notes !== undefined ? { notes: notes ? String(notes).trim() : null } : {}),
      },
      include: {
        emis: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { card: updated },
    });
  } catch (err: unknown) {
    console.error("[Update Credit Card Error]:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update credit card" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const existing = await prisma.creditCard.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Credit card not found" } },
        { status: 404 }
      );
    }

    await prisma.creditCard.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { message: "Credit card deleted successfully" },
    });
  } catch (err: unknown) {
    console.error("[Delete Credit Card Error]:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete credit card" } },
      { status: 500 }
    );
  }
}
