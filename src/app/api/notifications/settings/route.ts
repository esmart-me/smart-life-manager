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

  try {
    let settings = await prisma.userSetting.findUnique({
      where: { userId: user.id },
    });

    if (!settings) {
      settings = await prisma.userSetting.create({
        data: {
          userId: user.id,
          notificationsEnabled: true,
          notifyCritical: true,
          notifyHigh: true,
          notifyMedium: true,
          notifyLow: true,
          notifyReminders: true,
          notifyPayments: true,
          notifyDocuments: true,
          notifyVehicles: true,
          notifySubscriptions: true,
          notifyImportantDates: true,
          quietHoursEnabled: false,
          quietHoursStart: "22:00",
          quietHoursEnd: "07:00",
          allowCriticalInQuietHours: true,
          soundEnabled: true,
          pushNotifications: true,
        },
      });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { timezone: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        settings,
        timezone: profile?.timezone || "UTC",
      },
    });
  } catch (error) {
    console.error("[Notification Settings GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch notification settings" } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const allowedFields = [
      "notificationsEnabled",
      "notifyCritical",
      "notifyHigh",
      "notifyMedium",
      "notifyLow",
      "notifyReminders",
      "notifyPayments",
      "notifyDocuments",
      "notifyVehicles",
      "notifySubscriptions",
      "notifyImportantDates",
      "quietHoursEnabled",
      "quietHoursStart",
      "quietHoursEnd",
      "allowCriticalInQuietHours",
      "soundEnabled",
      "pushNotifications",
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
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
      message: "Notification preferences updated",
      data: updated,
    });
  } catch (error) {
    console.error("[Notification Settings PATCH Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update notification settings" } },
      { status: 500 }
    );
  }
}
