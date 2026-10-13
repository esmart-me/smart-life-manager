import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

function calculateStreaks(dates: Date[]) {
  if (dates.length === 0) return { currentStreak: 0, bestStreak: 0 };

  // Normalize dates to YYYY-MM-DD set
  const dateSet = new Set(
    dates.map((d) => d.toISOString().split("T")[0])
  );

  // Check current streak from today or yesterday
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let currentStreak = 0;
  let checkDate = new Date(today);

  // If today is completed, start from today. If not, but yesterday was, start from yesterday.
  if (dateSet.has(todayStr)) {
    checkDate = new Date(today);
  } else if (dateSet.has(yesterdayStr)) {
    checkDate = new Date(yesterday);
  } else {
    checkDate = new Date(0); // broken streak
  }

  if (checkDate.getTime() > 0) {
    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (dateSet.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate best streak across all dates
  const sortedDates = Array.from(dateSet).sort();
  let bestStreak = 0;
  let runningStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const curr = new Date(dateStr + "T00:00:00.000Z");
    if (!prevDate) {
      runningStreak = 1;
    } else {
      const diffMs = curr.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        runningStreak++;
      } else {
        runningStreak = 1;
      }
    }
    if (runningStreak > bestStreak) {
      bestStreak = runningStreak;
    }
    prevDate = curr;
  }

  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
  };
}

export async function POST(
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

  const { id: habitId } = await params;

  try {
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId: user.id },
    });

    if (!habit) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Habit not found" } },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawDate = body.date ? new Date(body.date) : new Date();
    // Normalize date to UTC start of day
    const normalizedDate = new Date(
      Date.UTC(rawDate.getUTCFullYear(), rawDate.getUTCMonth(), rawDate.getUTCDate())
    );

    // Check if log exists
    const existingLog = await prisma.habitLog.findUnique({
      where: {
        habitId_date: {
          habitId,
          date: normalizedDate,
        },
      },
    });

    let completedStatus = true;

    if (existingLog) {
      if (body.completed !== undefined) {
        completedStatus = Boolean(body.completed);
        await prisma.habitLog.update({
          where: { id: existingLog.id },
          data: {
            completed: completedStatus,
            notes: body.notes !== undefined ? body.notes : existingLog.notes,
          },
        });
      } else {
        // Toggle
        completedStatus = !existingLog.completed;
        await prisma.habitLog.update({
          where: { id: existingLog.id },
          data: { completed: completedStatus },
        });
      }
    } else {
      completedStatus = body.completed !== undefined ? Boolean(body.completed) : true;
      await prisma.habitLog.create({
        data: {
          habitId,
          userId: user.id,
          date: normalizedDate,
          completed: completedStatus,
          notes: body.notes?.trim() || null,
        },
      });
    }

    // Recalculate streak
    const allCompletedLogs = await prisma.habitLog.findMany({
      where: {
        habitId,
        completed: true,
      },
      select: { date: true },
    });

    const { currentStreak, bestStreak } = calculateStreaks(
      allCompletedLogs.map((l) => l.date)
    );

    const updatedHabit = await prisma.habit.update({
      where: { id: habitId },
      data: {
        currentStreak,
        bestStreak: Math.max(habit.bestStreak, bestStreak),
      },
      include: {
        logs: {
          orderBy: { date: "desc" },
          take: 30,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        habit: updatedHabit,
        logCompleted: completedStatus,
      },
    });
  } catch (error) {
    console.error("[Habit Log POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to record habit completion" } },
      { status: 500 }
    );
  }
}
