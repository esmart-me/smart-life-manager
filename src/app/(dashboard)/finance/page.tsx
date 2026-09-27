import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Wallet, CreditCard, DollarSign, Shield, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export default async function FinancePage() {
  const user = await requireUser();

  const [payments, expenses, subscriptions] = await Promise.all([
    prisma.payment.findMany({ where: { userId: user.id }, take: 5 }),
    prisma.expense.findMany({ where: { userId: user.id }, take: 5 }),
    prisma.subscription.findMany({ where: { userId: user.id }, take: 5 }),
  ]);

  const hasAnyRecords = payments.length > 0 || expenses.length > 0 || subscriptions.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Finance & Bills
            </h1>
            <Badge variant="outline">Planned for Upcoming Phase</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track upcoming bill due dates, expenses, subscriptions, and financial peace of mind.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="Module will be active in an upcoming phase"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600/50 text-white cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Entry (Planned)</span>
          </button>
        </div>
      </div>

      {!hasAnyRecords ? (
        <div className="space-y-6">
          <EmptyState
            icon={Wallet}
            title="Finance & Ledger is Planned for an Upcoming Phase"
            description="In an upcoming phase, this module will provide complete payment schedules, ledger tracking, and recurring bill reminders. For now, payments and expenses can be logged directly from the Dashboard Quick Actions."
          />

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Architectural Preparedness
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Payments & Bills:</strong> `Payment` entity handles upcoming bills, payee tracking, and due date indexing.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Expenses & Budgets:</strong> `Expense` and `Budget` entities support categorization and threshold warnings.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Subscriptions:</strong> `Subscription` model tracks recurring billing cycles, renewals, and cost trends.
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500">Records will display here.</p>
        </div>
      )}
    </div>
  );
}
