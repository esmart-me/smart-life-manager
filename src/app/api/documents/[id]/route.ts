import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateDocumentStatus } from "@/lib/documents/status";
import { syncDocumentReminders } from "@/lib/documents/reminders";
import { saveDocumentFile, deleteDocumentFile } from "@/lib/storage/document-storage";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_PDF_TYPES,
  MAX_FILE_SIZE_BYTES,
  DEFAULT_REMINDER_DAYS,
} from "@/lib/documents/constants";

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
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        files: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    // Security Authorization: strictly check ownership
    if (document.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Get active reminders for this document
    const reminders = await prisma.reminder.findMany({
      where: {
        userId: user.id,
        relatedType: "document",
        relatedId: document.id,
      },
      orderBy: { dueDate: "asc" },
    });

    const statusInfo = calculateDocumentStatus(document.expiryDate);

    return NextResponse.json({
      success: true,
      data: {
        document: {
          ...document,
          statusInfo,
          reminders,
        },
      },
    });
  } catch (error) {
    console.error("[Document Detail GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch document" } },
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
    const existingDoc = await prisma.document.findUnique({
      where: { id },
      include: { files: true },
    });

    if (!existingDoc) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    if (existingDoc.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    const contentType = request.headers.get("content-type") || "";

    let title = existingDoc.title;
    let category = existingDoc.category;
    let documentNumber = existingDoc.documentNumber;
    let issuedBy = existingDoc.issuedBy;
    let issueDate = existingDoc.issueDate;
    let expiryDate = existingDoc.expiryDate;
    let notes = existingDoc.notes;
    let reminderMilestones: number[] = [...DEFAULT_REMINDER_DAYS];

    const filesToUpload: { file: File; kind: "image" | "pdf" }[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      if (formData.has("title") || formData.has("name")) {
        title = String(formData.get("title") || formData.get("name")).trim();
      }
      if (formData.has("category") || formData.has("type")) {
        category = String(formData.get("category") || formData.get("type")).trim();
      }
      if (formData.has("documentNumber")) {
        const val = formData.get("documentNumber");
        documentNumber = val ? String(val).trim() : null;
      }
      if (formData.has("issuedBy")) {
        const val = formData.get("issuedBy");
        issuedBy = val ? String(val).trim() : null;
      }
      if (formData.has("notes")) {
        const val = formData.get("notes");
        notes = val ? String(val).trim() : null;
      }
      if (formData.has("issueDate")) {
        const val = formData.get("issueDate");
        issueDate = val && String(val).trim() ? new Date(String(val)) : null;
      }
      if (formData.has("expiryDate")) {
        const val = formData.get("expiryDate");
        expiryDate = val && String(val).trim() ? new Date(String(val)) : null;
      }

      const remindersRaw = formData.get("reminderMilestones") || formData.get("reminders");
      if (remindersRaw) {
        try {
          const parsed = JSON.parse(String(remindersRaw));
          if (Array.isArray(parsed)) {
            reminderMilestones = parsed.map(Number).filter((n) => !isNaN(n));
          }
        } catch {
          // ignore
        }
      }

      const imageFile = formData.get("image") as File | null;
      if (imageFile && imageFile.size > 0) {
        filesToUpload.push({ file: imageFile, kind: "image" });
      }

      const pdfFile = formData.get("pdf") as File | null;
      if (pdfFile && pdfFile.size > 0) {
        filesToUpload.push({ file: pdfFile, kind: "pdf" });
      }
    } else {
      const body = await request.json();
      if (body.title || body.name) title = String(body.title || body.name).trim();
      if (body.category || body.type) category = String(body.category || body.type).trim();
      if (body.documentNumber !== undefined) documentNumber = body.documentNumber ? String(body.documentNumber).trim() : null;
      if (body.issuedBy !== undefined) issuedBy = body.issuedBy ? String(body.issuedBy).trim() : null;
      if (body.notes !== undefined) notes = body.notes ? String(body.notes).trim() : null;
      if (body.issueDate !== undefined) {
        issueDate = body.issueDate ? new Date(body.issueDate) : null;
      }
      if (body.expiryDate !== undefined) {
        expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
      }
      if (Array.isArray(body.reminderMilestones)) {
        reminderMilestones = body.reminderMilestones.map(Number).filter((n: number) => !isNaN(n));
      }
    }

    if (!title) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TITLE", message: "Document name/title cannot be empty" } },
        { status: 400 }
      );
    }

    // Validate uploaded files
    for (const { file, kind } of filesToUpload) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FILE_TOO_LARGE",
              message: `File ${file.name} exceeds maximum allowed size of 15MB`,
            },
          },
          { status: 400 }
        );
      }

      if (kind === "image" && !ALLOWED_IMAGE_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_FILE_TYPE",
              message: `Unsupported image format (${file.type}). Allowed: JPG, PNG, WEBP, GIF.`,
            },
          },
          { status: 400 }
        );
      }

      if (kind === "pdf" && !ALLOWED_PDF_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_FILE_TYPE",
              message: `Unsupported PDF format (${file.type}). File must be a valid PDF document.`,
            },
          },
          { status: 400 }
        );
      }
    }

    // Update document record
    const updated = await prisma.document.update({
      where: { id },
      data: {
        title,
        category,
        documentNumber,
        issuedBy,
        issueDate,
        expiryDate,
        hasExpiry: expiryDate !== null,
        notes,
      },
    });

    // Save new files if provided
    for (const { file } of filesToUpload) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { storageKey, size } = await saveDocumentFile(user.id, file.name, buffer);

      await prisma.documentFile.create({
        data: {
          documentId: updated.id,
          userId: user.id,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: size,
          storageKey,
          storageDriver: "local",
          isEncrypted: false,
        },
      });
    }

    // Resynchronize reminders
    await syncDocumentReminders(user.id, updated.id, updated.title, expiryDate, reminderMilestones);

    const refreshedFiles = await prisma.documentFile.findMany({
      where: { documentId: updated.id },
    });

    const statusInfo = calculateDocumentStatus(expiryDate);

    return NextResponse.json({
      success: true,
      message: "Document updated successfully",
      data: {
        document: {
          ...updated,
          files: refreshedFiles,
          statusInfo,
        },
      },
    });
  } catch (error) {
    console.error("[Document Update PUT Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_FAILED", message: "Failed to update document" } },
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
    const document = await prisma.document.findUnique({
      where: { id },
      include: { files: true },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    if (document.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // 1. Delete all physical files from secure storage
    for (const file of document.files) {
      await deleteDocumentFile(file.storageKey);
    }

    // 2. Delete all linked reminder records
    await prisma.reminder.deleteMany({
      where: {
        userId: user.id,
        relatedType: "document",
        relatedId: document.id,
      },
    });

    // 3. Delete Document (DocumentFile cascade deleted)
    await prisma.document.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Document and associated files deleted successfully",
    });
  } catch (error) {
    console.error("[Document DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_FAILED", message: "Failed to delete document" } },
      { status: 500 }
    );
  }
}
