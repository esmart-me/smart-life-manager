import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

export interface AlertBannerProps {
  type?: "info" | "success" | "warning" | "error";
  title?: string;
  message: string;
  className?: string;
  onDismiss?: () => void;
}

export function AlertBanner({
  type = "info",
  title,
  message,
  className,
  onDismiss,
}: AlertBannerProps) {
  const icons = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    error: AlertCircle,
  };

  const styles = {
    info: "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200",
    success: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200",
    warning: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
    error: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200",
  };

  const Icon = icons[type];

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 p-3.5 rounded-lg border text-xs relative",
        styles[type],
        className
      )}
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 pr-2">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <p className="leading-relaxed">{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-current opacity-70 hover:opacity-100 p-0.5 rounded transition-opacity"
          aria-label="Dismiss alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
