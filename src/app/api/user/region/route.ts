import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getRegion } from "@/lib/regions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { countryCode, currencyCode } = body;

    if (!countryCode) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "Country code is required" } },
        { status: 400 }
      );
    }

    const region = getRegion(countryCode);
    const user = await getCurrentUser();

    if (user) {
      await prisma.profile.upsert({
        where: { userId: user.id },
        update: {
          country: region.countryCode,
          region: region.countryCode,
          currency: currencyCode || region.currencyCode,
          locale: region.locale,
        },
        create: {
          userId: user.id,
          country: region.countryCode,
          region: region.countryCode,
          currency: currencyCode || region.currencyCode,
          locale: region.locale,
        },
      });
    }

    const response = NextResponse.json({
      success: true,
      data: {
        region,
        currency: currencyCode || region.currencyCode,
      },
    });

    // Set cookie for 1 year so region preference persists across visits
    response.cookies.set("slm_region", region.countryCode, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false, // accessible to client scripts
    });

    return response;
  } catch (error) {
    console.error("[User Region POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "REGION_UPDATE_FAILED", message: "Failed to update region preference" } },
      { status: 500 }
    );
  }
}
