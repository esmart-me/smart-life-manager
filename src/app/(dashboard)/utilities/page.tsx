import { requireUser } from "@/lib/auth/session";
import Link from "next/link";
import {
  Calculator,
  Globe,
  ArrowRight,
  Sparkles,
  Layers,
  Wrench,
  Clock,
  FileSpreadsheet,
} from "lucide-react";

export const metadata = {
  title: "Utilities & Tools | Smart Life Manager",
  description: "Productivity and financial calculation utilities for everyday life management.",
};

export default async function UtilitiesHubPage() {
  await requireUser();

  const utilities = [
    {
      title: "Smart Calculator",
      description:
        "Fast precision arithmetic, percentages, backspace, sign toggling, and interactive calculation history with keyboard support.",
      href: "/utilities/calculator",
      icon: Calculator,
      tag: "Productivity",
      accent: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
      border: "hover:border-amber-400/50",
    },
    {
      title: "Live Currency Converter",
      description:
        "Real-time exchange rates across GCC currencies (AED, SAR, QAR, KWD, BHD, OMR), USD, EUR, INR, GBP and global currencies.",
      href: "/utilities/currency",
      icon: Globe,
      tag: "Finance",
      accent: "text-brand-600 dark:text-brand-400 bg-brand-500/10",
      border: "hover:border-brand-400/50",
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Utilities & Smart Tools
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Everyday productivity and financial tools built directly into Smart Life Manager.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Utilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {utilities.map((util) => {
          const Icon = util.icon;
          return (
            <Link
              key={util.title}
              href={util.href}
              className={`glass-card group rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 hover:shadow-lg ${util.border} relative overflow-hidden`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-2xl ${util.accent} flex items-center justify-center transition-transform group-hover:scale-105`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {util.tag}
                </span>
              </div>

              <div className="mt-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors flex items-center gap-1.5">
                  {util.title}
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-brand-500" />
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {util.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center text-xs font-semibold text-brand-600 dark:text-brand-400">
                Launch Utility →
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
