import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { saveReceiptFile, deleteReceiptFile } from "@/lib/storage/receipt-storage";
import { ALLOWED_RECEIPT_TYPES, MAX_RECEIPT_SIZE_BYTES } from "@/lib/finance/constants";

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
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense || expense.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Expense not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { expense },
    });
  } catch (error) {
    console.error("[Expense GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch expense" } },
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
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Expense not found" } },
        { status: 404 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    const dataToUpdate: Record<string, unknown> = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const title = formData.get("title") || formData.get("description");
      const amount = formData.get("amount");
      const currency = formData.get("currency");
      const category = formData.get("category");
      const spentAt = formData.get("spentAt") || formData.get("date");
      const paymentMethod = formData.get("paymentMethod");
      const notes = formData.get("notes");

      if (title !== null) dataToUpdate.title = String(title).trim();
      if (amount !== null) {
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
          return NextResponse.json(
            { success: false, error: { code: "INVALID_AMOUNT", message: "Amount must be a positive number" } },
            { status: 400 }
          );
        }
        dataToUpdate.amount = numAmount;
      }
      if (currency !== null) dataToUpdate.currency = String(currency).trim();
      if (category !== null) dataToUpdate.category = String(category).trim();
      if (spentAt !== null) {
        const cleanDate = new Date(String(spentAt));
        if (isNaN(cleanDate.getTime())) {
          return NextResponse.json(
            { success: false, error: { code: "INVALID_DATE", message: "Invalid date format" } },
            { status: 400 }
          );
        }
        dataToUpdate.spentAt = cleanDate;
      }
      if (paymentMethod !== null) dataToUpdate.paymentMethod = String(paymentMethod).trim();
      if (notes !== null) dataToUpdate.notes = String(notes).trim() || null;

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

          // Delete old receipt if existed
          if (existing.receiptUrl) {
            await deleteReceiptFile(existing.receiptUrl);
          }

          const arrayBuffer = await fileObj.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const saved = await saveReceiptFile(user.id, fileObj.name, buffer);
          dataToUpdate.receiptUrl = saved.storageKey;
        }
      }
    } else {
      const body = await request.json();
      const title = body.title || body.description;
      if (title !== undefined) {
        if (typeof title !== "string" || title.trim() === "") {
          return NextResponse.json(
            { success: false, error: { code: "INVALID_TITLE", message: "Description cannot be empty" } },
            { status: 400 }
          );
        }
        dataToUpdate.title = title.trim();
      }

      if (body.amount !== undefined) {
        const numAmount = Number(body.amount);
        if (isNaN(numAmount) || numAmount <= 0) {
          return NextResponse.json(
            { success: false, error: { code: "INVALID_AMOUNT", message: "Amount must be a positive number" } },
            { status: 400 }
          );
        }
        dataToUpdate.amount = numAmount;
      }

      if (body.currency !== undefined) dataToUpdate.currency = String(body.currency).trim();
      if (body.category !== undefined) dataToUpdate.category = String(body.category).trim();
      if (body.paymentMethod !== undefined) dataToUpdate.paymentMethod = String(body.paymentMethod).trim();
      if (body.notes !== undefined) dataToUpdate.notes = body.notes ? String(body.notes).trim() : null;

      const dateField = body.spentAt || body.date;
      if (dateField !== undefined) {
        const cleanDate = new Date(dateField);
        if (isNaN(cleanDate.getTime())) {
          return NextResponse.json(
            { success: false, error: { code: "INVALID_DATE", message: "Invalid date format" } },
            { status: 400 }
          );
        }
        dataToUpdate.spentAt = cleanDate;
      }

      if (body.receiptUrl !== undefined) {
        dataToUpdate.receiptUrl = body.receiptUrl ? String(body.receiptUrl).trim() : null;
      }
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      message: "Expense updated successfully",
      data: { expense: updated },
    });
  } catch (error) {
    console.error("[Expense PUT Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_FAILED", message: "Failed to update expense" } },
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
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Expense not found" } },
        { status: 404 }
      );
    }

    if (existing.receiptUrl) {
      await deleteReceiptFile(existing.receiptUrl);
    }

    await prisma.expense.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("[Expense DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_FAILED", message: "Failed to delete expense" } },
      { status: 500 }
    );
  }
}
