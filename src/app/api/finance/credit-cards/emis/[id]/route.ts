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
    const existing = await prisma.creditCardEmi.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Credit card EMI not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      merchant,
      totalAmount,
      monthlyEmi,
      interestRate,
      tenureMonths,
      paidMonths,
      status,
      notes,
    } = body;

    const newTenure = tenureMonths !== undefined ? Math.max(1, Number(tenureMonths)) : existing.tenureMonths;
    const newPaid = paidMonths !== undefined ? Math.max(0, Number(paidMonths)) : existing.paidMonths;
    const computedStatus = status || (newPaid >= newTenure ? "completed" : "active");

    const updated = await prisma.creditCardEmi.update({
      where: { id },
      data: {
        ...(merchant !== undefined ? { merchant: String(merchant).trim() } : {}),
        ...(totalAmount !== undefined ? { totalAmount: Math.max(0, Number(totalAmount)) } : {}),
        ...(monthlyEmi !== undefined ? { monthlyEmi: Math.max(0, Number(monthlyEmi)) } : {}),
        ...(interestRate !== undefined ? { interestRate: interestRate !== null ? Number(interestRate) : null } : {}),
        ...(tenureMonths !== undefined ? { tenureMonths: newTenure } : {}),
        ...(paidMonths !== undefined ? { paidMonths: newPaid } : {}),
        status: computedStatus,
        ...(notes !== undefined ? { notes: notes ? String(notes).trim() : null } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      data: { emi: updated },
    });
  } catch (err: unknown) {
    console.error("[Update Credit Card EMI Error]:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update credit card EMI" } },
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
    const existing = await prisma.creditCardEmi.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Credit card EMI not found" } },
        { status: 404 }
      );
    }

    await prisma.creditCardEmi.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { message: "Credit card EMI deleted successfully" },
    });
  } catch (err: unknown) {
    console.error("[Delete Credit Card EMI Error]:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete credit card EMI" } },
      { status: 500 }
    );
  }
}
