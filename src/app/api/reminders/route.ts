import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatRecurrenceLabel } from "@/lib/reminders/recurring";
import { notifyReminderEvent } from "@/lib/notifications/notification-service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const tab = (searchParams.get("tab") || "all").trim().toLowerCase();
  const categoryFilter = (searchParams.get("category") || "all").trim().toLowerCase();

  try {
    const rawReminders = await prisma.reminder.findMany({
      where: {
        userId: user.id,
        ...(categoryFilter !== "all" ? { category: categoryFilter } : {}),
      },
      orderBy: { dueDate: "asc" },
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const endOfTomorrow = new Date(endOfToday.getTime() + 24 * 60 * 60 * 1000);

    // End of current week (Sunday end of day)
    const dayOfWeek = now.getDay(); // 0 is Sunday
    const daysUntilEndOfWeek = (7 - dayOfWeek) % 7;
    const endOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + daysUntilEndOfWeek,
      23,
      59,
      59,
      999
    );

    const reminders = rawReminders
      .map((rem) => {
        const dueDate = new Date(rem.dueDate);
        const recurrenceLabel = formatRecurrenceLabel(rem.recurrenceRule);

        // Calculate grouping tag
        let groupTag: "today" | "tomorrow" | "this_week" | "upcoming" | "completed";
        if (rem.status === "completed") {
          groupTag = "completed";
        } else if (dueDate <= endOfToday) {
          // Includes past/overdue tasks in 'today' so they aren't lost
          groupTag = "today";
        } else if (dueDate <= endOfTomorrow) {
          groupTag = "tomorrow";
        } else if (dueDate <= endOfWeek) {
          groupTag = "this_week";
        } else {
          groupTag = "upcoming";
        }

        const isOverdue = rem.status === "pending" && dueDate < now;

        return {
          ...rem,
          groupTag,
          recurrenceLabel,
          isOverdue,
          timeString: dueDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          dateString: dueDate.toISOString().split("T")[0],
        };
      })
      .filter((rem) => {
        // Tab Filter
        if (tab === "today" && rem.groupTag !== "today") return false;
        if (tab === "tomorrow" && rem.groupTag !== "tomorrow") return false;
        if (tab === "this_week" && rem.groupTag !== "this_week") return false;
        if (tab === "upcoming" && rem.groupTag !== "upcoming") return false;
        if (tab === "completed" && rem.groupTag !== "completed") return false;

        // Search Query Filter
        if (q) {
          const matchTitle = rem.title.toLowerCase().includes(q);
          const matchDesc = rem.description?.toLowerCase().includes(q) || false;
          const matchCategory = rem.category.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchCategory) {
            return false;
          }
        }

        return true;
      });

    return NextResponse.json({
      success: true,
      data: {
        reminders,
        total: reminders.length,
      },
    });
  } catch (error) {
    console.error("[Reminders GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch reminders" } },
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
      notificationPreference = "both",
    } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TITLE", message: "Reminder title is required" } },
        { status: 400 }
      );
    }

    // Determine target dueDate
    let calculatedDueDate: Date;
    if (date) {
      const cleanTime = time && String(time).trim() ? String(time).trim() : "09:00";
      calculatedDueDate = new Date(`${date}T${cleanTime}:00`);
    } else if (rawDueDate) {
      calculatedDueDate = new Date(rawDueDate);
    } else {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DUE_DATE", message: "Date is required" } },
        { status: 400 }
      );
    }

    if (isNaN(calculatedDueDate.getTime())) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DUE_DATE", message: "Invalid date format" } },
        { status: 400 }
      );
    }

    // Determine recurrence rule
    let isRecurring = false;
    let recurrenceRule: string | null = null;
    const recurrenceInput = repeat || body.recurrenceRule;

    if (recurrenceInput && recurrenceInput !== "none" && recurrenceInput !== "one_time") {
      isRecurring = true;
      if (recurrenceInput === "custom") {
        const interval = Math.max(1, Number(customInterval) || 1);
        const unit = (customUnit || "days").toLowerCase();
        recurrenceRule = `custom:${interval}:${unit}`;
      } else {
        recurrenceRule = String(recurrenceInput).toLowerCase();
      }
    }

    const reminder = await prisma.reminder.create({
      data: {
        userId: user.id,
        title: title.trim(),
        description: description ? String(description).trim() : null,
        dueDate: calculatedDueDate,
        priority: priority || "medium",
        category: category || "general",
        status: "pending",
        isRecurring,
        recurrenceRule,
      },
    });

    // Proactively dispatch notification if notification preference is active
    if (notificationPreference !== "none") {
      await notifyReminderEvent(user.id, reminder, notificationPreference);
    }

    const recurrenceLabel = formatRecurrenceLabel(reminder.recurrenceRule);

    return NextResponse.json(
      {
        success: true,
        message: "Reminder created successfully",
        data: {
          reminder: {
            ...reminder,
            recurrenceLabel,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Reminders POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_FAILED", message: "Failed to create reminder" } },
      { status: 500 }
    );
  }
}
