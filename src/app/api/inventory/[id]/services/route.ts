import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id: inventoryItemId } = await params;

  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    });

    if (!item || item.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Inventory item not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      serviceDate,
      description,
      provider,
      cost,
      currency = item.currency || "USD",
      nextServiceDate,
      notes,
    } = body;

    if (!serviceDate) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DATE", message: "Service date is required" } },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DESCRIPTION", message: "Description is required" } },
        { status: 400 }
      );
    }

    const log = await prisma.inventoryServiceLog.create({
      data: {
        inventoryItemId,
        userId: user.id,
        serviceDate: new Date(serviceDate),
        description: description.trim(),
        provider: provider ? String(provider).trim() : null,
        cost: cost !== null && cost !== undefined && !isNaN(Number(cost)) ? Number(cost) : null,
        currency: currency ? String(currency).trim() : "USD",
        nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null,
        notes: notes ? String(notes).trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Service record added successfully",
      data: log,
    });
  } catch (error) {
    console.error("[Inventory Service POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to record service" } },
      { status: 500 }
    );
  }
}
