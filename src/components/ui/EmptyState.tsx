import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-10 text-center rounded-2xl border border-dashed border-slate-300/80 dark:border-white/[0.1] glass-subtle",
        className
      )}
    >
      <div className="w-13 h-13 rounded-2xl bg-white/80 dark:bg-white/[0.06] backdrop-blur-md border border-slate-200/80 dark:border-white/[0.1] flex items-center justify-center text-slate-500 dark:text-slate-400 mb-3.5 shadow-xs">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
        {title}
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 leading-relaxed">
        {description}
      </p>

      {actionText && (
        <div className="mt-4">
          {actionHref ? (
            <a
              href={actionHref}
              className="inline-flex items-center justify-center text-xs font-semibold px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-sm shadow-brand-500/20 active:scale-[0.98] transition-all"
            >
              {actionText}
            </a>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center justify-center text-xs font-semibold px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-sm shadow-brand-500/20 active:scale-[0.98] transition-all"
            >
              {actionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
