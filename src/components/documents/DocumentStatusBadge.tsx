import React from "react";
import { CheckCircle2, Clock, AlertTriangle, AlertOctagon, HelpCircle } from "lucide-react";
import { DocumentStatusInfo } from "@/lib/documents/status";

interface DocumentStatusBadgeProps {
  statusInfo: DocumentStatusInfo;
  showCountdown?: boolean;
  size?: "sm" | "md";
}

export function DocumentStatusBadge({
  statusInfo,
  showCountdown = true,
  size = "md",
}: DocumentStatusBadgeProps) {
  const { status, label, countdownText } = statusInfo;

  let bgClass = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  let IconComponent = HelpCircle;
  let iconClass = "text-slate-500";

  switch (status) {
    case "VALID":
      bgClass = "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60";
      IconComponent = CheckCircle2;
      iconClass = "text-emerald-600 dark:text-emerald-400";
      break;
    case "EXPIRING_SOON":
      bgClass = "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60";
      IconComponent = Clock;
      iconClass = "text-amber-600 dark:text-amber-400";
      break;
    case "CRITICAL":
      bgClass = "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 animate-pulse";
      IconComponent = AlertTriangle;
      iconClass = "text-rose-600 dark:text-rose-400";
      break;
    case "EXPIRED":
      bgClass = "bg-red-100 text-red-900 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800";
      IconComponent = AlertOctagon;
      iconClass = "text-red-600 dark:text-red-400";
      break;
  }

  const isSmall = size === "sm";

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span
        className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-md border ${bgClass} ${
          isSmall ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
        }`}
      >
        <IconComponent className={isSmall ? "w-3 h-3 " + iconClass : "w-3.5 h-3.5 " + iconClass} />
        <span>{label}</span>
      </span>

      {showCountdown && countdownText && (
        <span
          className={`font-medium ${
            status === "EXPIRED"
              ? "text-red-600 dark:text-red-400 font-semibold"
              : status === "CRITICAL"
              ? "text-rose-600 dark:text-rose-400 font-semibold"
              : status === "EXPIRING_SOON"
              ? "text-amber-700 dark:text-amber-400 font-medium"
              : "text-slate-500 dark:text-slate-400"
          } ${isSmall ? "text-[11px]" : "text-xs"}`}
        >
          {countdownText}
        </span>
      )}
    </div>
  );
}
