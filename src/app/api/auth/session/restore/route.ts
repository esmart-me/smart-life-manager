// src/app/api/auth/session/restore/route.ts
// Secure endpoint to validate and restore an existing persisted session.
// Validates JWT signature, checks customer active status, sets HTTP-only cookie.

import { NextResponse } from "next/server";
import { verifySessionToken, setSessionCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TOKEN", message: "Session token is required." } },
        { status: 400 }
      );
    }

    const payload = await verifySessionToken(token);
    if (!payload || !payload.sub) {
      return NextResponse.json(
        { success: false, error: { code: "EXPIRED_TOKEN", message: "Session token has expired or is invalid." } },
        { status: 401 }
      );
    }

    // Verify account existence and active lifecycle status in SQLite
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { profile: true },
    });

    if (!user || user.status === "deleted") {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "Account does not exist." } },
        { status: 401 }
      );
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        { success: false, error: { code: "ACCOUNT_SUSPENDED", message: "Account has been suspended." } },
        { status: 403 }
      );
    }

    // Update last active login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch(() => {});

    // Establish persistent session cookie
    await setSessionCookie(token, true);

    return NextResponse.json({
      success: true,
      message: "Session restored successfully.",
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
    console.error("[Session Restore Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An error occurred during session restoration." } },
      { status: 500 }
    );
  }
}
