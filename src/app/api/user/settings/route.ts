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
    const effectiveSettings = settings || (body.theme ? { theme: body.theme } : null);

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
    if (effectiveSettings) {
      await prisma.userSetting.upsert({
        where: { userId: user.id },
        update: {
          theme: effectiveSettings.theme,
          emailNotifications: effectiveSettings.emailNotifications,
          pushNotifications: effectiveSettings.pushNotifications,
          reminderDaysBefore: Number(effectiveSettings.reminderDaysBefore) || 3,
          weeklyDigest: effectiveSettings.weeklyDigest,
          securityAlerts: effectiveSettings.securityAlerts,
          ...(effectiveSettings.notificationsEnabled !== undefined && { notificationsEnabled: effectiveSettings.notificationsEnabled }),
          ...(effectiveSettings.notifyCritical !== undefined && { notifyCritical: effectiveSettings.notifyCritical }),
          ...(effectiveSettings.notifyHigh !== undefined && { notifyHigh: effectiveSettings.notifyHigh }),
          ...(effectiveSettings.notifyMedium !== undefined && { notifyMedium: effectiveSettings.notifyMedium }),
          ...(effectiveSettings.notifyLow !== undefined && { notifyLow: effectiveSettings.notifyLow }),
          ...(effectiveSettings.notifyReminders !== undefined && { notifyReminders: effectiveSettings.notifyReminders }),
          ...(effectiveSettings.notifyPayments !== undefined && { notifyPayments: effectiveSettings.notifyPayments }),
          ...(effectiveSettings.notifyDocuments !== undefined && { notifyDocuments: effectiveSettings.notifyDocuments }),
          ...(effectiveSettings.notifyVehicles !== undefined && { notifyVehicles: effectiveSettings.notifyVehicles }),
          ...(effectiveSettings.notifySubscriptions !== undefined && { notifySubscriptions: effectiveSettings.notifySubscriptions }),
          ...(effectiveSettings.notifyImportantDates !== undefined && { notifyImportantDates: effectiveSettings.notifyImportantDates }),
          ...(effectiveSettings.quietHoursEnabled !== undefined && { quietHoursEnabled: effectiveSettings.quietHoursEnabled }),
          ...(effectiveSettings.quietHoursStart !== undefined && { quietHoursStart: effectiveSettings.quietHoursStart }),
          ...(effectiveSettings.quietHoursEnd !== undefined && { quietHoursEnd: effectiveSettings.quietHoursEnd }),
          ...(effectiveSettings.allowCriticalInQuietHours !== undefined && { allowCriticalInQuietHours: effectiveSettings.allowCriticalInQuietHours }),
          ...(effectiveSettings.soundEnabled !== undefined && { soundEnabled: effectiveSettings.soundEnabled }),
          ...(effectiveSettings.onboardingCompleted !== undefined && { onboardingCompleted: Boolean(effectiveSettings.onboardingCompleted) }),
          ...(effectiveSettings.onboardingStep !== undefined && { onboardingStep: Number(effectiveSettings.onboardingStep) }),
        },
        create: {
          userId: user.id,
          theme: effectiveSettings.theme || "system",
          emailNotifications: effectiveSettings.emailNotifications ?? true,
          pushNotifications: effectiveSettings.pushNotifications ?? true,
          reminderDaysBefore: Number(effectiveSettings.reminderDaysBefore) || 3,
          weeklyDigest: effectiveSettings.weeklyDigest ?? true,
          securityAlerts: effectiveSettings.securityAlerts ?? true,
          notificationsEnabled: effectiveSettings.notificationsEnabled ?? true,
          notifyCritical: effectiveSettings.notifyCritical ?? true,
          notifyHigh: effectiveSettings.notifyHigh ?? true,
          notifyMedium: effectiveSettings.notifyMedium ?? true,
          notifyLow: effectiveSettings.notifyLow ?? true,
          notifyReminders: effectiveSettings.notifyReminders ?? true,
          notifyPayments: effectiveSettings.notifyPayments ?? true,
          notifyDocuments: effectiveSettings.notifyDocuments ?? true,
          notifyVehicles: effectiveSettings.notifyVehicles ?? true,
          notifySubscriptions: effectiveSettings.notifySubscriptions ?? true,
          notifyImportantDates: effectiveSettings.notifyImportantDates ?? true,
          quietHoursEnabled: effectiveSettings.quietHoursEnabled ?? false,
          quietHoursStart: effectiveSettings.quietHoursStart || "22:00",
          quietHoursEnd: effectiveSettings.quietHoursEnd || "07:00",
          allowCriticalInQuietHours: effectiveSettings.allowCriticalInQuietHours ?? true,
          soundEnabled: effectiveSettings.soundEnabled ?? true,
          onboardingCompleted: effectiveSettings.onboardingCompleted ?? false,
          onboardingStep: effectiveSettings.onboardingStep ?? 1,
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
