import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/session";
import { updateRegionalPricing, getAllRegionalPricings } from "@/lib/plans/regional-pricing";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Administrator access denied. Master Administrator privileges required." } },
      { status: 403 }
    );
  }

  try {
    const pricings = await getAllRegionalPricings();
    return NextResponse.json({
      success: true,
      data: { pricings },
    });
  } catch (error) {
    console.error("[Admin Regional Plans GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to retrieve regional pricing." } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Administrator access denied. Master Administrator privileges required." } },
      { status: 403 }
    );
  }

  try {

    const body = await req.json().catch(() => ({}));
    const { plan, regionCode, monthlyPrice, yearlyPrice, enabled } = body;

    if (!plan || !regionCode) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_FAILED", message: "Plan and regionCode are required." } },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const updated = await updateRegionalPricing(
      plan,
      regionCode,
      {
        monthlyPrice: monthlyPrice !== undefined ? Number(monthlyPrice) : undefined,
        yearlyPrice: yearlyPrice !== undefined ? Number(yearlyPrice) : undefined,
        enabled: enabled !== undefined ? Boolean(enabled) : undefined,
      },
      {
        id: admin.id,
        email: admin.email,
        ip: typeof ip === "string" ? ip.split(",")[0].trim() : "127.0.0.1",
      }
    );

    return NextResponse.json({
      success: true,
      message: `Pricing for ${plan} in region ${regionCode} updated successfully with audit trail.`,
      data: { updated },
    });
  } catch (error) {
    console.error("[Admin Regional Plans PUT Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update regional pricing." } },
      { status: 500 }
    );
  }
}
