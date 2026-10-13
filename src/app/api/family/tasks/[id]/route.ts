import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const existing = await prisma.familyTask.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      dueDate,
      priority,
      status,
      category,
      assignedMemberId,
      assignedMemberName,
      isCompleted,
    } = body;

    let completedFlag = isCompleted;
    if (completedFlag === undefined && status !== undefined) {
      completedFlag = status === "completed";
    }

    const updated = await prisma.familyTask.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(priority !== undefined && { priority }),
        ...(status !== undefined && { status }),
        ...(category !== undefined && { category }),
        ...(assignedMemberId !== undefined && { assignedMemberId: assignedMemberId || null }),
        ...(assignedMemberName !== undefined && { assignedMemberName: assignedMemberName?.trim() || null }),
        ...(completedFlag !== undefined && {
          isCompleted: Boolean(completedFlag),
          completedAt: Boolean(completedFlag) ? (existing.completedAt || new Date()) : null,
          status: Boolean(completedFlag) ? "completed" : (status || (existing.status === "completed" ? "pending" : existing.status)),
        }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Family Task PUT Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update family task" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const existing = await prisma.familyTask.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    await prisma.familyTask.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("[Family Task DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete family task" } },
      { status: 500 }
    );
  }
}
