import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { simulateUserPlanChange, getUserPlanSummary } from "@/lib/plans/plan-service";
import { PlanTier } from "@/lib/plans/constants";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { plan, billingInterval } = body;

    if (!plan || !["free", "premium", "family"].includes(plan)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PLAN",
            message: "Plan must be 'free', 'premium', or 'family'",
          },
        },
        { status: 400 }
      );
    }

    const interval = billingInterval === "yearly" ? "yearly" : "monthly";

    const subscription = await simulateUserPlanChange(
      user.id,
      plan as PlanTier,
      interval
    );

    const summary = await getUserPlanSummary(user.id);

    return NextResponse.json({
      success: true,
      data: {
        message: `Subscription successfully updated to ${plan.toUpperCase()} (${interval})`,
        subscription,
        summary,
      },
    });
  } catch (error) {
    console.error("[Subscription Simulate POST Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to update subscription" },
      },
      { status: 500 }
    );
  }
}
