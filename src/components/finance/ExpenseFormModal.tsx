"use client";

import { useState, useEffect, useRef } from "react";
import { X, Receipt, Calendar, DollarSign, Tag, Upload, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertBanner } from "@/components/ui/AlertBanner";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  ExpenseCategory,
  ExpensePaymentMethod,
  ALLOWED_RECEIPT_TYPES,
  MAX_RECEIPT_SIZE_BYTES,
} from "@/lib/finance/constants";

export interface ExpenseFormData {
  id?: string;
  title: string;
  amount: number | string;
  currency?: string;
  category?: string;
  spentAt?: string;
  date?: string;
  paymentMethod?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
}

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: ExpenseFormData | null;
  userCurrency?: string;
}

export function ExpenseFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  userCurrency = "USD",
}: ExpenseFormModalProps) {
  const isEditing = Boolean(initialData?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(userCurrency);
  const [spentAt, setSpentAt] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Food");
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>("Credit Card");
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setAmount(initialData.amount !== undefined ? String(initialData.amount) : "");
      setCurrency(initialData.currency || userCurrency);
      setCategory((initialData.category as ExpenseCategory) || "Food");
      setPaymentMethod((initialData.paymentMethod as ExpensePaymentMethod) || "Credit Card");
      setNotes(initialData.notes || "");
      setExistingReceiptUrl(initialData.receiptUrl || null);
      setReceiptFile(null);

      const dateField = initialData.spentAt || initialData.date;
      if (dateField) {
        const d = new Date(dateField);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        setSpentAt(`${yyyy}-${mm}-${dd}`);
      } else {
        setSpentAt("");
      }
    } else {
      setTitle("");
      setAmount("");
      setCurrency(userCurrency);
      setCategory("Food");
      setPaymentMethod("Credit Card");
      setNotes("");
      setExistingReceiptUrl(null);
      setReceiptFile(null);

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      setSpentAt(`${yyyy}-${mm}-${dd}`);
    }
    setErrorMessage(null);
  }, [initialData, isOpen, userCurrency]);

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_RECEIPT_TYPES.includes(file.type)) {
      setErrorMessage("Receipt must be an image (PNG, JPEG, WebP) or PDF file.");
      return;
    }

    if (file.size > MAX_RECEIPT_SIZE_BYTES) {
      setErrorMessage("Receipt size must not exceed 10MB.");
      return;
    }

    setErrorMessage(null);
    setReceiptFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("Please enter an expense description.");
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage("Please enter a valid positive amount.");
      return;
    }

    if (!spentAt) {
      setErrorMessage("Please select a date.");
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = isEditing ? `/api/expenses/${initialData?.id}` : "/api/expenses";
      const method = isEditing ? "PUT" : "POST";

      let res: Response;

      if (receiptFile) {
        const formData = new FormData();
        formData.append("title", title.trim());
        formData.append("amount", String(numAmount));
        formData.append("currency", currency);
        formData.append("category", category);
        formData.append("spentAt", new Date(spentAt).toISOString());
        formData.append("paymentMethod", paymentMethod);
        if (notes.trim()) formData.append("notes", notes.trim());
        formData.append("receipt", receiptFile);

        res = await fetch(endpoint, {
          method,
          body: formData,
        });
      } else {
        const payload = {
          title: title.trim(),
          amount: numAmount,
          currency,
          category,
          spentAt: new Date(spentAt).toISOString(),
          paymentMethod,
          notes: notes.trim() || null,
        };

        res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save expense.");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("[ExpenseForm Submit Error]:", err);
      setErrorMessage(err instanceof Error ? err.message : "Network error occurred. Please try again.");
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
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {isEditing ? "Edit Expense" : "Log New Expense"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track your real daily and monthly expenditure with optional receipts.
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

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. Grocery shopping, Fuel refill, Team lunch"
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
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold uppercase text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Date & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={spentAt}
                onChange={(e) => setSpentAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {EXPENSE_PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Receipt File Upload */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Receipt Attachment (Optional)
            </label>

            {receiptFile ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/30">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                    {receiptFile.name} ({(receiptFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptFile(null)}
                  className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : existingReceiptUrl ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Existing receipt on file
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-medium text-sky-600 hover:underline"
                >
                  Replace Receipt
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-500 rounded-xl p-4 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Click to attach receipt (Image or PDF)
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WebP, PDF up to 10MB</p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Store or merchant details, transaction remarks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
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
              className="bg-sky-600 hover:bg-sky-700 text-white"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update Expense" : "Save Expense"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
