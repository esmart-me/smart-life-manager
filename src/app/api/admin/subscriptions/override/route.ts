import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { mutateCentralSubscription } from "@/lib/supabase/server";
import { saveCachedEntitlement } from "@/lib/entitlement/entitlement-service";

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Administrator access denied. Master Administrator privileges required." } },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { userId, plan, status, reason, durationDays, expiryDate, continuous } = body;

    if (!userId || !plan || !status || !reason || reason.trim().length < 5) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "User ID, target plan, status, and an administrative justification reason (min 5 characters) are required.",
          },
        },
        { status: 400 }
      );
    }

    const existingSub = await prisma.userSubscription.findUnique({
      where: { userId },
    });

    const planName = plan === "family" ? "Family Circle Plus" : plan === "premium" ? "Life Pro Premium" : "Free Starter";

    // Calculate authoritative currentPeriodEnd
    let periodEnd: Date | null = null;
    if (status === "active" && plan !== "free") {
      if (expiryDate) {
        periodEnd = new Date(expiryDate);
      } else if (durationDays) {
        periodEnd = new Date(Date.now() + Number(durationDays) * 24 * 60 * 60 * 1000);
      } else if (!continuous) {
        // Default to 30 days
        periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
    } else if (status === "expired" || status === "canceled") {
      periodEnd = new Date(); // Marks as expired now
    }

    const updatedSub = await prisma.userSubscription.upsert({
      where: { userId },
      update: {
        plan,
        planName,
        status,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      },
      create: {
        userId,
        plan,
        planName,
        status,
        billingInterval: "monthly",
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      },
    });

    const expiresAtIso = periodEnd ? periodEnd.toISOString() : null;
    const isPremium = (plan === "premium" || plan === "family") && status === "active";
    let daysRemaining: number | null = null;
    if (periodEnd) {
      daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    } else if (isPremium) {
      daysRemaining = 365;
    }

    // Sync to Central Supabase if configured
    await mutateCentralSubscription({
      customerId: userId,
      plan: plan === "free" ? "basic" : "premium",
      status: status === "active" ? "active" : status === "expired" ? "expired" : "canceled",
      expiresAt: expiresAtIso,
      adminEmail: admin.email,
      reason: reason.trim(),
    }).catch((e) => console.warn("[Central Supabase] Sync override error:", e));

    // Update local authoritative entitlement cache
    saveCachedEntitlement(userId, {
      plan: plan === "free" ? "basic" : "premium",
      status: status === "active" ? "active" : status === "expired" ? "expired" : "canceled",
      startsAt: new Date().toISOString(),
      expiresAt: expiresAtIso,
      premiumEnabled: isPremium,
      accountStatus: "active",
      appAccessAllowed: true,
      lastVerifiedAt: new Date().toISOString(),
      serverTime: new Date().toISOString(),
      daysRemaining,
    });

    // Write audit log entry for this override
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: "subscription_override",
        targetType: "subscription",
        targetId: updatedSub.id,
        details: JSON.stringify({
          userId,
          previous: existingSub ? { plan: existingSub.plan, status: existingSub.status, expiresAt: existingSub.currentPeriodEnd } : null,
          updatedTo: { plan, status, periodEnd: expiresAtIso },
          reason: reason.trim(),
        }),
        ipAddress: typeof ip === "string" ? ip.split(",")[0].trim() : "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Subscription successfully updated with audit record.",
      data: { subscription: updatedSub },
    });
  } catch (error) {
    console.error("[Admin Subscription Override Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to override subscription." } },
      { status: 500 }
    );
  }
}
