import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateWarrantyStatus, syncWarrantyReminder } from "@/lib/inventory/status";
import { saveDocumentFile } from "@/lib/storage/document-storage";

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

  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        serviceLogs: {
          orderBy: { serviceDate: "desc" },
        },
      },
    });

    if (!item || item.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Inventory item not found" } },
        { status: 404 }
      );
    }

    const warrantyInfo = calculateWarrantyStatus(item.warrantyExpiry, item.warrantyStart);

    return NextResponse.json({
      success: true,
      data: {
        ...item,
        warrantyStatus: warrantyInfo.status,
        daysUntilWarrantyExpiry: warrantyInfo.daysRemaining,
        warrantyLabel: warrantyInfo.label,
      },
    });
  } catch (error) {
    console.error("[Inventory GET by ID Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch item" } },
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
    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Inventory item not found" } },
        { status: 404 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let data: any = {};
    let receiptUrl: string | undefined = undefined;
    let photoUrl: string | undefined = undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      data.name = formData.get("name")?.toString();
      data.category = formData.get("category")?.toString();
      data.brand = formData.get("brand")?.toString();
      data.modelNumber = formData.get("modelNumber")?.toString();
      data.serialNumber = formData.get("serialNumber")?.toString();
      data.purchaseDate = formData.get("purchaseDate")?.toString();
      data.purchasePrice = formData.get("purchasePrice") !== null ? Number(formData.get("purchasePrice")) : undefined;
      data.currency = formData.get("currency")?.toString();
      data.retailer = formData.get("retailer")?.toString();
      data.location = formData.get("location")?.toString();
      data.warrantyStart = formData.get("warrantyStart")?.toString();
      data.warrantyExpiry = formData.get("warrantyExpiry")?.toString();
      data.warrantyNotes = formData.get("warrantyNotes")?.toString();
      data.notes = formData.get("notes")?.toString();
      data.isArchived = formData.get("isArchived") !== null ? formData.get("isArchived") === "true" : undefined;
      data.syncReminder = formData.get("syncReminder") === "true";
      data.advanceReminderDays = formData.get("advanceReminderDays") ? Number(formData.get("advanceReminderDays")) : 30;

      const receiptFile = formData.get("receiptFile") as File | null;
      if (receiptFile && receiptFile.size > 0) {
        const buffer = Buffer.from(await receiptFile.arrayBuffer());
        const saved = await saveDocumentFile(user.id, receiptFile.name, buffer);
        receiptUrl = `/storage/documents/${saved.storageKey}`;
      }

      const photoFile = formData.get("photoFile") as File | null;
      if (photoFile && photoFile.size > 0) {
        const buffer = Buffer.from(await photoFile.arrayBuffer());
        const saved = await saveDocumentFile(user.id, photoFile.name, buffer);
        photoUrl = `/storage/documents/${saved.storageKey}`;
      }
    } else {
      data = await request.json();
    }

    const updateData: any = {};
    if (data.name !== undefined) {
      if (!data.name.trim()) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_NAME", message: "Name cannot be empty" } },
          { status: 400 }
        );
      }
      updateData.name = data.name.trim();
    }

    if (data.category !== undefined) updateData.category = data.category;
    if (data.brand !== undefined) updateData.brand = data.brand ? String(data.brand).trim() : null;
    if (data.modelNumber !== undefined) updateData.modelNumber = data.modelNumber ? String(data.modelNumber).trim() : null;
    if (data.serialNumber !== undefined) updateData.serialNumber = data.serialNumber ? String(data.serialNumber).trim() : null;
    if (data.retailer !== undefined) updateData.retailer = data.retailer ? String(data.retailer).trim() : null;
    if (data.location !== undefined) updateData.location = data.location ? String(data.location).trim() : null;
    if (data.notes !== undefined) updateData.notes = data.notes ? String(data.notes).trim() : null;
    if (data.warrantyNotes !== undefined) updateData.warrantyNotes = data.warrantyNotes ? String(data.warrantyNotes).trim() : null;
    if (data.currency !== undefined) updateData.currency = data.currency;

    if (data.purchasePrice !== undefined) {
      updateData.purchasePrice = data.purchasePrice !== null && !isNaN(Number(data.purchasePrice)) ? Number(data.purchasePrice) : null;
    }

    if (data.purchaseDate !== undefined) {
      updateData.purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : null;
    }
    if (data.warrantyStart !== undefined) {
      updateData.warrantyStart = data.warrantyStart ? new Date(data.warrantyStart) : null;
    }
    if (data.warrantyExpiry !== undefined) {
      updateData.warrantyExpiry = data.warrantyExpiry ? new Date(data.warrantyExpiry) : null;
    }

    if (data.isArchived !== undefined) {
      updateData.isArchived = Boolean(data.isArchived);
    }

    if (receiptUrl) updateData.receiptUrl = receiptUrl;
    if (photoUrl) updateData.photoUrl = photoUrl;

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: updateData,
      include: {
        serviceLogs: {
          orderBy: { serviceDate: "desc" },
        },
      },
    });

    // Update advance warranty reminder if configured
    if (updated.warrantyExpiry && data.syncReminder) {
      const days = data.advanceReminderDays || 30;
      await syncWarrantyReminder(user.id, updated.id, updated.name, updated.warrantyExpiry, days);
    }

    const warrantyInfo = calculateWarrantyStatus(updated.warrantyExpiry, updated.warrantyStart);

    return NextResponse.json({
      success: true,
      message: "Item updated successfully",
      data: {
        ...updated,
        warrantyStatus: warrantyInfo.status,
        daysUntilWarrantyExpiry: warrantyInfo.daysRemaining,
        warrantyLabel: warrantyInfo.label,
      },
    });
  } catch (error) {
    console.error("[Inventory PUT Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update item" } },
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
    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Item not found" } },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.reminder.deleteMany({
        where: { userId: user.id, relatedType: "inventory_warranty", relatedId: id },
      }),
      prisma.inventoryServiceLog.deleteMany({
        where: { inventoryItemId: id },
      }),
      prisma.inventoryItem.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Inventory item and associated history deleted",
    });
  } catch (error) {
    console.error("[Inventory DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete item" } },
      { status: 500 }
    );
  }
}
