"use client";

/**
 * ReminderEngine.tsx
 * Client-side reminder notification engine for Smart Life Manager.
 * 
 * Responsibilities:
 * - Polls /api/reminders every 60 seconds for due/overdue reminders
 * - Triggers native browser notifications (when permission granted)
 * - Plays in-app sound alerts (respects user sound setting + browser autoplay rules)
 * - Shows a non-intrusive "missed reminders" recovery banner
 * - Snooze: 5m / 10m / 30m / 1h / custom
 * - Duplicate prevention: tracks already-notified reminder IDs per session
 * - Does NOT modify any existing component or auth flow
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell,
  X,
  Clock,
  CheckCircle2,
  AlarmClock,
  RotateCcw,
  ChevronDown,
  BellOff,
} from "lucide-react";
import {
  getBrowserNotificationPermission,
  hasAskedPermission,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  getSoundEnabled,
  setSoundEnabled,
  isBrowserNotificationGranted,
} from "@/lib/notifications/browser-notifications";
import { playNotificationSound } from "@/lib/notifications/sound";

// ------- Types -------

interface DueReminder {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  priority: string;
  category: string;
  isOverdue: boolean;
  timeString: string;
  dateString: string;
}

const SNOOZE_OPTIONS = [
  { label: "5 min", minutes: 5 },
  { label: "10 min", minutes: 10 },
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
];

// ------- Main Engine Component -------

export function ReminderEngine() {
  // Permission state
  const [permState, setPermState] = useState<NotificationPermission | "unavailable">("unavailable");
  const [showPermBanner, setShowPermBanner] = useState(false);

  // Due/overdue reminders that need recovery action
  const [dueReminders, setDueReminders] = useState<DueReminder[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  // Sound setting
  const [soundEnabled, setSoundEnabledState] = useState(true);

  // Snooze UI state
  const [snoozingId, setSnoozingId] = useState<string | null>(null);
  const [customSnoozeMinutes, setCustomSnoozeMinutes] = useState(15);
  const [showCustomSnooze, setShowCustomSnooze] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Track which reminder IDs we've already notified this session (duplicate prevention)
  const notifiedIds = useRef<Set<string>>(new Set());
  // Track if user has interacted (for sound autoplay rules)
  const hasInteracted = useRef(false);

  // ------- Initialization -------

  useEffect(() => {
    // Read sound preference from localStorage
    setSoundEnabledState(getSoundEnabled());

    // Determine current permission state
    const currentPerm = getBrowserNotificationPermission();
    setPermState(currentPerm);

    // Show permission banner if not yet asked, supported, and not already granted/denied
    if (
      currentPerm === "default" &&
      !hasAskedPermission() &&
      typeof window !== "undefined" &&
      "Notification" in window
    ) {
      // Delay banner by 3s so page loads first
      const t = setTimeout(() => setShowPermBanner(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  // Track user interaction to allow sound playback
  useEffect(() => {
    const handleInteraction = () => {
      hasInteracted.current = true;
    };
    document.addEventListener("click", handleInteraction, { once: true });
    document.addEventListener("keydown", handleInteraction, { once: true });
    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  // ------- Fetching due/overdue reminders -------

  const fetchDueReminders = useCallback(async () => {
    try {
      const res = await fetch("/api/reminders?tab=all");
      if (!res.ok) return;
      const json = await res.json();
      if (!json.success || !json.data?.reminders) return;

      const now = new Date();
      const due: DueReminder[] = json.data.reminders.filter((r: DueReminder & { status: string }) => {
        // Only pending reminders that are due now or overdue
        if (r.status !== "pending") return false;
        const dueDate = new Date(r.dueDate);
        return dueDate <= now;
      });

      // New reminders that haven't been notified yet this session
      const newlyDue = due.filter((r) => !notifiedIds.current.has(r.id));

      if (newlyDue.length > 0) {
        // Mark them as notified
        newlyDue.forEach((r) => notifiedIds.current.add(r.id));

        // Play sound if allowed
        if (soundEnabled && hasInteracted.current) {
          const hasCritical = newlyDue.some((r) => r.priority === "critical" || r.priority === "urgent");
          playNotificationSound(hasCritical ? "critical" : "medium");
        }

        // Fire native browser notification for each new due reminder
        if (isBrowserNotificationGranted()) {
          newlyDue.forEach((r) => {
            showBrowserNotification({
              title: `⏰ Reminder Due: ${r.title}`,
              body: r.description || `Your reminder "${r.title}" is due now.`,
              tag: `slm-rem-${r.id}`,
              priority: r.priority,
              linkUrl: "/reminders",
            });
          });
        }

        // Trigger backend scheduler for the current user to create in-app notifications
        fetch("/api/notifications/scheduler", { method: "POST" }).catch(() => {});
      }

      setDueReminders(due);
      // Show recovery panel if there are overdue items
      if (due.length > 0) setShowPanel(true);
    } catch (err) {
      console.debug("[ReminderEngine] Fetch error:", err);
    }
  }, [soundEnabled]);

  // Poll every 60 seconds
  useEffect(() => {
    fetchDueReminders();
    const interval = setInterval(fetchDueReminders, 60000);
    return () => clearInterval(interval);
  }, [fetchDueReminders]);

  // ------- Actions -------

  const handleRequestPermission = async () => {
    const result = await requestBrowserNotificationPermission();
    setPermState(result);
    setShowPermBanner(false);
  };

  const handleDismissPermBanner = () => {
    setShowPermBanner(false);
    // Mark as asked so we don't show again
    if (typeof window !== "undefined") {
      localStorage.setItem("slm_notif_permission_asked", "true");
    }
  };

  const handleComplete = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/reminders/${id}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (res.ok) {
        setDueReminders((prev) => prev.filter((r) => r.id !== id));
        if (dueReminders.length <= 1) setShowPanel(false);
      }
    } catch (err) {
      console.error("[ReminderEngine] Complete error:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleDismiss = (id: string) => {
    // Locally dismiss from panel without marking complete
    notifiedIds.current.add(id);
    setDueReminders((prev) => prev.filter((r) => r.id !== id));
    if (dueReminders.length <= 1) setShowPanel(false);
  };

  const handleSnooze = async (id: string, minutes: number) => {
    setActionLoading((prev) => ({ ...prev, [`snooze-${id}`]: true }));
    try {
      const res = await fetch(`/api/reminders/${id}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes }),
      });
      if (res.ok) {
        // Remove from due panel and untrack so it re-fires after snooze
        notifiedIds.current.delete(id);
        setDueReminders((prev) => prev.filter((r) => r.id !== id));
        setSnoozingId(null);
        setShowCustomSnooze(false);
        if (dueReminders.length <= 1) setShowPanel(false);
      }
    } catch (err) {
      console.error("[ReminderEngine] Snooze error:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`snooze-${id}`]: false }));
    }
  };

  const handleToggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabledState(newVal);
    setSoundEnabled(newVal);
  };

  // ------- Render -------

  return (
    <>
      {/* ── Permission Request Banner ── */}
      {showPermBanner && permState === "default" && (
        <div
          role="alertdialog"
          aria-label="Enable reminder notifications"
          className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:max-w-sm z-50
            glass-elevated rounded-2xl shadow-2xl border border-amber-300/40 dark:border-amber-500/20
            p-4 animate-in slide-in-from-bottom duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 shrink-0">
              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Enable Reminder Alerts
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Get browser notifications when reminders are due, even if the tab isn&apos;t in focus.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xs transition-colors"
                >
                  Enable Notifications
                </button>
                <button
                  type="button"
                  onClick={handleDismissPermBanner}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismissPermBanner}
              aria-label="Dismiss"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Due / Overdue Reminder Recovery Panel ── */}
      {showPanel && dueReminders.length > 0 && (
        <div
          role="region"
          aria-label="Due reminders"
          className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:max-w-sm z-40
            glass-elevated rounded-2xl shadow-2xl border border-rose-300/50 dark:border-rose-500/30
            overflow-hidden animate-in slide-in-from-bottom duration-300"
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-rose-500/10 dark:bg-rose-950/40 border-b border-rose-200/60 dark:border-rose-900/40">
            <div className="flex items-center gap-2">
              <AlarmClock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span className="text-sm font-bold text-rose-800 dark:text-rose-300">
                {dueReminders.length} Reminder{dueReminders.length > 1 ? "s" : ""} Due
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* Sound toggle */}
              <button
                type="button"
                onClick={handleToggleSound}
                title={soundEnabled ? "Mute reminder sounds" : "Unmute reminder sounds"}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
              >
                {soundEnabled ? (
                  <Bell className="w-4 h-4" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowPanel(false)}
                aria-label="Close panel"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reminder Items */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {dueReminders.map((rem) => {
              const isLoadingItem = actionLoading[rem.id];
              const isSnoozing = snoozingId === rem.id;

              return (
                <div key={rem.id} className="p-3 space-y-2">
                  {/* Title Row */}
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {rem.title}
                      </p>
                      {rem.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {rem.description}
                        </p>
                      )}
                      <p className="text-[11px] text-rose-500 dark:text-rose-400 mt-0.5">
                        Due: {new Date(rem.dueDate).toLocaleString(undefined, {
                          weekday: "short", month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Snooze Options (expanded) */}
                  {isSnoozing && (
                    <div className="pl-6 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {SNOOZE_OPTIONS.map((opt) => (
                          <button
                            key={opt.minutes}
                            type="button"
                            disabled={!!actionLoading[`snooze-${rem.id}`]}
                            onClick={() => handleSnooze(rem.id, opt.minutes)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700
                              bg-slate-50 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/60
                              hover:border-amber-400 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
                          >
                            {opt.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setShowCustomSnooze((v) => !v)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium border border-dashed border-slate-300 dark:border-slate-600
                            text-slate-500 dark:text-slate-400 hover:border-amber-400 transition-colors flex items-center gap-1"
                        >
                          Custom
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>

                      {showCustomSnooze && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={43200}
                            value={customSnoozeMinutes}
                            onChange={(e) =>
                              setCustomSnoozeMinutes(Math.max(1, parseInt(e.target.value, 10) || 15))
                            }
                            className="w-20 px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700
                              bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                          <span className="text-xs text-slate-500">min</span>
                          <button
                            type="button"
                            disabled={!!actionLoading[`snooze-${rem.id}`]}
                            onClick={() => handleSnooze(rem.id, customSnoozeMinutes)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600
                              text-white transition-colors disabled:opacity-50"
                          >
                            Snooze
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => { setSnoozingId(null); setShowCustomSnooze(false); }}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!isSnoozing && (
                    <div className="pl-6 flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={isLoadingItem}
                        onClick={() => handleComplete(rem.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold
                          bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Done</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setSnoozingId(rem.id); setShowCustomSnooze(false); }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
                          border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400
                          hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors"
                      >
                        <AlarmClock className="w-3.5 h-3.5" />
                        <span>Snooze</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDismiss(rem.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
                          text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        title="Dismiss (will show again on next reload)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Panel Footer — link to reminders page */}
          <div className="px-4 py-2.5 glass-panel border-t border-slate-100 dark:border-white/10">
            <a
              href="/reminders"
              className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
            >
              View all reminders →
            </a>
          </div>
        </div>
      )}
    </>
  );
}
