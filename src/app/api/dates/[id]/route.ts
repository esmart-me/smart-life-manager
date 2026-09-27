import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateNextDateOccurrence, syncImportantDateReminder } from "@/lib/dates/calculations";

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
    const importantDate = await prisma.importantDate.findUnique({ where: { id } });
    if (!importantDate || importantDate.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Important date not found" } },
        { status: 404 }
      );
    }

    const computed = calculateNextDateOccurrence(importantDate.eventDate, importantDate.recurrence);

    return NextResponse.json({
      success: true,
      data: { date: { ...importantDate, computed } },
    });
  } catch (error) {
    console.error("[ImportantDate GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch date" } },
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
    const existing = await prisma.importantDate.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Important date not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, eventDate, category, recurrence, reminderDaysBefore, notes } = body;

    const dataToUpdate: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim() === "") {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_TITLE", message: "Title cannot be empty" } },
          { status: 400 }
        );
      }
      dataToUpdate.title = title.trim();
    }

    if (eventDate !== undefined) {
      const cleanDate = new Date(eventDate);
      if (isNaN(cleanDate.getTime())) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_DATE", message: "Invalid date format" } },
          { status: 400 }
        );
      }
      dataToUpdate.eventDate = cleanDate;
    }

    if (category !== undefined) dataToUpdate.category = String(category).trim();
    if (recurrence !== undefined) dataToUpdate.recurrence = String(recurrence).trim();
    if (reminderDaysBefore !== undefined) dataToUpdate.reminderDaysBefore = Number(reminderDaysBefore) || 7;
    if (notes !== undefined) dataToUpdate.notes = notes ? String(notes).trim() : null;

    const updated = await prisma.importantDate.update({
      where: { id },
      data: dataToUpdate,
    });

    // Resync reminder
    await syncImportantDateReminder(prisma, user.id, updated);

    const computed = calculateNextDateOccurrence(updated.eventDate, updated.recurrence);

    return NextResponse.json({
      success: true,
      message: "Important date updated successfully",
      data: { date: { ...updated, computed } },
    });
  } catch (error) {
    console.error("[ImportantDate PUT Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_FAILED", message: "Failed to update date" } },
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
    const existing = await prisma.importantDate.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Important date not found" } },
        { status: 404 }
      );
    }

    // Cascade delete related reminder
    await prisma.reminder.deleteMany({
      where: {
        userId: user.id,
        relatedType: "important_date",
        relatedId: id,
      },
    });

    await prisma.importantDate.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Important date deleted successfully",
    });
  } catch (error) {
    console.error("[ImportantDate DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_FAILED", message: "Failed to delete date" } },
      { status: 500 }
    );
  }
}
