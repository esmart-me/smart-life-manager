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
      // 1. Travel
      await tx.tripPackingItem.deleteMany({ where: { userId: user.id } });
      await tx.tripItinerary.deleteMany({ where: { userId: user.id } });
      const trips = await tx.trip.deleteMany({ where: { userId: user.id } });

      // 2. Wellness & Habits
      await tx.habitLog.deleteMany({ where: { userId: user.id } });
      const habits = await tx.habit.deleteMany({ where: { userId: user.id } });
      const wellness = await tx.wellnessLog.deleteMany({ where: { userId: user.id } });

      // 3. Family Organizer
      const familyShopping = await tx.familyShoppingItem.deleteMany({ where: { userId: user.id } });
      const familyTasks = await tx.familyTask.deleteMany({ where: { userId: user.id } });
      const familyEvents = await tx.familyEvent.deleteMany({ where: { userId: user.id } });

      // 4. Knowledge Wallet
      const notes = await tx.knowledgeNote.deleteMany({ where: { userId: user.id } });
      const collections = await tx.knowledgeCollection.deleteMany({ where: { userId: user.id } });

      // 5. Planner & Inventory
      const planner = await tx.plannerTask.deleteMany({ where: { userId: user.id } });
      await tx.inventoryServiceLog.deleteMany({ where: { userId: user.id } });
      const inventory = await tx.inventoryItem.deleteMany({ where: { userId: user.id } });

      // 6. Core Modules
      await tx.documentFile.deleteMany({ where: { userId: user.id } });
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
        family: family.count,
        planner: planner.count,
        inventory: inventory.count,
        familyEvents: familyEvents.count,
        familyTasks: familyTasks.count,
        familyShopping: familyShopping.count,
        habits: habits.count,
        wellness: wellness.count,
        trips: trips.count,
        notes: notes.count,
        notifications: notifications.count,
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
