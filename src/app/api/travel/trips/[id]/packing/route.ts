import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id: tripId } = await params;

  try {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId: user.id },
    });

    if (!trip) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Trip not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      item,
      category = "essentials",
      quantity = 1,
    } = body;

    if (!item || !item.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Item name is required" } },
        { status: 400 }
      );
    }

    const packingItem = await prisma.tripPackingItem.create({
      data: {
        tripId,
        userId: user.id,
        item: item.trim(),
        category,
        quantity: parseInt(quantity, 10) || 1,
      },
    });

    return NextResponse.json({ success: true, data: packingItem }, { status: 201 });
  } catch (error) {
    console.error("[Trip Packing POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to add packing item" } },
      { status: 500 }
    );
  }
}
