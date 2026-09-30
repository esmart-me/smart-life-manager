import { requireUser } from "@/lib/auth/session";
import { Calculator } from "@/components/utilities/Calculator";
import Link from "next/link";
import { ArrowLeft, Sparkles, Calculator as CalcIcon } from "lucide-react";

export const metadata = {
  title: "Calculator | Smart Life Manager",
  description: "Built-in precision calculator with history log and keyboard support.",
};

export default async function CalculatorPage() {
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
          Productivity Utility
        </span>
      </div>

      <div className="text-center space-y-1">
        <div className="inline-flex p-3 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 mb-1">
          <CalcIcon className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Smart Calculator
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Perform quick arithmetic, expense estimates, and percentage calculations with instant history tracking.
        </p>
      </div>

      {/* Main Interactive Calculator */}
      <div className="pt-2">
        <Calculator />
      </div>
    </div>
  );
}
