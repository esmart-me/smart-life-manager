import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const items = await prisma.familyShoppingItem.findMany({
      where: { userId: user.id },
      orderBy: [{ isPurchased: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error("[Family Shopping GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch shopping items" } },
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
      item,
      quantity,
      category = "groceries",
      assignedMemberName,
      estimatedCost,
      notes,
    } = body;

    if (!item || !item.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Item name is required" } },
        { status: 400 }
      );
    }

    const newItem = await prisma.familyShoppingItem.create({
      data: {
        userId: user.id,
        item: item.trim(),
        quantity: quantity?.trim() || null,
        category,
        assignedMemberName: assignedMemberName?.trim() || null,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, data: newItem }, { status: 201 });
  } catch (error) {
    console.error("[Family Shopping POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create shopping item" } },
      { status: 500 }
    );
  }
}
