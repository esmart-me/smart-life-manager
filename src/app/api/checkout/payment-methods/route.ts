// src/app/api/checkout/payment-methods/route.ts
import { NextResponse } from "next/server";
import { getPublicPaymentConfig } from "@/lib/payments/payment-config-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getPublicPaymentConfig();
    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("[Payment Methods API Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to load payment methods" } },
      { status: 500 }
    );
  }
}
