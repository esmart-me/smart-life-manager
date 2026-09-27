import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { confirmation } = body;

    if (confirmation !== "CLEAR") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFIRMATION_REQUIRED",
            message: 'You must type "CLEAR" to confirm deleting your personal records.',
          },
        },
        { status: 400 }
      );
    }

    // Atomically delete all customer-created data records
    const result = await prisma.$transaction(async (tx) => {
      const docFiles = await tx.documentFile.deleteMany({ where: { userId: user.id } });
      const docs = await tx.document.deleteMany({ where: { userId: user.id } });
      const reminders = await tx.reminder.deleteMany({ where: { userId: user.id } });
      const payments = await tx.payment.deleteMany({ where: { userId: user.id } });
      const expenses = await tx.expense.deleteMany({ where: { userId: user.id } });
      const budgets = await tx.budget.deleteMany({ where: { userId: user.id } });
      const vehicles = await tx.vehicle.deleteMany({ where: { userId: user.id } });
      const subscriptions = await tx.subscription.deleteMany({ where: { userId: user.id } });
      const dates = await tx.importantDate.deleteMany({ where: { userId: user.id } });
      const family = await tx.familyMember.deleteMany({ where: { userId: user.id } });
      const notifications = await tx.notification.deleteMany({ where: { userId: user.id } });

      return {
        docs: docs.count,
        reminders: reminders.count,
        payments: payments.count,
        expenses: expenses.count,
        budgets: budgets.count,
        vehicles: vehicles.count,
        subscriptions: subscriptions.count,
        dates: dates.count,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Personal application records successfully cleared. Your account remains active.",
      data: { cleared: result },
    });
  } catch (error) {
    console.error("[Clear Data Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "CLEAR_DATA_FAILED", message: "Failed to clear records" } },
      { status: 500 }
    );
  }
}
