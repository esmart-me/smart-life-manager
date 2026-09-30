"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  CreditCard,
  ShieldCheck,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Lock,
  Sparkles,
  AlertTriangle,
  QrCode,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatRegionalCurrency } from "@/lib/regions";
import { PublicPaymentConfig } from "@/lib/payments/payment-config-service";

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

  // Payment Config from Server
  const [config, setConfig] = useState<PublicPaymentConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<"card" | "upi">("card");

  // Processing & Feedback States
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // UPI Form States
  const [utrNumber, setUtrNumber] = useState("");
  const [upiNotes, setUpiNotes] = useState("");
  const [upiSubmittedResult, setUpiSubmittedResult] = useState<{
    id: string;
    transactionId: string;
    utrNumber: string;
    status: string;
    amount: number;
    currency: string;
    plan: string;
  } | null>(null);

  const formattedPrice = formatRegionalCurrency(amount, currency);

  // Load active payment methods
  useEffect(() => {
    let isMounted = true;
    fetch("/api/checkout/payment-methods")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.data) {
          setConfig(data.data);
          // Set initial selected payment method
          if (data.data.defaultMethod === "upi" && data.data.upiEnabled) {
            setSelectedMethod("upi");
          } else if (!data.data.cardEnabled && data.data.upiEnabled) {
            setSelectedMethod("upi");
          } else {
            setSelectedMethod("card");
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load payment methods:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingConfig(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyUpiId = () => {
    if (!config?.upiId) return;
    navigator.clipboard.writeText(config.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  // Card Simulation (Stripe Webhook simulation)
  const handleSimulateCardPayment = async (status: "succeeded" | "failed") => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);

      if (status === "succeeded") {
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

  // Submit UPI Payment
  const handleSubmitUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUtr = utrNumber.trim();
    if (!cleanUtr || cleanUtr.length < 6) {
      setErrorMessage("Please enter a valid 12-digit UTR or Transaction Reference number.");
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const res = await fetch("/api/checkout/submit-upi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          billingInterval: interval,
          amount,
          currency,
          utrNumber: cleanUtr,
          notes: upiNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to submit UPI payment details.");
      }

      setUpiSubmittedResult(data.data);
    } catch (err: any) {
      console.error("UPI submission error:", err);
      setErrorMessage(err.message || "Failed to submit UPI transaction reference.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    router.push("/pricing?payment=cancelled");
  };

  // If customer successfully submitted UPI, show the Pending Verification confirmation screen
  if (upiSubmittedResult) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 animate-fade-in text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wide">
              <span>Pending Administrative Verification</span>
            </span>
            <h2 className="text-xl font-bold text-white">Payment Reference Submitted</h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              Your UPI payment has been received and is pending verification. Our administrative team will verify your funds against the submitted UTR number.
            </p>
          </div>

          {/* Details Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">Plan:</span>
              <span className="font-bold text-white capitalize">{planName}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">Amount & Currency:</span>
              <span className="font-bold text-white font-mono">{formattedPrice}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">Submitted UTR Reference:</span>
              <span className="font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                {upiSubmittedResult.utrNumber}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">Transaction ID:</span>
              <span className="font-mono text-[11px] text-slate-400 truncate max-w-[200px]">
                {upiSubmittedResult.transactionId}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Current Status:</span>
              <span className="font-bold text-amber-400 uppercase text-[11px]">
                Pending Verification
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 text-left flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Zero Risk Policy:</strong> Your subscription is automatically activated as soon as an administrator verifies the transaction. No action is required from you.
            </span>
          </div>

          <div className="space-y-2 pt-2">
            <Button
              type="button"
              variant="primary"
              className="w-full justify-center py-2.5 text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30"
              onClick={() => router.push("/dashboard")}
            >
              <span>Return to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-center py-2 text-xs text-slate-400 hover:text-white"
              onClick={() => router.push("/settings?tab=subscription")}
            >
              <span>View Subscription Status in Settings</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Top Header / Mode Banner */}
        <div className="bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border-b border-indigo-800/50 p-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold tracking-wide uppercase">
            <Lock className="w-3.5 h-3.5" />
            <span>Smart Life Manager • Secure Checkout</span>
          </div>
          <p className="text-xs text-indigo-200/80 mt-1">
            Choose your preferred payment method to upgrade your account.
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

          {/* Payment Method Selector Tabs */}
          {isLoadingConfig ? (
            <div className="p-6 text-center text-xs text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-2" />
              Loading available payment methods...
            </div>
          ) : (
            <div className="space-y-4">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Select Payment Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Card Tab */}
                {(config?.cardEnabled || config?.stripeEnabled || !config?.upiEnabled) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMethod("card");
                      setErrorMessage(null);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      selectedMethod === "card"
                        ? "bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${selectedMethod === "card" ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400"}`}>
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">Card / Stripe</p>
                      <p className="text-[10px] text-slate-400">Instant Activation</p>
                    </div>
                  </button>
                )}

                {/* UPI Tab */}
                {config?.upiEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMethod("upi");
                      setErrorMessage(null);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      selectedMethod === "upi"
                        ? "bg-amber-950/50 border-amber-500 shadow-md shadow-amber-950 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${selectedMethod === "upi" ? "bg-amber-600 text-white" : "bg-slate-900 text-slate-400"}`}>
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">UPI (India QR)</p>
                      <p className="text-[10px] text-slate-400">Manual Verification</p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* METHOD 1: CARD CHECKOUT */}
          {selectedMethod === "card" && (
            <div className="space-y-4">
              {/* Test Card Simulation Details */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-slate-300" />
                    Test Payment Simulation:
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

              {/* Simulation Action Buttons */}
              <div className="space-y-3 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full justify-center py-3 text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30"
                  isLoading={isProcessing}
                  disabled={isProcessing}
                  onClick={() => handleSimulateCardPayment("succeeded")}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Complete Payment (Simulate Card Success)</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center py-2.5 text-xs font-semibold gap-2 border-rose-800/60 text-rose-400 hover:bg-rose-950/40"
                  disabled={isProcessing}
                  onClick={() => handleSimulateCardPayment("failed")}
                >
                  <XCircle className="w-4 h-4" />
                  <span>Simulate Payment Failure (Card Declined)</span>
                </Button>
              </div>
            </div>
          )}

          {/* METHOD 2: MANUAL UPI CHECKOUT */}
          {selectedMethod === "upi" && (
            <form onSubmit={handleSubmitUpi} className="space-y-5">
              {/* UPI Instructions and QR Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="text-center space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Payee: {config?.upiDisplayName || "Smart Life Manager"}
                  </span>
                  <h3 className="text-sm font-bold text-white">Scan &amp; Pay via any UPI App</h3>
                  <p className="text-[11px] text-slate-400">
                    Google Pay, PhonePe, Paytm, CRED, or BHIM
                  </p>
                </div>

                {/* QR Code Container */}
                {config?.upiQrCodeUrl ? (
                  <div className="w-48 h-48 mx-auto p-2 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                    <img
                      src={config.upiQrCodeUrl}
                      alt="UPI QR Code"
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="w-44 h-44 mx-auto p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
                    <QrCode className="w-12 h-12 text-amber-400/80" />
                    <span className="text-[11px] text-slate-400 font-mono">
                      Pay to UPI ID below
                    </span>
                  </div>
                )}

                {/* UPI ID Copy Card */}
                {config?.upiId && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="truncate">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">UPI ID</p>
                      <p className="font-mono text-xs font-bold text-amber-300 truncate">
                        {config.upiId}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyUpiId}
                      className="h-8 px-2.5 text-xs gap-1 border-slate-700 text-slate-300 hover:text-white shrink-0"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Payment Instructions */}
                {config?.upiInstructions && (
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-[11px] text-slate-400 leading-relaxed">
                    {config.upiInstructions}
                  </div>
                )}
              </div>

              {/* UTR Input Form */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-200 flex items-center justify-between">
                    <span>12-Digit UTR / Transaction Reference Number *</span>
                    <span className="text-[10px] text-amber-400 font-normal">Required</span>
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. 427819204910 or UPI transaction ref"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    className="bg-slate-900 border-slate-800 text-xs text-white font-mono placeholder:text-slate-600"
                  />
                  <p className="text-[10px] text-slate-500">
                    Find the 12-digit UTR in your payment receipt / bank transaction message.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Notes / Sender Account Name (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Paid from HDFC account of John"
                    value={upiNotes}
                    onChange={(e) => setUpiNotes(e.target.value)}
                    className="bg-slate-900 border-slate-800 text-xs text-white placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Submit UPI Button */}
              <Button
                type="submit"
                variant="primary"
                className="w-full justify-center py-3 text-xs font-bold gap-2 bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-lg shadow-amber-600/20"
                isLoading={isProcessing}
                disabled={isProcessing}
              >
                <CheckCircle className="w-4 h-4" />
                <span>Submit UPI Payment for Verification</span>
              </Button>
            </form>
          )}

          {/* Cancel Button */}
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

          <div className="text-center text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
            Smart Life Manager never stores card numbers or security credentials.
          </div>
        </div>
      </div>
    </div>
  );
}
