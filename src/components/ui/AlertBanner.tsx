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
    info: "bg-sky-500/10 dark:bg-sky-500/15 backdrop-blur-md border-sky-400/30 dark:border-sky-500/25 text-sky-900 dark:text-sky-200 shadow-xs",
    success: "bg-emerald-500/10 dark:bg-emerald-500/15 backdrop-blur-md border-emerald-400/30 dark:border-emerald-500/25 text-emerald-900 dark:text-emerald-200 shadow-xs",
    warning: "bg-amber-500/10 dark:bg-amber-500/15 backdrop-blur-md border-amber-400/30 dark:border-amber-500/25 text-amber-900 dark:text-amber-200 shadow-xs",
    error: "bg-rose-500/10 dark:bg-rose-500/15 backdrop-blur-md border-rose-400/30 dark:border-rose-500/25 text-rose-900 dark:text-rose-200 shadow-xs",
  };

  const Icon = icons[type];

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 p-3.5 rounded-xl border text-xs relative transition-all",
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
          className="text-current opacity-70 hover:opacity-100 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
