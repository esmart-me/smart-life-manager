import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getUnifiedPlannerData } from "@/lib/planner/planner-service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const data = await getUnifiedPlannerData(user.id, undefined, "today", "today");
    return NextResponse.json({
      success: true,
      data: data.briefing,
    });
  } catch (error) {
    console.error("[Planner Briefing GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch briefing" } },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { dailyBriefingEnabled, dailyBriefingTime } = body;

    const updateData: any = {};
    if (dailyBriefingEnabled !== undefined) {
      updateData.dailyBriefingEnabled = Boolean(dailyBriefingEnabled);
    }
    if (dailyBriefingTime !== undefined && typeof dailyBriefingTime === "string") {
      updateData.dailyBriefingTime = dailyBriefingTime.trim();
    }

    const updated = await prisma.userSetting.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        ...updateData,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Daily briefing settings updated",
      data: {
        dailyBriefingEnabled: updated.dailyBriefingEnabled,
        dailyBriefingTime: updated.dailyBriefingTime,
      },
    });
  } catch (error) {
    console.error("[Planner Briefing PUT Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update briefing settings" } },
      { status: 500 }
    );
  }
}
