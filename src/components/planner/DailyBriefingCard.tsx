"use client";

import React, { useState } from "react";
import {
  Sun,
  AlertTriangle,
  Clock,
  Settings2,
  Calendar,
  CheckCircle2,
  Wallet,
  Bell,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { DailyBriefingData, UnifiedTimelineItem } from "@/lib/planner/planner-service";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface DailyBriefingCardProps {
  briefing: DailyBriefingData;
  onUpdateBriefingSettings: (settings: { dailyBriefingEnabled: boolean; dailyBriefingTime: string }) => Promise<void>;
  onItemClick?: (item: UnifiedTimelineItem) => void;
}

export function DailyBriefingCard({
  briefing,
  onUpdateBriefingSettings,
  onItemClick,
}: DailyBriefingCardProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [enabled, setEnabled] = useState(briefing.enabled);
  const [time, setTime] = useState(briefing.preferredTime || "08:00");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      await onUpdateBriefingSettings({
        dailyBriefingEnabled: enabled,
        dailyBriefingTime: time,
      });
      setShowSettings(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-card border border-theme-border rounded-2xl p-5 shadow-xs relative overflow-hidden bg-gradient-to-br from-theme-glass to-theme-glass-subtle">
      {/* Decorative ambient accent */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-theme-accent/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-theme-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shadow-2xs">
            <Sun className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-theme-text-primary tracking-tight">
                {briefing.greeting}, Here is your Daily Briefing
              </h2>
              {briefing.enabled && (
                <Badge variant="success" className="text-[10px]">
                  Briefing Active
                </Badge>
              )}
            </div>
            <p className="text-xs text-theme-text-muted">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs h-8 px-2.5 gap-1.5"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Preferences</span>
            {showSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Briefing Preferences Drawer */}
      {showSettings && (
        <div className="mt-3 p-3.5 rounded-xl bg-theme-bg-elevated/70 border border-theme-border animate-in fade-in space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-theme-text-primary">
              Daily Briefing Alerts
            </span>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="briefingEnabledToggle"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-theme-border text-theme-accent focus:ring-theme-accent"
              />
              <label htmlFor="briefingEnabledToggle" className="text-xs text-theme-text-secondary cursor-pointer">
                Enabled
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-theme-border/50">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-theme-text-muted" />
              <label htmlFor="briefingTime" className="text-xs text-theme-text-secondary">
                Preferred Briefing Time:
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="briefingTime"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-theme-border bg-theme-bg-elevated text-xs text-theme-text-primary focus:outline-hidden focus:ring-1 focus:ring-theme-accent"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="text-xs h-8 px-3"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Today's Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div className="p-3 rounded-xl bg-theme-glass-subtle border border-theme-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-theme-accent-subtle text-theme-accent flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-lg font-bold text-theme-text-primary block leading-none">
              {briefing.totalScheduleCount}
            </span>
            <span className="text-[11px] text-theme-text-muted">Total Today</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-theme-glass-subtle border border-theme-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-lg font-bold text-theme-text-primary block leading-none">
              {briefing.tasksCount + briefing.appointmentsCount}
            </span>
            <span className="text-[11px] text-theme-text-muted">Tasks & Syncs</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-theme-glass-subtle border border-theme-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <span className="text-lg font-bold text-theme-text-primary block leading-none">
              {briefing.billsCount}
            </span>
            <span className="text-[11px] text-theme-text-muted">Bills Due</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-theme-glass-subtle border border-theme-border flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            briefing.overdueCount > 0
              ? "bg-rose-500/10 text-rose-500 font-bold"
              : "bg-slate-500/10 text-theme-text-muted"
          }`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className={`text-lg font-bold block leading-none ${
              briefing.overdueCount > 0 ? "text-rose-500" : "text-theme-text-primary"
            }`}>
              {briefing.overdueCount}
            </span>
            <span className="text-[11px] text-theme-text-muted">Overdue Items</span>
          </div>
        </div>
      </div>

      {/* Overdue alert banner if items are overdue */}
      {briefing.overdueCount > 0 && briefing.topOverdueItems.length > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                You have {briefing.overdueCount} overdue item{briefing.overdueCount > 1 ? "s" : ""} requiring attention
              </span>
              <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80">
                {briefing.topOverdueItems.map((i) => i.title).slice(0, 2).join(", ")}
                {briefing.topOverdueItems.length > 2 ? ` and ${briefing.topOverdueItems.length - 2} more` : ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
