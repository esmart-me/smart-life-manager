import { formatDate, getGreetingTime } from "@/lib/utils";
import { ShieldCheck, Calendar } from "lucide-react";

interface WelcomeBannerProps {
  displayName: string;
}

export function WelcomeBanner({ displayName }: WelcomeBannerProps) {
  const greeting = getGreetingTime();
  const today = formatDate(new Date());

  return (
    <div className="relative overflow-hidden rounded-2xl glass-card text-theme-text-primary p-6 sm:p-8 shadow-xl border border-theme-border animate-card-enter">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-theme-accent-subtle blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 rounded-full bg-theme-accent-subtle blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-subtle border border-theme-border text-xs font-medium text-theme-text-secondary">
            <Calendar className="w-3.5 h-3.5 text-theme-accent" />
            <span>{today}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-theme-accent-subtle border border-theme-accent/30 text-[11px] font-medium text-theme-accent">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Vault Protected & Scoped</span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-theme-text-primary">
            {greeting},{" "}
            <span className="text-theme-gradient font-bold">{displayName}</span>
          </h1>
          <p className="text-sm text-theme-text-secondary mt-1 max-w-xl">
            Never miss an important expiry date, payment, reminder, or life event. Your personal command center is ready.
          </p>
        </div>
      </div>
    </div>
  );
}
