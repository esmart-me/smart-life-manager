"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, MapPin, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface PlannerTaskFormData {
  id?: string;
  title: string;
  description?: string;
  itemType: "task" | "appointment";
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  location?: string;
  priority: "low" | "medium" | "high" | "urgent";
  category: "work" | "personal" | "health" | "family" | "errand" | "appointment";
  notes?: string;
  syncReminder?: boolean;
}

interface PlannerTaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PlannerTaskFormData) => Promise<void>;
  initialData?: PlannerTaskFormData | null;
  defaultDate?: string;
  defaultType?: "task" | "appointment";
}

export function PlannerTaskFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultDate,
  defaultType = "task",
}: PlannerTaskFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [itemType, setItemType] = useState<"task" | "appointment">("task");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [category, setCategory] = useState<"work" | "personal" | "health" | "family" | "errand" | "appointment">("personal");
  const [notes, setNotes] = useState("");
  const [syncReminder, setSyncReminder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setItemType(initialData.itemType || "task");
      setDate(initialData.date ? initialData.date.split("T")[0] : "");
      setStartTime(initialData.startTime || "");
      setEndTime(initialData.endTime || "");
      setLocation(initialData.location || "");
      setPriority(initialData.priority || "medium");
      setCategory(initialData.category || "personal");
      setNotes(initialData.notes || "");
      setSyncReminder(Boolean(initialData.syncReminder));
    } else {
      const today = defaultDate || new Date().toISOString().split("T")[0];
      setTitle("");
      setDescription("");
      setItemType(defaultType);
      setDate(today);
      setStartTime("");
      setEndTime("");
      setLocation("");
      setPriority("medium");
      setCategory(defaultType === "appointment" ? "appointment" : "personal");
      setNotes("");
      setSyncReminder(false);
    }
    setError(null);
  }, [initialData, isOpen, defaultDate, defaultType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a title");
      return;
    }
    if (!date) {
      setError("Please select a date");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        id: initialData?.id,
        title: title.trim(),
        description: description.trim() || undefined,
        itemType,
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        location: location.trim() || undefined,
        priority,
        category,
        notes: notes.trim() || undefined,
        syncReminder,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save planner item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg glass-card border border-theme-border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-theme-accent-subtle flex items-center justify-center text-theme-accent border border-theme-accent/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-semibold text-theme-text-primary">
                {initialData ? `Edit ${itemType === "appointment" ? "Appointment" : "Task"}` : `Add New ${itemType === "appointment" ? "Appointment" : "Task"}`}
              </h2>
              <p className="text-xs text-theme-text-muted">
                Schedule your daily commitments in one unified place
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-glass-subtle transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector (Task vs Appointment) */}
          <div className="flex rounded-xl bg-theme-glass-subtle p-1 border border-theme-border">
            <button
              type="button"
              onClick={() => {
                setItemType("task");
                if (category === "appointment") setCategory("personal");
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                itemType === "task"
                  ? "bg-theme-accent text-white shadow-2xs font-semibold"
                  : "text-theme-text-secondary hover:text-theme-text-primary"
              }`}
            >
              Task
            </button>
            <button
              type="button"
              onClick={() => {
                setItemType("appointment");
                setCategory("appointment");
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                itemType === "appointment"
                  ? "bg-theme-accent text-white shadow-2xs font-semibold"
                  : "text-theme-text-secondary hover:text-theme-text-primary"
              }`}
            >
              Appointment
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-theme-text-secondary mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={itemType === "appointment" ? "e.g., Dentist Consultation, Team Sync" : "e.g., Review project draft, Renew passport"}
              required
              autoFocus
            />
          </div>

          {/* Date & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Start Time
              </label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                End Time
              </label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Location (for appointment or task) */}
          <div>
            <label className="block text-xs font-medium text-theme-text-secondary mb-1">
              Location / Venue (Optional)
            </label>
            <div className="relative">
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., 450 Health Clinic, Zoom link, Home Office"
              />
            </div>
          </div>

          {/* Priority & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-theme-border bg-theme-bg-elevated text-xs text-theme-text-primary focus:outline-hidden focus:ring-2 focus:ring-theme-accent"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-theme-border bg-theme-bg-elevated text-xs text-theme-text-primary focus:outline-hidden focus:ring-2 focus:ring-theme-accent"
              >
                <option value="personal">Personal</option>
                <option value="work">Work</option>
                <option value="health">Health & Medical</option>
                <option value="family">Family</option>
                <option value="errand">Errand</option>
                <option value="appointment">Appointment</option>
              </select>
            </div>
          </div>

          {/* Description / Notes */}
          <div>
            <label className="block text-xs font-medium text-theme-text-secondary mb-1">
              Notes & Description
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add agenda items, contact details, checklist, or preparation notes..."
              className="w-full p-3 rounded-xl border border-theme-border bg-theme-bg-elevated text-xs text-theme-text-primary focus:outline-hidden focus:ring-2 focus:ring-theme-accent resize-none"
            />
          </div>

          {/* Sync into Reminders Checkbox */}
          {!initialData && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="syncReminder"
                checked={syncReminder}
                onChange={(e) => setSyncReminder(e.target.checked)}
                className="w-4 h-4 rounded border-theme-border text-theme-accent focus:ring-theme-accent"
              />
              <label htmlFor="syncReminder" className="text-xs text-theme-text-secondary cursor-pointer">
                Also create a system reminder alert for this {itemType}
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-theme-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : initialData ? "Save Changes" : `Create ${itemType === "appointment" ? "Appointment" : "Task"}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
