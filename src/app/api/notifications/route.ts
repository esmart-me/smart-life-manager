import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createInAppNotification } from "@/lib/notifications/notification-service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    console.error("[Notifications GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch notifications" } },
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
    const { title, message, type, linkUrl } = body;

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PAYLOAD", message: "Title and message are required" } },
        { status: 400 }
      );
    }

    const result = await createInAppNotification({
      userId: user.id,
      title: String(title).trim(),
      message: String(message).trim(),
      type: type || "info",
      linkUrl: linkUrl || "/reminders",
    });

    return NextResponse.json(
      {
        success: true,
        message: result.created ? "Notification dispatched" : "Duplicate notification prevented",
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Notifications POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create notification" } },
      { status: 500 }
    );
  }
}
