"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert, FileWarning, DollarSign, Bell, Car } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export interface AttentionItem {
  id: string;
  title: string;
  subtitle: string;
  dueDateText: string;
  type: "expired_document" | "expiring_document" | "critical_reminder" | "overdue_payment" | "vehicle_alert";
  urgency: "urgent" | "high" | "warning";
  actionHref: string;
  customBadge?: string;
}

interface AttentionRequiredProps {
  items: AttentionItem[];
}

export function AttentionRequired({ items }: AttentionRequiredProps) {
  const hasItems = items.length > 0;

  const itemConfig = {
    expired_document: {
      badge: "EXPIRED",
      badgeVariant: "danger" as const,
      icon: FileWarning,
      border: "border-rose-300/60 dark:border-rose-500/25 bg-rose-50/70 dark:bg-rose-950/25 hover:border-rose-400",
      iconColor: "text-rose-600 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-900/50 border border-rose-300/40 dark:border-rose-700/40",
    },
    overdue_payment: {
      badge: "OVERDUE",
      badgeVariant: "danger" as const,
      icon: DollarSign,
      border: "border-rose-300/60 dark:border-rose-500/25 bg-rose-50/70 dark:bg-rose-950/25 hover:border-rose-400",
      iconColor: "text-rose-600 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-900/50 border border-rose-300/40 dark:border-rose-700/40",
    },
    vehicle_alert: {
      badge: "VEHICLE ALERT",
      badgeVariant: "danger" as const,
      icon: Car,
      border: "border-rose-300/60 dark:border-rose-500/25 bg-rose-50/70 dark:bg-rose-950/25 hover:border-rose-400",
      iconColor: "text-rose-600 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-900/50 border border-rose-300/40 dark:border-rose-700/40",
    },
    critical_reminder: {
      badge: "CRITICAL",
      badgeVariant: "warning" as const,
      icon: Bell,
      border: "border-amber-300/60 dark:border-amber-500/25 bg-amber-50/70 dark:bg-amber-950/25 hover:border-amber-400",
      iconColor: "text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-900/50 border border-amber-300/40 dark:border-amber-700/40",
    },
    expiring_document: {
      badge: "EXPIRING SOON",
      badgeVariant: "warning" as const,
      icon: FileWarning,
      border: "border-amber-300/60 dark:border-amber-500/25 bg-amber-50/70 dark:bg-amber-950/25 hover:border-amber-400",
      iconColor: "text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-900/50 border border-amber-300/40 dark:border-amber-700/40",
    },
  };

  return (
    <section aria-labelledby="attention-heading" className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasItems && <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />}
          <h2
            id="attention-heading"
            className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white"
          >
            Attention Required
          </h2>
        </div>
        <Badge variant={hasItems ? "danger" : "success"}>
          {hasItems ? `${items.length} Requires Action` : "All Clear"}
        </Badge>
      </div>

      {!hasItems ? (
        <div className="p-5 rounded-2xl glass-card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
              Zero critical items requiring attention
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              All documents, payment due dates, and reminders are current. Smart Life Manager is monitoring your deadlines.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const config = itemConfig[item.type] || itemConfig.critical_reminder;
            const Icon = config.icon;

            return (
              <Link
                key={item.id}
                href={item.actionHref}
                className={`flex items-center justify-between p-3.5 rounded-2xl border backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md group ${config.border}`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${config.iconColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:underline">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {item.subtitle} • {item.dueDateText}
                    </p>
                  </div>
                </div>

                <Badge
                  variant={item.urgency === "urgent" ? "danger" : item.urgency === "warning" ? "warning" : config.badgeVariant}
                  className="shrink-0 font-bold uppercase text-[10px]"
                >
                  {item.customBadge || config.badge}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

