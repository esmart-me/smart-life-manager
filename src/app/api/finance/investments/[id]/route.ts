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
    const existing = await prisma.investment.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Investment not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      fundHouse,
      folioNumber,
      type,
      investmentMode,
      sipAmount,
      sipFrequency,
      sipDay,
      sipStartDate,
      sipEndDate,
      totalInvested,
      currentValuation,
      units,
      nav,
      currency,
      notes,
      status,
    } = body;

    const updated = await prisma.investment.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(fundHouse !== undefined ? { fundHouse: fundHouse ? String(fundHouse).trim() : null } : {}),
        ...(folioNumber !== undefined ? { folioNumber: folioNumber ? String(folioNumber).trim() : null } : {}),
        ...(type !== undefined ? { type: String(type).trim() } : {}),
        ...(investmentMode !== undefined ? { investmentMode: String(investmentMode).trim() } : {}),
        ...(sipAmount !== undefined ? { sipAmount: sipAmount !== null ? Number(sipAmount) : null } : {}),
        ...(sipFrequency !== undefined ? { sipFrequency: sipFrequency ? String(sipFrequency).trim() : "monthly" } : {}),
        ...(sipDay !== undefined ? { sipDay: sipDay ? Number(sipDay) : null } : {}),
        ...(sipStartDate !== undefined ? { sipStartDate: sipStartDate ? new Date(sipStartDate) : null } : {}),
        ...(sipEndDate !== undefined ? { sipEndDate: sipEndDate ? new Date(sipEndDate) : null } : {}),
        ...(totalInvested !== undefined ? { totalInvested: Math.max(0, Number(totalInvested)) } : {}),
        ...(currentValuation !== undefined ? { currentValuation: Math.max(0, Number(currentValuation)) } : {}),
        ...(units !== undefined ? { units: units !== null ? Number(units) : null } : {}),
        ...(nav !== undefined ? { nav: nav !== null ? Number(nav) : null } : {}),
        ...(currency !== undefined ? { currency: String(currency).toUpperCase() } : {}),
        lastValuationDate: currentValuation !== undefined ? new Date() : existing.lastValuationDate,
        ...(notes !== undefined ? { notes: notes ? String(notes).trim() : null } : {}),
        ...(status !== undefined ? { status: String(status) } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      data: { investment: updated },
    });
  } catch (err: unknown) {
    console.error("[Update Investment Error]:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update investment" } },
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
    const existing = await prisma.investment.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Investment not found" } },
        { status: 404 }
      );
    }

    await prisma.investment.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { message: "Investment deleted successfully" },
    });
  } catch (err: unknown) {
    console.error("[Delete Investment Error]:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete investment" } },
      { status: 500 }
    );
  }
}
