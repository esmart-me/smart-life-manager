import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatRecurrenceLabel } from "@/lib/reminders/recurring";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
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

    const recurrenceLabel = formatRecurrenceLabel(reminder.recurrenceRule);

    return NextResponse.json({
      success: true,
      data: {
        reminder: {
          ...reminder,
          recurrenceLabel,
        },
      },
    });
  } catch (error) {
    console.error("[Reminder GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch reminder" } },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const existing = await prisma.reminder.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Reminder not found" } },
        { status: 404 }
      );
    }

    if (existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      date,
      time,
      dueDate: rawDueDate,
      priority,
      category,
      repeat,
      customInterval,
      customUnit,
      reminderTiming,
      customMinutesBefore,
      timezone,
    } = body;

    let updatedDueDate = existing.dueDate;
    if (date) {
      const cleanTime = time && String(time).trim() ? String(time).trim() : "09:00";
      updatedDueDate = new Date(`${date}T${cleanTime}:00`);
    } else if (rawDueDate) {
      updatedDueDate = new Date(rawDueDate);
    }

    let isRecurring = existing.isRecurring;
    let recurrenceRule = existing.recurrenceRule;

    if (repeat !== undefined) {
      if (repeat === "none" || repeat === "one_time") {
        isRecurring = false;
        recurrenceRule = null;
      } else if (repeat === "custom") {
        isRecurring = true;
        const interval = Math.max(1, Number(customInterval) || 1);
        const unit = (customUnit || "days").toLowerCase();
        recurrenceRule = `custom:${interval}:${unit}`;
      } else {
        isRecurring = true;
        recurrenceRule = String(repeat).toLowerCase();
      }
    }

    const updated = await prisma.reminder.update({
      where: { id },
      data: {
        title: title ? String(title).trim() : existing.title,
        description: description !== undefined ? (description ? String(description).trim() : null) : existing.description,
        dueDate: updatedDueDate,
        priority: priority || existing.priority,
        category: category || existing.category,
        isRecurring,
        recurrenceRule,
        reminderTiming: reminderTiming !== undefined ? reminderTiming : (existing as any).reminderTiming || "exact",
        customMinutesBefore: customMinutesBefore !== undefined ? (customMinutesBefore ? Number(customMinutesBefore) : null) : (existing as any).customMinutesBefore,
        timezone: timezone !== undefined ? timezone : (existing as any).timezone,
      },
    });

    const recurrenceLabel = formatRecurrenceLabel(updated.recurrenceRule);

    return NextResponse.json({
      success: true,
      message: "Reminder updated successfully",
      data: {
        reminder: {
          ...updated,
          recurrenceLabel,
        },
      },
    });
  } catch (error) {
    console.error("[Reminder PUT Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_FAILED", message: "Failed to update reminder" } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const existing = await prisma.reminder.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Reminder not found" } },
        { status: 404 }
      );
    }

    if (existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    await prisma.reminder.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Reminder deleted successfully",
    });
  } catch (error) {
    console.error("[Reminder DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_FAILED", message: "Failed to delete reminder" } },
      { status: 500 }
    );
  }
}
