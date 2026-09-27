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
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { formatRegionalCurrency } from "@/lib/regions";

export interface PaymentTransactionDTO {
  id: string;
  transactionId: string;
  customerName: string;
  customerEmail: string;
  plan: string;
  amount: number;
  currency: string;
  status: string; // "paid" | "failed" | "pending" | "refunded" | "cancelled"
  paymentProvider: string;
  paymentDate: string;
}

interface PaymentsClientProps {
  initialPayments: PaymentTransactionDTO[];
}

export function PaymentsClient({ initialPayments }: PaymentsClientProps) {
  const [payments] = useState<PaymentTransactionDTO[]>(initialPayments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = payments.filter((p) => {
    const matchSearch =
      search.trim() === "" ||
      p.customerName.toLowerCase().includes(search.toLowerCase()) ||
      p.customerEmail.toLowerCase().includes(search.toLowerCase()) ||
      p.transactionId.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "ALL" || p.status.toLowerCase() === statusFilter.toLowerCase();

    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800">
            <CheckCircle className="w-3 h-3" />
            <span>PAID</span>
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/70 text-rose-400 border border-rose-800">
            <XCircle className="w-3 h-3" />
            <span>FAILED</span>
          </span>
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
            <span>{status.toUpperCase()}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <Input
            type="text"
            placeholder="Search customer, email, or transaction ID (e.g. txn_...)"
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
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Security Note Banner */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>
            PCI-DSS Compliance Rule: Card numbers, CVV security codes, and cardholder secrets are never received or stored on application servers.
          </span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 space-y-1">
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
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-400">
                      {t.transactionId}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-white">{t.customerName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{t.customerEmail}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 capitalize font-medium text-slate-300">
                      {t.plan}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {formatRegionalCurrency(t.amount, t.currency)}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(t.status)}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] uppercase">
                      {t.paymentProvider}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(t.paymentDate).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
