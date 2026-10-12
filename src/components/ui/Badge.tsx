import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline" | "gold" | "emerald" | "accent";
}

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default:
      "bg-slate-100/80 dark:bg-slate-800/60 backdrop-blur-xs text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/[0.08]",
    accent:
      "bg-theme-accent-subtle backdrop-blur-xs text-theme-accent border-theme-accent shadow-2xs font-semibold",
    success:
      "bg-emerald-500/10 dark:bg-emerald-400/10 backdrop-blur-xs text-emerald-700 dark:text-emerald-300 border-emerald-500/25 dark:border-emerald-400/20",
    warning:
      "bg-amber-500/10 dark:bg-amber-400/10 backdrop-blur-xs text-amber-700 dark:text-amber-300 border-amber-500/25 dark:border-amber-400/20",
    danger:
      "bg-rose-500/10 dark:bg-rose-400/10 backdrop-blur-xs text-rose-700 dark:text-rose-300 border-rose-500/25 dark:border-rose-400/20",
    info:
      "bg-sky-500/10 dark:bg-sky-400/10 backdrop-blur-xs text-sky-700 dark:text-sky-300 border-sky-500/25 dark:border-sky-400/20",
    outline:
      "bg-white/40 dark:bg-white/[0.03] backdrop-blur-xs border-slate-300/80 dark:border-white/[0.12] text-slate-700 dark:text-slate-300",
    gold:
      "bg-theme-accent-subtle backdrop-blur-xs text-theme-accent border-theme-accent shadow-2xs",
    emerald:
      "bg-theme-accent-subtle backdrop-blur-xs text-theme-accent border-theme-accent shadow-2xs",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
