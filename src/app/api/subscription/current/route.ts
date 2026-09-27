import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserPlanSummary, getUserSubscription } from "@/lib/plans/plan-service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const [summary, subscription] = await Promise.all([
      getUserPlanSummary(user.id),
      getUserSubscription(user.id),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        subscription,
      },
    });
  } catch (error) {
    console.error("[Subscription Current GET Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to fetch subscription status" },
      },
      { status: 500 }
    );
  }
}
