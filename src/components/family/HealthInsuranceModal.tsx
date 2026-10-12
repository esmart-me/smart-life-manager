"use client";

import { useState, useEffect } from "react";
import { X, ShieldCheck, Calendar, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface HealthInsuranceFormData {
  id?: string;
  policyName: string;
  provider: string;
  policyNumber: string;
  sumInsured: number;
  premiumAmount: number;
  premiumFrequency: string;
  startDate: string;
  expiryDate: string;
  coveredMembers?: string | null;
  tpaContact?: string | null;
  cashlessHospitals?: string | null;
  notes?: string | null;
  status?: string;
}

interface HealthInsuranceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: HealthInsuranceFormData | null;
}

export function HealthInsuranceModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: HealthInsuranceModalProps) {
  const [policyName, setPolicyName] = useState("");
  const [provider, setProvider] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [sumInsured, setSumInsured] = useState<number | "">("");
  const [premiumAmount, setPremiumAmount] = useState<number | "">("");
  const [premiumFrequency, setPremiumFrequency] = useState("yearly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [coveredMembers, setCoveredMembers] = useState("");
  const [tpaContact, setTpaContact] = useState("");
  const [cashlessHospitals, setCashlessHospitals] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setPolicyName(initialData.policyName);
      setProvider(initialData.provider);
      setPolicyNumber(initialData.policyNumber);
      setSumInsured(initialData.sumInsured);
      setPremiumAmount(initialData.premiumAmount || 0);
      setPremiumFrequency(initialData.premiumFrequency || "yearly");
      setStartDate(
        initialData.startDate
          ? new Date(initialData.startDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setExpiryDate(
        initialData.expiryDate
          ? new Date(initialData.expiryDate).toISOString().split("T")[0]
          : ""
      );
      setCoveredMembers(initialData.coveredMembers || "");
      setTpaContact(initialData.tpaContact || "");
      setCashlessHospitals(initialData.cashlessHospitals || "");
      setNotes(initialData.notes || "");
    } else {
      setPolicyName("");
      setProvider("");
      setPolicyNumber("");
      setSumInsured("");
      setPremiumAmount("");
      setPremiumFrequency("yearly");
      setStartDate(new Date().toISOString().split("T")[0]);
      // Default expiry date 1 year from now
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setExpiryDate(nextYear.toISOString().split("T")[0]);
      setCoveredMembers("");
      setTpaContact("");
      setCashlessHospitals("");
      setNotes("");
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!policyName.trim() || !provider.trim() || !policyNumber.trim() || sumInsured === "" || !expiryDate) {
      setError("Please fill out all required fields (Policy Name, Provider, Policy #, Sum Insured, Renewal Date).");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        policyName: policyName.trim(),
        provider: provider.trim(),
        policyNumber: policyNumber.trim(),
        sumInsured: Number(sumInsured),
        premiumAmount: Number(premiumAmount || 0),
        premiumFrequency,
        startDate: new Date(startDate).toISOString(),
        expiryDate: new Date(expiryDate).toISOString(),
        coveredMembers: coveredMembers.trim() || null,
        tpaContact: tpaContact.trim() || null,
        cashlessHospitals: cashlessHospitals.trim() || null,
        notes: notes.trim() || null,
      };

      const url = initialData?.id
        ? `/api/family/insurance/${initialData.id}`
        : "/api/family/insurance";

      const method = initialData?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save health insurance policy");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("[HealthInsurance Submit Error]:", err);
      setError(err instanceof Error ? err.message : "Network error saving insurance policy");
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
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {initialData?.id ? "Edit Health Insurance Policy" : "Add Health Insurance Policy"}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Track family floater or individual policies, renewal countdowns, and TPA support.
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Plan / Policy Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Star Comprehensive Family Floater, Bupa Gold"
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Insurance Provider *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Star Health, BlueCross, Cigna, Aetna"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Policy / Member ID # *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. POL-98472910"
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Sum Insured (Coverage Amount) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                placeholder="e.g. 500000"
                value={sumInsured}
                onChange={(e) => setSumInsured(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Premium Amount
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 1200"
                value={premiumAmount}
                onChange={(e) => setPremiumAmount(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Premium Frequency
              </label>
              <select
                value={premiumFrequency}
                onChange={(e) => setPremiumFrequency(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="yearly">Yearly (Annual)</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Policy Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Renewal Expiry Date *
              </label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Covered Family Members
            </label>
            <input
              type="text"
              placeholder="e.g. Self, Spouse, Child 1, Child 2"
              value={coveredMembers}
              onChange={(e) => setCoveredMembers(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                TPA / 24x7 Helpline Phone
              </label>
              <input
                type="tel"
                placeholder="e.g. 1800-425-2255"
                value={tpaContact}
                onChange={(e) => setTpaContact(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Cashless Hospitals Notes
              </label>
              <input
                type="text"
                placeholder="e.g. City General, Metro Hospital within 5km"
                value={cashlessHospitals}
                onChange={(e) => setCashlessHospitals(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Policy Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. No claim bonus 20%, Maternity covered after 2 years..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
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
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {loading ? "Saving..." : initialData?.id ? "Save Changes" : "Save Insurance Policy"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
