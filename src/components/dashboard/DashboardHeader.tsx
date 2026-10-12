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
    <div className="relative overflow-hidden rounded-3xl glass-card border border-theme-border text-theme-text-primary p-6 sm:p-8 shadow-theme-glow animate-card-enter">
      {/* Decorative luxury gradient glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-theme-accent-glow opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -mb-10 w-64 h-64 rounded-full bg-theme-accent-subtle opacity-40 blur-2xl pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-32 h-32 rounded-full bg-theme-accent-glow opacity-20 blur-xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Top bar: Date & 5-Second Status Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-theme-accent-subtle backdrop-blur-md border border-theme-accent/30 text-xs font-medium text-theme-accent">
            <Calendar className="w-3.5 h-3.5 text-theme-accent" />
            <span>{today}</span>
          </div>

          {attentionCount > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-xs font-semibold text-rose-300 animate-pulse shadow-2xs">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{attentionCount} item{attentionCount > 1 ? "s" : ""} need attention today</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-xs font-medium text-emerald-300 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>All Clear • On Schedule</span>
            </div>
          )}
        </div>

        {/* Greeting & Subtitle */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-theme-text-primary">
            {greeting},{" "}
            <span className="text-theme-gradient font-bold">{displayName}</span>
          </h1>
          <p className="text-xs sm:text-sm text-theme-text-secondary mt-1 max-w-xl leading-relaxed">
            {attentionCount > 0
              ? `You have ${attentionCount} critical item${attentionCount > 1 ? "s" : ""} requiring attention and ${upcomingCount} upcoming event${upcomingCount > 1 ? "s" : ""} on schedule.`
              : `Never miss an expiry date, payment, or life event. Your personal command center is fully up to date.`}
          </p>
        </div>
      </div>
    </div>
  );
}
