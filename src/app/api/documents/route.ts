import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const documents = await prisma.document.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: { documents } });
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
    const { title, category, documentNumber, issuedBy, expiryDate, notes } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TITLE", message: "Document title is required" } },
        { status: 400 }
      );
    }

    const cleanExpiry = expiryDate ? new Date(expiryDate) : null;

    const document = await prisma.document.create({
      data: {
        userId: user.id,
        title: title.trim(),
        category: category || "general",
        documentNumber: documentNumber ? String(documentNumber).trim() : null,
        issuedBy: issuedBy ? String(issuedBy).trim() : null,
        expiryDate: cleanExpiry,
        hasExpiry: cleanExpiry !== null,
        notes: notes ? String(notes).trim() : null,
      },
    });

    return NextResponse.json(
      { success: true, message: "Document saved successfully", data: { document } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Documents POST Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "CREATE_FAILED", message: "Failed to create document" } },
      { status: 500 }
    );
  }
}
