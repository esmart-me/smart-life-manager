"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert, FileWarning, DollarSign, Bell } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export interface AttentionItem {
  id: string;
  title: string;
  subtitle: string;
  dueDateText: string;
  type: "expired_document" | "expiring_document" | "critical_reminder" | "overdue_payment";
  urgency: "urgent" | "high" | "warning";
  actionHref: string;
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
      border: "border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20",
      iconColor: "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50",
    },
    overdue_payment: {
      badge: "OVERDUE",
      badgeVariant: "danger" as const,
      icon: DollarSign,
      border: "border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20",
      iconColor: "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50",
    },
    critical_reminder: {
      badge: "CRITICAL",
      badgeVariant: "warning" as const,
      icon: Bell,
      border: "border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20",
      iconColor: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50",
    },
    expiring_document: {
      badge: "EXPIRING SOON",
      badgeVariant: "warning" as const,
      icon: FileWarning,
      border: "border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20",
      iconColor: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50",
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
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Zero critical items requiring attention
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all hover:shadow-xs group ${config.border}`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${config.iconColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:underline">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {item.subtitle} • {item.dueDateText}
                    </p>
                  </div>
                </div>

                <Badge variant={config.badgeVariant} className="shrink-0 font-bold uppercase text-[10px]">
                  {config.badge}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
