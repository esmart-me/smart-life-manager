import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createInAppNotification } from "@/lib/notifications/notification-service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    const whereClause: any = { userId: user.id };

    if (category && category !== "all") {
      whereClause.category = category;
    }
    if (priority && priority !== "all") {
      whereClause.priority = priority;
    }
    if (unreadOnly) {
      whereClause.isRead = false;
    }

    const [notifications, unreadCount, criticalCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: user.id, isRead: false },
      }),
      prisma.notification.count({
        where: { userId: user.id, isRead: false, priority: "critical" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        criticalCount,
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
    const { title, message, type, priority, category, linkUrl, deliveryKey } = body;

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
      priority: priority || "medium",
      category: category || "general",
      linkUrl: linkUrl || "/reminders",
      deliveryKey: deliveryKey || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        message: result.created ? "Notification dispatched" : "Notification filtered or duplicate",
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
