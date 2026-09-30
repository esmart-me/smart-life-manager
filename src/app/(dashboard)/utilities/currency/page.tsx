import { requireUser } from "@/lib/auth/session";
import { CurrencyConverter } from "@/components/utilities/CurrencyConverter";
import Link from "next/link";
import { ArrowLeft, Sparkles, Globe } from "lucide-react";

export const metadata = {
  title: "Currency Converter | Smart Life Manager",
  description: "Live foreign exchange currency converter with real-time GCC and global interbank rates.",
};

export default async function CurrencyPage() {
  await requireUser();

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-2">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/utilities"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Utilities
        </Link>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
          <Sparkles className="w-3 h-3" />
          Financial Utility
        </span>
      </div>

      <div className="text-center space-y-1">
        <div className="inline-flex p-3 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 mb-1">
          <Globe className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Live Currency Converter
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Calculate multi-currency values across AED, SAR, QAR, KWD, USD, EUR, INR and global currencies in real time.
        </p>
      </div>

      {/* Main Interactive Converter */}
      <div className="pt-2">
        <CurrencyConverter />
      </div>
    </div>
  );
}
