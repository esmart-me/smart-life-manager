import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const sub = await prisma.userSubscription.findUnique({
      where: { userId: user.id },
    });

    if (!sub || sub.plan === "free") {
      return NextResponse.json(
        { success: false, error: { code: "NO_ACTIVE_PAID_SUBSCRIPTION", message: "You are on the Free Starter plan." } },
        { status: 400 }
      );
    }

    // Set cancellation: subscription remains active until period ends, or cancelled immediately
    const updated = await prisma.userSubscription.update({
      where: { userId: user.id },
      data: {
        cancelAtPeriodEnd: true,
        status: "cancelled",
        cancelledAt: new Date(),
      },
    });

    // NOTE: Historical payment transactions in BillingTransaction are PRESERVED!

    return NextResponse.json({
      success: true,
      message: "Subscription successfully scheduled for cancellation. Access continues through end of current period.",
      data: { subscription: updated },
    });
  } catch (error: any) {
    console.error("[Subscription Cancel Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "CANCEL_ERROR", message: "Failed to cancel subscription." } },
      { status: 500 }
    );
  }
}
