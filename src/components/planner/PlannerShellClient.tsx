"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { DailyBriefingCard } from "./DailyBriefingCard";
import { TimelineItemRow } from "./TimelineItemRow";
import { PlannerTaskFormModal, PlannerTaskFormData } from "./PlannerTaskFormModal";
import { CalendarMonthGrid } from "./CalendarMonthGrid";
import { PlannerQueryResult, UnifiedTimelineItem } from "@/lib/planner/planner-service";

interface PlannerShellClientProps {
  initialData: PlannerQueryResult;
}

export function PlannerShellClient({ initialData }: PlannerShellClientProps) {
  const router = useRouter();
  const [data, setData] = useState<PlannerQueryResult>(initialData);
  const [activeView, setActiveView] = useState<"today" | "tomorrow" | "week" | "calendar" | "all">(initialData.view || "today");
  const [activeFilter, setActiveFilter] = useState<"all" | "overdue" | "today" | "upcoming" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(initialData.selectedDate);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(initialData.selectedDate || Date.now()));

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"task" | "appointment">("task");
  const [editingTask, setEditingTask] = useState<PlannerTaskFormData | null>(null);

  // Fetch planner data when view or date changes
  const fetchPlannerData = async (view = activeView, date = selectedDate, filter = activeFilter) => {
    try {
      const res = await fetch(`/api/planner?view=${view}&date=${date}&filter=${filter}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch planner updates:", err);
    }
  };

  const handleViewChange = (view: "today" | "tomorrow" | "week" | "calendar" | "all") => {
    setActiveView(view);
    const todayStr = new Date().toISOString().split("T")[0];
    let newDate = todayStr;
    if (view === "tomorrow") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      newDate = tomorrow.toISOString().split("T")[0];
    }
    setSelectedDate(newDate);
    fetchPlannerData(view, newDate, activeFilter);
  };

  const handleFilterChange = (filter: "all" | "overdue" | "today" | "upcoming" | "completed") => {
    setActiveFilter(filter);
    fetchPlannerData(activeView, selectedDate, filter);
  };

  const handleSelectCalendarDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    fetchPlannerData("today", dateStr, activeFilter);
  };

  const handleMonthChange = (newMonth: Date) => {
    setCalendarMonth(newMonth);
    const dateStr = newMonth.toISOString().split("T")[0];
    setSelectedDate(dateStr);
    fetchPlannerData("calendar", dateStr, activeFilter);
  };

  // Task creation/update
  const handleSaveTask = async (formData: PlannerTaskFormData) => {
    if (formData.id) {
      // Edit existing
      const res = await fetch(`/api/planner/tasks/${formData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || "Failed to update task");
      }
    } else {
      // Create new
      const res = await fetch("/api/planner/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || "Failed to create task");
      }
    }
    await fetchPlannerData();
  };

  // Toggle complete
  const handleToggleComplete = async (item: UnifiedTimelineItem) => {
    const nextCompleted = !item.isCompleted;

    // Optimistic UI update
    setData((prev) => ({
      ...prev,
      timeline: prev.timeline.map((it) =>
        it.id === item.id ? { ...it, isCompleted: nextCompleted } : it
      ),
    }));

    try {
      const res = await fetch(`/api/planner/tasks/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: nextCompleted }),
      });
      if (!res.ok) {
        // Rollback
        await fetchPlannerData();
      }
    } catch {
      await fetchPlannerData();
    }
  };

  // Delete task
  const handleDeleteTask = async (item: UnifiedTimelineItem) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return;

    // Optimistic UI update
    setData((prev) => ({
      ...prev,
      timeline: prev.timeline.filter((it) => it.id !== item.id),
    }));

    try {
      const res = await fetch(`/api/planner/tasks/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        await fetchPlannerData();
      }
    } catch {
      await fetchPlannerData();
    }
  };

  // Reschedule task
  const handleRescheduleTask = async (item: UnifiedTimelineItem, newDate: string) => {
    try {
      const res = await fetch(`/api/planner/tasks/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate }),
      });
      if (res.ok) {
        await fetchPlannerData();
      }
    } catch (err) {
      console.error("Failed to reschedule task:", err);
    }
  };

  // Update briefing settings
  const handleUpdateBriefingSettings = async (settings: {
    dailyBriefingEnabled: boolean;
    dailyBriefingTime: string;
  }) => {
    const res = await fetch("/api/planner/briefing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      setData((prev) => ({
        ...prev,
        briefing: {
          ...prev.briefing,
          enabled: settings.dailyBriefingEnabled,
          preferredTime: settings.dailyBriefingTime,
        },
      }));
    }
  };

  // Filter items by client search
  const visibleItems = useMemo(() => {
    if (!searchQuery.trim()) return data.timeline;
    const q = searchQuery.toLowerCase().trim();
    return data.timeline.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        (it.description && it.description.toLowerCase().includes(q)) ||
        it.category.toLowerCase().includes(q) ||
        (it.location && it.location.toLowerCase().includes(q))
    );
  }, [data.timeline, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner: Daily Briefing Card */}
      <DailyBriefingCard
        briefing={data.briefing}
        onUpdateBriefingSettings={handleUpdateBriefingSettings}
      />

      {/* Action Bar: Views, Search, Quick Add */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* View Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-theme-glass-subtle border border-theme-border self-start">
          <button
            type="button"
            onClick={() => handleViewChange("today")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeView === "today"
                ? "bg-theme-accent text-white shadow-2xs"
                : "text-theme-text-secondary hover:text-theme-text-primary"
            }`}
          >
            Today ({data.counts.today})
          </button>
          <button
            type="button"
            onClick={() => handleViewChange("tomorrow")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeView === "tomorrow"
                ? "bg-theme-accent text-white shadow-2xs"
                : "text-theme-text-secondary hover:text-theme-text-primary"
            }`}
          >
            Tomorrow ({data.counts.tomorrow})
          </button>
          <button
            type="button"
            onClick={() => handleViewChange("week")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeView === "week"
                ? "bg-theme-accent text-white shadow-2xs"
                : "text-theme-text-secondary hover:text-theme-text-primary"
            }`}
          >
            Next 7 Days ({data.counts.week})
          </button>
          <button
            type="button"
            onClick={() => handleViewChange("calendar")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeView === "calendar"
                ? "bg-theme-accent text-white shadow-2xs"
                : "text-theme-text-secondary hover:text-theme-text-primary"
            }`}
          >
            Calendar
          </button>
          <button
            type="button"
            onClick={() => handleViewChange("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeView === "all"
                ? "bg-theme-accent text-white shadow-2xs"
                : "text-theme-text-secondary hover:text-theme-text-primary"
            }`}
          >
            All Items
          </button>
        </div>

        {/* Right side: Search & Add Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search schedule..."
              className="pl-8 h-9 text-xs"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setModalType("appointment");
              setEditingTask(null);
              setIsModalOpen(true);
            }}
            className="text-xs h-9 gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-sky-500" />
            <span>+ Appointment</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setModalType("task");
              setEditingTask(null);
              setIsModalOpen(true);
            }}
            className="text-xs h-9 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Task</span>
          </Button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-xs text-theme-text-muted font-medium flex items-center gap-1 mr-1">
          <Filter className="w-3 h-3" /> Filter:
        </span>
        {[
          { key: "all", label: "All Items" },
          { key: "overdue", label: `Overdue (${data.counts.overdue})`, alert: data.counts.overdue > 0 },
          { key: "today", label: `Today (${data.counts.today})` },
          { key: "upcoming", label: "Upcoming" },
          { key: "completed", label: `Completed (${data.counts.completed})` },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => handleFilterChange(f.key as any)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activeFilter === f.key
                ? "bg-theme-accent-subtle text-theme-accent border border-theme-accent/30 font-semibold"
                : f.alert
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                : "text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-glass-subtle border border-transparent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Calendar Month Grid (when Calendar view is active) */}
      {activeView === "calendar" && (
        <CalendarMonthGrid
          currentDate={calendarMonth}
          onSelectDate={handleSelectCalendarDate}
          selectedDateStr={selectedDate}
          items={data.timeline}
          onMonthChange={handleMonthChange}
        />
      )}

      {/* Timeline Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-theme-accent" />
            <h3 className="text-sm font-bold text-theme-text-primary tracking-tight">
              {activeView === "calendar"
                ? `Schedule for ${selectedDate}`
                : activeView === "today"
                ? "Today's Chronological Timeline"
                : activeView === "tomorrow"
                ? "Tomorrow's Schedule"
                : activeView === "week"
                ? "7-Day Agenda"
                : "All Scheduled Items"}
            </h3>
            <span className="text-xs text-theme-text-muted">
              ({visibleItems.length} item{visibleItems.length === 1 ? "" : "s"})
            </span>
          </div>
        </div>

        {/* Items List */}
        {visibleItems.length > 0 ? (
          <div className="space-y-2.5">
            {visibleItems.map((item) => (
              <TimelineItemRow
                key={item.id}
                item={item}
                onToggleComplete={handleToggleComplete}
                onEdit={(it) => {
                  setEditingTask({
                    id: it.id,
                    title: it.title,
                    description: it.description || undefined,
                    itemType: it.sourceType === "appointment" ? "appointment" : "task",
                    date: it.date,
                    startTime: it.time || undefined,
                    endTime: it.endTime || undefined,
                    location: it.location || undefined,
                    priority: it.priority,
                    category: it.category as any,
                    notes: (it as any).notes || undefined,
                  });
                  setModalType(it.sourceType === "appointment" ? "appointment" : "task");
                  setIsModalOpen(true);
                }}
                onDelete={handleDeleteTask}
                onReschedule={handleRescheduleTask}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="No scheduled items"
            description={
              searchQuery
                ? `No items matching "${searchQuery}". Try clearing the search.`
                : activeFilter === "overdue"
                ? "All caught up! You have no overdue tasks or deadlines."
                : "Your schedule is clear for this timeframe. Add a new task or appointment to plan your day."
            }
            actionText="+ Add New Task"
            onAction={() => {
              setModalType("task");
              setEditingTask(null);
              setIsModalOpen(true);
            }}
          />
        )}
      </div>

      {/* Task / Appointment Creation Modal */}
      <PlannerTaskFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        initialData={editingTask}
        defaultDate={selectedDate}
        defaultType={modalType}
      />
    </div>
  );
}
