import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { saveReceiptFile } from "@/lib/storage/receipt-storage";
import { ALLOWED_RECEIPT_TYPES, MAX_RECEIPT_SIZE_BYTES } from "@/lib/finance/constants";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const categoryFilter = (searchParams.get("category") || "all").trim();
  const methodFilter = (searchParams.get("method") || "all").trim();
  const searchQuery = (searchParams.get("q") || "").trim().toLowerCase();
  const monthParam = searchParams.get("month"); // e.g. "2026-09"

  try {
    const expenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
        ...(categoryFilter !== "all" && categoryFilter !== "" ? { category: categoryFilter } : {}),
        ...(methodFilter !== "all" && methodFilter !== "" ? { paymentMethod: methodFilter } : {}),
      },
      orderBy: { spentAt: "desc" },
    });

    const filtered = expenses.filter((e) => {
      // Month filter if supplied
      if (monthParam) {
        const d = new Date(e.spentAt);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const entryMonth = `${y}-${m}`;
        if (entryMonth !== monthParam) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery) {
        const matchTitle = e.title.toLowerCase().includes(searchQuery);
        const matchNotes = e.notes?.toLowerCase().includes(searchQuery) || false;
        const matchCategory = e.category.toLowerCase().includes(searchQuery);
        const matchMethod = e.paymentMethod?.toLowerCase().includes(searchQuery) || false;
        if (!matchTitle && !matchNotes && !matchCategory && !matchMethod) {
          return false;
        }
      }

      return true;
    });

    return NextResponse.json({
      success: true,
      data: {
        expenses: filtered,
        total: filtered.length,
      },
    });
  } catch (error) {
    console.error("[Expenses GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch expenses" } },
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

    let title = "";
    let amountStr = "";
    let currency = "USD";
    let category = "Other";
    let spentAtStr = "";
    let paymentMethod = "Cash";
    let notes = "";
    let receiptStorageKey: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      title = (formData.get("title") || formData.get("description") || "").toString();
      amountStr = (formData.get("amount") || "").toString();
      currency = (formData.get("currency") || "USD").toString();
      category = (formData.get("category") || "Other").toString();
      spentAtStr = (formData.get("spentAt") || formData.get("date") || "").toString();
      paymentMethod = (formData.get("paymentMethod") || "Cash").toString();
      notes = (formData.get("notes") || "").toString();

      const receiptFile = formData.get("receipt");
      if (receiptFile && typeof receiptFile === "object" && "arrayBuffer" in receiptFile) {
        const fileObj = receiptFile as File;
        if (fileObj.size > 0) {
          if (!ALLOWED_RECEIPT_TYPES.includes(fileObj.type)) {
            return NextResponse.json(
              {
                success: false,
                error: {
                  code: "INVALID_FILE_TYPE",
                  message: "Receipt must be an image (PNG, JPEG, WebP) or PDF file",
                },
              },
              { status: 400 }
            );
          }

          if (fileObj.size > MAX_RECEIPT_SIZE_BYTES) {
            return NextResponse.json(
              {
                success: false,
                error: {
                  code: "FILE_TOO_LARGE",
                  message: "Receipt file size exceeds 10MB limit",
                },
              },
              { status: 400 }
            );
          }

          const arrayBuffer = await fileObj.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const saved = await saveReceiptFile(user.id, fileObj.name, buffer);
          receiptStorageKey = saved.storageKey;
        }
      }
    } else {
      const body = await request.json();
      title = body.title || body.description || "";
      amountStr = body.amount !== undefined ? String(body.amount) : "";
      currency = body.currency || "USD";
      category = body.category || "Other";
      spentAtStr = body.spentAt || body.date || "";
      paymentMethod = body.paymentMethod || "Cash";
      notes = body.notes || "";
      receiptStorageKey = body.receiptUrl || null;
    }

    if (!title || title.trim() === "") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TITLE", message: "Expense description is required" } },
        { status: 400 }
      );
    }

    const numAmount = Number(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_AMOUNT", message: "A valid positive expense amount is required" } },
        { status: 400 }
      );
    }

    const cleanSpentAt = spentAtStr ? new Date(spentAtStr) : new Date();
    if (isNaN(cleanSpentAt.getTime())) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DATE", message: "Invalid date format" } },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        userId: user.id,
        title: title.trim(),
        amount: numAmount,
        currency: currency.trim() || "USD",
        category: category.trim() || "Other",
        spentAt: cleanSpentAt,
        paymentMethod: paymentMethod.trim() || "Cash",
        notes: notes ? notes.trim() : null,
        receiptUrl: receiptStorageKey,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Expense saved successfully",
        data: { expense },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Expenses POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_FAILED", message: "Failed to create expense" } },
      { status: 500 }
    );
  }
}
