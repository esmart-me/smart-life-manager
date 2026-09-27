import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_TOKEN", message: "Token is required" } },
        { status: 400 }
      );
    }

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    if (!resetRecord || resetRecord.usedAt !== null || resetRecord.expiresAt < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_TOKEN", message: "This password reset link is invalid or has expired." },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        email: resetRecord.user.email,
      },
    });
  } catch (error) {
    console.error("[Verify Reset Token Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
      },
      { status: 500 }
    );
  }
}
