import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthoritativePlanPrice } from "@/lib/plans/regional-pricing";
import { createSubscriptionCheckoutSession } from "@/lib/stripe";
import { prisma } from "@/lib/db/prisma";
import { PlanTier } from "@/lib/plans/constants";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Please log in to choose a subscription plan." } },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { plan, billingInterval = "monthly", regionCode } = body;

    if (!plan || !["free", "premium", "family"].includes(plan)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PLAN", message: "Plan must be 'free', 'premium', or 'family'." } },
        { status: 400 }
      );
    }

    const interval = billingInterval === "yearly" ? "yearly" : "monthly";

    // 1. FREE PLAN: Direct activation (no checkout required)
    if (plan === "free") {
      await prisma.userSubscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          plan: "free",
          planName: "Free Starter",
          status: "active",
          billingInterval: "monthly",
          billingCycle: "monthly",
          amount: 0.0,
          currency: "USD",
          provider: "stripe",
          startedAt: new Date(),
          currentPeriodStart: new Date(),
          cancelAtPeriodEnd: false,
        },
        update: {
          plan: "free",
          planName: "Free Starter",
          status: "active",
          billingInterval: "monthly",
          billingCycle: "monthly",
          amount: 0.0,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Free plan activated successfully.",
        data: {
          url: "/settings?tab=subscription&activated=free",
          plan: "free",
          isFree: true,
        },
      });
    }

    // 2. PAID PLAN (premium or family): Retrieve authoritative server-side regional price
    const userRegion = regionCode || user.region || user.country || "US";
    const authoritativePrice = await getAuthoritativePlanPrice(plan as PlanTier, userRegion, interval);

    if (!authoritativePrice) {
      return NextResponse.json(
        { success: false, error: { code: "PLAN_UNAVAILABLE", message: "This plan is currently not available in your region." } },
        { status: 400 }
      );
    }

    const amount = authoritativePrice.amount;
    const currency = authoritativePrice.currency;
    const planName = plan === "family" ? "Family Circle Plus" : "Life Pro Premium";

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const appBaseUrl = `${protocol}://${host}`;

    // Create Checkout Session (Stripe or Sandbox Simulator)
    const session = await createSubscriptionCheckoutSession({
      userId: user.id,
      userEmail: user.email,
      plan: plan as PlanTier,
      planName,
      billingInterval: interval,
      amount,
      currency,
      appBaseUrl,
    });

    return NextResponse.json({
      success: true,
      message: "Checkout session created.",
      data: {
        sessionId: session.sessionId,
        url: session.url,
        isSandbox: session.isSandbox,
        plan,
        planName,
        billingInterval: interval,
        amount,
        currency,
      },
    });
  } catch (error: any) {
    console.error("[Create Checkout Session Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "CHECKOUT_ERROR", message: error.message || "Failed to initiate payment session." } },
      { status: 500 }
    );
  }
}
