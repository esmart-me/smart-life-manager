import { requireUser } from "@/lib/auth/session";
import Link from "next/link";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function ImportantDatesPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Important Dates & Milestones
            </h1>
            <Badge variant="outline">Planned for Future Phase</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Anniversaries, life milestones, birthdays, and proactive annual milestone countdowns.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Planned Feature State */}
      <div className="space-y-6">
        <EmptyState
          icon={Calendar}
          title="Important Dates is Planned for an Upcoming Phase"
          description="This module is architecturally prepared in the database schema. In an upcoming phase, you will be able to store recurring annual milestones, wedding anniversaries, birthdays, and custom celebrations."
        />

        {/* Architectural Preparedness Info */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Module Status & Architecture
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The relational database model <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">ImportantDate</code> is already indexed and ready for annual recurrence calculations and multi-day advance alerts.
          </p>
        </div>
      </div>
    </div>
  );
}
