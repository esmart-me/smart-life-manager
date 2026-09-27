import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { syncSubscriptionReminder } from "@/lib/subscriptions/calculations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  if (!id || typeof id !== "string" || id.trim() === "") {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Subscription ID is required" } },
      { status: 400 }
    );
  }

  try {
    const subscription = await prisma.subscription.findUnique({ where: { id } });
    if (!subscription || subscription.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Subscription not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { subscription },
    });
  } catch (error) {
    console.error("[Subscription GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch subscription" } },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const existing = await prisma.subscription.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Subscription not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, cost, currency, billingCycle, nextBillingDate, renewalStatus, category, notes } = body;

    const dataToUpdate: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_NAME", message: "Subscription name cannot be empty" } },
          { status: 400 }
        );
      }
      dataToUpdate.name = name.trim();
    }

    if (cost !== undefined) {
      const numCost = Number(cost);
      if (isNaN(numCost) || numCost <= 0) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_COST", message: "Cost must be a positive number" } },
          { status: 400 }
        );
      }
      dataToUpdate.cost = numCost;
    }

    if (currency !== undefined) dataToUpdate.currency = String(currency).trim();
    if (billingCycle !== undefined) dataToUpdate.billingCycle = String(billingCycle).trim();

    if (nextBillingDate !== undefined) {
      const cleanDate = new Date(nextBillingDate);
      if (isNaN(cleanDate.getTime())) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_DATE", message: "Invalid billing date format" } },
          { status: 400 }
        );
      }
      dataToUpdate.nextBillingDate = cleanDate;
    }

    if (renewalStatus !== undefined) dataToUpdate.renewalStatus = String(renewalStatus).trim();
    if (category !== undefined) dataToUpdate.category = String(category).trim();
    if (notes !== undefined) dataToUpdate.notes = notes ? String(notes).trim() : null;

    const updated = await prisma.subscription.update({
      where: { id },
      data: dataToUpdate,
    });

    // Resync reminder
    await syncSubscriptionReminder(prisma, user.id, updated);

    return NextResponse.json({
      success: true,
      message: "Subscription updated successfully",
      data: { subscription: updated },
    });
  } catch (error) {
    console.error("[Subscription PUT Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_FAILED", message: "Failed to update subscription" } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const existing = await prisma.subscription.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Subscription not found" } },
        { status: 404 }
      );
    }

    // Cascade delete subscription reminder
    await prisma.reminder.deleteMany({
      where: {
        userId: user.id,
        relatedType: "subscription",
        relatedId: id,
      },
    });

    await prisma.subscription.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Subscription deleted successfully",
    });
  } catch (error) {
    console.error("[Subscription DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_FAILED", message: "Failed to delete subscription" } },
      { status: 500 }
    );
  }
}
