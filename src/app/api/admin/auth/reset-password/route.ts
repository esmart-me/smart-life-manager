// src/app/api/admin/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { isAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token, password, confirmPassword } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TOKEN", message: "A valid recovery token is required." } },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { success: false, error: { code: "WEAK_PASSWORD", message: "Password must be at least 8 characters long." } },
        { status: 400 }
      );
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: { code: "PASSWORD_MISMATCH", message: "Passwords do not match." } },
        { status: 400 }
      );
    }

    // Look up token
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TOKEN", message: "This recovery link is invalid or has expired." } },
        { status: 400 }
      );
    }

    if (resetRecord.usedAt !== null || resetRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: { code: "EXPIRED_TOKEN", message: "This recovery token has expired." } },
        { status: 400 }
      );
    }

    // Strict role check: user MUST be an administrator
    if (!isAdmin(resetRecord.user.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Token does not belong to an administrator." } },
        { status: 403 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      // Terminate all existing sessions for security
      prisma.session.deleteMany({
        where: { userId: resetRecord.userId },
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId: resetRecord.user.id,
          adminEmail: resetRecord.user.email,
          action: "admin_password_reset_completed",
          targetType: "user",
          targetId: resetRecord.user.id,
          details: JSON.stringify({ email: resetRecord.user.email, timestamp: new Date().toISOString() }),
          ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Administrator master password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    console.error("[Admin Reset Password Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to reset administrator password." } },
      { status: 500 }
    );
  }
}
