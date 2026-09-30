// src/app/api/checkout/submit-upi/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getPaymentConfig } from "@/lib/payments/payment-config-service";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Please log in to submit a payment." } },
        { status: 401 }
      );
    }

    const config = await getPaymentConfig();
    if (!config.upiEnabled) {
      return NextResponse.json(
        { success: false, error: { code: "UPI_DISABLED", message: "UPI payments are currently not accepted." } },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { plan, billingInterval = "monthly", amount, currency = "INR", utrNumber, notes } = body;

    if (!plan || !["premium", "family"].includes(plan)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PLAN", message: "Plan must be 'premium' or 'family'." } },
        { status: 400 }
      );
    }

    const cleanUtr = typeof utrNumber === "string" ? utrNumber.trim() : "";
    if (!cleanUtr || cleanUtr.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_UTR",
            message: "A valid UTR or Transaction Reference Number (at least 6 characters) is required.",
          },
        },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_AMOUNT", message: "A valid payment amount is required." } },
        { status: 400 }
      );
    }

    const transactionId = `upi_utr_${cleanUtr}_${Date.now()}`;

    // Create billing transaction with status 'pending_verification'
    // NOTE: Customer subscription is NEVER activated automatically until Admin reviews and marks as verified
    const transaction = await prisma.billingTransaction.create({
      data: {
        userId: user.id,
        plan,
        amount: parsedAmount,
        currency: currency.toUpperCase(),
        status: "pending_verification",
        paymentProvider: "upi",
        transactionId,
        billingCycle: billingInterval === "yearly" ? "yearly" : "monthly",
        utrNumber: cleanUtr,
        notes: typeof notes === "string" ? notes.trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "UPI payment details submitted successfully. Your transaction is currently pending administrative verification.",
      data: {
        id: transaction.id,
        transactionId: transaction.transactionId,
        status: transaction.status,
        utrNumber: transaction.utrNumber,
        amount: transaction.amount,
        currency: transaction.currency,
        plan: transaction.plan,
      },
    });
  } catch (error: any) {
    console.error("[Submit UPI Payment Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to submit UPI payment" } },
      { status: 500 }
    );
  }
}
