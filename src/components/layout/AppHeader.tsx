"use client";

import Link from "next/link";
import { ShieldCheck, LogOut } from "lucide-react";
import { SessionUser } from "@/types";
import { ThemeToggle } from "./ThemeToggle";

interface AppHeaderProps {
  user: SessionUser;
  title?: string;
}

export function AppHeader({ user, title }: AppHeaderProps) {
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
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
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {user.displayName || user.email}
          </span>
          <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300">
            {user.role}
          </span>
        </div>
      </div>
    </header>
  );
}
