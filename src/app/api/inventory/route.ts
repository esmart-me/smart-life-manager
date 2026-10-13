import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateWarrantyStatus, syncWarrantyReminder } from "@/lib/inventory/status";
import { saveDocumentFile } from "@/lib/storage/document-storage";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const categoryFilter = searchParams.get("category") || "all";
  const locationFilter = searchParams.get("location") || "all";
  const statusFilter = searchParams.get("status") || "all"; // "all" | "active" | "expiring_soon" | "expired"
  const includeArchived = searchParams.get("archived") === "true";

  try {
    const whereClause: any = {
      userId: user.id,
      isArchived: includeArchived ? true : false,
    };

    if (categoryFilter !== "all") {
      whereClause.category = categoryFilter;
    }
    if (locationFilter !== "all") {
      whereClause.location = locationFilter;
    }

    const items = await prisma.inventoryItem.findMany({
      where: whereClause,
      include: {
        serviceLogs: {
          orderBy: { serviceDate: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute status and filter by text search & warranty status
    const formatted = items.map((item) => {
      const warrantyInfo = calculateWarrantyStatus(item.warrantyExpiry, item.warrantyStart);
      return {
        ...item,
        warrantyStatus: warrantyInfo.status,
        daysUntilWarrantyExpiry: warrantyInfo.daysRemaining,
        warrantyLabel: warrantyInfo.label,
      };
    });

    let filtered = formatted;
    if (q) {
      filtered = filtered.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          (it.brand && it.brand.toLowerCase().includes(q)) ||
          (it.modelNumber && it.modelNumber.toLowerCase().includes(q)) ||
          (it.serialNumber && it.serialNumber.toLowerCase().includes(q)) ||
          (it.location && it.location.toLowerCase().includes(q)) ||
          (it.category && it.category.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((it) => it.warrantyStatus === statusFilter);
    }

    // Compute metrics
    let activeWarranties = 0;
    let expiringSoonWarranties = 0;
    let expiredWarranties = 0;
    const valuationByCurrency: Record<string, number> = {};

    for (const it of formatted) {
      if (it.warrantyStatus === "active") activeWarranties++;
      else if (it.warrantyStatus === "expiring_soon") expiringSoonWarranties++;
      else if (it.warrantyStatus === "expired") expiredWarranties++;

      if (it.purchasePrice && it.purchasePrice > 0) {
        const curr = it.currency || "USD";
        valuationByCurrency[curr] = (valuationByCurrency[curr] || 0) + it.purchasePrice;
      }
    }

    // Extract unique categories and locations for filter dropdowns
    const allCategories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));
    const allLocations = Array.from(new Set(items.map((i) => i.location).filter(Boolean))) as string[];

    return NextResponse.json({
      success: true,
      data: {
        items: filtered,
        metrics: {
          totalCount: items.length,
          activeWarranties,
          expiringSoonWarranties,
          expiredWarranties,
          valuationByCurrency,
        },
        filters: {
          categories: allCategories,
          locations: allLocations,
        },
      },
    });
  } catch (error) {
    console.error("[Inventory GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch inventory items" } },
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
    const contentType = request.headers.get("content-type") || "";
    let data: any = {};
    let receiptUrl: string | null = null;
    let photoUrl: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      data.name = formData.get("name")?.toString();
      data.category = formData.get("category")?.toString() || "electronics";
      data.brand = formData.get("brand")?.toString() || null;
      data.modelNumber = formData.get("modelNumber")?.toString() || null;
      data.serialNumber = formData.get("serialNumber")?.toString() || null;
      data.purchaseDate = formData.get("purchaseDate")?.toString() || null;
      data.purchasePrice = formData.get("purchasePrice") ? Number(formData.get("purchasePrice")) : null;
      data.currency = formData.get("currency")?.toString() || "USD";
      data.retailer = formData.get("retailer")?.toString() || null;
      data.location = formData.get("location")?.toString() || null;
      data.warrantyStart = formData.get("warrantyStart")?.toString() || null;
      data.warrantyExpiry = formData.get("warrantyExpiry")?.toString() || null;
      data.warrantyNotes = formData.get("warrantyNotes")?.toString() || null;
      data.notes = formData.get("notes")?.toString() || null;
      data.syncReminder = formData.get("syncReminder") === "true";
      data.advanceReminderDays = formData.get("advanceReminderDays") ? Number(formData.get("advanceReminderDays")) : 30;

      // Handle attached files safely
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

    if (!data.name || typeof data.name !== "string" || data.name.trim() === "") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_NAME", message: "Item name is required" } },
        { status: 400 }
      );
    }

    const item = await prisma.inventoryItem.create({
      data: {
        userId: user.id,
        name: data.name.trim(),
        category: data.category || "electronics",
        brand: data.brand ? String(data.brand).trim() : null,
        modelNumber: data.modelNumber ? String(data.modelNumber).trim() : null,
        serialNumber: data.serialNumber ? String(data.serialNumber).trim() : null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        purchasePrice: data.purchasePrice !== null && !isNaN(Number(data.purchasePrice)) ? Number(data.purchasePrice) : null,
        currency: data.currency ? String(data.currency).trim() : "USD",
        retailer: data.retailer ? String(data.retailer).trim() : null,
        location: data.location ? String(data.location).trim() : null,
        warrantyStart: data.warrantyStart ? new Date(data.warrantyStart) : null,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
        warrantyNotes: data.warrantyNotes ? String(data.warrantyNotes).trim() : null,
        receiptUrl: receiptUrl || data.receiptUrl || null,
        photoUrl: photoUrl || data.photoUrl || null,
        notes: data.notes ? String(data.notes).trim() : null,
        isArchived: false,
      },
    });

    // Sync advance warranty reminder if configured
    if (item.warrantyExpiry && data.syncReminder) {
      const days = data.advanceReminderDays || 30;
      await syncWarrantyReminder(user.id, item.id, item.name, item.warrantyExpiry, days);
    }

    const warrantyInfo = calculateWarrantyStatus(item.warrantyExpiry, item.warrantyStart);

    return NextResponse.json({
      success: true,
      message: "Inventory item added successfully",
      data: {
        ...item,
        warrantyStatus: warrantyInfo.status,
        daysUntilWarrantyExpiry: warrantyInfo.daysRemaining,
        warrantyLabel: warrantyInfo.label,
        serviceLogs: [],
      },
    });
  } catch (error) {
    console.error("[Inventory POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create inventory item" } },
      { status: 500 }
    );
  }
}
