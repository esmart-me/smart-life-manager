import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "glass" | "gold" | "emerald" | "accent";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-180 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]";

    const variants = {
      primary:
        "btn-theme-accent shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2",
      accent:
        "btn-theme-accent shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2",
      secondary:
        "bg-slate-100/90 dark:bg-slate-800/80 backdrop-blur-sm text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700/90 border border-slate-200/60 dark:border-white/[0.06] focus-visible:ring-slate-400 active:scale-[0.98]",
      outline:
        "border border-slate-300/80 dark:border-white/[0.12] bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/[0.08] focus-visible:ring-2 active:scale-[0.98]",
      ghost:
        "bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-white/[0.06] focus-visible:ring-slate-400 active:scale-[0.98]",
      danger:
        "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-sm shadow-rose-600/25 active:scale-[0.98] focus-visible:ring-rose-500 border border-rose-400/20",
      glass:
        "bg-white/80 dark:bg-white/[0.08] backdrop-blur-md border border-slate-200/80 dark:border-white/[0.12] text-slate-800 dark:text-slate-100 hover:bg-white/95 dark:hover:bg-white/[0.15] hover:border-white/30 shadow-xs focus-visible:ring-2 active:scale-[0.98]",
      gold:
        "btn-theme-accent shadow-md active:scale-[0.98] border border-white/20",
      emerald:
        "btn-theme-accent shadow-md active:scale-[0.98] border border-white/20",
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5 min-h-[36px] sm:min-h-0 gap-1.5",
      md: "text-sm px-4 py-2 min-h-[44px] gap-2",
      lg: "text-base px-5 py-2.5 min-h-[48px] gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
