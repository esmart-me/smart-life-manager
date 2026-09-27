import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser, clearSessionCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { confirmation, password } = body;

    if (confirmation !== "DELETE") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFIRMATION_REQUIRED",
            message: 'You must type "DELETE" to confirm permanent account deletion.',
          },
        },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        billingTransactions: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "User account not found." } },
        { status: 404 }
      );
    }

    // Verify password if password was provided or required
    if (password) {
      const isValid = await bcrypt.compare(password, dbUser.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_PASSWORD", message: "Incorrect password provided." } },
          { status: 401 }
        );
      }
    }

    // Check if legal / payment retention requires preserving transaction records
    const hasRetainedPayments = dbUser.billingTransactions && dbUser.billingTransactions.length > 0;

    if (hasRetainedPayments) {
      // Anonymize user record to satisfy privacy deletion rights while preserving ledger
      await prisma.$transaction(async (tx) => {
        // Delete all personal content
        await tx.documentFile.deleteMany({ where: { userId: dbUser.id } });
        await tx.document.deleteMany({ where: { userId: dbUser.id } });
        await tx.reminder.deleteMany({ where: { userId: dbUser.id } });
        await tx.payment.deleteMany({ where: { userId: dbUser.id } });
        await tx.expense.deleteMany({ where: { userId: dbUser.id } });
        await tx.budget.deleteMany({ where: { userId: dbUser.id } });
        await tx.vehicle.deleteMany({ where: { userId: dbUser.id } });
        await tx.subscription.deleteMany({ where: { userId: dbUser.id } });
        await tx.importantDate.deleteMany({ where: { userId: dbUser.id } });
        await tx.familyMember.deleteMany({ where: { userId: dbUser.id } });
        await tx.notification.deleteMany({ where: { userId: dbUser.id } });
        await tx.session.deleteMany({ where: { userId: dbUser.id } });
        await tx.profile.deleteMany({ where: { userId: dbUser.id } });
        await tx.userSetting.deleteMany({ where: { userId: dbUser.id } });

        // Redact user identity
        await tx.user.update({
          where: { id: dbUser.id },
          data: {
            email: `deleted_${dbUser.id}@anonymized.local`,
            passwordHash: "ACCOUNT_DELETED",
            role: "deleted",
            emailVerified: false,
          },
        });
      });
    } else {
      // No retention constraints -> completely delete user record
      await prisma.user.delete({
        where: { id: dbUser.id },
      });
    }

    // Invalidate active session and clear cookie
    await clearSessionCookie();

    return NextResponse.json({
      success: true,
      message: "Your account and all associated data have been permanently deleted.",
    });
  } catch (error) {
    console.error("[Delete Account Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ACCOUNT_FAILED", message: "Failed to delete account" } },
      { status: 500 }
    );
  }
}
