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

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      profile: true,
      settings: true,
    },
  });

  if (!userData) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      profile: userData.profile,
      settings: userData.settings,
    },
  });
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
    const { profile, settings } = body;

    // Scoped update for profile
    if (profile) {
      await prisma.profile.upsert({
        where: { userId: user.id },
        update: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          displayName: profile.displayName,
          phoneNumber: profile.phoneNumber,
          timezone: profile.timezone,
          currency: profile.currency,
        },
        create: {
          userId: user.id,
          firstName: profile.firstName,
          lastName: profile.lastName,
          displayName: profile.displayName,
          phoneNumber: profile.phoneNumber,
          timezone: profile.timezone || "UTC",
          currency: profile.currency || "USD",
        },
      });
    }

    // Scoped update for settings
    if (settings) {
      await prisma.userSetting.upsert({
        where: { userId: user.id },
        update: {
          theme: settings.theme,
          emailNotifications: settings.emailNotifications,
          pushNotifications: settings.pushNotifications,
          reminderDaysBefore: Number(settings.reminderDaysBefore) || 3,
          weeklyDigest: settings.weeklyDigest,
          securityAlerts: settings.securityAlerts,
        },
        create: {
          userId: user.id,
          theme: settings.theme || "system",
          emailNotifications: settings.emailNotifications ?? true,
          pushNotifications: settings.pushNotifications ?? true,
          reminderDaysBefore: Number(settings.reminderDaysBefore) || 3,
          weeklyDigest: settings.weeklyDigest ?? true,
          securityAlerts: settings.securityAlerts ?? true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("[Settings Update Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "UPDATE_FAILED", message: "Failed to update settings" },
      },
      { status: 500 }
    );
  }
}
