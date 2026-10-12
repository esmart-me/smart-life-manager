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
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-theme-border shadow-lg pb-[env(safe-area-inset-bottom,0px)]"
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
                "flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all duration-150 select-none active:scale-[0.95]",
                isActive
                  ? "text-theme-accent font-semibold"
                  : "text-theme-text-muted hover:text-theme-text-primary"
              )}
            >
              <div
                className={cn(
                  "p-1.5 rounded-xl transition-all",
                  isActive && "bg-theme-accent-subtle text-theme-accent scale-105 border border-theme-accent/30 shadow-2xs"
                )}
              >
                <Icon className="w-4.5 h-4.5" />
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
