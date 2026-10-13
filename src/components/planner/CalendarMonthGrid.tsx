"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { UnifiedTimelineItem } from "@/lib/planner/planner-service";
import { Button } from "@/components/ui/Button";

interface CalendarMonthGridProps {
  currentDate: Date;
  onSelectDate: (dateStr: string) => void;
  selectedDateStr: string;
  items: UnifiedTimelineItem[];
  onMonthChange: (newDate: Date) => void;
}

export function CalendarMonthGrid({
  currentDate,
  onSelectDate,
  selectedDateStr,
  items,
  onMonthChange,
}: CalendarMonthGridProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Monday-first indexing: 0 = Mon, 6 = Sun
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  const totalDays = lastDayOfMonth.getDate();

  const prevMonth = () => {
    onMonthChange(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1));
  };

  const todayStr = new Date().toISOString().split("T")[0];

  // Map items by date string YYYY-MM-DD
  const itemsByDate: Record<string, UnifiedTimelineItem[]> = {};
  for (const item of items) {
    if (!itemsByDate[item.date]) {
      itemsByDate[item.date] = [];
    }
    itemsByDate[item.date].push(item);
  }

  const monthName = firstDayOfMonth.toLocaleString("en-US", { month: "long" });

  const weekDayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Generate cells
  const calendarCells = [];
  // Empty lead cells
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarCells.push(null);
  }
  // Days of month
  for (let d = 1; d <= totalDays; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarCells.push({ dayNumber: d, dateStr: dStr });
  }

  return (
    <div className="glass-card border border-theme-border rounded-2xl p-5 shadow-xs">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-theme-accent" />
          <h3 className="text-base font-bold text-theme-text-primary">
            {monthName} {year}
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={prevMonth}
            className="h-8 w-8 p-0"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMonthChange(new Date())}
            className="h-8 px-2.5 text-xs"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextMonth}
            className="h-8 w-8 p-0"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekDayHeaders.map((day) => (
          <div
            key={day}
            className="text-[11px] font-semibold text-theme-text-muted uppercase py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarCells.map((cell, idx) => {
          if (!cell) {
            return (
              <div
                key={`empty-${idx}`}
                className="h-16 rounded-xl bg-transparent opacity-20 pointer-events-none"
              />
            );
          }

          const { dayNumber, dateStr } = cell;
          const dayItems = itemsByDate[dateStr] || [];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDateStr;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={`h-16 p-1.5 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between ${
                isSelected
                  ? "border-theme-accent bg-theme-accent/10 shadow-xs"
                  : isToday
                  ? "border-amber-500/40 bg-amber-500/5 hover:border-theme-accent/40"
                  : "border-theme-border/60 bg-theme-glass-subtle/50 hover:bg-theme-glass hover:border-theme-border"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center ${
                    isToday
                      ? "bg-amber-500 text-white font-bold"
                      : isSelected
                      ? "bg-theme-accent text-white"
                      : "text-theme-text-primary"
                  }`}
                >
                  {dayNumber}
                </span>

                {dayItems.length > 0 && (
                  <span className="text-[10px] font-bold text-theme-accent px-1.5 py-0.2 rounded-full bg-theme-accent-subtle">
                    {dayItems.length}
                  </span>
                )}
              </div>

              {/* Mini item dots */}
              <div className="flex items-center gap-1 overflow-hidden h-3">
                {dayItems.slice(0, 3).map((it) => (
                  <span
                    key={it.id}
                    title={it.title}
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      it.sourceType === "appointment"
                        ? "bg-sky-500"
                        : it.sourceType === "bill"
                        ? "bg-emerald-500"
                        : it.sourceType === "reminder"
                        ? "bg-amber-500"
                        : it.isOverdue
                        ? "bg-rose-500"
                        : "bg-theme-accent"
                    }`}
                  />
                ))}
                {dayItems.length > 3 && (
                  <span className="text-[8px] text-theme-text-muted leading-none">
                    +{dayItems.length - 3}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
