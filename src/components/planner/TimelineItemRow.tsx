"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  MapPin,
  AlertCircle,
  MoreVertical,
  Edit2,
  Trash2,
  ExternalLink,
  CalendarDays,
  FileText,
  Car,
  Wallet,
  Bell,
  Sparkles,
} from "lucide-react";
import { UnifiedTimelineItem } from "@/lib/planner/planner-service";
import { Badge } from "@/components/ui/Badge";

interface TimelineItemRowProps {
  item: UnifiedTimelineItem;
  onToggleComplete?: (item: UnifiedTimelineItem) => Promise<void>;
  onEdit?: (item: UnifiedTimelineItem) => void;
  onDelete?: (item: UnifiedTimelineItem) => Promise<void>;
  onReschedule?: (item: UnifiedTimelineItem, newDate: string) => Promise<void>;
}

export function TimelineItemRow({
  item,
  onToggleComplete,
  onEdit,
  onDelete,
  onReschedule,
}: TimelineItemRowProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(item.date);

  const handleToggle = async () => {
    if (!onToggleComplete || isUpdating) return;
    try {
      setIsUpdating(true);
      await onToggleComplete(item);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!onReschedule || !rescheduleDate) return;
    try {
      setIsUpdating(true);
      await onReschedule(item, rescheduleDate);
      setShowReschedule(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const getSourceIcon = () => {
    switch (item.sourceType) {
      case "appointment":
        return <Calendar className="w-3.5 h-3.5 text-sky-500" />;
      case "reminder":
        return <Bell className="w-3.5 h-3.5 text-amber-500" />;
      case "bill":
        return <Wallet className="w-3.5 h-3.5 text-emerald-500" />;
      case "document_expiry":
        return <FileText className="w-3.5 h-3.5 text-purple-500" />;
      case "vehicle_service":
        return <Car className="w-3.5 h-3.5 text-blue-500" />;
      case "task":
      default:
        return <CheckCircle2 className="w-3.5 h-3.5 text-theme-accent" />;
    }
  };

  const getSourceBadge = () => {
    switch (item.sourceType) {
      case "appointment":
        return <Badge variant="info">Appointment</Badge>;
      case "reminder":
        return <Badge variant="warning">Reminder</Badge>;
      case "bill":
        return <Badge variant="emerald">Payment Due</Badge>;
      case "document_expiry":
        return <Badge variant="default">Doc Expiry</Badge>;
      case "vehicle_service":
        return <Badge variant="info">Vehicle Alert</Badge>;
      case "task":
      default:
        return <Badge variant="accent">Task</Badge>;
    }
  };

  const isUserTask = item.sourceType === "task" || item.sourceType === "appointment";

  return (
    <div
      className={`glass-panel border rounded-xl p-3.5 transition-all duration-150 hover:border-theme-accent/30 ${
        item.isCompleted
          ? "opacity-60 bg-theme-glass-subtle/50 border-theme-border"
          : item.isOverdue
          ? "border-rose-500/30 bg-rose-500/[0.03]"
          : "border-theme-border bg-theme-glass"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left side: check/type icon + main text */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Action icon / checkbox */}
          {isUserTask ? (
            <button
              type="button"
              onClick={handleToggle}
              disabled={isUpdating}
              className="mt-0.5 text-theme-text-muted hover:text-theme-accent transition-colors shrink-0"
              aria-label={item.isCompleted ? "Mark incomplete" : "Mark complete"}
            >
              {item.isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </button>
          ) : (
            <div className="mt-0.5 p-1 rounded-lg bg-theme-glass-subtle border border-theme-border shrink-0">
              {getSourceIcon()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className={`text-sm font-semibold tracking-tight truncate ${
                  item.isCompleted
                    ? "line-through text-theme-text-muted"
                    : "text-theme-text-primary"
                }`}
              >
                {item.title}
              </span>
              {getSourceBadge()}
              {item.isOverdue && !item.isCompleted && (
                <Badge variant="danger" className="text-[10px]">
                  Overdue
                </Badge>
              )}
              {item.priority === "urgent" && (
                <Badge variant="danger" className="text-[10px]">
                  Urgent
                </Badge>
              )}
            </div>

            {item.description && (
              <p className="text-xs text-theme-text-secondary line-clamp-2 mb-2">
                {item.description}
              </p>
            )}

            {/* Meta tags: Time, Date, Location */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-theme-text-muted">
              {item.time && (
                <div className="flex items-center gap-1 font-mono text-[11px] text-theme-text-secondary">
                  <Clock className="w-3.5 h-3.5 text-theme-accent" />
                  <span>
                    {item.time}
                    {item.endTime ? ` - ${item.endTime}` : ""}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{item.date}</span>
              </div>
              {item.location && (
                <div className="flex items-center gap-1 text-theme-text-secondary truncate max-w-xs">
                  <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span className="truncate">{item.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side: Quick Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {isUserTask ? (
            <>
              {/* Reschedule Button */}
              <button
                type="button"
                onClick={() => setShowReschedule(!showReschedule)}
                className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-glass-subtle transition-colors"
                title="Reschedule task"
                aria-label="Reschedule task"
              >
                <CalendarDays className="w-4 h-4" />
              </button>

              {/* Edit Button */}
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-glass-subtle transition-colors"
                  title="Edit item"
                  aria-label="Edit item"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}

              {/* Delete Button */}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  className="p-1.5 rounded-lg text-theme-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title="Delete item"
                  aria-label="Delete item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            <Link
              href={item.actionUrl}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-theme-accent hover:bg-theme-accent-subtle transition-colors"
              title="View in source module"
            >
              <span>View</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Reschedule inline drawer */}
      {showReschedule && (
        <div className="mt-3 pt-3 border-t border-theme-border flex items-center gap-2 animate-in fade-in">
          <span className="text-xs text-theme-text-secondary font-medium">
            Reschedule to:
          </span>
          <input
            type="date"
            value={rescheduleDate}
            onChange={(e) => setRescheduleDate(e.target.value)}
            className="h-8 px-2 rounded-lg border border-theme-border bg-theme-bg-elevated text-xs text-theme-text-primary focus:outline-hidden focus:ring-1 focus:ring-theme-accent"
          />
          <button
            type="button"
            onClick={handleRescheduleSubmit}
            disabled={isUpdating}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-theme-accent text-white hover:opacity-90"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setShowReschedule(false)}
            className="px-2 py-1 text-xs text-theme-text-muted hover:text-theme-text-primary"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
