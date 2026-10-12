"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Bell,
  Wallet,
  Car,
  Calendar,
  Users,
  Settings,
  User,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  LucideIcon,
  RefreshCw,
  BarChart3,
  Search,
  Sparkles,
  Calculator,
} from "lucide-react";
import { DESKTOP_NAV_ITEMS, DESKTOP_SECONDARY_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { SessionUser } from "@/types";
import { ThemeToggle } from "./ThemeToggle";
import { performCustomerLogout } from "@/lib/auth/client-logout";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  FileText,
  Bell,
  Wallet,
  BarChart3,
  RefreshCw,
  Car,
  Calendar,
  Search,
  Users,
  Settings,
  User,
  Sparkles,
  Calculator,
};

interface DesktopSidebarProps {
  user: SessionUser;
}

export function DesktopSidebar({ user }: DesktopSidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await performCustomerLogout();
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-theme-border glass-panel h-screen sticky top-0 shrink-0 z-30 select-none shadow-xs">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-theme-border">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl btn-theme-accent flex items-center justify-center text-white border border-white/20 shadow-theme-glow transition-all">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-theme-text-primary block leading-none">
              Smart Life
            </span>
            <span className="text-[10px] text-theme-accent font-semibold tracking-wider uppercase">
              Manager
            </span>
          </div>
        </Link>
        <ThemeToggle />
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="px-3 text-[10px] font-semibold text-theme-text-muted uppercase tracking-wider mb-2">
            Workspace
          </p>
          <nav className="space-y-1">
            {DESKTOP_NAV_ITEMS.map((item) => {
              const Icon = ICON_MAP[item.iconName] || LayoutDashboard;
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 active:scale-[0.98]",
                    isActive
                      ? "bg-theme-accent-subtle text-theme-accent font-semibold border border-theme-accent/30 shadow-2xs"
                      : "text-theme-text-secondary hover:bg-theme-glass-subtle hover:text-theme-text-primary hover:border-theme-border border border-transparent"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      isActive
                        ? "text-theme-accent"
                        : "text-theme-text-muted"
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* System & Preferences */}
        <div>
          <p className="px-3 text-[10px] font-semibold text-theme-text-muted uppercase tracking-wider mb-2">
            Preferences
          </p>
          <nav className="space-y-1">
            {DESKTOP_SECONDARY_NAV.map((item) => {
              const Icon = ICON_MAP[item.iconName] || Settings;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 active:scale-[0.98]",
                    isActive
                      ? "bg-theme-accent-subtle text-theme-accent font-semibold border border-theme-accent/30 shadow-2xs"
                      : "text-theme-text-secondary hover:bg-theme-glass-subtle hover:text-theme-text-primary hover:border-theme-border border border-transparent"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      isActive
                        ? "text-theme-accent"
                        : "text-theme-text-muted"
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Monetization Upgrade Card */}
      <div className="px-3 pb-2">
        <Link
          href="/premium"
          className="block p-3 rounded-xl bg-theme-accent-subtle border border-theme-accent/30 hover:border-theme-accent/50 backdrop-blur-xs transition-all group shadow-2xs hover:shadow-theme-glow active:scale-[0.98]"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-theme-accent group-hover:rotate-12 transition-transform" />
            <span className="text-[11px] font-bold text-theme-accent">
              Upgrade to Life Pro
            </span>
          </div>
          <p className="text-[10px] text-theme-text-muted leading-tight">
            Unlimited docs, family sharing &amp; cloud sync
          </p>
        </Link>
      </div>

      {/* User Footer Profile & Logout */}
      <div className="p-3 border-t border-theme-border">
        <div className="flex items-center justify-between p-2 rounded-xl glass-subtle border border-theme-border shadow-2xs">
          <Link
            href="/profile"
            className="min-w-0 pr-2 flex-1 group"
            title="View Profile"
          >
            <p className="text-xs font-semibold text-theme-text-primary truncate group-hover:text-theme-accent transition-colors">
              {user.displayName || "My Account"}
            </p>
            <p className="text-[11px] text-theme-text-muted truncate">
              {user.email}
            </p>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            aria-label="Log out"
            className="p-1.5 text-theme-text-muted hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-theme-glass-subtle transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>

  );
}
