import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnifiedPlannerData } from "@/lib/planner/planner-service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || undefined;
  const view = (searchParams.get("view") || "today") as any;
  const filter = (searchParams.get("filter") || "all") as any;

  try {
    const data = await getUnifiedPlannerData(user.id, date, view, filter);
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[Planner API Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to load planner data" } },
      { status: 500 }
    );
  }
}
