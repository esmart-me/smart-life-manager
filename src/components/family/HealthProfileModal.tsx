"use client";

import { useState, useEffect } from "react";
import { X, HeartPulse, AlertTriangle, Phone, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface HealthProfileFormData {
  id?: string;
  familyMemberId?: string | null;
  memberName?: string | null;
  bloodGroup?: string | null;
  height?: number | null;
  weight?: number | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  medications?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  doctorName?: string | null;
  doctorPhone?: string | null;
  notes?: string | null;
}

interface HealthProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: HealthProfileFormData | null;
  familyMembers: Array<{ id: string; name: string }>;
}

export function HealthProfileModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  familyMembers,
}: HealthProfileModalProps) {
  const [familyMemberId, setFamilyMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [height, setHeight] = useState<number | "">("");
  const [weight, setWeight] = useState<number | "">("");
  const [allergies, setAllergies] = useState("");
  const [chronicConditions, setChronicConditions] = useState("");
  const [medications, setMedications] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorPhone, setDoctorPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFamilyMemberId(initialData.familyMemberId || "");
      setMemberName(initialData.memberName || "");
      setBloodGroup(initialData.bloodGroup || "");
      setHeight(initialData.height ?? "");
      setWeight(initialData.weight ?? "");
      setAllergies(initialData.allergies || "");
      setChronicConditions(initialData.chronicConditions || "");
      setMedications(initialData.medications || "");
      setEmergencyContactName(initialData.emergencyContactName || "");
      setEmergencyContactPhone(initialData.emergencyContactPhone || "");
      setDoctorName(initialData.doctorName || "");
      setDoctorPhone(initialData.doctorPhone || "");
      setNotes(initialData.notes || "");
    } else {
      setFamilyMemberId("");
      setMemberName("");
      setBloodGroup("");
      setHeight("");
      setWeight("");
      setAllergies("");
      setChronicConditions("");
      setMedications("");
      setEmergencyContactName("");
      setEmergencyContactPhone("");
      setDoctorName("");
      setDoctorPhone("");
      setNotes("");
    }
    setError(null);
  }, [initialData, isOpen]);

  // Compute BMI if height and weight exist
  const bmi =
    typeof height === "number" && typeof weight === "number" && height > 0
      ? (weight / ((height / 100) * (height / 100))).toFixed(1)
      : null;

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const chosenName =
      memberName.trim() ||
      familyMembers.find((m) => m.id === familyMemberId)?.name ||
      "";

    if (!chosenName) {
      setError("Please select or enter the member's name.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        familyMemberId: familyMemberId || null,
        memberName: chosenName,
        bloodGroup: bloodGroup || null,
        height: height === "" ? null : Number(height),
        weight: weight === "" ? null : Number(weight),
        allergies: allergies.trim() || null,
        chronicConditions: chronicConditions.trim() || null,
        medications: medications.trim() || null,
        emergencyContactName: emergencyContactName.trim() || null,
        emergencyContactPhone: emergencyContactPhone.trim() || null,
        doctorName: doctorName.trim() || null,
        doctorPhone: doctorPhone.trim() || null,
        notes: notes.trim() || null,
      };

      const url = initialData?.id
        ? `/api/family/health/${initialData.id}`
        : "/api/family/health";

      const method = initialData?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save health profile");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("[HealthProfile Submit Error]:", err);
      setError(err instanceof Error ? err.message : "Network error saving health profile");
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
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {initialData?.id ? "Edit Health Profile" : "New Family Health Profile"}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Private medical profile for blood group, allergies, medications, and emergency doctors.
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
                Link to Family Member
              </label>
              <select
                value={familyMemberId}
                onChange={(e) => {
                  setFamilyMemberId(e.target.value);
                  const selected = familyMembers.find((m) => m.id === e.target.value);
                  if (selected) setMemberName(selected.name);
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="">-- Choose Household Member --</option>
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Member Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe, Sarah Doe"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="">Unknown</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 175"
                value={height}
                onChange={(e) => setHeight(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 70"
                value={weight}
                onChange={(e) => setWeight(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          {bmi && (
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs flex items-center justify-between">
              <span className="text-slate-500">Calculated Body Mass Index (BMI):</span>
              <strong className="text-rose-600 dark:text-rose-400 font-bold">{bmi} kg/m²</strong>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Known Allergies (Food, Drug, Environmental)
            </label>
            <input
              type="text"
              placeholder="e.g. Penicillin, Peanuts, Sulfa Drugs, Bee stings"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Chronic Health Conditions
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Asthma, Hypertension, Type 2 Diabetes"
                value={chronicConditions}
                onChange={(e) => setChronicConditions(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Regular Medications
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Inhaler as needed, Metformin 500mg daily"
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Emergency & Doctor Contacts */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Emergency & Physician Contacts
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Spouse / Sibling"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Primary Physician Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Roberts"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Doctor Phone / Clinic
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={doctorPhone}
                  onChange={(e) => setDoctorPhone(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              General Medical Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Medical history, vaccine records, surgical history..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
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
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {loading ? "Saving..." : initialData?.id ? "Save Changes" : "Save Health Profile"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
