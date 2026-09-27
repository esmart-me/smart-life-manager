"use client";

import { useState } from "react";
import {
  X,
  Bell,
  Calendar,
  Clock,
  Repeat,
  Tag,
  AlertTriangle,
  Sparkles,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertBanner } from "@/components/ui/AlertBanner";
import {
  REMINDER_REPEAT_TYPES,
  REMINDER_CATEGORIES,
  REMINDER_PRIORITIES,
  NOTIFICATION_PREFERENCES,
  QUICK_REMINDER_SUGGESTIONS,
  ReminderRepeatType,
  ReminderCategory,
  ReminderPriority,
  NotificationPreference,
} from "@/lib/reminders/constants";

export interface ReminderFormData {
  id?: string;
  title: string;
  description?: string | null;
  dueDate?: string;
  date?: string;
  time?: string;
  priority?: string;
  category?: string;
  repeat?: string;
  recurrenceRule?: string | null;
  customInterval?: number;
  customUnit?: string;
  notificationPreference?: string;
}

interface ReminderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: ReminderFormData | null;
}

export function ReminderFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: ReminderFormModalProps) {
  const isEditing = Boolean(initialData?.id);

  // Parse initial date & time
  let defaultDate = new Date().toISOString().split("T")[0];
  let defaultTime = "09:00";
  if (initialData?.dueDate) {
    const d = new Date(initialData.dueDate);
    if (!isNaN(d.getTime())) {
      defaultDate = d.toISOString().split("T")[0];
      defaultTime = d.toTimeString().slice(0, 5);
    }
  }

  // Parse repeat
  let initialRepeat: ReminderRepeatType = "one_time";
  let initialInterval = 1;
  let initialUnit = "weeks";

  if (initialData?.recurrenceRule) {
    const rule = initialData.recurrenceRule.toLowerCase();
    if (rule === "daily") initialRepeat = "daily";
    else if (rule === "weekly") initialRepeat = "weekly";
    else if (rule === "monthly") initialRepeat = "monthly";
    else if (rule === "yearly") initialRepeat = "yearly";
    else if (rule.startsWith("custom:")) {
      initialRepeat = "custom";
      const parts = rule.split(":");
      initialInterval = parseInt(parts[1], 10) || 1;
      initialUnit = parts[2] || "weeks";
    }
  }

  // Form states
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [date, setDate] = useState(initialData?.date || defaultDate);
  const [time, setTime] = useState(initialData?.time || defaultTime);
  const [repeat, setRepeat] = useState<ReminderRepeatType>(initialRepeat);
  const [customInterval, setCustomInterval] = useState(initialInterval);
  const [customUnit, setCustomUnit] = useState(initialUnit);
  const [category, setCategory] = useState<ReminderCategory>(
    (initialData?.category as ReminderCategory) || "general"
  );
  const [priority, setPriority] = useState<ReminderPriority>(
    (initialData?.priority as ReminderPriority) || "medium"
  );
  const [notificationPreference, setNotificationPreference] = useState<NotificationPreference>("both");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplySuggestion = (sug: typeof QUICK_REMINDER_SUGGESTIONS[number]) => {
    setTitle(sug.title);
    setCategory(sug.category as ReminderCategory);
    setPriority(sug.priority as ReminderPriority);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage("Please enter a reminder title.");
      return;
    }
    if (!date) {
      setErrorMessage("Please select a date.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        date,
        time,
        repeat,
        customInterval,
        customUnit,
        category,
        priority,
        notificationPreference,
      };

      const url = isEditing ? `/api/reminders/${initialData?.id}` : "/api/reminders";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save reminder");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong saving the reminder.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 rounded-lg">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? "Edit Reminder" : "New Reminder"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Never forget payments, service dates, birthdays, or meetings.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <AlertBanner
              type="error"
              title="Error saving reminder"
              message={errorMessage}
            />
          )}

          {/* Quick suggestions when adding new */}
          {!isEditing && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Quick Suggestions:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REMINDER_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug.title}
                    type="button"
                    onClick={() => handleApplySuggestion(sug)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    + {sug.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label
              htmlFor="rem-title"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Reminder Title <span className="text-rose-500">*</span>
            </label>
            <Input
              id="rem-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Pay rent, Renew car insurance, Call accountant"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="rem-desc"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Description / Notes (Optional)
            </label>
            <textarea
              id="rem-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add extra details, account numbers, or agenda..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div>
              <label
                htmlFor="rem-date"
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-brand-500" />
                <span>Date</span>
              </label>
              <Input
                id="rem-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label
                htmlFor="rem-time"
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-brand-500" />
                <span>Time</span>
              </label>
              <Input
                id="rem-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Repeat Rule */}
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Repeat className="w-3.5 h-3.5 text-amber-500" />
              <span>Repeat Schedule</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <select
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value as ReminderRepeatType)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {REMINDER_REPEAT_TYPES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Interval Settings */}
              {repeat === "custom" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Every</span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={customInterval}
                    onChange={(e) => setCustomInterval(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 px-2.5 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="rem-cat"
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Category</span>
              </label>
              <select
                id="rem-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as ReminderCategory)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {REMINDER_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label} ({cat.example})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="rem-pri"
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                <span>Urgency & Priority</span>
              </label>
              <select
                id="rem-pri"
                value={priority}
                onChange={(e) => setPriority(e.target.value as ReminderPriority)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {REMINDER_PRIORITIES.map((pri) => (
                  <option key={pri.id} value={pri.id}>
                    {pri.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notification Preference */}
          <div>
            <label
              htmlFor="rem-notif"
              className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
            >
              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
              <span>Notification Delivery</span>
            </label>
            <select
              id="rem-notif"
              value={notificationPreference}
              onChange={(e) => setNotificationPreference(e.target.value as NotificationPreference)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {NOTIFICATION_PREFERENCES.map((np) => (
                <option key={np.id} value={np.id}>
                  {np.label}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Deduplication engine prevents duplicate notification alerts
            </span>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEditing ? "Save Changes" : "Create Reminder"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
