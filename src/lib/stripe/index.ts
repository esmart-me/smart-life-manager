import Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import { PlanTier } from "@/lib/plans/constants";

// Read Stripe environment variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_key_replace_for_live_stripe";
export const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder_key_replace_for_live_stripe";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_placeholder_secret_replace_for_live_stripe";

let stripeSingleton: Stripe | null = null;

/**
 * Returns true if real Stripe credentials are configured (not dummy placeholders).
 */
export function isRealStripeConfigured(): boolean {
  return (
    Boolean(STRIPE_SECRET_KEY) &&
    !STRIPE_SECRET_KEY.includes("placeholder") &&
    (STRIPE_SECRET_KEY.startsWith("sk_test_") || STRIPE_SECRET_KEY.startsWith("sk_live_"))
  );
}

/**
 * Returns the Stripe SDK singleton instance.
 */
export function getStripe(): Stripe {
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as any,
      typescript: true,
    });
  }
  return stripeSingleton;
}

export interface CreateCheckoutParams {
  userId: string;
  userEmail: string;
  plan: PlanTier;
  planName: string;
  billingInterval: "monthly" | "yearly";
  amount: number;
  currency: string;
  appBaseUrl: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
  isSandbox: boolean;
}

/**
 * Creates a Stripe Checkout Session, or returns a Sandbox Checkout URL if running in test development mode.
 */
