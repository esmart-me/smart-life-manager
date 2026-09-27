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

  const reminders = await prisma.reminder.findMany({
    where: { userId: user.id },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json({ success: true, data: { reminders } });
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
    const { title, description, dueDate, priority, category } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TITLE", message: "Reminder title is required" } },
        { status: 400 }
      );
    }

    if (!dueDate) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DUE_DATE", message: "Due date is required" } },
        { status: 400 }
      );
    }

    const cleanDueDate = new Date(dueDate);
    if (isNaN(cleanDueDate.getTime())) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DUE_DATE", message: "Invalid due date format" } },
        { status: 400 }
      );
    }

    const reminder = await prisma.reminder.create({
      data: {
        userId: user.id,
        title: title.trim(),
        description: description ? String(description).trim() : null,
        dueDate: cleanDueDate,
        priority: priority || "medium",
        category: category || "general",
        status: "pending",
      },
    });

    return NextResponse.json(
      { success: true, message: "Reminder saved successfully", data: { reminder } },
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
