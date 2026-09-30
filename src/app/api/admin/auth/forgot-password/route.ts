// src/app/api/admin/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { isAuthorizedOwnerAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_EMAIL", message: "A valid administrator email is required." } },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    let resetToken: string | null = null;

    // Verify user exists AND is the authorized Master Administrator
    if (user && isAuthorizedOwnerAdmin(user.email, user.role)) {
      // Invalidate existing tokens
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Generate secure 32-byte (64-char) token
      resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt,
        },
      });

      // Log security event
      await prisma.adminAuditLog.create({
        data: {
          adminId: user.id,
          adminEmail: user.email,
          action: "admin_password_reset_requested",
          targetType: "user",
          targetId: user.id,
          details: JSON.stringify({ email: user.email, timestamp: new Date().toISOString() }),
          ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1",
        },
      });
    }

    const responseData: Record<string, unknown> = {
      success: true,
      message: "If an administrator account with that email exists, password recovery instructions have been initiated.",
    };

    // Return token in local / test mode for automated audits
    const isDevOrTest =
      process.env.NODE_ENV !== "production" ||
      process.env.DATABASE_URL?.includes("file:");

    if (isDevOrTest && resetToken) {
      responseData.debug = {
        resetToken,
        resetEndpoint: "/api/admin/auth/reset-password",
      };
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[Admin Forgot Password Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to process recovery request." } },
      { status: 500 }
    );
  }
}
