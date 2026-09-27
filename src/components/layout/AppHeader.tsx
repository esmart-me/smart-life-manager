"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, LogOut, Search, Sparkles } from "lucide-react";
import { SessionUser } from "@/types";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";

interface AppHeaderProps {
  user: SessionUser;
  title?: string;
}

export function AppHeader({ user, title }: AppHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global Ctrl+K / Cmd+K / "/" keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an existing input or textarea
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === "/" && !isInput) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-20 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Mobile Brand / Page Title */}
        <div className="flex items-center gap-3">
          <Link href="/" className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm text-slate-900 dark:text-white">
              Smart Life
            </span>
          </Link>

          {title && (
            <h1 className="hidden lg:block text-base font-semibold text-slate-900 dark:text-white">
              {title}
            </h1>
          )}
        </div>

        {/* Global Search Bar (Quick Command Palette Trigger) */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xs flex items-center justify-between transition-colors shadow-2xs group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500 transition-colors" />
              <span className="hidden sm:inline">Search anything across records...</span>
              <span className="sm:hidden">Search...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 shadow-2xs">
              <span>Ctrl</span> K
            </kbd>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5">
          <ThemeToggle />

          <div className="lg:hidden">
            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              className="p-2 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <Link
              href="/premium"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 hover:bg-brand-100 transition-colors"
              title="View Subscription Plans"
            >
              <Sparkles className="w-3 h-3 text-brand-500" />
              <span>Plans</span>
            </Link>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {user.displayName || user.email}
            </span>
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300">
              {user.role}
            </span>
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
