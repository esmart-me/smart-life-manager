import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculatePaymentStatus, calculateBudgetAnalytics } from "@/lib/finance/calculations";
import { FinanceShellClient } from "@/components/finance/FinanceShellClient";
import { PaymentItem } from "@/components/finance/PaymentListTab";
import { ExpenseItem } from "@/components/finance/ExpenseListTab";

export const dynamic = "force-dynamic";

export default async function FinancePage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const params = searchParams ? await searchParams : {};
  const initialTab =
    params.tab === "expenses" ? "expenses" : params.tab === "payments" ? "payments" : "overview";

  const [profile, rawPayments, rawExpenses, budgets] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId: user.id },
      select: { currency: true },
    }),
    prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { dueDate: "asc" },
    }),
    prisma.expense.findMany({
      where: { userId: user.id },
      orderBy: { spentAt: "desc" },
    }),
    prisma.budget.findMany({
      where: { userId: user.id },
    }),
  ]);

  const userCurrency = profile?.currency || "USD";
  const now = new Date();

  // Attach real calculated payment statuses
  const payments: PaymentItem[] = rawPayments.map((p) => ({
    id: p.id,
    title: p.title,
    payee: p.payee,
    amount: p.amount,
    currency: p.currency,
    dueDate: p.dueDate.toISOString(),
    category: p.category,
    isRecurring: p.isRecurring,
    frequency: p.frequency,
    notes: p.notes,
    isPaid: p.isPaid,
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    status: calculatePaymentStatus(p.dueDate, p.isPaid, now),
  }));

  // Format expenses
  const expenses: ExpenseItem[] = rawExpenses.map((e) => ({
    id: e.id,
    title: e.title,
    amount: e.amount,
    currency: e.currency,
    category: e.category,
    spentAt: e.spentAt.toISOString(),
    paymentMethod: e.paymentMethod,
    notes: e.notes,
    receiptUrl: e.receiptUrl,
  }));

  // Calculate live budget analytics
  const analytics = calculateBudgetAnalytics(
    budgets,
    rawExpenses.map((e) => ({
      category: e.category,
      amount: e.amount,
      spentAt: e.spentAt,
    })),
    now
  );

  return (
    <FinanceShellClient
      initialPayments={payments}
      initialExpenses={expenses}
      initialBudgets={budgets}
      initialAnalytics={analytics}
      userCurrency={userCurrency}
      initialTab={initialTab}
    />
  );
}
