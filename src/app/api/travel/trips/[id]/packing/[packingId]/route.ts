import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; packingId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id: tripId, packingId } = await params;

  try {
    const existing = await prisma.tripPackingItem.findFirst({
      where: { id: packingId, tripId, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Packing item not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { item, category, quantity, isPacked } = body;

    const updated = await prisma.tripPackingItem.update({
      where: { id: packingId },
      data: {
        ...(item !== undefined && { item: item.trim() }),
        ...(category !== undefined && { category }),
        ...(quantity !== undefined && { quantity: parseInt(quantity, 10) || 1 }),
        ...(isPacked !== undefined && { isPacked: Boolean(isPacked) }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Trip Packing PUT Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update packing item" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; packingId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id: tripId, packingId } = await params;

  try {
    const existing = await prisma.tripPackingItem.findFirst({
      where: { id: packingId, tripId, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Packing item not found" } },
        { status: 404 }
      );
    }

    await prisma.tripPackingItem.delete({
      where: { id: packingId },
    });

    return NextResponse.json({ success: true, message: "Packing item deleted" });
  } catch (error) {
    console.error("[Trip Packing DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete packing item" } },
      { status: 500 }
    );
  }
}
