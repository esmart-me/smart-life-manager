import { NavItem, QuickActionItem } from "@/types";

export const APP_CONFIG = {
  name: "Smart Life Manager",
  tagline: "Never miss an important expiry date, payment, or life event.",
  version: "0.1.0",
  cookieName: "slm_session",
  adminCookieName: "slm_admin_session",
  sessionMaxAge: 60 * 60 * 24 * 30, // 30 days in seconds (persistent session)
};

// Main Mobile Navigation (Home, Documents, Reminders, Finance, More)
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", iconName: "Home", exact: true },
  { label: "Documents", href: "/documents", iconName: "FileText" },
  { label: "Reminders", href: "/reminders", iconName: "Bell" },
  { label: "Finance", href: "/finance", iconName: "Wallet" },
  { label: "More", href: "/more", iconName: "Grid" },
];

// Desktop Sidebar Primary Navigation
export const DESKTOP_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", iconName: "LayoutDashboard", exact: true },
  { label: "AI Assistant", href: "/assistant", iconName: "Sparkles" },
  { label: "Documents & Expiries", href: "/documents", iconName: "FileText" },
  { label: "Reminders & Tasks", href: "/reminders", iconName: "Bell" },
  { label: "Finance & Bills", href: "/finance", iconName: "Wallet" },
  { label: "Reports & Analytics", href: "/reports", iconName: "BarChart3" },
  { label: "Subscriptions", href: "/subscriptions", iconName: "RefreshCw" },
  { label: "Vehicles & Assets", href: "/more/vehicles", iconName: "Car" },
  { label: "Important Dates", href: "/more/dates", iconName: "Calendar" },
  { label: "Global Search", href: "/search", iconName: "Search" },
  { label: "Family Circle", href: "/more/family", iconName: "Users" },
  { label: "Utilities & Tools", href: "/utilities", iconName: "Calculator" },
];

export const DESKTOP_SECONDARY_NAV: NavItem[] = [
  { label: "Plans & Pricing", href: "/premium", iconName: "Sparkles" },
  { label: "My Profile", href: "/profile", iconName: "User" },
  { label: "Settings", href: "/settings", iconName: "Settings" },
];

// Dashboard Quick Actions (Pre-configured for Phase 1 shell)
export const DASHBOARD_QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: "add_document",
    title: "Add Document",
    description: "Passport, ID, Insurance, Contracts",
    href: "/documents",
    iconName: "FilePlus",
    colorVariant: "primary",
  },
  {
    id: "add_reminder",
    title: "New Reminder",
    description: "Tasks, renewals & alerts",
    href: "/reminders",
    iconName: "BellPlus",
    colorVariant: "amber",
  },
  {
    id: "log_payment",
    title: "Record Payment",
    description: "Upcoming bills & expenses",
    href: "/finance",
    iconName: "CreditCard",
    colorVariant: "emerald",
  },
  {
    id: "add_date",
    title: "Important Date",
    description: "Anniversaries & milestones",
    href: "/more/dates",
    iconName: "CalendarPlus",
    colorVariant: "sky",
  },
];
