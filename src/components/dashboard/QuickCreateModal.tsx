"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, FilePlus, BellPlus, CreditCard, Receipt, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { DOCUMENT_TYPES } from "@/lib/documents/constants";
import { PAYMENT_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/finance/constants";

export type QuickModalType = "document" | "reminder" | "payment" | "expense" | null;

interface QuickCreateModalProps {
  type: QuickModalType;
  onClose: () => void;
  userCurrency?: string;
}

export function QuickCreateModal({ type, onClose, userCurrency = "USD" }: QuickCreateModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("Passport");
  const [docExpiryDate, setDocExpiryDate] = useState("");
  const [docNumber, setDocNumber] = useState("");

  const [remTitle, setRemTitle] = useState("");
  const [remDueDate, setRemDueDate] = useState("");
  const [remPriority, setRemPriority] = useState("high");
  const [remCategory, setRemCategory] = useState("general");

  const [payTitle, setPayTitle] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDueDate, setPayDueDate] = useState("");
  const [payPayee, setPayPayee] = useState("");
  const [payCategory, setPayCategory] = useState("Electricity");

  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("Food");
  const [expSpentAt, setExpSpentAt] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (type) {
      setErrorMessage(null);
      setIsLoading(false);
    }
  }, [type]);

  if (!type) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    let endpoint = "";
    let payload: Record<string, unknown> = {};

    if (type === "document") {
      endpoint = "/api/documents";
      payload = {
        title: docTitle,
        category: docCategory,
        expiryDate: docExpiryDate || null,
        documentNumber: docNumber || null,
      };
    } else if (type === "reminder") {
      endpoint = "/api/reminders";
      payload = {
        title: remTitle,
        dueDate: remDueDate,
        priority: remPriority,
        category: remCategory,
      };
    } else if (type === "payment") {
      endpoint = "/api/payments";
      payload = {
        title: payTitle,
        amount: Number(payAmount),
        currency: userCurrency,
        dueDate: payDueDate,
        payee: payPayee || null,
        category: payCategory,
      };
    } else if (type === "expense") {
      endpoint = "/api/expenses";
      payload = {
        title: expTitle,
        amount: Number(expAmount),
        currency: userCurrency,
        category: expCategory,
        spentAt: expSpentAt,
      };
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save entry");
      }

      onClose();
      router.refresh();
    } catch (err: unknown) {
      console.error("[QuickCreateModal Submit Error]:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setIsLoading(false);
    }
  };

  const modalConfig = {
    document: {
      title: "Add Document",
      description: "Track passports, IDs, contracts, or insurance policies with expiry dates",
      icon: FilePlus,
      iconColor: "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60",
    },
    reminder: {
      title: "Add Reminder",
      description: "Set a critical task or deadline you must not forget",
      icon: BellPlus,
      iconColor: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60",
    },
    payment: {
      title: "Add Payment",
      description: "Record an upcoming bill or payment to prevent overdue fees",
      icon: CreditCard,
      iconColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60",
    },
    expense: {
      title: "Add Expense",
      description: "Record daily spending to keep track of your cash flow",
      icon: Receipt,
      iconColor: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60",
    },
  }[type];

  const Icon = modalConfig.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modalConfig.iconColor}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-headline" className="text-base font-semibold text-slate-900 dark:text-white">
                {modalConfig.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {modalConfig.description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <AlertBanner type="error" title="Validation Error" message={errorMessage} />
          )}

          {/* DOCUMENT FORM */}
          {type === "document" && (
            <>
              <Input
                label="Document Title"
                required
                placeholder="e.g. Passport, Driver License, Car Insurance"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {DOCUMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Expiry Date"
                  type="date"
                  value={docExpiryDate}
                  onChange={(e) => setDocExpiryDate(e.target.value)}
                />
              </div>

              <Input
                label="Document Number / ID (Optional)"
                placeholder="e.g. AB1234567"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
              />
            </>
          )}

          {/* REMINDER FORM */}
          {type === "reminder" && (
            <>
              <Input
                label="Reminder Title"
                required
                placeholder="e.g. Call dentist, Renew domain, Car service"
                value={remTitle}
                onChange={(e) => setRemTitle(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Due Date & Time"
                  type="datetime-local"
                  required
                  value={remDueDate}
                  onChange={(e) => setRemDueDate(e.target.value)}
                />

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Priority
                  </label>
                  <select
                    value={remPriority}
                    onChange={(e) => setRemPriority(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="urgent">🚨 Urgent (Must do today)</option>
                    <option value="high">⚠️ High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* PAYMENT FORM */}
          {type === "payment" && (
            <>
              <Input
                label="Payment / Bill Title"
                required
                placeholder="e.g. Electricity Bill, Rent, Credit Card"
                value={payTitle}
                onChange={(e) => setPayTitle(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={`Amount (${userCurrency})`}
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />

                <Input
                  label="Due Date"
                  type="date"
                  required
                  value={payDueDate}
                  onChange={(e) => setPayDueDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Payee / Provider (Optional)"
                  placeholder="e.g. Power Corp, Landlord"
                  value={payPayee}
                  onChange={(e) => setPayPayee(e.target.value)}
                />

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    value={payCategory}
                    onChange={(e) => setPayCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {PAYMENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* EXPENSE FORM */}
          {type === "expense" && (
            <>
              <Input
                label="Expense Description"
                required
                placeholder="e.g. Weekly Groceries, Fuel, Restaurant"
                value={expTitle}
                onChange={(e) => setExpTitle(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={`Amount (${userCurrency})`}
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                />

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Input
                label="Date"
                type="date"
                required
                value={expSpentAt}
                onChange={(e) => setExpSpentAt(e.target.value)}
              />
            </>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading} className="gap-2 px-5">
              <Save className="w-4 h-4" />
              <span>Save Record</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
