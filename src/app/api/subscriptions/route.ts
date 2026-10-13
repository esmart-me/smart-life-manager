import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateSubscriptionMetrics, syncSubscriptionReminder } from "@/lib/subscriptions/calculations";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") || "all";
  const includeArchived = searchParams.get("archived") === "true";

  try {
    const whereClause: any = {
      userId: user.id,
      isArchived: includeArchived,
    };

    if (statusFilter !== "all") {
      whereClause.renewalStatus = statusFilter;
    }

    const subscriptions = await prisma.subscription.findMany({
      where: whereClause,
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
    const {
      name,
      cost,
      amount,
      currency,
      billingCycle,
      nextBillingDate,
      nextRenewalDate,
      renewalDate,
      startDate,
      trialEndDate,
      cancellationDate,
      renewalStatus,
      status,
      websiteUrl,
      category,
      notes,
    } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_NAME", message: "Subscription name is required" } },
        { status: 400 }
      );
    }

    const rawCost = cost !== undefined ? cost : amount;
    const numCost = Number(rawCost);
    if (isNaN(numCost) || numCost < 0) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_COST", message: "Valid amount is required" } },
        { status: 400 }
      );
    }

    const rawBillingDate = nextBillingDate || nextRenewalDate || renewalDate;
    if (!rawBillingDate) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DATE", message: "Billing date is required" } },
        { status: 400 }
      );
    }

    const cleanBillingDate = new Date(rawBillingDate);
    if (isNaN(cleanBillingDate.getTime())) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DATE", message: "Invalid billing date format" } },
        { status: 400 }
      );
    }

    // Status handling
    const resolvedStatus = (renewalStatus || status || (trialEndDate ? "trial" : "active")).toLowerCase();
    const validStatus = ["active", "trial", "paused", "cancelled", "expired"].includes(resolvedStatus)
      ? resolvedStatus
      : "active";

    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        name: name.trim(),
        cost: numCost,
        currency: currency ? String(currency).trim().toUpperCase() : "USD",
        billingCycle: billingCycle || "monthly",
        nextBillingDate: cleanBillingDate,
        startDate: startDate ? new Date(startDate) : null,
        trialEndDate: trialEndDate ? new Date(trialEndDate) : null,
        cancellationDate: cancellationDate ? new Date(cancellationDate) : validStatus === "cancelled" ? new Date() : null,
        renewalStatus: validStatus,
        websiteUrl: websiteUrl ? String(websiteUrl).trim() : null,
        category: category || "Entertainment",
        notes: notes ? String(notes).trim() : null,
        isArchived: false,
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
