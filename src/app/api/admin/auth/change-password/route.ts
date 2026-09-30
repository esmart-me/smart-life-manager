import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Administrator access denied. Master Administrator privileges required." } },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Current password, new password, and confirmation are required." },
        },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: { code: "PASSWORD_MISMATCH", message: "New password and confirmation do not match." } },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: { code: "WEAK_PASSWORD", message: "New password must be at least 8 characters long." } },
        { status: 400 }
      );
    }

    // Retrieve administrator's current record with password hash
    const adminRecord = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!adminRecord) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Administrator account not found." } },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(currentPassword, adminRecord.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CREDENTIALS", message: "Current master password is incorrect." } },
        { status: 400 }
      );
    }

    // Hash new password securely with 12 salt rounds
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: adminRecord.id },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId: adminRecord.id,
          adminEmail: adminRecord.email,
          action: "admin_password_changed",
          targetType: "user",
          targetId: adminRecord.id,
          details: JSON.stringify({ email: adminRecord.email, timestamp: new Date().toISOString() }),
          ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Administrator master password updated successfully.",
    });
  } catch (error) {
    console.error("[Admin Change Password Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update administrator password." } },
      { status: 500 }
    );
  }
}
