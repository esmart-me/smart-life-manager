"use client";

import { useState, useEffect } from "react";
import { X, Layers } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface CreditCardEmiFormData {
  id?: string;
  cardId: string;
  merchant: string;
  totalAmount: number;
  monthlyEmi: number;
  interestRate?: number | null;
  tenureMonths: number;
  paidMonths: number;
  startDate?: string;
  notes?: string | null;
}

interface CreditCardEmiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cardId: string;
  cardName: string;
  initialData?: CreditCardEmiFormData | null;
}

export function CreditCardEmiModal({
  isOpen,
  onClose,
  onSuccess,
  cardId,
  cardName,
  initialData,
}: CreditCardEmiModalProps) {
  const [merchant, setMerchant] = useState("");
  const [totalAmount, setTotalAmount] = useState<number | "">("");
  const [monthlyEmi, setMonthlyEmi] = useState<number | "">("");
  const [interestRate, setInterestRate] = useState<number | "">("");
  const [tenureMonths, setTenureMonths] = useState<number>(12);
  const [paidMonths, setPaidMonths] = useState<number>(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setMerchant(initialData.merchant);
      setTotalAmount(initialData.totalAmount);
      setMonthlyEmi(initialData.monthlyEmi);
      setInterestRate(initialData.interestRate ?? "");
      setTenureMonths(initialData.tenureMonths || 12);
      setPaidMonths(initialData.paidMonths || 0);
      setStartDate(
        initialData.startDate
          ? new Date(initialData.startDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setNotes(initialData.notes || "");
    } else {
      setMerchant("");
      setTotalAmount("");
      setMonthlyEmi("");
      setInterestRate("");
      setTenureMonths(12);
      setPaidMonths(0);
      setStartDate(new Date().toISOString().split("T")[0]);
      setNotes("");
    }
    setError(null);
  }, [initialData, isOpen]);

  // Auto calculate monthly EMI if totalAmount and tenureMonths are present
  function handleTotalAmountChange(val: string) {
    const num = val === "" ? "" : Number(val);
    setTotalAmount(num);
    if (typeof num === "number" && num > 0 && tenureMonths > 0) {
      setMonthlyEmi(Math.round((num / tenureMonths) * 100) / 100);
    }
  }

  function handleTenureChange(val: number) {
    setTenureMonths(val);
    if (typeof totalAmount === "number" && totalAmount > 0 && val > 0) {
      setMonthlyEmi(Math.round((totalAmount / val) * 100) / 100);
    }
  }

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!merchant.trim() || totalAmount === "" || monthlyEmi === "" || !tenureMonths) {
      setError("Please fill out all required fields (Merchant, Total Amount, Monthly EMI, Tenure).");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        cardId,
        merchant: merchant.trim(),
        totalAmount: Number(totalAmount),
        monthlyEmi: Number(monthlyEmi),
        interestRate: interestRate === "" ? null : Number(interestRate),
        tenureMonths: Number(tenureMonths),
        paidMonths: Number(paidMonths),
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        notes: notes.trim() || null,
      };

      const url = initialData?.id
        ? `/api/finance/credit-cards/emis/${initialData.id}`
        : "/api/finance/credit-cards/emis";

      const method = initialData?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save credit card EMI");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("[CreditCardEmi Submit Error]:", err);
      setError(err instanceof Error ? err.message : "Network error saving EMI");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {initialData?.id ? "Edit Card EMI" : "Add Card EMI"}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Linked to {cardName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Purchase Item / Merchant *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. iPhone 15 Pro, Flight Tickets, Laptop"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Total Purchase Amount *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                placeholder="e.g. 1200"
                value={totalAmount}
                onChange={(e) => handleTotalAmountChange(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Monthly EMI Amount *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                placeholder="e.g. 100"
                value={monthlyEmi}
                onChange={(e) => setMonthlyEmi(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Total Tenures (Mos) *
              </label>
              <select
                value={tenureMonths}
                onChange={(e) => handleTenureChange(Number(e.target.value))}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {[3, 6, 9, 12, 18, 24, 36, 48, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} mos
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Paid So Far (Mos)
              </label>
              <input
                type="number"
                min="0"
                max={tenureMonths}
                value={paidMonths}
                onChange={(e) => setPaidMonths(Math.min(tenureMonths, Math.max(0, Number(e.target.value))))}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Interest Rate (%)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 14"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. No-cost EMI offer"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? "Saving..." : initialData?.id ? "Save Changes" : "Add EMI"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
