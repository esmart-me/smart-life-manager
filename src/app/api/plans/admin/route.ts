import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/session";
import { updatePlanConfig, getAllPlans } from "@/lib/plans/plan-service";
import { PlanTier } from "@/lib/plans/constants";

export async function PUT(req: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Administrator access denied. Master Administrator privileges required." } },
      { status: 403 }
    );
  }
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
