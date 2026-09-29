import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
        status: "read",
      },
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} notification(s) marked as read`,
      data: { count: result.count },
    });
  } catch (error) {
    console.error("[Notifications Mark All Read Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to mark all as read" } },
      { status: 500 }
    );
  }
}
