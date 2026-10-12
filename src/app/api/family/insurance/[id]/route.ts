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
    const existing = await prisma.healthInsurance.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Health insurance policy not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      policyName,
      provider,
      policyNumber,
      sumInsured,
      premiumAmount,
      premiumFrequency,
      startDate,
      expiryDate,
      coveredMembers,
      tpaContact,
      cashlessHospitals,
      notes,
      status,
    } = body;

    const expDate = expiryDate ? new Date(expiryDate) : existing.expiryDate;
    const computedStatus = status || (expDate < new Date() ? "expired" : "active");

    const updated = await prisma.healthInsurance.update({
      where: { id },
      data: {
        ...(policyName !== undefined ? { policyName: String(policyName).trim() } : {}),
        ...(provider !== undefined ? { provider: String(provider).trim() } : {}),
        ...(policyNumber !== undefined ? { policyNumber: String(policyNumber).trim() } : {}),
        ...(sumInsured !== undefined ? { sumInsured: Math.max(0, Number(sumInsured)) } : {}),
        ...(premiumAmount !== undefined ? { premiumAmount: Math.max(0, Number(premiumAmount)) } : {}),
        ...(premiumFrequency !== undefined ? { premiumFrequency: String(premiumFrequency) } : {}),
        ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
        ...(expiryDate !== undefined ? { expiryDate: expDate } : {}),
        ...(coveredMembers !== undefined ? { coveredMembers: coveredMembers ? String(coveredMembers).trim() : null } : {}),
        ...(tpaContact !== undefined ? { tpaContact: tpaContact ? String(tpaContact).trim() : null } : {}),
        ...(cashlessHospitals !== undefined ? { cashlessHospitals: cashlessHospitals ? String(cashlessHospitals).trim() : null } : {}),
        ...(notes !== undefined ? { notes: notes ? String(notes).trim() : null } : {}),
        status: computedStatus,
      },
    });

    return NextResponse.json({
      success: true,
      data: { policy: updated },
    });
  } catch (err: unknown) {
    console.error("[Update Health Insurance Error]:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update health insurance policy" } },
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
    const existing = await prisma.healthInsurance.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Health insurance policy not found" } },
        { status: 404 }
      );
    }

    await prisma.healthInsurance.delete({
      where: { id },
    });

    // Clean up linked reminder
    try {
      await prisma.reminder.deleteMany({
        where: { relatedType: "insurance", relatedId: id, userId: user.id },
      });
    } catch {
      // Ignore reminder cleanup error
    }

    return NextResponse.json({
      success: true,
      data: { message: "Health insurance policy deleted successfully" },
    });
  } catch (err: unknown) {
    console.error("[Delete Health Insurance Error]:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete health insurance policy" } },
      { status: 500 }
    );
  }
}
