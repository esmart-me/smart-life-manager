"use client";

import { useState } from "react";
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  Upload,
  Globe,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface PaymentConfigDTO {
  id: string;
  cardEnabled: boolean;
  stripeEnabled: boolean;
  paypalEnabled: boolean;
  upiEnabled: boolean;
  upiId: string | null;
  upiDisplayName: string | null;
  upiQrCodeUrl: string | null;
  upiInstructions: string | null;
  defaultMethod: string;
}

export function PaymentSettingsClient({ initialConfig }: { initialConfig: PaymentConfigDTO }) {
  const [cardEnabled, setCardEnabled] = useState(initialConfig.cardEnabled);
  const [stripeEnabled, setStripeEnabled] = useState(initialConfig.stripeEnabled);
  const [paypalEnabled, setPaypalEnabled] = useState(initialConfig.paypalEnabled);
  const [upiEnabled, setUpiEnabled] = useState(initialConfig.upiEnabled);
  const [upiId, setUpiId] = useState(initialConfig.upiId || "");
  const [upiDisplayName, setUpiDisplayName] = useState(initialConfig.upiDisplayName || "");
  const [upiQrCodeUrl, setUpiQrCodeUrl] = useState(initialConfig.upiQrCodeUrl || "");
  const [upiInstructions, setUpiInstructions] = useState(initialConfig.upiInstructions || "");

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/admin/payments/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardEnabled,
          stripeEnabled,
          paypalEnabled,
          upiEnabled,
          upiId,
          upiDisplayName,
          upiQrCodeUrl,
          upiInstructions,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: "success", text: "Payment settings saved and published successfully." });
      } else {
        setStatusMessage({ type: "error", text: data.error?.message || "Failed to save payment settings." });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Network error while saving settings." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleQrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusMessage({ type: "error", text: "Please upload a valid image file (PNG, JPG, SVG)." });
      return;
    }

    setIsUploadingQr(true);
    setStatusMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const res = await fetch("/api/admin/payments/qr-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrImageBase64: base64Data }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setUpiQrCodeUrl(data.data.upiQrCodeUrl);
          setStatusMessage({ type: "success", text: "UPI QR code uploaded successfully." });
        } else {
          setStatusMessage({ type: "error", text: data.error?.message || "Failed to upload QR code." });
        }
        setIsUploadingQr(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setStatusMessage({ type: "error", text: "Failed to read QR image file." });
      setIsUploadingQr(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs font-medium ${
            statusMessage.type === "success"
              ? "bg-emerald-950/60 border border-emerald-800 text-emerald-300"
              : "bg-rose-950/60 border border-rose-800 text-rose-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Gateway Methods Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              Enabled Customer Payment Methods
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Control which payment options appear in the Customer Checkout screen. Card will only appear if enabled.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card / Stripe Toggle */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between">
            <div className="space-y-1 pr-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">Credit / Debit Card (Stripe)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Allow customers to subscribe using Visa, Mastercard, AMEX via Stripe Checkout.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={cardEnabled}
                onChange={(e) => {
                  setCardEnabled(e.target.checked);
                  setStripeEnabled(e.target.checked);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>

          {/* PayPal Toggle */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between opacity-80">
            <div className="space-y-1 pr-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">PayPal Gateway</span>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Coming Soon
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Allow customers to checkout using PayPal balance and digital wallet.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={paypalEnabled}
                onChange={(e) => setPaypalEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>

          {/* Manual UPI Toggle */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between sm:col-span-2">
            <div className="space-y-1 pr-4">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">Manual UPI &amp; UPI QR Code</span>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Admin Verified
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Show your custom UPI ID and QR code to customers. Customers submit their 12-digit UTR for admin verification.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={upiEnabled}
                onChange={(e) => setUpiEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>
        </div>
      </div>

      {/* UPI Configuration Section (Only visible when UPI is enabled) */}
      {upiEnabled && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 animate-in fade-in">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-400" />
              Manual UPI Configuration Details
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              These details will be rendered directly on the Customer Checkout screen when UPI is chosen.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                UPI ID (VPA) *
              </label>
              <input
                type="text"
                required={upiEnabled}
                placeholder="e.g. smartlifemanager@okaxis"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                UPI Display Name / Payee Name *
              </label>
              <input
                type="text"
                required={upiEnabled}
                placeholder="e.g. Smart Life Manager"
                value={upiDisplayName}
                onChange={(e) => setUpiDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Customer Payment Instructions
              </label>
              <textarea
                rows={3}
                placeholder="Enter step-by-step payment instructions for customers..."
                value={upiInstructions}
                onChange={(e) => setUpiInstructions(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-hidden leading-relaxed"
              />
            </div>

            {/* QR Code Upload & Preview */}
            <div className="sm:col-span-2 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">UPI QR Code Image</span>
                  <span className="text-[11px] text-slate-400">
                    Upload your official UPI QR code image (PNG, JPG, or SVG).
                  </span>
                </div>

                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingQr ? "Uploading..." : "Upload QR Image"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingQr}
                    onChange={handleQrFileUpload}
                    className="sr-only"
                  />
                </label>
              </div>

              {upiQrCodeUrl ? (
                <div className="flex items-center gap-4 pt-2">
                  <div className="w-24 h-24 rounded-xl bg-white p-1.5 border border-slate-700 shadow-md shrink-0 flex items-center justify-center">
                    <img
                      src={upiQrCodeUrl}
                      alt="UPI QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-white">Active QR Code Configured</p>
                    <p className="text-[10px] text-slate-500 font-mono break-all">{upiQrCodeUrl}</p>
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Ready for customer scanning
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-slate-900/60 border border-dashed border-slate-800 text-center">
                  <p className="text-xs text-slate-500">
                    No QR code image uploaded yet. Click "Upload QR Image" above to upload your payment QR code.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="submit"
          variant="primary"
          isLoading={isSaving}
          disabled={isSaving}
          className="px-6 py-2.5 text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
        >
          <Save className="w-4 h-4" />
          <span>Save Payment Configuration</span>
        </Button>
      </div>
    </form>
  );
}
