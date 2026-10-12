"use client";

import React from "react";
import {
  Car,
  FileText,
  Shield,
  CreditCard,
  Bell,
  Sparkles,
  Receipt,
  Wallet,
  CheckCircle2,
  FileCheck,
  Plane,
  IdCard,
} from "lucide-react";

/**
 * VEHICLES: Premium vehicle visual with subtle drive-in and settle animation.
 */
export function VehicleHeroVisual({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-[#063B2E]/10 to-[#0B4A3A]/20 border border-[#063B2E]/20 text-[#063B2E] dark:text-[#C5A059] transition-transform duration-500 ease-out hover:scale-105 ${className}`}
    >
      <Car className="w-6 h-6 animate-pulse" />
      <div className="absolute -bottom-1 w-6 h-1 bg-black/10 dark:bg-white/10 rounded-full blur-[1px]" />
    </div>
  );
}

/**
 * DOCUMENTS: Categorized luxury document badges for Passport, ID, Driving Licence,
 * Visa, Insurance, Vehicle Registration, Work Permit, Other.
 */
export type DocumentCategoryType =
  | "passport"
  | "id"
  | "license"
  | "visa"
  | "insurance"
  | "vehicle_registration"
  | "work_permit"
  | "other";

export function DocumentTypeBadge({
  category,
  label,
  className = "",
}: {
  category: DocumentCategoryType | string;
  label?: string;
  className?: string;
}) {
  const norm = (category || "").toLowerCase();

  let Icon = FileText;
  let bgClass = "bg-stone-100 text-stone-800 border-stone-200";
  let defaultLabel = "Document";

  if (norm.includes("passport")) {
    Icon = Plane;
    bgClass = "bg-emerald-900/10 text-[#063B2E] dark:text-emerald-300 border-emerald-900/20";
    defaultLabel = "Passport";
  } else if (norm.includes("id") || norm.includes("national")) {
    Icon = IdCard;
    bgClass = "bg-amber-900/10 text-amber-900 dark:text-amber-200 border-amber-900/20";
    defaultLabel = "ID Card";
  } else if (norm.includes("licen") || norm.includes("driver")) {
    Icon = FileCheck;
    bgClass = "bg-blue-900/10 text-blue-900 dark:text-blue-200 border-blue-900/20";
    defaultLabel = "Driving Licence";
  } else if (norm.includes("visa")) {
    Icon = Plane;
    bgClass = "bg-teal-900/10 text-teal-900 dark:text-teal-200 border-teal-900/20";
    defaultLabel = "Visa";
  } else if (norm.includes("insur")) {
    Icon = Shield;
    bgClass = "bg-purple-900/10 text-purple-900 dark:text-purple-200 border-purple-900/20";
    defaultLabel = "Insurance";
  } else if (norm.includes("reg") || norm.includes("vehic")) {
    Icon = Car;
    bgClass = "bg-indigo-900/10 text-indigo-900 dark:text-indigo-200 border-indigo-900/20";
    defaultLabel = "Registration";
  } else if (norm.includes("permit") || norm.includes("work")) {
    Icon = FileText;
    bgClass = "bg-emerald-900/10 text-[#0B4A3A] dark:text-emerald-300 border-emerald-900/20";
    defaultLabel = "Work Permit";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-200 hover:shadow-xs ${bgClass} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{label || defaultLabel}</span>
    </span>
  );
}

/**
 * EXPENSES: Receipt & wallet luxury visual accents.
 */
export function ExpenseReceiptVisual({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#063B2E]/10 text-[#063B2E] dark:text-[#C5A059] border border-[#063B2E]/15 text-xs font-medium ${className}`}
    >
      <Receipt className="w-3.5 h-3.5" />
      <span>Receipt Verified</span>
    </div>
  );
}

/**
 * REMINDERS: Bell animation for reminder triggers and alerts.
 */
export function ReminderBellVisual({
  active = false,
  className = "",
}: {
  active?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative inline-flex items-center justify-center p-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 transition-all ${
        active ? "animate-bounce" : ""
      } ${className}`}
    >
      <Bell className="w-4 h-4" />
      {active && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
      )}
    </div>
  );
}

/**
 * AI: Subtle floating badge with champagne-gold shimmer.
 */
export function AiFloatingBadge({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#063B2E] to-[#0B4A3A] text-white text-xs font-medium shadow-sm shadow-[#063B2E]/20 transition-all hover:shadow-md hover:scale-[1.02] ${className}`}
    >
      <Sparkles className="w-3.5 h-3.5 text-[#C5A059] animate-spin" style={{ animationDuration: "8s" }} />
      <span>Smart Life AI</span>
    </div>
  );
}
