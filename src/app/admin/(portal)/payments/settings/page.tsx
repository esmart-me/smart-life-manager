import { requireAdmin } from "@/lib/auth/session";
import { getPaymentConfig } from "@/lib/payments/payment-config-service";
import { PaymentSettingsClient } from "@/components/admin/PaymentSettingsClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPaymentSettingsPage() {
  await requireAdmin();
  const config = await getPaymentConfig();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <Link
          href="/admin/payments"
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Back to Payments Ledger"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Payment Methods &amp; Gateway Settings
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure enabled checkout providers, custom UPI identifiers, payment instructions, and QR codes.
          </p>
        </div>
      </div>

      <PaymentSettingsClient initialConfig={config} />
    </div>
  );
}
