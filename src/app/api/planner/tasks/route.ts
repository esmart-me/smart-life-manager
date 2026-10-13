import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

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
      itemType = "task",
      date,
      startTime,
      endTime,
      location,
      priority = "medium",
      category = "personal",
      notes,
      syncReminder = false,
    } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TITLE", message: "Title is required" } },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DATE", message: "Date is required" } },
        { status: 400 }
      );
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DATE", message: "Invalid date format" } },
        { status: 400 }
      );
    }

    const validItemType = itemType === "appointment" ? "appointment" : "task";
    const validPriority = ["low", "medium", "high", "urgent"].includes(priority) ? priority : "medium";
    const validCategory = [
      "work",
      "personal",
      "health",
      "family",
      "errand",
      "appointment",
      "general",
    ].includes(category)
      ? category
      : "personal";

    const task = await prisma.plannerTask.create({
      data: {
        userId: user.id,
        title: title.trim(),
        description: description ? String(description).trim() : null,
        itemType: validItemType,
        date: parsedDate,
        startTime: startTime ? String(startTime).trim() : null,
        endTime: endTime ? String(endTime).trim() : null,
        location: location ? String(location).trim() : null,
        priority: validPriority,
        category: validCategory,
        notes: notes ? String(notes).trim() : null,
      },
    });

    // Optionally sync into Reminder system if requested
    if (syncReminder) {
      try {
        const reminderDate = new Date(parsedDate);
        if (startTime) {
          const [hours, minutes] = startTime.split(":").map(Number);
          if (!isNaN(hours) && !isNaN(minutes)) {
            reminderDate.setHours(hours, minutes, 0, 0);
          }
        }
        await prisma.reminder.create({
          data: {
            userId: user.id,
            title: `${validItemType === "appointment" ? "Appointment" : "Task"}: ${task.title}`,
            description: task.description || task.notes,
            dueDate: reminderDate,
            priority: validPriority,
            category: "personal",
            relatedType: "planner_task",
            relatedId: task.id,
          },
        });
      } catch (remErr) {
        console.warn("[Planner Task] Non-fatal warning syncing reminder:", remErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${validItemType === "appointment" ? "Appointment" : "Task"} created successfully`,
      data: task,
    });
  } catch (error) {
    console.error("[Planner Task POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create planner item" } },
      { status: 500 }
    );
  }
}
