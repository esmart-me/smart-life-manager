import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_CREDENTIALS", message: "Email and password are required" },
        },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "We couldn’t sign you in. Please check your email and password.",
          },
        },
        { status: 401 }
      );
    }

    if (user.status === "deleted") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "We couldn’t sign you in. Please check your email and password.",
          },
        },
        { status: 401 }
      );
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ACCOUNT_SUSPENDED",
            message: "Your account has been suspended by an administrator. Please contact support.",
          },
        },
        { status: 403 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "We couldn’t sign you in. Please check your email and password.",
          },
        },
        { status: 401 }
      );
    }

    // Update last active login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch(() => {});

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      role: user.role as "user" | "admin",
    });

    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          displayName: user.profile?.displayName || user.email.split("@")[0],
        },
      },
    });
  } catch (error) {
    console.error("[Auth Login Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An error occurred during authentication" },
      },
      { status: 500 }
    );
  }
}
