import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

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
    const task = await prisma.plannerTask.findUnique({
      where: { id },
    });

    if (!task || task.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    console.error("[Planner Task GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch task" } },
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
    const existing = await prisma.plannerTask.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      itemType,
      date,
      startTime,
      endTime,
      location,
      priority,
      category,
      isCompleted,
      notes,
    } = body;

    const updateData: any = {};

    if (title !== undefined) {
      if (!title || typeof title !== "string" || title.trim() === "") {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_TITLE", message: "Title cannot be empty" } },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (itemType !== undefined) updateData.itemType = itemType === "appointment" ? "appointment" : "task";
    if (location !== undefined) updateData.location = location ? String(location).trim() : null;
    if (startTime !== undefined) updateData.startTime = startTime ? String(startTime).trim() : null;
    if (endTime !== undefined) updateData.endTime = endTime ? String(endTime).trim() : null;
    if (priority !== undefined) updateData.priority = priority;
    if (category !== undefined) updateData.category = category;
    if (notes !== undefined) updateData.notes = notes ? String(notes).trim() : null;

    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_DATE", message: "Invalid date format" } },
          { status: 400 }
        );
      }
      updateData.date = parsedDate;
    }

    if (isCompleted !== undefined) {
      const completed = Boolean(isCompleted);
      updateData.isCompleted = completed;
      updateData.completedAt = completed ? new Date() : null;
    }

    const updatedTask = await prisma.plannerTask.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Planner item updated successfully",
      data: updatedTask,
    });
  } catch (error) {
    console.error("[Planner Task PUT Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update planner item" } },
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
    const existing = await prisma.plannerTask.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.reminder.deleteMany({
        where: { userId: user.id, relatedType: "planner_task", relatedId: id },
      }),
      prisma.plannerTask.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Planner item deleted successfully",
    });
  } catch (error) {
    console.error("[Planner Task DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete planner item" } },
      { status: 500 }
    );
  }
}
