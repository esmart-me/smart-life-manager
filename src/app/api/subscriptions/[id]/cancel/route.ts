import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { syncSubscriptionReminder } from "@/lib/subscriptions/calculations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const existing = await prisma.subscription.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Subscription not found" } },
        { status: 404 }
      );
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: { renewalStatus: "cancelled" },
    });

    // Remove active reminder for cancelled subscription
    await syncSubscriptionReminder(prisma, user.id, updated);

    return NextResponse.json({
      success: true,
      message: `Subscription "${updated.name}" has been marked as cancelled`,
      data: { subscription: updated },
    });
  } catch (error) {
    console.error("[Subscription Cancel PATCH Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "CANCEL_FAILED", message: "Failed to cancel subscription" } },
      { status: 500 }
    );
  }
}
