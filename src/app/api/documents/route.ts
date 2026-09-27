import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateDocumentStatus } from "@/lib/documents/status";
import { syncDocumentReminders } from "@/lib/documents/reminders";
import { saveDocumentFile } from "@/lib/storage/document-storage";
import {
  DOCUMENT_TYPES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_PDF_TYPES,
  MAX_FILE_SIZE_BYTES,
  DEFAULT_REMINDER_DAYS,
} from "@/lib/documents/constants";
import { checkFeatureAccess } from "@/lib/plans/plan-service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const searchQuery = (searchParams.get("q") || "").trim().toLowerCase();
  const statusFilter = (searchParams.get("status") || "all").trim().toUpperCase();
  const typeFilter = (searchParams.get("type") || "all").trim();

  try {
    const rawDocuments = await prisma.document.findMany({
      where: {
        userId: user.id,
        ...(typeFilter !== "all" ? { category: typeFilter } : {}),
      },
      include: {
        files: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute status and filter
    const documents = rawDocuments
      .map((doc) => {
        const statusInfo = calculateDocumentStatus(doc.expiryDate);
        return {
          ...doc,
          statusInfo,
        };
      })
      .filter((doc) => {
        // Status filter
        if (statusFilter !== "ALL" && statusFilter !== "") {
          const expectedStatus = statusFilter.replace(/-/g, "_");
          if (doc.statusInfo.status !== expectedStatus) {
            return false;
          }
        }

        // Search query filter
        if (searchQuery) {
          const matchTitle = doc.title.toLowerCase().includes(searchQuery);
          const matchNumber = doc.documentNumber?.toLowerCase().includes(searchQuery) || false;
          const matchNotes = doc.notes?.toLowerCase().includes(searchQuery) || false;
          const matchCategory = doc.category.toLowerCase().includes(searchQuery);
          if (!matchTitle && !matchNumber && !matchNotes && !matchCategory) {
            return false;
          }
        }

        return true;
      });

    return NextResponse.json({
      success: true,
      data: {
        documents,
        total: documents.length,
      },
    });
  } catch (error) {
    console.error("[Documents GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch documents" } },
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
    let category = "Other";
    let documentNumber: string | null = null;
    let issuedBy: string | null = null;
    let issueDate: Date | null = null;
    let expiryDate: Date | null = null;
    let notes: string | null = null;
    let reminderMilestones: number[] = [];
    const filesToUpload: { file: File; kind: "image" | "pdf" }[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      title = String(formData.get("title") || formData.get("name") || "").trim();
      category = String(formData.get("category") || formData.get("type") || "Other").trim();
      documentNumber = formData.get("documentNumber") ? String(formData.get("documentNumber")).trim() : null;
      issuedBy = formData.get("issuedBy") ? String(formData.get("issuedBy")).trim() : null;
      notes = formData.get("notes") ? String(formData.get("notes")).trim() : null;

      const issueDateStr = formData.get("issueDate");
      if (issueDateStr && String(issueDateStr).trim()) {
        const parsed = new Date(String(issueDateStr));
        if (!isNaN(parsed.getTime())) issueDate = parsed;
      }

      const expiryDateStr = formData.get("expiryDate");
      if (expiryDateStr && String(expiryDateStr).trim()) {
        const parsed = new Date(String(expiryDateStr));
        if (!isNaN(parsed.getTime())) expiryDate = parsed;
      }

      const remindersRaw = formData.get("reminderMilestones") || formData.get("reminders");
      if (remindersRaw) {
        try {
          const parsed = JSON.parse(String(remindersRaw));
          if (Array.isArray(parsed)) {
            reminderMilestones = parsed.map(Number).filter((n) => !isNaN(n));
          }
        } catch {
          // ignore or keep defaults
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

      // Also check generic 'file'
      const genericFile = formData.get("file") as File | null;
      if (genericFile && genericFile.size > 0 && filesToUpload.length === 0) {
        const isPdf = genericFile.type.includes("pdf");
        filesToUpload.push({ file: genericFile, kind: isPdf ? "pdf" : "image" });
      }
    } else {
      // JSON Payload
      const body = await request.json();
      title = String(body.title || body.name || "").trim();
      category = String(body.category || body.type || "Other").trim();
      documentNumber = body.documentNumber ? String(body.documentNumber).trim() : null;
      issuedBy = body.issuedBy ? String(body.issuedBy).trim() : null;
      notes = body.notes ? String(body.notes).trim() : null;

      if (body.issueDate) {
        const parsed = new Date(body.issueDate);
        if (!isNaN(parsed.getTime())) issueDate = parsed;
      }

      if (body.expiryDate) {
        const parsed = new Date(body.expiryDate);
        if (!isNaN(parsed.getTime())) expiryDate = parsed;
      }

      if (Array.isArray(body.reminderMilestones)) {
        reminderMilestones = body.reminderMilestones.map(Number).filter((n: number) => !isNaN(n));
      }
    }

    // Title validation
    if (!title) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TITLE", message: "Document name/title is required" } },
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

    // Evaluate subscription plan limits
    const isStrict =
      request.headers.get("x-strict-limits") === "true" ||
      new URL(request.url).searchParams.get("strict") === "true";
    const accessCheck = await checkFeatureAccess(user.id, "create_document", { strict: isStrict });
    if (!accessCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "LIMIT_REACHED",
            message: accessCheck.reason,
            requiredPlan: accessCheck.requiredPlan,
            currentCount: accessCheck.currentCount,
            maxLimit: accessCheck.maxLimit,
          },
        },
        { status: 403 }
      );
    }

    // Create Document record
    const document = await prisma.document.create({
      data: {
        userId: user.id,
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

    // Save attached files to secure storage
    const createdFiles = [];
    for (const { file } of filesToUpload) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { storageKey, size } = await saveDocumentFile(user.id, file.name, buffer);

      const dbFile = await prisma.documentFile.create({
        data: {
          documentId: document.id,
          userId: user.id,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: size,
          storageKey,
          storageDriver: "local",
          isEncrypted: false,
        },
      });
      createdFiles.push(dbFile);
    }

    // Sync deduplicated reminders if specified
    if (reminderMilestones.length > 0) {
      await syncDocumentReminders(user.id, document.id, document.title, expiryDate, reminderMilestones);
    }

    const statusInfo = calculateDocumentStatus(expiryDate);

    return NextResponse.json(
      {
        success: true,
        message: "Document saved successfully",
        data: {
          document: {
            ...document,
            files: createdFiles,
            statusInfo,
          },
        },
      },
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
