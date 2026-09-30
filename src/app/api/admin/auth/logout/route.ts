import { NextResponse } from "next/server";
import { clearAdminSessionCookie, getAdminUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  try {
    const user = await getAdminUser();
    if (user && (user.role === "admin" || user.role === "super_admin")) {
      await prisma.adminAuditLog.create({
        data: {
          adminId: user.id,
          adminEmail: user.email,
          action: "admin_logout",
          targetType: "auth",
          targetId: user.id,
          details: JSON.stringify({ email: user.email }),
          ipAddress: "127.0.0.1",
        },
      });
    }

    await clearAdminSessionCookie();

    return NextResponse.json({
      success: true,
      message: "Admin logged out successfully.",
    });
  } catch (error) {
    console.error("[Admin Logout Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Logout failed." } },
      { status: 500 }
    );
  }
}
