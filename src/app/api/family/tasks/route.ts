import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const tasks = await prisma.familyTask.findMany({
      where: { userId: user.id },
      orderBy: [{ isCompleted: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    console.error("[Family Tasks GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch family tasks" } },
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
      dueDate,
      priority = "medium",
      status = "pending",
      category = "household",
      assignedMemberId,
      assignedMemberName,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Title is required" } },
        { status: 400 }
      );
    }

    const task = await prisma.familyTask.create({
      data: {
        userId: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        status,
        category,
        assignedMemberId: assignedMemberId || null,
        assignedMemberName: assignedMemberName?.trim() || null,
        isCompleted: status === "completed",
        completedAt: status === "completed" ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error) {
    console.error("[Family Task POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create family task" } },
      { status: 500 }
    );
  }
}
