"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, LogOut, Search, Sparkles } from "lucide-react";
import { SessionUser } from "@/types";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";
import { NotificationBellDropdown } from "@/components/notifications/NotificationBellDropdown";
import { performCustomerLogout } from "@/lib/auth/client-logout";

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
    await performCustomerLogout();
  };

  return (
    <>
      <header className="sticky top-0 z-20 h-16 glass-panel border-b border-theme-border px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 shadow-xs">
        {/* Mobile Brand / Page Title */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link href="/" className="lg:hidden flex items-center gap-1.5 sm:gap-2">
            <div className="w-8 h-8 rounded-xl btn-theme-accent flex items-center justify-center text-white border border-white/20 shadow-theme-glow shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-xs sm:text-sm text-theme-text-primary truncate max-w-[80px] sm:max-w-none">
              Smart Life
            </span>
          </Link>

          {title && (
            <h1 className="hidden lg:block text-base font-semibold text-theme-text-primary tracking-tight">
              {title}
            </h1>
          )}
        </div>

        {/* Global Search Bar (Quick Command Palette Trigger) */}
        <div className="flex-1 max-w-md mx-1 sm:mx-4 min-w-0">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full h-9 px-3 rounded-xl border border-theme-border glass-subtle hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-text-primary text-xs flex items-center justify-between transition-all shadow-2xs group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-theme-text-muted group-hover:text-theme-accent transition-colors" />
              <span className="hidden sm:inline">Search anything across records...</span>
              <span className="sm:hidden">Search...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md glass-subtle border border-theme-border text-theme-text-muted shadow-2xs">
              <span>Ctrl</span> K
            </kbd>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <NotificationBellDropdown />
          <ThemeToggle />

          <div className="lg:hidden">
            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              className="p-2 text-theme-text-muted hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-theme-glass-subtle transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-theme-border">
            <Link
              href="/premium"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-theme-accent bg-theme-accent-subtle border border-theme-accent/30 hover:bg-theme-accent-subtle hover:border-theme-accent/50 transition-all shadow-2xs group active:scale-[0.98]"
              title="View Subscription Plans"
            >
              <Sparkles className="w-3 h-3 text-theme-accent group-hover:rotate-12 transition-transform" />
              <span>Plans</span>
            </Link>
            <span className="text-xs font-medium text-theme-text-secondary">
              {user.displayName || user.email}
            </span>
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-theme-accent-subtle text-theme-accent border border-theme-accent/30">
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
