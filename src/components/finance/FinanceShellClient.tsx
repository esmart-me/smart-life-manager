"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PieChart, CreditCard, Receipt, Plus, Settings, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BudgetStatusInfo } from "@/lib/finance/calculations";
import { BudgetOverviewTab } from "./BudgetOverviewTab";
import { PaymentListTab, PaymentItem } from "./PaymentListTab";
import { ExpenseListTab, ExpenseItem } from "./ExpenseListTab";
import { PaymentFormModal, PaymentFormData } from "./PaymentFormModal";
import { ExpenseFormModal, ExpenseFormData } from "./ExpenseFormModal";
import { BudgetConfigModal } from "./BudgetConfigModal";

type ActiveTab = "overview" | "payments" | "expenses";

interface FinanceShellClientProps {
  initialPayments: PaymentItem[];
  initialExpenses: ExpenseItem[];
  initialBudgets: Array<{ category: string; limitAmount: number; currency: string }>;
  initialAnalytics: BudgetStatusInfo;
  userCurrency: string;
}

export function FinanceShellClient({
  initialPayments,
  initialExpenses,
  initialBudgets,
  initialAnalytics,
  userCurrency,
}: FinanceShellClientProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  // Modals state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentFormData | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseFormData | null>(null);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  function handleRefresh() {
    router.refresh();
  }

  function handleOpenAddPayment() {
    setSelectedPayment(null);
    setIsPaymentModalOpen(true);
  }

  function handleOpenEditPayment(payment: PaymentFormData) {
    setSelectedPayment(payment);
    setIsPaymentModalOpen(true);
  }

  function handleOpenAddExpense() {
    setSelectedExpense(null);
    setIsExpenseModalOpen(true);
  }

  function handleOpenEditExpense(expense: ExpenseFormData) {
    setSelectedExpense(expense);
    setIsExpenseModalOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Finance Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Finance & Bill Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time budget tracking, payment reminders with recurring cycles, and expense ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsBudgetModalOpen(true)}
            className="text-xs inline-flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Budget Targets</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenAddPayment}
            className="text-xs inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Add Bill</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenAddExpense}
            className="text-xs inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Log Expense</span>
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-xs font-semibold inline-flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "overview"
              ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Budget & Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("payments")}
          className={`pb-3 text-xs font-semibold inline-flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "payments"
              ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Bills & Payments ({initialPayments.filter((p) => !p.isPaid).length} due)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("expenses")}
          className={`pb-3 text-xs font-semibold inline-flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "expenses"
              ? "border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Expense Tracker ({initialExpenses.length})</span>
        </button>

        <Link
          href="/subscriptions"
          className="pb-3 text-xs font-semibold inline-flex items-center gap-2 border-b-2 border-transparent text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Subscriptions Vault</span>
        </Link>
      </div>

      {/* Tab Panels */}
      {activeTab === "overview" && (
        <BudgetOverviewTab
          analytics={initialAnalytics}
          userCurrency={userCurrency}
          onOpenConfig={() => setIsBudgetModalOpen(true)}
          onAddExpense={handleOpenAddExpense}
        />
      )}

      {activeTab === "payments" && (
        <PaymentListTab
          payments={initialPayments}
          userCurrency={userCurrency}
          onAddPayment={handleOpenAddPayment}
          onEditPayment={handleOpenEditPayment}
          onRefresh={handleRefresh}
        />
      )}

      {activeTab === "expenses" && (
        <ExpenseListTab
          expenses={initialExpenses}
          userCurrency={userCurrency}
          onAddExpense={handleOpenAddExpense}
          onEditExpense={handleOpenEditExpense}
          onRefresh={handleRefresh}
        />
      )}

      {/* Modals */}
      <PaymentFormModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={handleRefresh}
        initialData={selectedPayment}
        userCurrency={userCurrency}
      />

      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={handleRefresh}
        initialData={selectedExpense}
        userCurrency={userCurrency}
      />

      <BudgetConfigModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        onSuccess={handleRefresh}
        initialBudgets={initialBudgets}
        userCurrency={userCurrency}
      />
    </div>
  );
}
