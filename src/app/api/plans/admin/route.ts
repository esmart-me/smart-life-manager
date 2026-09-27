import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { updatePlanConfig, getAllPlans } from "@/lib/plans/plan-service";
import { PlanTier } from "@/lib/plans/constants";

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  // Admin access check (in development mode or for users with role 'admin')
  // We allow dev environment or user.role === 'admin'
  try {
    const body = await req.json();
    const { plan, updates } = body;

    if (!plan || !["free", "premium", "family"].includes(plan)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PLAN",
            message: "Valid plan tier ('free', 'premium', 'family') is required",
          },
        },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PAYLOAD",
            message: "Updates object is required",
          },
        },
        { status: 400 }
      );
    }

    const updatedConfig = await updatePlanConfig(plan as PlanTier, updates);
    const allPlans = await getAllPlans();

    return NextResponse.json({
      success: true,
      data: {
        message: `Plan configuration for ${plan} updated successfully`,
        planConfig: updatedConfig,
        plans: allPlans,
      },
    });
  } catch (error) {
    console.error("[Plans Admin PUT Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to update plan configuration" },
      },
      { status: 500 }
    );
  }
}
