import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth/session";

import { prisma } from "@/lib/db/prisma";
import { readDocumentFile, deleteDocumentFile } from "@/lib/storage/document-storage";

interface RouteParams {
  params: Promise<{ id: string; fileId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id: documentId, fileId } = await params;

  try {
    const docFile = await prisma.documentFile.findUnique({
      where: { id: fileId },
    });

    if (!docFile || docFile.documentId !== documentId) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "File not found" } },
        { status: 404 }
      );
    }

    // Strict Security Authorization: Customer B is blocked; Administrator inspecting Customer A's account has permission.
    if (docFile.userId !== user.id && !isAdmin(user.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    const fileBuffer = await readDocumentFile(docFile.storageKey);
    if (!fileBuffer) {
      return NextResponse.json(
        { success: false, error: { code: "FILE_MISSING", message: "Physical file could not be found" } },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get("download") === "true";

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": docFile.fileType || "application/octet-stream",
        "Content-Length": String(fileBuffer.length),
        "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(
          docFile.fileName
        )}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[Document File Stream Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to stream file" } },
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

  const { id: documentId, fileId } = await params;

  try {
    const docFile = await prisma.documentFile.findUnique({
      where: { id: fileId },
    });

    if (!docFile || docFile.documentId !== documentId) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "File not found" } },
        { status: 404 }
      );
    }

    if (docFile.userId !== user.id && !isAdmin(user.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    await deleteDocumentFile(docFile.storageKey);
    await prisma.documentFile.delete({
      where: { id: fileId },
    });

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("[Document File DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_FAILED", message: "Failed to delete file" } },
      { status: 500 }
    );
  }
}
