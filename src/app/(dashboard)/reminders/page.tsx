import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Bell, Shield, BellRing, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export default async function RemindersPage() {
  const user = await requireUser();

  const reminders = await prisma.reminder.findMany({
    where: { userId: user.id },
    orderBy: { dueDate: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Reminders & Tasks
            </h1>
            <Badge variant="outline">Phase 1 Foundation</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Keep track of life tasks, deadlines, and multi-tier proactive alert schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="Module will be active in Phase 2"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600/50 text-white cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Reminder (Phase 2)</span>
          </button>
        </div>
      </div>

      {reminders.length === 0 ? (
        <div className="space-y-6">
          <EmptyState
            icon={Bell}
            title="Reminder Engine Ready"
            description="You have no active reminders right now. In Phase 2, this module will manage priority alerts, snoozing, and recurring schedules."
          />

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Architectural Preparedness
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <BellRing className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Priority & Status:</strong> Database supports indexed urgency levels (urgent, high, medium, low) and lifecycle tracking (pending, completed, snoozed).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Polymorphic Relations:</strong> Prepared to link reminders directly to documents, payments, vehicles, and subscriptions.
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {reminders.map((rem) => (
            <div key={rem.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{rem.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{rem.priority}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
