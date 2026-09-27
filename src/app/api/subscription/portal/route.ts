import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getStripe, isRealStripeConfigured } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const sub = await prisma.userSubscription.findUnique({
      where: { userId: user.id },
    });

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const appBaseUrl = `${protocol}://${host}`;

    if (isRealStripeConfigured() && sub?.providerCustomerId) {
      const stripe = getStripe();
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: sub.providerCustomerId,
        return_url: `${appBaseUrl}/settings?tab=subscription`,
      });

      return NextResponse.json({
        success: true,
        data: { url: portalSession.url },
      });
    }

    // In sandbox or when no customer ID yet
    return NextResponse.json({
      success: true,
      data: { url: `${appBaseUrl}/settings?tab=subscription` },
    });
  } catch (error: any) {
    console.error("[Customer Portal Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "PORTAL_ERROR", message: "Failed to open customer billing portal." } },
      { status: 500 }
    );
  }
}
