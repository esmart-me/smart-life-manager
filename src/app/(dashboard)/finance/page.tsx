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
  const validTabs = ["overview", "payments", "credit-cards", "investments", "expenses"];
  const initialTab = validTabs.includes(params.tab || "")
    ? (params.tab as "overview" | "payments" | "credit-cards" | "investments" | "expenses")
    : "overview";

  const [profile, rawPayments, rawExpenses, budgets, rawCreditCards, rawInvestments] = await Promise.all([
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
    prisma.creditCard.findMany({
      where: { userId: user.id },
      include: {
        emis: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.investment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const userCurrency = profile?.currency || "USD";
  const now = new Date();

  // Attach real calculated payment statuses
  const payments: PaymentItem[] = rawPayments.map((p) => {
    const isLoanClosed =
      p.category === "Loan / EMI" &&
      Boolean(p.totalTenureMonths && p.paidTenureMonths && p.paidTenureMonths >= p.totalTenureMonths);
    return {
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
      status: calculatePaymentStatus(p.dueDate, p.isPaid, now, isLoanClosed),
      loanCategory: p.loanCategory,
      bankName: p.bankName,
      accountRef: p.accountRef,
      principalAmount: p.principalAmount,
      interestRate: p.interestRate,
      totalTenureMonths: p.totalTenureMonths,
      paidTenureMonths: p.paidTenureMonths,
      loanStartDate: p.loanStartDate ? p.loanStartDate.toISOString() : null,
      loanClosingDate: p.loanClosingDate ? p.loanClosingDate.toISOString() : null,
      reminderLeadDays: p.reminderLeadDays,
    };
  });

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

  // Format credit cards & investments
  const creditCards = rawCreditCards.map((c) => ({
    ...c,
    emis: c.emis.map((emi) => ({
      ...emi,
      startDate: emi.startDate.toISOString(),
    })),
  }));

  const investments = rawInvestments.map((i) => ({
    ...i,
    sipStartDate: i.sipStartDate ? i.sipStartDate.toISOString() : null,
    sipEndDate: i.sipEndDate ? i.sipEndDate.toISOString() : null,
    lastValuationDate: i.lastValuationDate ? i.lastValuationDate.toISOString() : null,
  }));

  return (
    <FinanceShellClient
      initialPayments={payments}
      initialExpenses={expenses}
      initialCreditCards={creditCards}
      initialInvestments={investments}
      initialBudgets={budgets}
      initialAnalytics={analytics}
      userCurrency={userCurrency}
      initialTab={initialTab}
    />
  );
}
