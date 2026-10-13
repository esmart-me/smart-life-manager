import { requireUser } from "@/lib/auth/session";
import { getUnifiedPlannerData } from "@/lib/planner/planner-service";
import { PlannerShellClient } from "@/components/planner/PlannerShellClient";
import { CalendarDays } from "lucide-react";

export const metadata = {
  title: "Daily Life Planner — Smart Life Manager",
  description: "Unified daily planner connecting tasks, appointments, reminders, bills, and deadlines.",
};

export default async function DailyPlannerPage() {
  const user = await requireUser();
  const initialData = await getUnifiedPlannerData(user.id);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-theme-accent-subtle flex items-center justify-center text-theme-accent border border-theme-accent/20 shadow-theme-glow">
            <CalendarDays className="w-5 h-5 text-theme-accent" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-theme-text-primary">
              Daily Life Planner
            </h1>
            <p className="text-xs sm:text-sm text-theme-text-muted">
              Connect and track your tasks, appointments, upcoming bills, and life milestones in one chronological timeline.
            </p>
          </div>
        </div>
      </div>

      {/* Main Client Shell */}
      <PlannerShellClient initialData={initialData} />
    </div>
  );
}
