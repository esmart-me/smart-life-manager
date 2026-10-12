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
    const policies = await prisma.healthInsurance.findMany({
      where: { userId: user.id },
      orderBy: { expiryDate: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: { policies },
    });
  } catch (err: unknown) {
    console.error("[Get Health Insurance Error]:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to retrieve insurance policies" } },
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
      policyName,
      provider,
      policyNumber,
      sumInsured,
      premiumAmount,
      premiumFrequency = "yearly",
      startDate,
      expiryDate,
      coveredMembers,
      tpaContact,
      cashlessHospitals,
      notes,
    } = body;

    if (!policyName || !provider || !policyNumber || sumInsured === undefined || !startDate || !expiryDate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "policyName, provider, policyNumber, sumInsured, startDate, and expiryDate are required",
          },
        },
        { status: 400 }
      );
    }

    const expDate = new Date(expiryDate);
    const now = new Date();
    const status = expDate < now ? "expired" : "active";

    const policy = await prisma.healthInsurance.create({
      data: {
        userId: user.id,
        policyName: String(policyName).trim(),
        provider: String(provider).trim(),
        policyNumber: String(policyNumber).trim(),
        sumInsured: Math.max(0, Number(sumInsured)),
        premiumAmount: Math.max(0, Number(premiumAmount || 0)),
        premiumFrequency: String(premiumFrequency || "yearly"),
        startDate: new Date(startDate),
        expiryDate: expDate,
        coveredMembers: coveredMembers ? String(coveredMembers).trim() : null,
        tpaContact: tpaContact ? String(tpaContact).trim() : null,
        cashlessHospitals: cashlessHospitals ? String(cashlessHospitals).trim() : null,
        notes: notes ? String(notes).trim() : null,
        status,
      },
    });

    // Create a renewal reminder 15 days before expiry
    const reminderDate = new Date(expDate);
    reminderDate.setDate(reminderDate.getDate() - 15);
    const reminderDueDate = reminderDate > now ? reminderDate : expDate;

    try {
      await prisma.reminder.create({
        data: {
          userId: user.id,
          title: `Health Insurance Renewal: ${policy.policyName} (${policy.provider})`,
          description: `Policy #${policy.policyNumber} expires on ${expDate.toDateString()}. Contact TPA / Provider for renewal.`,
          dueDate: reminderDueDate,
          priority: "high",
          category: "general",
          relatedType: "insurance",
          relatedId: policy.id,
        },
      });
    } catch (remErr) {
      console.warn("[Insurance Reminder Sync Warning]:", remErr);
    }

    return NextResponse.json({
      success: true,
      data: { policy },
    });
  } catch (err: unknown) {
    console.error("[Create Health Insurance Error]:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create health insurance policy" } },
      { status: 500 }
    );
  }
}
