// src/app/api/admin/payments/settings/route.ts
import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/session";
import { getPaymentConfig, updatePaymentConfig } from "@/lib/payments/payment-config-service";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Administrator access denied." } },
      { status: 403 }
    );
  }

  try {
    const config = await getPaymentConfig();
    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("[Admin Payment Settings GET Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to retrieve payment settings." } },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Administrator access denied." } },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const {
      cardEnabled,
      stripeEnabled,
      paypalEnabled,
      upiEnabled,
      upiId,
      upiDisplayName,
      upiQrCodeUrl,
      upiInstructions,
      defaultMethod,
    } = body;

    const updated = await updatePaymentConfig({
      ...(cardEnabled !== undefined && { cardEnabled: Boolean(cardEnabled) }),
      ...(stripeEnabled !== undefined && { stripeEnabled: Boolean(stripeEnabled) }),
      ...(paypalEnabled !== undefined && { paypalEnabled: Boolean(paypalEnabled) }),
      ...(upiEnabled !== undefined && { upiEnabled: Boolean(upiEnabled) }),
      ...(upiId !== undefined && { upiId: upiId ? String(upiId).trim() : null }),
      ...(upiDisplayName !== undefined && { upiDisplayName: upiDisplayName ? String(upiDisplayName).trim() : null }),
      ...(upiQrCodeUrl !== undefined && { upiQrCodeUrl: upiQrCodeUrl ? String(upiQrCodeUrl).trim() : null }),
      ...(upiInstructions !== undefined && { upiInstructions: upiInstructions ? String(upiInstructions).trim() : null }),
      ...(defaultMethod !== undefined && { defaultMethod: String(defaultMethod) }),
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: "payment_settings_updated",
        targetType: "system",
        targetId: "default_payment_config",
        details: JSON.stringify({
          cardEnabled: updated.cardEnabled,
          stripeEnabled: updated.stripeEnabled,
          upiEnabled: updated.upiEnabled,
          paypalEnabled: updated.paypalEnabled,
          upiId: updated.upiId,
        }),
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment configuration updated successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("[Admin Payment Settings PUT Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update payment settings." } },
      { status: 500 }
    );
  }
}
