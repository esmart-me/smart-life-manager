import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function PUT(
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

  const { id } = await params;

  try {
    const existing = await prisma.familyShoppingItem.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Shopping item not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      item,
      quantity,
      category,
      assignedMemberName,
      isPurchased,
      estimatedCost,
      notes,
    } = body;

    const updated = await prisma.familyShoppingItem.update({
      where: { id },
      data: {
        ...(item !== undefined && { item: item.trim() }),
        ...(quantity !== undefined && { quantity: quantity?.trim() || null }),
        ...(category !== undefined && { category }),
        ...(assignedMemberName !== undefined && { assignedMemberName: assignedMemberName?.trim() || null }),
        ...(isPurchased !== undefined && { isPurchased: Boolean(isPurchased) }),
        ...(estimatedCost !== undefined && { estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Family Shopping PUT Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update shopping item" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const existing = await prisma.familyShoppingItem.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Shopping item not found" } },
        { status: 404 }
      );
    }

    await prisma.familyShoppingItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Shopping item deleted successfully" });
  } catch (error) {
    console.error("[Family Shopping DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete shopping item" } },
      { status: 500 }
    );
  }
}
