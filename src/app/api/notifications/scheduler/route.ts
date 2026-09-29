import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { runNotificationScheduler } from "@/lib/notifications/scheduler";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  const isCronAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!user && !isCronAuthorized) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    // If run by authenticated customer, scan only their items
    // If run by authorized cron/secret, scan all or optionally target user
    const targetUserId = isCronAuthorized ? undefined : user?.id;

    const result = await runNotificationScheduler(targetUserId);

    return NextResponse.json({
      success: true,
      message: "Notification scheduler executed successfully",
      data: result,
    });
  } catch (error) {
    console.error("[Notification Scheduler Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to run notification scheduler" } },
      { status: 500 }
    );
  }
}
