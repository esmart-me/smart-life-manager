"use client";

import { useState, useEffect } from "react";
import { X, CreditCard, Calendar, Repeat, Tag, DollarSign, Building } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { PAYMENT_CATEGORIES, PAYMENT_FREQUENCIES, LOAN_CATEGORIES, PaymentFrequency } from "@/lib/finance/constants";

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
  // Loan / EMI fields (Phase 1)
  loanCategory?: string | null;
  bankName?: string | null;
  accountRef?: string | null;
  principalAmount?: number | string | null;
  interestRate?: number | string | null;
  totalTenureMonths?: number | string | null;
  paidTenureMonths?: number | string | null;
  loanStartDate?: string | null;
  loanClosingDate?: string | null;
  reminderLeadDays?: number | string | null;
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

  // Loan EMI states (Phase 1)
  const [loanCategory, setLoanCategory] = useState("home");
  const [bankName, setBankName] = useState("");
  const [accountRef, setAccountRef] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [totalTenureMonths, setTotalTenureMonths] = useState("");
  const [paidTenureMonths, setPaidTenureMonths] = useState("0");
  const [loanStartDate, setLoanStartDate] = useState("");
  const [loanClosingDate, setLoanClosingDate] = useState("");
  const [reminderLeadDays, setReminderLeadDays] = useState("3");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatDateInput = (dateStr?: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setPayee(initialData.payee || "");
      setAmount(initialData.amount !== undefined ? String(initialData.amount) : "");
      setCurrency(initialData.currency || userCurrency);
      setCategory(initialData.category || "Other");
      setFrequency((initialData.frequency as PaymentFrequency) || (initialData.isRecurring ? "monthly" : "none"));
      setNotes(initialData.notes || "");
      setLoanCategory(initialData.loanCategory || "home");
      setBankName(initialData.bankName || "");
      setAccountRef(initialData.accountRef || "");
      setPrincipalAmount(initialData.principalAmount !== undefined && initialData.principalAmount !== null ? String(initialData.principalAmount) : "");
      setInterestRate(initialData.interestRate !== undefined && initialData.interestRate !== null ? String(initialData.interestRate) : "");
      setTotalTenureMonths(initialData.totalTenureMonths !== undefined && initialData.totalTenureMonths !== null ? String(initialData.totalTenureMonths) : "");
      setPaidTenureMonths(initialData.paidTenureMonths !== undefined && initialData.paidTenureMonths !== null ? String(initialData.paidTenureMonths) : "0");
      setLoanStartDate(formatDateInput(initialData.loanStartDate));
      setLoanClosingDate(formatDateInput(initialData.loanClosingDate));
      setReminderLeadDays(initialData.reminderLeadDays !== undefined && initialData.reminderLeadDays !== null ? String(initialData.reminderLeadDays) : "3");

      if (initialData.dueDate) {
        setDueDate(formatDateInput(initialData.dueDate));
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
      setLoanCategory("home");
      setBankName("");
      setAccountRef("");
      setPrincipalAmount("");
      setInterestRate("");
      setTotalTenureMonths("");
      setPaidTenureMonths("0");
      setLoanStartDate("");
      setLoanClosingDate("");
      setReminderLeadDays("3");

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
      const payload: Record<string, unknown> = {
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

      if (category === "Loan EMI") {
        payload.loanCategory = loanCategory;
        payload.bankName = bankName.trim() || null;
        payload.accountRef = accountRef.trim() || null;
        payload.principalAmount = principalAmount !== "" ? Number(principalAmount) : null;
        payload.interestRate = interestRate !== "" ? Number(interestRate) : null;
        payload.totalTenureMonths = totalTenureMonths !== "" ? Number(totalTenureMonths) : null;
        payload.paidTenureMonths = paidTenureMonths !== "" ? Number(paidTenureMonths) : 0;
        payload.loanStartDate = loanStartDate ? new Date(loanStartDate).toISOString() : null;
        payload.loanClosingDate = loanClosingDate ? new Date(loanClosingDate).toISOString() : null;
        payload.reminderLeadDays = reminderLeadDays !== "" ? Number(reminderLeadDays) : 3;
      }

      const endpoint = isEditing ? `/api/payments/${initialData?.id}` : "/api/payments";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save payment.");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("[PaymentForm Submit Error]:", err);
      setErrorMessage(err instanceof Error ? err.message : "Network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg glass-elevated border border-theme-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-modal-pop">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border glass-panel">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-theme-accent-subtle text-theme-accent border border-theme-accent/20 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-theme-text-primary">
                {isEditing ? "Edit Payment Reminder" : "Add Payment Reminder"}
              </h2>
              <p className="text-xs text-theme-text-muted">
                Track due dates and ensure recurring bills never get missed.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-glass-subtle transition-colors"
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

          {/* Loan / EMI Specific Fields (Phase 1) */}
          {category === "Loan EMI" && (
            <div className="p-4 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-emerald-200/50 dark:border-emerald-800/30 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Loan & EMI Schedule Parameters
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Tenure & Cutoff Tracking
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Loan Type
                  </label>
                  <select
                    value={loanCategory}
                    onChange={(e) => setLoanCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {LOAN_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Lending Bank / Institution
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. HDFC, Chase, Emirates NBD"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Loan Account Ref
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. LN-9842"
                    value={accountRef}
                    onChange={(e) => setAccountRef(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Principal Amount
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 50000"
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Annual Interest Rate (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 7.5"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Total EMIs / Tenures
                  </label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 60"
                    value={totalTenureMonths}
                    onChange={(e) => setTotalTenureMonths(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Paid EMIs Count
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 12"
                    value={paidTenureMonths}
                    onChange={(e) => setPaidTenureMonths(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Remaining EMIs
                  </label>
                  <Input
                    type="text"
                    disabled
                    value={
                      totalTenureMonths && !isNaN(Number(totalTenureMonths))
                        ? Math.max(0, Number(totalTenureMonths) - Number(paidTenureMonths || 0))
                        : "N/A"
                    }
                    className="bg-slate-100 dark:bg-slate-800 font-semibold cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Loan Start Date
                  </label>
                  <input
                    type="date"
                    value={loanStartDate}
                    onChange={(e) => setLoanStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Loan Closing Date (Cutoff)
                  </label>
                  <input
                    type="date"
                    value={loanClosingDate}
                    onChange={(e) => setLoanClosingDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

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
              isLoading={isSubmitting}
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
