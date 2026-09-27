"use client";

import { useState, useEffect } from "react";
import { X, CreditCard, Calendar, Repeat, Tag, DollarSign, Building } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { PAYMENT_CATEGORIES, PAYMENT_FREQUENCIES, PaymentFrequency } from "@/lib/finance/constants";

export interface PaymentFormData {
  id?: string;
  title: string;
  payee?: string | null;
  amount: number | string;
  currency?: string;
  dueDate: string;
  category?: string;
  frequency?: string | null;
  isRecurring?: boolean;
  notes?: string | null;
  isPaid?: boolean;
}

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: PaymentFormData | null;
  userCurrency?: string;
}

export function PaymentFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  userCurrency = "USD",
}: PaymentFormModalProps) {
  const isEditing = Boolean(initialData?.id);

  const [title, setTitle] = useState("");
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(userCurrency);
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("Other");
  const [frequency, setFrequency] = useState<PaymentFrequency>("none");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setPayee(initialData.payee || "");
      setAmount(initialData.amount !== undefined ? String(initialData.amount) : "");
      setCurrency(initialData.currency || userCurrency);
      setCategory(initialData.category || "Other");
      setFrequency((initialData.frequency as PaymentFrequency) || (initialData.isRecurring ? "monthly" : "none"));
      setNotes(initialData.notes || "");

      if (initialData.dueDate) {
        const d = new Date(initialData.dueDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        setDueDate(`${yyyy}-${mm}-${dd}`);
      } else {
        setDueDate("");
      }
    } else {
      // Default for new payment
      setTitle("");
      setPayee("");
      setAmount("");
      setCurrency(userCurrency);
      setCategory("Electricity");
      setFrequency("monthly");
      setNotes("");

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      setDueDate(`${yyyy}-${mm}-${dd}`);
    }
    setErrorMessage(null);
  }, [initialData, isOpen, userCurrency]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("Please enter a payment name.");
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage("Please enter a valid positive amount.");
      return;
    }

    if (!dueDate) {
      setErrorMessage("Please select a due date.");
      return;
    }

    setIsSubmitting(true);

    try {
      const isRecurring = frequency !== "none";
      const payload = {
        title: title.trim(),
        payee: payee.trim() || null,
        amount: numAmount,
        currency,
        dueDate: new Date(dueDate).toISOString(),
        category,
        isRecurring,
        frequency: isRecurring ? frequency : null,
        notes: notes.trim() || null,
      };

      const endpoint = isEditing ? `/api/payments/${initialData?.id}` : "/api/payments";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || "Failed to save payment.");
        setIsSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("[PaymentForm Submit Error]:", err);
      setErrorMessage("Network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {isEditing ? "Edit Payment Reminder" : "Add Payment Reminder"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track due dates and ensure recurring bills never get missed.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <AlertBanner type="error" title="Validation Error" message={errorMessage} />
          )}

          {/* Payment Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Payment Name <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. Home Internet Bill, Apartment Rent, Car Loan"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Amount <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-medium text-slate-400">
                  <DollarSign className="w-3.5 h-3.5" />
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Currency
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold uppercase text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Due Date & Payee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Due Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Payee / Biller (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400">
                  <Building className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. DEWA, Etisalat, Landlord"
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Category & Recurring Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {PAYMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Recurring Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as PaymentFrequency)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {PAYMENT_FREQUENCIES.map((freq) => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {frequency !== "none" && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 shrink-0" />
              <span>When marked as paid, the next {frequency} cycle will be automatically scheduled.</span>
            </p>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Account number, payment link or reminder note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update Payment" : "Save Payment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
