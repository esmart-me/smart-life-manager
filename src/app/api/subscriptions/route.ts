import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateSubscriptionMetrics, syncSubscriptionReminder } from "@/lib/subscriptions/calculations";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: user.id },
      orderBy: { nextBillingDate: "asc" },
    });

    const metrics = calculateSubscriptionMetrics(subscriptions);

    return NextResponse.json({
      success: true,
      data: {
        subscriptions,
        metrics,
        total: subscriptions.length,
      },
    });
  } catch (error) {
    console.error("[Subscriptions GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch subscriptions" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { name, cost, currency, billingCycle, nextBillingDate, category, notes } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_NAME", message: "Subscription name is required" } },
        { status: 400 }
      );
    }

    const numCost = Number(cost);
    if (isNaN(numCost) || numCost <= 0) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_COST", message: "Valid positive amount is required" } },
        { status: 400 }
      );
    }

    if (!nextBillingDate) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DATE", message: "Billing date is required" } },
        { status: 400 }
      );
    }

    const cleanDate = new Date(nextBillingDate);
    if (isNaN(cleanDate.getTime())) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DATE", message: "Invalid billing date format" } },
        { status: 400 }
      );
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        name: name.trim(),
        cost: numCost,
        currency: currency ? String(currency).trim() : "USD",
        billingCycle: billingCycle || "monthly",
        nextBillingDate: cleanDate,
        category: category || "Entertainment",
        renewalStatus: "active",
        notes: notes ? String(notes).trim() : null,
      },
    });

    // Reuse existing reminder system
    await syncSubscriptionReminder(prisma, user.id, subscription);

    return NextResponse.json(
      {
        success: true,
        message: "Subscription added successfully",
        data: { subscription },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Subscriptions POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_FAILED", message: "Failed to create subscription" } },
      { status: 500 }
    );
  }
}
