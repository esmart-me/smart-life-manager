import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { createSessionToken, setSessionCookie, isAdmin } from "@/lib/auth/session";
import { ensureSuperAdmin } from "@/lib/auth/admin-init";

export async function POST(req: NextRequest) {
  try {
    // Ensure default admin exists
    await ensureSuperAdmin();

    const body = await req.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Email and password are required." } },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid administrator credentials." } },
        { status: 401 }
      );
    }

    // Role check: Normal customers cannot use admin login
    if (!isAdmin(user.role)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Access denied. Administrator privileges are required to access this portal.",
          },
        },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid administrator credentials." } },
        { status: 401 }
      );
    }

    // Create session token and set cookie
    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      role: user.role as any,
    });

    await setSessionCookie(token);

    // Audit log
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    await prisma.adminAuditLog.create({
      data: {
        adminId: user.id,
        adminEmail: user.email,
        action: "admin_login",
        targetType: "auth",
        targetId: user.id,
        details: JSON.stringify({ email: user.email, role: user.role }),
        ipAddress: typeof ip === "string" ? ip.split(",")[0].trim() : "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("[Admin Login Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Administrator login failed." } },
      { status: 500 }
    );
  }
}
