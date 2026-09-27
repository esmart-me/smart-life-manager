import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateNextDueDate, formatRecurrenceLabel } from "@/lib/reminders/recurring";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const reminder = await prisma.reminder.findUnique({
      where: { id },
    });

    if (!reminder) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Reminder not found" } },
        { status: 404 }
      );
    }

    if (reminder.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    let markComplete = true;
    try {
      const body = await request.json();
      if (body.completed !== undefined) {
        markComplete = Boolean(body.completed);
      }
    } catch {
      // Default to toggle or true if body empty
      markComplete = reminder.status !== "completed";
    }

    if (markComplete) {
      // 1. Mark current reminder as completed
      const completedReminder = await prisma.reminder.update({
        where: { id },
        data: {
          status: "completed",
          completedAt: new Date(),
        },
      });

      // 2. If recurring, spawn the next scheduled occurrence!
      let nextReminder = null;
      if (reminder.isRecurring && reminder.recurrenceRule) {
        const nextDueDate = calculateNextDueDate(reminder.dueDate, reminder.recurrenceRule);

        nextReminder = await prisma.reminder.create({
          data: {
            userId: user.id,
            title: reminder.title,
            description: reminder.description,
            dueDate: nextDueDate,
            priority: reminder.priority,
            category: reminder.category,
            status: "pending",
            isRecurring: true,
            recurrenceRule: reminder.recurrenceRule,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: nextReminder
          ? "Reminder completed and next recurring occurrence scheduled"
          : "Reminder marked as completed",
        data: {
          reminder: {
            ...completedReminder,
            recurrenceLabel: formatRecurrenceLabel(completedReminder.recurrenceRule),
          },
          nextOccurrence: nextReminder
            ? {
                ...nextReminder,
                recurrenceLabel: formatRecurrenceLabel(nextReminder.recurrenceRule),
              }
            : null,
        },
      });
    } else {
      // Revert to pending
      const reverted = await prisma.reminder.update({
        where: { id },
        data: {
          status: "pending",
          completedAt: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Reminder restored to pending",
        data: {
          reminder: {
            ...reverted,
            recurrenceLabel: formatRecurrenceLabel(reverted.recurrenceRule),
          },
        },
      });
    }
  } catch (error) {
    console.error("[Reminder Complete PATCH Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to toggle reminder completion" } },
      { status: 500 }
    );
  }
}
