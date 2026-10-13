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
    // Fetch active habits with recent logs (past 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const habits = await prisma.habit.findMany({
      where: { userId: user.id },
      include: {
        logs: {
          where: {
            date: { gte: thirtyDaysAgo },
          },
          orderBy: { date: "desc" },
        },
      },
      orderBy: [{ isArchived: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: habits });
  } catch (error) {
    console.error("[Wellness Habits GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch habits" } },
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
      category = "health",
      frequency = "daily",
      targetDaysPerWeek = 7,
      color = "emerald",
      reminderTime,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Title is required" } },
        { status: 400 }
      );
    }

    const habit = await prisma.habit.create({
      data: {
        userId: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        category,
        frequency,
        targetDaysPerWeek: Number(targetDaysPerWeek) || 7,
        color,
        reminderTime: reminderTime || null,
      },
      include: {
        logs: true,
      },
    });

    return NextResponse.json({ success: true, data: habit }, { status: 201 });
  } catch (error) {
    console.error("[Wellness Habit POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create habit" } },
      { status: 500 }
    );
  }
}
