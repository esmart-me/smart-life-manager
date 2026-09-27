import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { readReceiptFile } from "@/lib/storage/receipt-storage";
import path from "path";

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
    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense || expense.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Expense not found" } },
        { status: 404 }
      );
    }

    if (!expense.receiptUrl) {
      return NextResponse.json(
        { success: false, error: { code: "NO_RECEIPT", message: "No receipt attached to this expense" } },
        { status: 404 }
      );
    }

    const buffer = await readReceiptFile(expense.receiptUrl);
    if (!buffer) {
      return NextResponse.json(
        { success: false, error: { code: "FILE_MISSING", message: "Receipt file is missing from storage" } },
        { status: 404 }
      );
    }

    const ext = path.extname(expense.receiptUrl).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".webp") contentType = "image/webp";

    const fileName = path.basename(expense.receiptUrl);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[Receipt Stream Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to stream receipt" } },
      { status: 500 }
    );
  }
}
