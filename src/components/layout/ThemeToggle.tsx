"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useCustomTheme } from "@/lib/theme/theme-context";
import { useTheme } from "next-themes";

export function ThemeToggle({ className }: { className?: string }) {
  const { themeConfig, setTheme: setCustomTheme } = useCustomTheme();
  const { setTheme: setNextTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-xl border border-theme-border glass-subtle animate-pulse ${
          className || ""
        }`}
      />
    );
  }

  const isDark = themeConfig.mode === "dark";

  const handleToggle = () => {
    if (isDark) {
      setCustomTheme("emerald-white");
      setNextTheme("light");
    } else {
      setCustomTheme("liquid-clear");
      setNextTheme("dark");
    }
  };

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={handleToggle}
      className={`p-2 rounded-xl border border-theme-border glass-subtle text-theme-text-primary hover:border-theme-accent/40 hover:bg-theme-accent-subtle transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-theme-accent ${
        className || ""
      }`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-theme-accent" />
      )}
    </button>
  );
}
