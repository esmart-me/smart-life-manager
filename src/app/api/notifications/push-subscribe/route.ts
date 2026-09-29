import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  savePushSubscription,
  removePushSubscription,
  getVapidPublicKey,
  isPushConfigured,
} from "@/lib/notifications/push-service";
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
    const publicKey = getVapidPublicKey();
    const isConfigured = isPushConfigured();

    const subscriptionsCount = await prisma.pushSubscription.count({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      data: {
        configured: isConfigured,
        publicKey,
        activeSubscriptionsCount: subscriptionsCount,
      },
    });
  } catch (error) {
    console.error("[Push Subscribe GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch push status" } },
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
    const { endpoint, keys, userAgent } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_SUBSCRIPTION", message: "Endpoint and cryptographic keys are required" } },
        { status: 400 }
      );
    }

    const subscription = await savePushSubscription({
      userId: user.id,
      endpoint,
      keys,
      userAgent: userAgent || request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Push subscription registered successfully",
        data: { id: subscription.id },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Push Subscribe POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to save push subscription" } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PAYLOAD", message: "Subscription endpoint required" } },
        { status: 400 }
      );
    }

    await removePushSubscription(endpoint, user.id);

    return NextResponse.json({
      success: true,
      message: "Push subscription unregistered",
    });
  } catch (error) {
    console.error("[Push Subscribe DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete push subscription" } },
      { status: 500 }
    );
  }
}
