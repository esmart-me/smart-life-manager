import { prisma } from "@/lib/db/prisma";
import { PaymentsClient, PaymentTransactionDTO } from "@/components/admin/PaymentsClient";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const transactions = await prisma.billingTransaction.findMany({
    orderBy: { paymentDate: "desc" },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });

  const paymentDTOs: PaymentTransactionDTO[] = transactions.map((t) => ({
    id: t.id,
    transactionId: t.transactionId,
    customerName:
      t.user.profile?.displayName ||
      `${t.user.profile?.firstName || ""} ${t.user.profile?.lastName || ""}`.trim() ||
      t.user.email.split("@")[0],
    customerEmail: t.user.email,
    plan: t.plan,
    amount: t.amount,
    currency: t.currency,
    status: t.status,
    paymentProvider: t.paymentProvider,
    paymentDate: t.paymentDate.toISOString(),
    failureReason: t.failureReason,
  }));

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Payments & Transactions Ledger
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Complete ledger of verified customer subscription payments, failed transactions, and refunds.
        </p>
      </div>

      <PaymentsClient initialPayments={paymentDTOs} />
    </div>
  );
}
