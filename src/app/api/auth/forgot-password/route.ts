import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_EMAIL", message: "A valid email address is required" },
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    let resetToken: string | null = null;

    if (user) {
      // Invalidate existing unused tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Generate secure 32-byte (64-char hex) token
      resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt,
        },
      });
    }

    // Always return a consistent success message to prevent user enumeration
    const responseData: Record<string, unknown> = {
      success: true,
      message: "If an account with that email exists, we have sent instructions to reset your password.",
    };

    // For local development, testing, and SQLite dev environments (until email service is configured)
    const isLocalOrTest =
      process.env.NODE_ENV !== "production" ||
      process.env.DATABASE_URL?.includes("file:") ||
      process.env.ENABLE_DEV_RESET === "true";

    if (isLocalOrTest && resetToken) {
      responseData.debug = {
        resetToken,
        resetUrl: `/reset-password?token=${resetToken}`,
      };
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[Forgot Password Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred. Please try again later." },
      },
      { status: 500 }
    );
  }
}
