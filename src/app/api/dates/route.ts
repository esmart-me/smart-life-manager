import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateNextDateOccurrence, syncImportantDateReminder } from "@/lib/dates/calculations";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const rawDates = await prisma.importantDate.findMany({
      where: { userId: user.id },
      orderBy: { eventDate: "asc" },
    });

    const now = new Date();
    const dates = rawDates.map((d) => {
      const computed = calculateNextDateOccurrence(d.eventDate, d.recurrence, now);
      return {
        ...d,
        computed,
      };
    });

    // Sort chronologically by next occurrence
    dates.sort((a, b) => a.computed.nextOccurrence.getTime() - b.computed.nextOccurrence.getTime());

    return NextResponse.json({
      success: true,
      data: { dates, total: dates.length },
    });
  } catch (error) {
    console.error("[ImportantDates GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch important dates" } },
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
    const { title, eventDate, category, recurrence, reminderDaysBefore, notes } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TITLE", message: "Event title is required" } },
        { status: 400 }
      );
    }

    if (!eventDate) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DATE", message: "Event date is required" } },
        { status: 400 }
      );
    }

    const cleanDate = new Date(eventDate);
    if (isNaN(cleanDate.getTime())) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DATE", message: "Invalid date format" } },
        { status: 400 }
      );
    }

    const importantDate = await prisma.importantDate.create({
      data: {
        userId: user.id,
        title: title.trim(),
        eventDate: cleanDate,
        category: category || "birthday",
        recurrence: recurrence || "yearly",
        reminderDaysBefore: Number(reminderDaysBefore) || 7,
        notes: notes ? String(notes).trim() : null,
      },
    });

    // Reuse existing reminder system
    await syncImportantDateReminder(prisma, user.id, importantDate);

    const computed = calculateNextDateOccurrence(importantDate.eventDate, importantDate.recurrence);

    return NextResponse.json(
      {
        success: true,
        message: "Important date created successfully",
        data: { date: { ...importantDate, computed } },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[ImportantDates POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_FAILED", message: "Failed to create important date" } },
      { status: 500 }
    );
  }
}