export async function createSubscriptionCheckoutSession(
  params: CreateCheckoutParams
): Promise<CheckoutSessionResult> {
  const { userId, userEmail, plan, planName, billingInterval, amount, currency, appBaseUrl } = params;

  // Real Stripe Integration
  if (isRealStripeConfigured()) {
    const stripe = getStripe();
    const cleanCurrency = currency.toLowerCase();
    const unitAmount = Math.round(amount * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: userEmail,
      client_reference_id: userId,
      line_items: [
        {
          price_data: {
            currency: cleanCurrency,
            unit_amount: unitAmount,
            product_data: {
              name: `Smart Life Manager - ${planName}`,
              description: `Smart Life Manager ${planName} (${billingInterval} billing)`,
            },
            recurring: {
              interval: billingInterval === "yearly" ? "year" : "month",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        plan,
        planName,
        billingInterval,
        amount: amount.toString(),
        currency: currency.toUpperCase(),
      },
      success_url: `${appBaseUrl}/pricing?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl}/pricing?payment=cancelled`,
    });

    return {
      sessionId: session.id,
      url: session.url || `${appBaseUrl}/pricing?payment=error`,
      isSandbox: false,
    };
  }

  // TEST / SANDBOX Simulation Mode
  const sandboxSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const searchParams = new URLSearchParams({
    session_id: sandboxSessionId,
    plan,
    plan_name: planName,
    interval: billingInterval,
    amount: amount.toString(),
    currency: currency.toUpperCase(),
    user_id: userId,
  });

  return {
    sessionId: sandboxSessionId,
    url: `${appBaseUrl}/checkout/sandbox?${searchParams.toString()}`,
    isSandbox: true,
  };
}

/**
 * Handles Webhook Events:
 * - checkout.session.completed
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.paid (renewals)
 * - invoice.payment_failed
 */
export async function handleWebhookEvent(event: {
  type: string;
  data: { object: any };
}): Promise<{ handled: boolean; message: string }> {
  const { type, data } = event;
  const obj = data.object;

  switch (type) {
    // 1. Successful initial checkout
    case "checkout.session.completed": {
      const userId = obj.client_reference_id || obj.metadata?.userId;
      const plan = (obj.metadata?.plan || "premium").toLowerCase();
      const planName = obj.metadata?.planName || (plan === "family" ? "Family Circle Plus" : "Life Pro Premium");
      const billingCycle = (obj.metadata?.billingInterval || "monthly").toLowerCase();
      const amount = obj.metadata?.amount ? parseFloat(obj.metadata.amount) : (obj.amount_total ? obj.amount_total / 100 : 0);
      const currency = (obj.currency || obj.metadata?.currency || "USD").toUpperCase();
      const customerId = obj.customer ? String(obj.customer) : null;
      const subscriptionId = obj.subscription ? String(obj.subscription) : `sub_stripe_${Date.now()}`;
      const paymentIntentId = obj.payment_intent ? String(obj.payment_intent) : `pi_${obj.id || Date.now()}`;

      if (!userId) {
        return { handled: false, message: "Missing client_reference_id or userId in metadata" };
      }

      // Calculate period end
      const startDate = new Date();
      const periodEnd = new Date(startDate);
      if (billingCycle === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // Atomically update user subscription and create paid transaction record
      await prisma.$transaction(async (tx) => {
        const sub = await tx.userSubscription.upsert({
          where: { userId },
          create: {
            userId,
            plan,
            planName,
            status: "active",
            billingInterval: billingCycle,
            billingCycle,
            amount,
            currency,
            provider: "stripe",
            providerCustomerId: customerId,
            providerSubscriptionId: subscriptionId,
            providerPaymentId: paymentIntentId,
            startedAt: startDate,
            currentPeriodStart: startDate,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          },
          update: {
            plan,
            planName,
            status: "active",
            billingInterval: billingCycle,
            billingCycle,
            amount,
            currency,
            provider: "stripe",
            providerCustomerId: customerId,
            providerSubscriptionId: subscriptionId,
            providerPaymentId: paymentIntentId,
            currentPeriodStart: startDate,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            cancelledAt: null,
          },
        });

        // Record immutable transaction in billing ledger
        await tx.billingTransaction.create({
          data: {
            userId,
            subscriptionId: sub.id,
            plan,
            amount,
            currency,
            status: "paid",
            paymentProvider: "stripe",
            transactionId: paymentIntentId,
            billingCycle,
            paymentDate: startDate,
            notes: `Stripe Checkout completed for ${planName} (${billingCycle})`,
          },
        });
      });

      return { handled: true, message: `Activated ${plan} subscription for user ${userId}` };
    }

    // 2. Subscription renewed (invoice paid)
    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const subscriptionId = obj.subscription ? String(obj.subscription) : null;
      const customerId = obj.customer ? String(obj.customer) : null;
      const amount = obj.amount_paid ? obj.amount_paid / 100 : 0;
      const currency = (obj.currency || "USD").toUpperCase();
      const invoiceId = obj.id || `inv_${Date.now()}`;
      const periodStart = obj.lines?.data?.[0]?.period?.start
        ? new Date(obj.lines.data[0].period.start * 1000)
        : new Date();
      const periodEnd = obj.lines?.data?.[0]?.period?.end
        ? new Date(obj.lines.data[0].period.end * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Find user subscription by providerSubscriptionId or customerId
      let sub = null;
      if (subscriptionId) {
        sub = await prisma.userSubscription.findFirst({
          where: { providerSubscriptionId: subscriptionId },
        });
      }
      if (!sub && customerId) {
        sub = await prisma.userSubscription.findFirst({
          where: { providerCustomerId: customerId },
        });
      }

      if (sub) {
        await prisma.$transaction(async (tx) => {
          await tx.userSubscription.update({
            where: { id: sub.id },
            data: {
              status: "active",
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: false,
            },
          });

          // Check if invoice already recorded to prevent duplicates
          const existing = await tx.billingTransaction.findUnique({
            where: { transactionId: invoiceId },
          });

          if (!existing) {
            await tx.billingTransaction.create({
              data: {
                userId: sub.userId,
                subscriptionId: sub.id,
                plan: sub.plan,
                amount,
                currency,
                status: "paid",
                paymentProvider: "stripe",
                transactionId: invoiceId,
                billingCycle: sub.billingCycle || sub.billingInterval || "monthly",
                paymentDate: new Date(),
                notes: `Subscription renewal invoice ${invoiceId} paid successfully`,
              },
            });
          }
        });

        return { handled: true, message: `Renewed subscription for user ${sub.userId}` };
      }

      return { handled: false, message: `No matching subscription for invoice ${invoiceId}` };
    }

    // 3. Payment failed
    case "invoice.payment_failed": {
      const subscriptionId = obj.subscription ? String(obj.subscription) : null;
      const customerId = obj.customer ? String(obj.customer) : null;
      const invoiceId = obj.id || `inv_fail_${Date.now()}`;
      const amount = obj.amount_due ? obj.amount_due / 100 : 0;
      const currency = (obj.currency || "USD").toUpperCase();
      const failureReason =
        obj.last_payment_error?.message ||
        obj.failure_message ||
        "Card was declined by issuing bank";

      let sub = null;
      if (subscriptionId) {
        sub = await prisma.userSubscription.findFirst({
          where: { providerSubscriptionId: subscriptionId },
        });
      }
      if (!sub && customerId) {
        sub = await prisma.userSubscription.findFirst({
          where: { providerCustomerId: customerId },
        });
      }

      if (sub) {
        await prisma.$transaction(async (tx) => {
          await tx.userSubscription.update({
            where: { id: sub.id },
            data: { status: "past_due" },
          });

          await tx.billingTransaction.create({
            data: {
              userId: sub.userId,
              subscriptionId: sub.id,
              plan: sub.plan,
              amount,
              currency,
              status: "failed",
              paymentProvider: "stripe",
              transactionId: invoiceId,
              billingCycle: sub.billingCycle || "monthly",
              paymentDate: new Date(),
              failureReason,
              notes: `Payment failed: ${failureReason}`,
            },
          });
        });

        return { handled: true, message: `Handled payment failure for user ${sub.userId}` };
      }

      return { handled: false, message: "Subscription not found for failed invoice" };
    }

    // 4. Subscription cancelled or expired
    case "customer.subscription.deleted": {
      const subscriptionId = obj.id ? String(obj.id) : null;
      if (!subscriptionId) return { handled: false, message: "Missing subscription ID" };

      const sub = await prisma.userSubscription.findFirst({
        where: { providerSubscriptionId: subscriptionId },
      });

      if (sub) {
        await prisma.userSubscription.update({
          where: { id: sub.id },
          data: {
            status: "cancelled",
            cancelAtPeriodEnd: false,
            cancelledAt: new Date(),
          },
        });
        // Important: Historical billingTransaction records are NEVER deleted
        return { handled: true, message: `Subscription ${subscriptionId} marked cancelled` };
      }

      return { handled: false, message: `Subscription ${subscriptionId} not found` };
    }

    // 5. Subscription updated (e.g. cancel_at_period_end set, tier upgrade)
    case "customer.subscription.updated": {
      const subscriptionId = obj.id ? String(obj.id) : null;
      if (!subscriptionId) return { handled: false, message: "Missing subscription ID" };

      const cancelAtPeriodEnd = Boolean(obj.cancel_at_period_end);
      const status = obj.status === "active" ? "active" : obj.status === "past_due" ? "past_due" : "cancelled";

      const sub = await prisma.userSubscription.findFirst({
        where: { providerSubscriptionId: subscriptionId },
      });

      if (sub) {
        await prisma.userSubscription.update({
          where: { id: sub.id },
          data: {
            cancelAtPeriodEnd,
            status,
            currentPeriodEnd: obj.current_period_end ? new Date(obj.current_period_end * 1000) : sub.currentPeriodEnd,
          },
        });
        return { handled: true, message: `Updated subscription ${subscriptionId}` };
      }

      return { handled: false, message: `Subscription ${subscriptionId} not found` };
    }

    default:
      return { handled: false, message: `Ignored unhandled event type: ${type}` };
  }
}
