"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Search,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  Repeat,
  AlertTriangle,
  Edit2,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReminderFormModal, ReminderFormData } from "./ReminderFormModal";
import { REMINDER_CATEGORIES } from "@/lib/reminders/constants";

export type ReminderTab = "today" | "tomorrow" | "this_week" | "upcoming" | "completed";

export interface ReminderItem {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  priority: string;
  status: string;
  category: string;
  isRecurring: boolean;
  recurrenceRule?: string | null;
  recurrenceLabel: string;
  groupTag: ReminderTab;
  isOverdue: boolean;
  dateString: string;
  timeString: string;
}

interface ReminderListClientProps {
  initialReminders: ReminderItem[];
}

export function ReminderListClient({ initialReminders }: ReminderListClientProps) {
  const router = useRouter();

  // Active tab & search filter states
  const [activeTab, setActiveTab] = useState<ReminderTab>("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<ReminderFormData | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Optimistic completion state map
  const [completingIds, setCompletingIds] = useState<Record<string, boolean>>({});

  // Dynamic tab counts calculation
  const tabCounts = useMemo(() => {
    const counts = {
      today: 0,
      tomorrow: 0,
      this_week: 0,
      upcoming: 0,
      completed: 0,
    };

    initialReminders.forEach((r) => {
      if (r.status === "completed") {
        counts.completed++;
      } else {
        counts[r.groupTag]++;
      }
    });

    return counts;
  }, [initialReminders]);

  // Filtered Reminders
  const filteredReminders = useMemo(() => {
    return initialReminders.filter((rem) => {
      // 1. Tab grouping
      if (activeTab === "completed") {
        if (rem.status !== "completed") return false;
      } else {
        if (rem.status === "completed") return false;
        if (rem.groupTag !== activeTab) return false;
      }

      // 2. Category filter
      if (categoryFilter !== "all" && rem.category !== categoryFilter) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = rem.title.toLowerCase().includes(q);
        const matchDesc = rem.description?.toLowerCase().includes(q) || false;
        const matchCategory = rem.category.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCategory) {
          return false;
        }
      }

      return true;
    });
  }, [initialReminders, activeTab, categoryFilter, searchQuery]);

  // Complete / Uncomplete Toggle
  const handleToggleComplete = async (rem: ReminderItem) => {
    const isCompleted = rem.status === "completed";
    setCompletingIds((prev) => ({ ...prev, [rem.id]: true }));

    try {
      const res = await fetch(`/api/reminders/${rem.id}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !isCompleted }),
      });

      if (res.ok) {
        showToast(isCompleted ? "Reminder marked incomplete." : "Reminder completed!");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to toggle completion:", err);
    } finally {
      setCompletingIds((prev) => ({ ...prev, [rem.id]: false }));
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this reminder?")) {
      const res = await fetch(`/api/reminders/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Reminder deleted successfully.");
        router.refresh();
      }
    }
  };

  const handleOpenAdd = () => {
    setSelectedReminder(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (rem: ReminderItem) => {
    setSelectedReminder({
      id: rem.id,
      title: rem.title,
      description: rem.description,
      dueDate: rem.dueDate,
      priority: rem.priority,
      category: rem.category,
      recurrenceRule: rem.recurrenceRule,
    });
    setIsFormOpen(true);
  };

  const formatPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      case "high":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "low":
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
      default:
        return "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border-brand-200 dark:border-brand-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Reminders & Tasks
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              Proactive Schedules
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track daily tasks, rent payments, client calls, vehicle maintenance, and recurring milestones.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleOpenAdd}
          className="min-h-[48px] px-5 py-2.5 text-sm font-semibold shadow-sm inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Reminder</span>
        </Button>
      </div>

      {/* Tabs Bar: Today, Tomorrow, This Week, Upcoming, Completed */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {(
          [
            { id: "today", label: "Today", count: tabCounts.today },
            { id: "tomorrow", label: "Tomorrow", count: tabCounts.tomorrow },
            { id: "this_week", label: "This Week", count: tabCounts.this_week },
            { id: "upcoming", label: "Upcoming", count: tabCounts.upcoming },
            { id: "completed", label: "Completed", count: tabCounts.completed },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                isActive
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] ${
                  isActive
                    ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Category Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reminders by title, note, or category..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="w-full sm:w-44">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Categories</option>
              {REMINDER_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {(searchQuery || categoryFilter !== "all") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setCategoryFilter("all");
              }}
              className="text-xs whitespace-nowrap"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Reminders List */}
      {filteredReminders.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            icon={Bell}
            title={
              activeTab === "completed"
                ? "No completed reminders"
                : activeTab === "today"
                ? "No reminders due today"
                : activeTab === "tomorrow"
                ? "No reminders scheduled for tomorrow"
                : "No reminders found"
            }
            description={
              activeTab === "completed"
                ? "Completed reminders and advanced recurring milestones will be kept here for your records."
                : "Keep your life organized by scheduling important dates, calls, bills, and appointments."
            }
          />
          {activeTab !== "completed" && (
            <div className="flex justify-center">
              <Button
                type="button"
                onClick={handleOpenAdd}
                className="min-h-[48px] px-6 py-2.5 text-sm font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span>Create Reminder</span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReminders.map((rem) => {
            const isCompleted = rem.status === "completed";
            const isProcessing = completingIds[rem.id];

            return (
              <div
                key={rem.id}
                className={`p-4 rounded-xl border transition-all ${
                  isCompleted
                    ? "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75"
                    : rem.isOverdue
                    ? "bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 shadow-xs"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Completion Toggle Checkbox */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(rem)}
                      disabled={isProcessing}
                      aria-label={isCompleted ? "Mark as pending" : "Mark as completed"}
                      className="mt-0.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors focus:outline-none"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 hover:text-slate-400" />
                      )}
                    </button>

                    {/* Middle: Details */}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm font-bold truncate ${
                            isCompleted
                              ? "line-through text-slate-400 dark:text-slate-500"
                              : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {rem.title}
                        </span>

                        {/* Priority Badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${formatPriorityBadge(
                            rem.priority
                          )}`}
                        >
                          {rem.priority}
                        </span>

                        {/* Overdue Badge */}
                        {rem.isOverdue && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Overdue</span>
                          </span>
                        )}

                        {/* Repeat Tag */}
                        {rem.isRecurring && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Repeat className="w-3 h-3" />
                            <span>{rem.recurrenceLabel}</span>
                          </span>
                        )}
                      </div>

                      {rem.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {rem.description}
                        </p>
                      )}

                      {/* Date & Time Footer */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(rem.dueDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{rem.timeString}</span>
                        </span>
                        <span className="capitalize px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px]">
                          {rem.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isCompleted ? (
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(rem)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Revert to pending"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(rem)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Edit reminder"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(rem.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Delete reminder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Form Modal */}
      <ReminderFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          showToast(selectedReminder?.id ? "Reminder updated successfully!" : "Reminder created successfully!");
          router.refresh();
        }}
        initialData={selectedReminder}
      />

      {/* Floating Success Toast */}
      {successToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-600 dark:bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-xl transition-all animate-in slide-in-from-bottom duration-200"
        >
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <span className="text-sm font-semibold tracking-tight">{successToast}</span>
        </div>
      )}
    </div>
  );
}
