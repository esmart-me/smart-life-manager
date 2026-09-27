"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, Bell, Wallet, Grid, LucideIcon } from "lucide-react";
import { MOBILE_NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const MOBILE_ICONS: Record<string, LucideIcon> = {
  Home,
  FileText,
  Bell,
  Wallet,
  Grid,
};

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = MOBILE_ICONS[item.iconName] || Home;
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all duration-150 select-none",
                isActive
                  ? "text-brand-600 dark:text-brand-400 font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <div
                className={cn(
                  "p-1 rounded-lg transition-transform",
                  isActive && "bg-brand-50 dark:bg-brand-950/60 scale-105"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
