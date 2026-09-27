import { AttentionItem } from "@/types";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

interface AttentionRequiredProps {
  items?: AttentionItem[];
}

export function AttentionRequired({ items = [] }: AttentionRequiredProps) {
  const hasItems = items.length > 0;

  return (
    <section aria-labelledby="attention-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <h2
            id="attention-heading"
            className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight"
          >
            Attention Required
          </h2>
        </div>
        <Badge variant={hasItems ? "warning" : "success"}>
          {hasItems ? `${items.length} Pending` : "All Clear"}
        </Badge>
      </div>

      {!hasItems ? (
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
              No items require immediate attention
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              All documents, payment due dates, and reminders are up to date. You will be alerted whenever an expiry approaches.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.actionHref}
              className="flex items-center justify-between p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {item.subtitle} • Due {item.dueDate}
                  </p>
                </div>
              </div>
              <Badge variant="warning">Action Needed</Badge>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
