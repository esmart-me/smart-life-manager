"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  Flame,
  Plus,
  CheckCircle2,
  Circle,
  Moon,
  Droplets,
  Dumbbell,
  Smile,
  Meh,
  Frown,
  Sparkles,
  Calendar,
  Trash2,
  Edit2,
  ShieldCheck,
  TrendingUp,
  Heart,
  AlertCircle,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface HabitLogItem {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  notes?: string | null;
}

interface HabitItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  frequency: string;
  targetDaysPerWeek: number;
  currentStreak: number;
  bestStreak: number;
  color: string;
  reminderTime: string | null;
  isArchived: boolean;
  logs: HabitLogItem[];
}

interface WellnessLogItem {
  id?: string;
  date: string;
  sleepHours: number | null;
  waterGlasses: number | null;
  exerciseMinutes: number | null;
  mood: string | null;
  notes: string | null;
}

export function WellnessClient() {
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<WellnessLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Daily log state for today
  const todayStr = new Date().toISOString().split("T")[0];
  const [todayLog, setTodayLog] = useState<WellnessLogItem>({
    date: todayStr,
    sleepHours: 7.5,
    waterGlasses: 8,
    exerciseMinutes: 30,
    mood: "good",
    notes: "",
  });
  const [savingLog, setSavingLog] = useState(false);
  const [logSavedSuccess, setLogSavedSuccess] = useState(false);

  // Habit modal states
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitItem | null>(null);
  const [habitFormData, setHabitFormData] = useState({
    title: "",
    description: "",
    category: "health",
    frequency: "daily",
    targetDaysPerWeek: 7,
    reminderTime: "",
  });
  const [submittingHabit, setSubmittingHabit] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Generate last 7 days array for check-off matrix
  const past7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [habitsRes, logsRes] = await Promise.all([
        fetch("/api/wellness/habits"),
        fetch("/api/wellness/logs?days=30"),
      ]);

      const habitsData = await habitsRes.json();
      const logsData = await logsRes.json();

      if (habitsData.success) {
        setHabits(habitsData.data || []);
      }
      if (logsData.success) {
        const list: WellnessLogItem[] = logsData.data || [];
        setWellnessLogs(list);
        const todayFound = list.find((l) => l.date.split("T")[0] === todayStr);
        if (todayFound) {
          setTodayLog({
            ...todayFound,
            date: todayStr,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load wellness data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleHabitDay = async (habitId: string, dateStr: string) => {
    try {
      const res = await fetch(`/api/wellness/habits/${habitId}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
      });
      const data = await res.json();
      if (data.success && data.data?.habit) {
        setHabits((prev) =>
          prev.map((h) => (h.id === habitId ? data.data.habit : h))
        );
      }
    } catch (err) {
      console.error("Failed to toggle habit:", err);
    }
  };

  const handleSaveDailyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingLog(true);
      setLogSavedSuccess(false);

      const res = await fetch("/api/wellness/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(todayLog),
      });

      const data = await res.json();
      if (data.success) {
        setLogSavedSuccess(true);
        setTimeout(() => setLogSavedSuccess(false), 3000);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to save wellness log:", err);
    } finally {
      setSavingLog(false);
    }
  };

  const openCreateHabitModal = () => {
    setEditingHabit(null);
    setHabitFormData({
      title: "",
      description: "",
      category: "health",
      frequency: "daily",
      targetDaysPerWeek: 7,
      reminderTime: "",
    });
    setShowHabitModal(true);
  };

  const openEditHabitModal = (habit: HabitItem) => {
    setEditingHabit(habit);
    setHabitFormData({
      title: habit.title,
      description: habit.description || "",
      category: habit.category || "health",
      frequency: habit.frequency || "daily",
      targetDaysPerWeek: habit.targetDaysPerWeek || 7,
      reminderTime: habit.reminderTime || "",
    });
    setShowHabitModal(true);
  };

  const handleHabitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitFormData.title.trim()) return;

    try {
      setSubmittingHabit(true);
      const url = editingHabit
        ? `/api/wellness/habits/${editingHabit.id}`
        : "/api/wellness/habits";
      const method = editingHabit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(habitFormData),
      });

      const data = await res.json();
      if (data.success) {
        setNotification({
          type: "success",
          message: editingHabit ? "Habit updated!" : "New habit created!",
        });
        setShowHabitModal(false);
        fetchData();
      } else {
        setNotification({
          type: "error",
          message: data.error?.message || "Failed to save habit",
        });
      }
    } catch (err) {
      console.error("Save habit error:", err);
    } finally {
      setSubmittingHabit(false);
    }
  };

  const handleDeleteHabit = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete habit "${title}"?`)) return;

    try {
      const res = await fetch(`/api/wellness/habits/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (err) {
      console.error("Delete habit error:", err);
    }
  };

  const filteredHabits = habits.filter((h) => {
    if (selectedCategory === "all") return true;
    return h.category === selectedCategory;
  });

  // Calculate summary metrics
  const activeHabitsCount = habits.filter((h) => !h.isArchived).length;
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.bestStreak), 0);
  const totalStreaks = habits.reduce((sum, h) => sum + h.currentStreak, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Wellness & Habit Tracker
            </h1>
            <Badge variant="success">Daily Streaks</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Build consistency, record daily vitals, and celebrate habit milestones offline and privately.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openCreateHabitModal}
          className="text-xs font-semibold gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Habit</span>
        </Button>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            notification.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Active Habits
            </span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              {activeHabitsCount}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Current Streaks
            </span>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {totalStreaks} days
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Best Ever Streak
            </span>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {bestStreak} days
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Today&apos;s Water
            </span>
            <p className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-0.5">
              {todayLog.waterGlasses || 0} glasses
            </p>
          </div>
          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600">
            <Droplets className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Habit Tracker Section (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Habits & Consistency Matrix</span>
              </h3>

              {/* Filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {["all", "health", "fitness", "mindfulness", "productivity"].map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all shrink-0 ${
                        selectedCategory === cat
                          ? "bg-brand-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
                Loading habits...
              </div>
            ) : filteredHabits.length === 0 ? (
              <div className="py-12 text-center">
                <Activity className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No habits tracked yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Start small! Add a 10-minute morning walk, drinking 2L of water, or reading before bed.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openCreateHabitModal}
                  className="mt-4 text-xs"
                >
                  Create First Habit
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 7-day header */}
                <div className="flex items-center justify-end gap-1.5 text-[10px] font-semibold text-slate-400 pr-2">
                  <span className="mr-auto hidden sm:inline">Habit</span>
                  {past7Days.map((dateStr) => {
                    const d = new Date(dateStr);
                    const dayLabel = d.toLocaleDateString(undefined, { weekday: "narrow" });
                    const isToday = dateStr === todayStr;
                    return (
                      <div
                        key={dateStr}
                        className={`w-7 text-center ${
                          isToday ? "text-brand-600 dark:text-brand-400 font-bold" : ""
                        }`}
                      >
                        {dayLabel}
                      </div>
                    );
                  })}
                </div>

                {filteredHabits.map((habit) => {
                  const logMap = new Map(
                    habit.logs.map((l) => [l.date.split("T")[0], l.completed])
                  );

                  return (
                    <div
                      key={habit.id}
                      className="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center justify-between gap-3 group hover:border-brand-300 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {habit.title}
                          </h4>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md">
                            <Flame className="w-3 h-3 fill-amber-500" />
                            {habit.currentStreak}d
                          </span>
                        </div>
                        {habit.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {habit.description}
                          </p>
                        )}
                      </div>

                      {/* 7-day checkmarks */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {past7Days.map((dateStr) => {
                          const isCompleted = Boolean(logMap.get(dateStr));
                          const isToday = dateStr === todayStr;

                          return (
                            <button
                              key={dateStr}
                              type="button"
                              onClick={() => handleToggleHabitDay(habit.id, dateStr)}
                              title={`${dateStr}: ${isCompleted ? "Completed" : "Incomplete"}`}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                isCompleted
                                  ? "bg-emerald-500 text-white shadow-xs"
                                  : isToday
                                  ? "border-2 border-brand-400 dark:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 text-slate-300"
                                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-300 dark:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 opacity-40" />
                              )}
                            </button>
                          );
                        })}

                        {/* Actions */}
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                          <button
                            onClick={() => openEditHabitModal(habit)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Edit habit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteHabit(habit.id, habit.title)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Delete habit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Daily Wellness Check-In Card (Right 1 col) */}
        <div className="space-y-4">
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                <span>Today&apos;s Check-In</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                {new Date().toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>

            <form onSubmit={handleSaveDailyLog} className="space-y-4">
              {/* Mood Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Mood & Energy
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { key: "great", label: "Great", icon: "😄" },
                    { key: "good", label: "Good", icon: "🙂" },
                    { key: "neutral", label: "Okay", icon: "😐" },
                    { key: "low", label: "Low", icon: "😔" },
                    { key: "stressed", label: "Stressed", icon: "😫" },
                  ].map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setTodayLog({ ...todayLog, mood: m.key })}
                      className={`p-2 rounded-xl text-center border text-xs transition-all ${
                        todayLog.mood === m.key
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40 shadow-xs font-bold text-brand-700 dark:text-brand-300"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="text-lg">{m.icon}</div>
                      <div className="text-[10px] mt-0.5 truncate">{m.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Water Intake */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-sky-500" />
                    Water Glasses
                  </span>
                  <span className="font-bold text-sky-600 dark:text-sky-400">
                    {todayLog.waterGlasses || 0} / 8 glasses
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setTodayLog({
                        ...todayLog,
                        waterGlasses: Math.max(0, (todayLog.waterGlasses || 0) - 1),
                      })
                    }
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200"
                  >
                    -
                  </button>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-sky-500 h-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, ((todayLog.waterGlasses || 0) / 8) * 100)}%`,
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setTodayLog({
                        ...todayLog,
                        waterGlasses: (todayLog.waterGlasses || 0) + 1,
                      })
                    }
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Sleep & Exercise */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sleep (Hours)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      value={todayLog.sleepHours ?? ""}
                      onChange={(e) =>
                        setTodayLog({
                          ...todayLog,
                          sleepHours: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <Moon className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Exercise (Mins)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="5"
                      min="0"
                      value={todayLog.exerciseMinutes ?? ""}
                      onChange={(e) =>
                        setTodayLog({
                          ...todayLog,
                          exerciseMinutes: e.target.value ? parseInt(e.target.value, 10) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <Dumbbell className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reflection / Notes
                </label>
                <textarea
                  rows={2}
                  value={todayLog.notes ?? ""}
                  onChange={(e) =>
                    setTodayLog({ ...todayLog, notes: e.target.value })
                  }
                  placeholder="How did you feel today? Any breakthroughs?"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={savingLog}
                className="w-full text-xs font-semibold gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {savingLog
                    ? "Saving..."
                    : logSavedSuccess
                    ? "Logged for Today!"
                    : "Save Today's Check-In"}
                </span>
              </Button>
            </form>
          </div>

          {/* Privacy Disclaimer */}
          <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 text-[11px] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Privacy Protected.
              </span>{" "}
              Your daily wellness and vitals are encrypted locally. Smart Life Manager does not offer medical diagnoses or treatment recommendations.
            </div>
          </div>
        </div>
      </div>

      {/* Habit Create/Edit Modal */}
      {showHabitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingHabit ? "Edit Habit" : "Create New Habit"}
            </h3>

            <form onSubmit={handleHabitSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Habit Title *
                </label>
                <input
                  type="text"
                  required
                  value={habitFormData.title}
                  onChange={(e) =>
                    setHabitFormData({ ...habitFormData, title: e.target.value })
                  }
                  placeholder="e.g. 20-min Morning Walk"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={habitFormData.category}
                  onChange={(e) =>
                    setHabitFormData({ ...habitFormData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="health">General Health</option>
                  <option value="fitness">Fitness & Exercise</option>
                  <option value="mindfulness">Mindfulness & Meditation</option>
                  <option value="productivity">Productivity & Reading</option>
                  <option value="hydration">Hydration & Nutrition</option>
                  <option value="sleep">Sleep & Recovery</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Frequency
                  </label>
                  <select
                    value={habitFormData.frequency}
                    onChange={(e) =>
                      setHabitFormData({ ...habitFormData, frequency: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Goal Days / Week
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={habitFormData.targetDaysPerWeek}
                    onChange={(e) =>
                      setHabitFormData({
                        ...habitFormData,
                        targetDaysPerWeek: parseInt(e.target.value, 10) || 7,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Daily Reminder Time (Optional)
                </label>
                <input
                  type="time"
                  value={habitFormData.reminderTime}
                  onChange={(e) =>
                    setHabitFormData({ ...habitFormData, reminderTime: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Motivation
                </label>
                <textarea
                  rows={2}
                  value={habitFormData.description}
                  onChange={(e) =>
                    setHabitFormData({
                      ...habitFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Why is this habit meaningful to you?"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHabitModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submittingHabit}
                  className="text-xs font-semibold"
                >
                  {submittingHabit
                    ? "Saving..."
                    : editingHabit
                    ? "Save Changes"
                    : "Create Habit"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
