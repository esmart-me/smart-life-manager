import { NextResponse } from "next/server";
import { getAllPlans } from "@/lib/plans/plan-service";

export async function GET() {
  try {
    const plans = await getAllPlans();

    return NextResponse.json({
      success: true,
      data: { plans },
    });
  } catch (error) {
    console.error("[Plans GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "PLANS_FETCH_FAILED", message: "Failed to retrieve plans" } },
      { status: 500 }
    );
  }
}
