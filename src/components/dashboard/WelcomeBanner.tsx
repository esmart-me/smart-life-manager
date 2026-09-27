import { formatDate, getGreetingTime } from "@/lib/utils";
import { ShieldCheck, Calendar } from "lucide-react";

interface WelcomeBannerProps {
  displayName: string;
}

export function WelcomeBanner({ displayName }: WelcomeBannerProps) {
  const greeting = getGreetingTime();
  const today = formatDate(new Date());

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 text-white p-6 sm:p-8 shadow-sm">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-medium text-brand-100">
            <Calendar className="w-3.5 h-3.5 text-brand-300" />
            <span>{today}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[11px] font-medium text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Vault Protected & Scoped</span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {greeting}, {displayName}
          </h1>
          <p className="text-sm text-brand-100/90 mt-1 max-w-xl">
            Never miss an important expiry date, payment, reminder, or life event. Your personal command center is ready.
          </p>
        </div>
      </div>
    </div>
  );
}
