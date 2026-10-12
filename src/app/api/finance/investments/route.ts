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
    const investments = await prisma.investment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: { investments },
    });
  } catch (err: unknown) {
    console.error("[Get Investments Error]:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to retrieve investments" } },
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
      name,
      fundHouse,
      folioNumber,
      type = "mutual_fund",
      investmentMode = "lumpsum",
      sipAmount,
      sipFrequency = "monthly",
      sipDay,
      sipStartDate,
      sipEndDate,
      totalInvested = 0,
      currentValuation = 0,
      units,
      nav,
      currency = "USD",
      notes,
      status = "active",
    } = body;

    if (!name || String(name).trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Investment name is required" } },
        { status: 400 }
      );
    }

    const investment = await prisma.investment.create({
      data: {
        userId: user.id,
        name: String(name).trim(),
        fundHouse: fundHouse ? String(fundHouse).trim() : null,
        folioNumber: folioNumber ? String(folioNumber).trim() : null,
        type: String(type).trim() || "mutual_fund",
        investmentMode: String(investmentMode).trim() || "lumpsum",
        sipAmount: sipAmount !== undefined && sipAmount !== null ? Number(sipAmount) : null,
        sipFrequency: sipFrequency ? String(sipFrequency).trim() : "monthly",
        sipDay: sipDay ? Number(sipDay) : null,
        sipStartDate: sipStartDate ? new Date(sipStartDate) : null,
        sipEndDate: sipEndDate ? new Date(sipEndDate) : null,
        totalInvested: Math.max(0, Number(totalInvested || 0)),
        currentValuation: Math.max(0, Number(currentValuation || totalInvested || 0)),
        units: units !== undefined && units !== null ? Number(units) : null,
        nav: nav !== undefined && nav !== null ? Number(nav) : null,
        currency: String(currency || "USD").toUpperCase(),
        lastValuationDate: new Date(),
        notes: notes ? String(notes).trim() : null,
        status: String(status || "active"),
      },
    });

    return NextResponse.json({
      success: true,
      data: { investment },
    });
  } catch (err: unknown) {
    console.error("[Create Investment Error]:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create investment" } },
      { status: 500 }
    );
  }
}
