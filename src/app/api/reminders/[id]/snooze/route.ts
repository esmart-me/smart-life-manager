import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatRecurrenceLabel } from "@/lib/reminders/recurring";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/reminders/[id]/snooze
 * Snoozes a reminder by pushing its dueDate forward by the requested minutes.
 * Body: { minutes: number }  (5 | 10 | 30 | 60 | custom)
 */
export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const existing = await prisma.reminder.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Reminder not found" } },
        { status: 404 }
      );
    }

    // Customer isolation: only the owner can snooze their own reminder
    if (existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const minutes = Number(body.minutes);

    if (!minutes || isNaN(minutes) || minutes < 1 || minutes > 43200) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_SNOOZE",
            message: "Snooze duration must be between 1 and 43200 minutes (30 days).",
          },
        },
        { status: 400 }
      );
    }

    // Base snooze from now if overdue, or from current dueDate if still pending
    const now = new Date();
    const baseTime = existing.dueDate < now ? now : existing.dueDate;
    const newDueDate = new Date(baseTime.getTime() + minutes * 60 * 1000);

    const updated = await prisma.reminder.update({
      where: { id },
      data: {
        dueDate: newDueDate,
        status: "pending", // Ensure re-activated if it was snoozed
      },
    });

    const recurrenceLabel = formatRecurrenceLabel(updated.recurrenceRule);

    return NextResponse.json({
      success: true,
      message: `Reminder snoozed for ${minutes} minute(s). New due time: ${newDueDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      data: {
        reminder: {
          ...updated,
          recurrenceLabel,
        },
        snoozedMinutes: minutes,
        newDueDate: newDueDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("[Reminder Snooze POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to snooze reminder" } },
      { status: 500 }
    );
  }
}
