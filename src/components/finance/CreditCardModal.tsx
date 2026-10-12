"use client";

import { useState, useEffect } from "react";
import { X, CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ISO_CURRENCIES } from "@/lib/regions";

export interface CreditCardFormData {
  id?: string;
  cardName: string;
  bank: string;
  network: string;
  lastFour: string;
  creditLimit: number;
  currentBalance: number;
  statementDay: number;
  dueDay: number;
  minimumDue?: number;
  totalDue?: number;
  currency: string;
  notes?: string | null;
}

interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: CreditCardFormData | null;
  defaultCurrency?: string;
}

export function CreditCardModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  defaultCurrency = "USD",
}: CreditCardModalProps) {
  const [cardName, setCardName] = useState("");
  const [bank, setBank] = useState("");
  const [network, setNetwork] = useState("Visa");
  const [lastFour, setLastFour] = useState("");
  const [creditLimit, setCreditLimit] = useState<number | "">("");
  const [currentBalance, setCurrentBalance] = useState<number | "">("");
  const [statementDay, setStatementDay] = useState<number>(1);
  const [dueDay, setDueDay] = useState<number>(20);
  const [minimumDue, setMinimumDue] = useState<number | "">("");
  const [totalDue, setTotalDue] = useState<number | "">("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setCardName(initialData.cardName);
      setBank(initialData.bank);
      setNetwork(initialData.network || "Visa");
      setLastFour(initialData.lastFour);
      setCreditLimit(initialData.creditLimit);
      setCurrentBalance(initialData.currentBalance || 0);
      setStatementDay(initialData.statementDay || 1);
      setDueDay(initialData.dueDay || 20);
      setMinimumDue(initialData.minimumDue ?? 0);
      setTotalDue(initialData.totalDue ?? 0);
      setCurrency(initialData.currency || defaultCurrency);
      setNotes(initialData.notes || "");
    } else {
      setCardName("");
      setBank("");
      setNetwork("Visa");
      setLastFour("");
      setCreditLimit("");
      setCurrentBalance(0);
      setStatementDay(1);
      setDueDay(20);
      setMinimumDue(0);
      setTotalDue(0);
      setCurrency(defaultCurrency);
      setNotes("");
    }
    setError(null);
  }, [initialData, defaultCurrency, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanFour = lastFour.replace(/\D/g, "");
    if (cleanFour.length !== 4) {
      setError("Please provide exactly 4 digits for Card Number (Last 4 digits).");
      return;
    }

    if (!cardName.trim() || !bank.trim() || creditLimit === "") {
      setError("Please fill out all required fields (Card Name, Bank, Credit Limit).");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        cardName: cardName.trim(),
        bank: bank.trim(),
        network,
        lastFour: cleanFour,
        creditLimit: Number(creditLimit),
        currentBalance: Number(currentBalance || 0),
        statementDay: Number(statementDay),
        dueDay: Number(dueDay),
        minimumDue: Number(minimumDue || 0),
        totalDue: Number(totalDue || 0),
        currency,
        notes: notes.trim() || null,
      };

      const url = initialData?.id
        ? `/api/finance/credit-cards/${initialData.id}`
        : "/api/finance/credit-cards";

      const method = initialData?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save credit card");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("[CreditCard Submit Error]:", err);
      setError(err instanceof Error ? err.message : "Network error saving credit card");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {initialData?.id ? "Edit Credit Card" : "Add Credit Card"}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Track limits, statement cycles, minimum dues, and linked EMIs safely.
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Privacy Notice */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[11px]">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <strong className="font-semibold">Zero-Knowledge Security:</strong> Only the last 4 digits are stored to help identify your card. We never ask for or store full card numbers, expiration dates, or CVV codes.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Card Nickname *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sapphire Preferred, Regalia Gold"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Issuing Bank *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Chase, HDFC Bank, Amex, Citi"
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Network
              </label>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Visa">Visa</option>
                <option value="Mastercard">Mastercard</option>
                <option value="Amex">American Express</option>
                <option value="RuPay">RuPay</option>
                <option value="Discover">Discover</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Last 4 Digits *
              </label>
              <input
                type="text"
                maxLength={4}
                required
                placeholder="4 digits (e.g. 8492)"
                value={lastFour}
                onChange={(e) => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {ISO_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Total Credit Limit *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                placeholder="e.g. 5000"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Current Outstanding Balance
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 1250"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Statement & Due Dates */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Billing Cycle & Payment Dates
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Statement Generation Day
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Every</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={statementDay}
                    onChange={(e) => setStatementDay(Math.min(31, Math.max(1, Number(e.target.value))))}
                    className="w-16 px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center text-slate-900 dark:text-white"
                  />
                  <span className="text-xs text-slate-500">th of month</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Payment Due Day
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Every</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(Math.min(31, Math.max(1, Number(e.target.value))))}
                    className="w-16 px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center text-slate-900 dark:text-white"
                  />
                  <span className="text-xs text-slate-500">th of month</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Latest Total Due Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Optional"
                  value={totalDue}
                  onChange={(e) => setTotalDue(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Minimum Due Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Optional"
                  value={minimumDue}
                  onChange={(e) => setMinimumDue(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes or Rewards Details (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 5x points on dining, lounge access 2/quarter..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? "Saving..." : initialData?.id ? "Save Changes" : "Add Credit Card"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
