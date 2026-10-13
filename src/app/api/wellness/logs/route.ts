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

  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get("days") || "30";
  const days = Math.min(Math.max(parseInt(daysParam, 10) || 30, 1), 90);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  try {
    const logs = await prisma.wellnessLog.findMany({
      where: {
        userId: user.id,
        date: { gte: startDate },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error("[Wellness Logs GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch wellness logs" } },
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
      date,
      sleepHours,
      waterGlasses,
      exerciseMinutes,
      mood,
      notes,
    } = body;

    const rawDate = date ? new Date(date) : new Date();
    const normalizedDate = new Date(
      Date.UTC(rawDate.getUTCFullYear(), rawDate.getUTCMonth(), rawDate.getUTCDate())
    );

    const log = await prisma.wellnessLog.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: normalizedDate,
        },
      },
      update: {
        ...(sleepHours !== undefined && { sleepHours: sleepHours !== null ? parseFloat(sleepHours) : null }),
        ...(waterGlasses !== undefined && { waterGlasses: waterGlasses !== null ? parseInt(waterGlasses, 10) : null }),
        ...(exerciseMinutes !== undefined && { exerciseMinutes: exerciseMinutes !== null ? parseInt(exerciseMinutes, 10) : null }),
        ...(mood !== undefined && { mood: mood || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
      create: {
        userId: user.id,
        date: normalizedDate,
        sleepHours: sleepHours !== undefined && sleepHours !== null ? parseFloat(sleepHours) : null,
        waterGlasses: waterGlasses !== undefined && waterGlasses !== null ? parseInt(waterGlasses, 10) : null,
        exerciseMinutes: exerciseMinutes !== undefined && exerciseMinutes !== null ? parseInt(exerciseMinutes, 10) : null,
        mood: mood || null,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, data: log });
  } catch (error) {
    console.error("[Wellness Log POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to save daily wellness log" } },
      { status: 500 }
    );
  }
}
