import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

interface RouteParams {
  params: Promise<{ id: string; serviceId: string }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id: inventoryItemId, serviceId } = await params;

  try {
    const log = await prisma.inventoryServiceLog.findUnique({
      where: { id: serviceId },
    });

    if (!log || log.inventoryItemId !== inventoryItemId || log.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Service record not found" } },
        { status: 404 }
      );
    }

    await prisma.inventoryServiceLog.delete({
      where: { id: serviceId },
    });

    return NextResponse.json({
      success: true,
      message: "Service record deleted",
    });
  } catch (error) {
    console.error("[Inventory Service DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete service record" } },
      { status: 500 }
    );
  }
}
