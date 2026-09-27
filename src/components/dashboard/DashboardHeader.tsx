import { formatDate, getGreetingTime } from "@/lib/utils";
import { Calendar, ShieldAlert, CheckCircle2 } from "lucide-react";

interface DashboardHeaderProps {
  displayName: string;
  attentionCount: number;
  upcomingCount: number;
}

export function DashboardHeader({ displayName, attentionCount, upcomingCount }: DashboardHeaderProps) {
  const greeting = getGreetingTime();
  const today = formatDate(new Date());

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900 via-slate-900 to-brand-950 text-white p-6 sm:p-7 shadow-sm">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-brand-500/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -mb-10 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Top bar: Date & 5-Second Status Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-medium text-brand-100">
            <Calendar className="w-3.5 h-3.5 text-brand-300" />
            <span>{today}</span>
          </div>

          {attentionCount > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-xs font-semibold text-rose-300 animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{attentionCount} item{attentionCount > 1 ? "s" : ""} need attention today</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-xs font-medium text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>All Clear • On Schedule</span>
            </div>
          )}
        </div>

        {/* Greeting & Subtitle */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {greeting}, {displayName}
          </h1>
          <p className="text-xs sm:text-sm text-brand-100/80 mt-1 max-w-xl">
            {attentionCount > 0
              ? `You have ${attentionCount} critical item${attentionCount > 1 ? "s" : ""} requiring attention and ${upcomingCount} upcoming event${upcomingCount > 1 ? "s" : ""} on schedule.`
              : `Never miss an expiry date, payment, or life event. Your command center is fully up to date.`}
          </p>
        </div>
      </div>
    </div>
  );
}
