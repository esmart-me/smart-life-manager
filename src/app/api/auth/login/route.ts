import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { authLimiter, getClientIp } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = authLimiter.isLimited(`login:${ip}`, 5, 15 * 60 * 1000);
    if (rateCheck.limited) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many failed login attempts. Please try again later.",
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateCheck.retryAfterSec) },
        }
      );
    }

    const body = await request.json();
    const { email, password, rememberMe = true } = body;

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
      authLimiter.check(`login:${ip}`, 5, 15 * 60 * 1000);
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
      authLimiter.check(`login:${ip}`, 5, 15 * 60 * 1000);
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

    // Reset rate limiter on successful credentials
    authLimiter.reset(`login:${ip}`);

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

    await setSessionCookie(token, Boolean(rememberMe));

    // Asynchronously record central telemetry if central backend is configured
    try {
      const { isSupabaseServerAdminConfigured } = await import("@/lib/supabase/config");
      if (isSupabaseServerAdminConfigured()) {
        const { ensureCentralCustomerProfile, recordCentralLoginEvent } = await import("@/lib/supabase/server");
        Promise.allSettled([
          ensureCentralCustomerProfile({
            customerId: user.id,
            email: user.email,
            fullName: user.profile?.displayName,
          }),
          recordCentralLoginEvent({
            customerId: user.id,
            deviceId: request.headers.get("x-device-id") || "desktop_client",
            loginMethod: "password",
            os: request.headers.get("x-os") || "windows",
            appVersion: request.headers.get("x-app-version") || "1.0.0",
          }),
        ]).catch(() => {});
      }
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        token,
        rememberMe: Boolean(rememberMe),
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
