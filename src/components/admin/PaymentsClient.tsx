"use client";

import { useState } from "react";
import {
  Receipt,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  Ban,
  Shield,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface PaymentTransactionDTO {
  id: string;
  transactionId: string;
  customerName: string;
  customerEmail: string;
  plan: string;
  amount: number;
  currency: string;
  status: string; // "paid" | "failed" | "pending" | "pending_verification" | "refunded" | "cancelled"
  paymentProvider: string;
  paymentDate: string;
  failureReason?: string | null;
  utrNumber?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
}

interface PaymentsClientProps {
  initialPayments: PaymentTransactionDTO[];
}

export function PaymentsClient({ initialPayments }: PaymentsClientProps) {
  const [payments, setPayments] = useState<PaymentTransactionDTO[]>(initialPayments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Verification & Rejection State
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [rejectModalTx, setRejectModalTx] = useState<PaymentTransactionDTO | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleVerifyPayment = async (txId: string) => {
    try {
      setProcessingId(txId);
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch("/api/admin/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: txId, action: "verify" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to verify transaction");
      }

      setPayments((prev) =>
        prev.map((p) =>
          p.id === txId || p.transactionId === txId
            ? { ...p, status: "paid", failureReason: null }
            : p
        )
      );

      setActionSuccess(`Payment successfully verified! Customer subscription has been activated.`);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      console.error("Verification error:", err);
      setActionError(err.message || "Failed to verify transaction");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectPayment = async () => {
    if (!rejectModalTx) return;
    try {
      setProcessingId(rejectModalTx.id);
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch("/api/admin/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: rejectModalTx.id,
          action: "reject",
          rejectionReason: rejectReason.trim() || "Payment reference / UTR could not be verified.",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to reject transaction");
      }

      setPayments((prev) =>
        prev.map((p) =>
          p.id === rejectModalTx.id
            ? {
                ...p,
                status: "failed",
                failureReason: rejectReason.trim() || "Payment rejected by administrator.",
              }
            : p
        )
      );

      setRejectModalTx(null);
      setRejectReason("");
      setActionSuccess("Transaction marked as rejected.");
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      console.error("Rejection error:", err);
      setActionError(err.message || "Failed to reject transaction");
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = payments
    .filter((p) => {
      const matchSearch =
        search.trim() === "" ||
        p.customerName.toLowerCase().includes(search.toLowerCase()) ||
        p.customerEmail.toLowerCase().includes(search.toLowerCase()) ||
        p.transactionId.toLowerCase().includes(search.toLowerCase()) ||
        (p.utrNumber && p.utrNumber.toLowerCase().includes(search.toLowerCase()));

      const matchStatus =
        statusFilter === "ALL" || p.status.toLowerCase() === statusFilter.toLowerCase();

      const matchPlan =
        planFilter === "ALL" || p.plan.toLowerCase() === planFilter.toLowerCase();

      return matchSearch && matchStatus && matchPlan;
    })
    .sort((a, b) => {
      const diff = new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime();
      return sortOrder === "desc" ? diff : -diff;
    });

  const pendingVerificationCount = payments.filter(
    (p) => p.status === "pending_verification"
  ).length;

  const getStatusBadge = (t: PaymentTransactionDTO) => {
    switch (t.status.toLowerCase()) {
      case "paid":
      case "succeeded":
        return (
          <div className="space-y-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800">
              <CheckCircle className="w-3 h-3" />
              <span>PAID</span>
            </span>
            {t.utrNumber && (
              <span className="block text-[10px] font-mono text-slate-400">
                UTR: {t.utrNumber}
              </span>
            )}
          </div>
        );
      case "pending_verification":
        return (
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Clock className="w-3 h-3 animate-pulse" />
              <span>PENDING VERIFICATION</span>
            </span>
            {t.utrNumber && (
              <div className="text-[10px] font-mono text-amber-200">
                UTR: <span className="bg-amber-950/80 px-1 py-0.5 rounded border border-amber-800/80 font-bold">{t.utrNumber}</span>
              </div>
            )}
          </div>
        );
      case "failed":
        return (
          <div className="space-y-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/70 text-rose-400 border border-rose-800">
              <XCircle className="w-3 h-3" />
              <span>FAILED</span>
            </span>
            {t.failureReason && (
              <span className="block text-[10px] text-rose-400/80 max-w-[180px] truncate" title={t.failureReason}>
                {t.failureReason}
              </span>
            )}
          </div>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/70 text-amber-400 border border-amber-800">
            <Clock className="w-3 h-3" />
            <span>PENDING</span>
          </span>
        );
      case "refunded":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/70 text-blue-400 border border-blue-800">
            <RotateCcw className="w-3 h-3" />
            <span>REFUNDED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
            <Ban className="w-3 h-3" />
            <span>{t.status.toUpperCase()}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Verifications Alert Banner */}
      {pendingVerificationCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-300">
                {pendingVerificationCount} Manual Payment{pendingVerificationCount > 1 ? "s" : ""} Pending Review
              </h3>
              <p className="text-xs text-amber-200/70">
                Customer-submitted UPI transactions with UTR reference numbers waiting for admin bank verification.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-amber-500/50 text-amber-300 hover:bg-amber-500/20"
            onClick={() => setStatusFilter("pending_verification")}
          >
            View Pending ({pendingVerificationCount})
          </Button>
        </div>
      )}

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <Input
            type="text"
            placeholder="Search customer, email, UTR, or transaction ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 text-xs"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="pending_verification">Pending Verification (Manual UPI)</option>
            <option value="paid">Paid / Verified</option>
            <option value="failed">Failed / Declined</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Plans</option>
            <option value="free">Free Starter</option>
            <option value="premium">Life Pro Premium</option>
            <option value="family">Family Circle Plus</option>
          </select>
        </div>
      </div>

      {/* Security Note Banner */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>
            PCI-DSS Compliance Rule: Card numbers and CVV security codes are handled exclusively by payment processors and never stored in the database.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
          className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium shrink-0"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>Date: {sortOrder === "desc" ? "Newest First" : "Oldest First"}</span>
        </button>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method / Provider</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Transaction / UTR</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 space-y-1">
                    <Receipt className="w-8 h-8 mx-auto text-slate-600 opacity-60 mb-2" />
                    <p className="font-semibold text-slate-400">0 Payment Transactions Found</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Transactions will populate in real time once live payments or sandbox simulated checkouts are triggered.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-white">{t.customerName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{t.customerEmail}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 capitalize font-semibold text-white">
                      {t.plan}
                    </td>
                    <td className="py-3 px-4 font-bold text-white font-mono">
                      {t.currency} {t.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-300 uppercase text-[11px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                        {t.paymentProvider}
                      </span>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(t)}</td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <div className="font-semibold text-indigo-400 truncate max-w-[150px]" title={t.transactionId}>
                        {t.transactionId}
                      </div>
                      {t.notes && (
                        <div className="text-[10px] text-slate-500 truncate max-w-[150px]" title={t.notes}>
                          Note: {t.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(t.paymentDate).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {t.status === "pending_verification" ? (
                        <div className="flex items-center gap-1.5 justify-end">
                          <Button
                            size="sm"
                            variant="primary"
                            className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 shadow-md shadow-emerald-950"
                            disabled={processingId === t.id}
                            onClick={() => handleVerifyPayment(t.id)}
                          >
                            {processingId === t.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5" />
                            )}
                            <span>Verify</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] border-rose-800 text-rose-300 hover:bg-rose-950/60 font-semibold gap-1"
                            disabled={processingId === t.id}
                            onClick={() => {
                              setRejectModalTx(t);
                              setRejectReason("");
                            }}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">
                          No actions
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Payment Confirmation Modal */}
      {rejectModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Reject Payment Transaction</span>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalTx(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to reject transaction{" "}
              <strong className="text-white font-mono">{rejectModalTx.transactionId}</strong> from{" "}
              <strong className="text-white">{rejectModalTx.customerName}</strong> ({rejectModalTx.customerEmail})?
            </p>

            {rejectModalTx.utrNumber && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Customer Submitted UTR</p>
                <p className="font-mono text-amber-300 font-bold">{rejectModalTx.utrNumber}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400">
                Reason for Rejection (Visible to Customer / Audit Log):
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. UTR reference not found in bank statement, amount mismatch..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 min-h-[75px]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRejectModalTx(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={processingId === rejectModalTx.id}
                onClick={handleRejectPayment}
                className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold border-rose-600 gap-1.5"
              >
                {processingId === rejectModalTx.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>Confirm Rejection</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
