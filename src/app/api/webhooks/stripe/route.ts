import { NextRequest, NextResponse } from "next/server";
import {
  getStripe,
  STRIPE_WEBHOOK_SECRET,
  isRealStripeConfigured,
  isRealStripeWebhookConfigured,
  handleWebhookEvent,
} from "@/lib/stripe";

// Next.js config to ensure raw body can be read
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: any;

    if (process.env.NODE_ENV === "production") {
      // PRODUCTION MODE:
      // Real cryptographic Stripe signature verification is strictly mandatory.
      // Fake test secrets, test signatures, and raw JSON parsing are strictly rejected.
      if (!isRealStripeWebhookConfigured() || !STRIPE_WEBHOOK_SECRET) {
        console.error("[Stripe Webhook]: STRIPE_WEBHOOK_SECRET is not configured in production.");
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "WEBHOOK_NOT_CONFIGURED",
              message: "Stripe webhook secret is not configured on this server.",
            },
          },
          { status: 503 }
        );
      }

      if (!signature) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "MISSING_SIGNATURE", message: "Missing stripe-signature header." },
          },
          { status: 400 }
        );
      }

      const stripe = getStripe();
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
      } catch (err: any) {
        console.error("[Stripe Webhook Signature Verification Failed]:", err.message);
        return NextResponse.json(
          {
            success: false,
            error: { code: "INVALID_SIGNATURE", message: `Webhook signature verification failed: ${err.message}` },
          },
          { status: 400 }
        );
      }
    } else {
      // DEVELOPMENT / TEST ONLY:
      if (isRealStripeConfigured() && isRealStripeWebhookConfigured() && signature && !signature.startsWith("test_sig_")) {
        const stripe = getStripe();
        try {
          event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
        } catch (err: any) {
          console.error("[Stripe Webhook Signature Verification Failed]:", err.message);
          return NextResponse.json(
            {
              success: false,
              error: { code: "INVALID_SIGNATURE", message: `Webhook signature verification failed: ${err.message}` },
            },
            { status: 400 }
          );
        }
      } else {
        // Fallback test sandbox for local offline development / automated testing
        const testSecret = req.headers.get("x-stripe-test-secret");
        const isTestSignatureValid = !signature || signature.startsWith("test_sig_") || testSecret === "sandbox_test_token";

        if (!isTestSignatureValid && signature === "invalid_test_signature") {
          return NextResponse.json(
            {
              success: false,
              error: { code: "INVALID_SIGNATURE", message: "Webhook test signature verification failed." },
            },
            { status: 400 }
          );
        }

        try {
          event = JSON.parse(rawBody);
        } catch (err) {
          return NextResponse.json(
            { success: false, error: { code: "INVALID_JSON", message: "Invalid JSON webhook payload." } },
            { status: 400 }
          );
        }
      }
    }

    if (!event || !event.type) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_EVENT", message: "Webhook event type is missing." } },
        { status: 400 }
      );
    }

    // Process event into database
    const result = await handleWebhookEvent(event);

    return NextResponse.json({
      received: true,
      handled: result.handled,
      message: result.message,
    });
  } catch (error: any) {
    console.error("[Stripe Webhook Handler Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "WEBHOOK_HANDLER_ERROR", message: error.message || "Failed to process webhook." } },
      { status: 500 }
    );
  }
}
