import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_TOKEN", message: "A valid reset token is required" },
        },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "WEAK_PASSWORD", message: "Password must be at least 8 characters long" },
        },
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
        {
          success: false,
          error: { code: "INVALID_TOKEN", message: "This password reset link is invalid or has expired." },
        },
        { status: 400 }
      );
    }

    // Check expiration and usage
    if (resetRecord.usedAt !== null || resetRecord.expiresAt < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "EXPIRED_TOKEN", message: "This password reset link is invalid or has expired." },
        },
        { status: 400 }
      );
    }

    // Hash new password and update user
    const passwordHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all active sessions for security so user re-authenticates with new password
      prisma.session.deleteMany({
        where: { userId: resetRecord.userId },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Your password has been reset successfully.",
    });
  } catch (error) {
    console.error("[Reset Password Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An error occurred while resetting your password." },
      },
      { status: 500 }
    );
  }
}
