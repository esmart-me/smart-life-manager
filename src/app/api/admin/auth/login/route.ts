import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { createSessionToken, setAdminSessionCookie, isAuthorizedOwnerAdmin } from "@/lib/auth/session";
import { ensureSuperAdmin } from "@/lib/auth/admin-init";
import { authLimiter, getClientIp } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = authLimiter.isLimited(`admin-login:${ip}`, 5, 15 * 60 * 1000);
    if (rateCheck.limited) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many failed administrator login attempts. Please try again later.",
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateCheck.retryAfterSec) },
        }
      );
    }

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
      authLimiter.check(`admin-login:${ip}`, 5, 15 * 60 * 1000);
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid administrator credentials." } },
        { status: 401 }
      );
    }

    // Strict Master/Owner Administrator authorization check
    if (!isAuthorizedOwnerAdmin(user.email, user.role)) {
      authLimiter.check(`admin-login:${ip}`, 5, 15 * 60 * 1000);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Access denied. Only the authorized Master Administrator may access this portal.",
          },
        },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      authLimiter.check(`admin-login:${ip}`, 5, 15 * 60 * 1000);
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid administrator credentials." } },
        { status: 401 }
      );
    }

    // Reset rate limiter on successful authentication
    authLimiter.reset(`admin-login:${ip}`);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch(() => {});

    // Create session token and set dedicated admin session cookie
    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      role: user.role as any,
    });

    await setAdminSessionCookie(token);

    // Audit log
    await prisma.adminAuditLog.create({
      data: {
        adminId: user.id,
        adminEmail: user.email,
        action: "admin_login",
        targetType: "auth",
        targetId: user.id,
        details: JSON.stringify({ email: user.email, role: user.role }),
        ipAddress: ip,
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
