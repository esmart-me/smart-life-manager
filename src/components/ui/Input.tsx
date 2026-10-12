import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            "w-full px-3.5 py-2 text-base sm:text-sm min-h-[42px] rounded-xl border glass-input text-theme-text-primary placeholder:text-theme-text-muted transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/25 focus-visible:border-theme-accent",
            error
              ? "border-rose-400 dark:border-rose-700/80 focus-visible:ring-rose-500/25 focus-visible:border-rose-500"
              : "border-theme-border hover:border-theme-accent/40",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
