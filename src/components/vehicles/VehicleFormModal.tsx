"use client";

import { useState, useEffect } from "react";
import { X, Car, Calendar, Gauge, Shield, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertBanner } from "@/components/ui/AlertBanner";

export interface VehicleFormData {
  id?: string;
  name: string;
  make?: string | null;
  model?: string | null;
  year?: number | string | null;
  licensePlate?: string | null;
  vin?: string | null;
  mileage?: number | string | null;
  nextServiceMileage?: number | string | null;
  insuranceExpiry?: string | null;
  registrationExpiry?: string | null;
  nextServiceDate?: string | null;
  notes?: string | null;
}

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: VehicleFormData | null;
}

export function VehicleFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: VehicleFormModalProps) {
  const isEditing = Boolean(initialData?.id);

  const [name, setName] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [vin, setVin] = useState("");
  const [mileage, setMileage] = useState("");
  const [nextServiceMileage, setNextServiceMileage] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [registrationExpiry, setRegistrationExpiry] = useState("");
  const [nextServiceDate, setNextServiceDate] = useState("");
  const [notes, setNotes] = useState("");

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
      setName(initialData.name || "");
      setMake(initialData.make || "");
      setModel(initialData.model || "");
      setYear(initialData.year ? String(initialData.year) : "");
      setLicensePlate(initialData.licensePlate || "");
      setVin(initialData.vin || "");
      setMileage(initialData.mileage !== null && initialData.mileage !== undefined ? String(initialData.mileage) : "");
      setNextServiceMileage(
        initialData.nextServiceMileage !== null && initialData.nextServiceMileage !== undefined
          ? String(initialData.nextServiceMileage)
          : ""
      );
      setInsuranceExpiry(formatDateInput(initialData.insuranceExpiry));
      setRegistrationExpiry(formatDateInput(initialData.registrationExpiry));
      setNextServiceDate(formatDateInput(initialData.nextServiceDate));
      setNotes(initialData.notes || "");
    } else {
      setName("");
      setMake("");
      setModel("");
      setYear("");
      setLicensePlate("");
      setVin("");
      setMileage("");
      setNextServiceMileage("");
      setInsuranceExpiry("");
      setRegistrationExpiry("");
      setNextServiceDate("");
      setNotes("");
    }
    setErrorMessage(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Please enter a vehicle name.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        make: make.trim() || null,
        model: model.trim() || null,
        year: year ? Number(year) : null,
        licensePlate: licensePlate.trim() || null,
        vin: vin.trim() || null,
        mileage: mileage !== "" ? Number(mileage) : null,
        nextServiceMileage: nextServiceMileage !== "" ? Number(nextServiceMileage) : null,
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry).toISOString() : null,
        registrationExpiry: registrationExpiry ? new Date(registrationExpiry).toISOString() : null,
        nextServiceDate: nextServiceDate ? new Date(nextServiceDate).toISOString() : null,
        notes: notes.trim() || null,
      };

      const endpoint = isEditing ? `/api/vehicles/${initialData?.id}` : "/api/vehicles";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || "Failed to save vehicle.");
        setIsSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("[VehicleForm Submit Error]:", err);
      setErrorMessage("Network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {isEditing ? "Edit Vehicle Details" : "Add New Vehicle"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track registration, insurance renewals, and service schedules.
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

          {/* Vehicle Name & Year */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Vehicle Nickname / Name <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. Primary Car, Family SUV, Commuter Bike"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Model Year
              </label>
              <Input
                type="number"
                min="1950"
                max="2035"
                placeholder="e.g. 2023"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          </div>

          {/* Make & Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Make / Brand
              </label>
              <Input
                type="text"
                placeholder="e.g. Toyota, Tesla, BMW, Honda"
                value={make}
                onChange={(e) => setMake(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Model
              </label>
              <Input
                type="text"
                placeholder="e.g. Camry, Model Y, 3 Series, Civic"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>
          </div>

          {/* License Plate & VIN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Registration / Plate Number
              </label>
              <Input
                type="text"
                placeholder="e.g. Dubai A-12345, ABC-789"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                VIN (Chassis Number)
              </label>
              <Input
                type="text"
                placeholder="17-character VIN number"
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          {/* Expiry Dates Section */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
              <span>Renewals & Expiries (Auto-Synced to Reminders)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Registration / Mulkiya Expiry
                </label>
                <input
                  type="date"
                  value={registrationExpiry}
                  onChange={(e) => setRegistrationExpiry(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm min-h-[42px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Insurance Policy Expiry
                </label>
                <input
                  type="date"
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm min-h-[42px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Service & Mileage Section */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-amber-500" />
              <span>Maintenance & Service Tracking</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Current Mileage
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 45000"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Next Service Date
                </label>
                <input
                  type="date"
                  value={nextServiceDate}
                  onChange={(e) => setNextServiceDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm min-h-[42px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Service Due Mileage
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  value={nextServiceMileage}
                  onChange={(e) => setNextServiceMileage(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Notes & Maintenance Remarks
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Tyres replaced at 40k, battery under warranty until Dec 2026..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update Vehicle" : "Save Vehicle"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
