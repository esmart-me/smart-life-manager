"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CreditCard,
  ShieldCheck,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Lock,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatRegionalCurrency } from "@/lib/regions";

export function SandboxCheckoutClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = searchParams.get("session_id") || "cs_test_mock";
  const plan = searchParams.get("plan") || "premium";
  const planName = searchParams.get("plan_name") || (plan === "family" ? "Family Circle Plus" : "Life Pro Premium");
  const interval = searchParams.get("interval") || "monthly";
  const amount = parseFloat(searchParams.get("amount") || "9.99");
  const currency = (searchParams.get("currency") || "USD").toUpperCase();
  const userId = searchParams.get("user_id") || "";

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formattedPrice = formatRegionalCurrency(amount, currency);

  const handleSimulatePayment = async (status: "succeeded" | "failed") => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);

      if (status === "succeeded") {
        // Trigger simulated Stripe webhook: checkout.session.completed
        const webhookPayload = {
          type: "checkout.session.completed",
          data: {
            object: {
              id: sessionId,
              client_reference_id: userId,
              amount_total: Math.round(amount * 100),
              currency: currency.toLowerCase(),
              customer: `cus_test_${userId.slice(-6)}`,
              subscription: `sub_stripe_${Date.now()}`,
              payment_intent: `pi_test_${Date.now()}`,
              metadata: {
                userId,
                plan,
                planName,
                billingInterval: interval,
                amount: amount.toString(),
                currency,
              },
            },
          },
        };

        const res = await fetch("/api/webhooks/stripe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-stripe-test-secret": "sandbox_test_token",
          },
          body: JSON.stringify(webhookPayload),
        });

        const data = await res.json();
        if (data.received) {
          router.push(`/pricing?payment=success&session_id=${sessionId}&plan=${plan}`);
        } else {
          setErrorMessage(data.error?.message || "Webhook processing did not succeed.");
          setIsProcessing(false);
        }
      } else {
        // Trigger simulated failed payment
        const webhookPayload = {
          type: "invoice.payment_failed",
          data: {
            object: {
              id: `inv_fail_${Date.now()}`,
              customer: `cus_test_${userId.slice(-6)}`,
              subscription: `sub_fail_${Date.now()}`,
              amount_due: Math.round(amount * 100),
              currency: currency.toLowerCase(),
              failure_message: "Your card was declined. The card issuer did not authorize the transaction (Sandbox Test).",
            },
          },
        };

        await fetch("/api/webhooks/stripe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-stripe-test-secret": "sandbox_test_token",
          },
          body: JSON.stringify(webhookPayload),
        });

        router.push(`/pricing?payment=failed&error=card_declined`);
      }
    } catch (err: any) {
      console.error("Sandbox payment error:", err);
      setErrorMessage("An unexpected error occurred in test sandbox.");
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    router.push("/pricing?payment=cancelled");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Top Header / Mode Banner */}
        <div className="bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border-b border-indigo-800/50 p-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold tracking-wide uppercase">
            <Lock className="w-3.5 h-3.5" />
            <span>Stripe Checkout • Test Sandbox</span>
          </div>
          <p className="text-xs text-indigo-200/80 mt-1">
            Simulate payment provider checkout in development mode.
          </p>
        </div>

        {/* Order Summary */}
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h2 className="text-base font-bold text-white">{planName}</h2>
              </div>
              <p className="text-xs text-slate-400 capitalize mt-0.5">
                {interval} Billing Cycle
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-white">
                {formattedPrice}
              </span>
              <span className="text-xs text-slate-400 block">
                /{interval === "yearly" ? "year" : "month"}
              </span>
            </div>
          </div>

          {/* Test Card Simulation Details */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-slate-300" />
                Test Payment Method:
              </span>
              <span className="font-mono text-slate-200 font-semibold">
                Visa •••• 4242
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Security:</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                PCI-DSS Compliant (Provider Handled)
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Session ID:</span>
              <span className="font-mono text-[10px] text-slate-500 truncate max-w-[200px]">
                {sessionId}
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Simulation Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              type="button"
              variant="primary"
              className="w-full justify-center py-3 text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30"
              isLoading={isProcessing}
              disabled={isProcessing}
              onClick={() => handleSimulatePayment("succeeded")}
            >
              <CheckCircle className="w-4 h-4" />
              <span>Complete Payment (Simulate Card Success)</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full justify-center py-2.5 text-xs font-semibold gap-2 border-rose-800/60 text-rose-400 hover:bg-rose-950/40"
              disabled={isProcessing}
              onClick={() => handleSimulatePayment("failed")}
            >
              <XCircle className="w-4 h-4" />
              <span>Simulate Payment Failure (Card Declined)</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full justify-center py-2 text-xs text-slate-400 hover:text-white gap-2"
              disabled={isProcessing}
              onClick={handleCancel}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cancel Checkout & Return to Plans</span>
            </Button>
          </div>

          <div className="text-center text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
            Smart Life Manager never stores card numbers or security codes.
          </div>
        </div>
      </div>
    </div>
  );
}
