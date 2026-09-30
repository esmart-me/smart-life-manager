// src/app/api/admin/payments/qr-upload/route.ts
import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/session";
import { updatePaymentConfig } from "@/lib/payments/payment-config-service";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Administrator access denied." } },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { qrImageBase64 } = body;

    if (!qrImageBase64 || typeof qrImageBase64 !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_IMAGE", message: "A valid base64 image string is required." } },
        { status: 400 }
      );
    }

    // Verify it is an image data URI or clean base64
    const matches = qrImageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let imageBuffer: Buffer;
    let extension = "png";

    if (matches && matches.length === 3) {
      const mimeType = matches[1];
      if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
        extension = "jpg";
      } else if (mimeType.includes("svg")) {
        extension = "svg";
      } else if (mimeType.includes("webp")) {
        extension = "webp";
      }
      imageBuffer = Buffer.from(matches[2], "base64");
    } else {
      imageBuffer = Buffer.from(qrImageBase64, "base64");
    }

    if (imageBuffer.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: { code: "IMAGE_TOO_LARGE", message: "QR Code image size must be under 5MB." } },
        { status: 400 }
      );
    }

    // Save to public storage directory so client can render it safely
    const storageDir = path.join(process.cwd(), "public", "uploads", "upi");
    await fs.mkdir(storageDir, { recursive: true });

    const filename = `upi_qr_${Date.now()}.${extension}`;
    const filePath = path.join(storageDir, filename);
    await fs.writeFile(filePath, imageBuffer);

    const publicUrl = `/uploads/upi/${filename}`;

    // Update system payment config
    await updatePaymentConfig({
      upiQrCodeUrl: publicUrl,
    });

    return NextResponse.json({
      success: true,
      message: "UPI QR code uploaded and configured successfully.",
      data: {
        upiQrCodeUrl: publicUrl,
      },
    });
  } catch (error: any) {
    console.error("[UPI QR Upload Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to upload QR code." } },
      { status: 500 }
    );
  }
}
