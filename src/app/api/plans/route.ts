import { NextRequest, NextResponse } from "next/server";
import { getAllPlans } from "@/lib/plans/plan-service";
import { getRegionalPricingForRegion } from "@/lib/plans/regional-pricing";
import { getRegion, getSupportedRegions, detectRegionFromLocale } from "@/lib/regions";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const queryRegion = req.nextUrl.searchParams.get("region");
    const cookieRegion = req.cookies.get("slm_region")?.value;
    const acceptLang = req.headers.get("accept-language");

    // Order of precedence: query param -> user saved profile -> cookie -> browser accept-language -> default US
    let regionCode = queryRegion || user?.region || user?.country || cookieRegion;
    if (!regionCode) {
      regionCode = detectRegionFromLocale(acceptLang).countryCode;
    }

    const selectedRegion = getRegion(regionCode);
    const [basePlans, regionalPricings] = await Promise.all([
      getAllPlans(),
      getRegionalPricingForRegion(selectedRegion.countryCode),
    ]);

    const pricingMap = new Map(regionalPricings.map((rp) => [rp.plan, rp]));

    const localizedPlans = basePlans.map((bp) => {
      const rp = pricingMap.get(bp.plan as any);
      return {
        ...bp,
        monthlyPrice: rp ? rp.monthlyPrice : bp.monthlyPrice,
        yearlyPrice: rp ? rp.yearlyPrice : bp.yearlyPrice,
        currency: rp ? rp.currency : bp.currency,
        currencySymbol: rp ? rp.currencySymbol : "$",
        regionCode: selectedRegion.countryCode,
        country: selectedRegion.country,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        plans: localizedPlans,
        selectedRegion,
        supportedRegions: getSupportedRegions(),
      },
    });
  } catch (error) {
    console.error("[Plans GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "PLANS_FETCH_FAILED", message: "Failed to retrieve plans" } },
      { status: 500 }
    );
  }
}
