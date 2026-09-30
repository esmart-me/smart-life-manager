import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

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
    const { userId, plan, status, reason } = body;

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

    const updatedSub = await prisma.userSubscription.upsert({
      where: { userId },
      update: {
        plan,
        planName,
        status,
      },
      create: {
        userId,
        plan,
        planName,
        status,
        billingInterval: "monthly",
      },
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
          previous: existingSub ? { plan: existingSub.plan, status: existingSub.status } : null,
          updatedTo: { plan, status },
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
