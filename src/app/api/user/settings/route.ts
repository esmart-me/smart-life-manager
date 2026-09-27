import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getRegion } from "@/lib/regions";

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

    let selectedRegionCode = "US";

    // Scoped update for profile
    if (profile) {
      const reg = getRegion(profile.country || profile.region || profile.currency);
      selectedRegionCode = reg.countryCode;

      await prisma.profile.upsert({
        where: { userId: user.id },
        update: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          displayName: profile.displayName,
          phoneNumber: profile.phoneNumber,
          timezone: profile.timezone,
          country: profile.country || reg.countryCode,
          region: profile.region || reg.countryCode,
          currency: profile.currency || reg.currencyCode,
          locale: reg.locale,
        },
        create: {
          userId: user.id,
          firstName: profile.firstName,
          lastName: profile.lastName,
          displayName: profile.displayName,
          phoneNumber: profile.phoneNumber,
          timezone: profile.timezone || "UTC",
          country: profile.country || reg.countryCode,
          region: profile.region || reg.countryCode,
          currency: profile.currency || reg.currencyCode,
          locale: reg.locale,
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

    const res = NextResponse.json({
      success: true,
      message: "Settings updated successfully",
    });

    if (profile) {
      res.cookies.set("slm_region", selectedRegionCode, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }

    return res;
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
