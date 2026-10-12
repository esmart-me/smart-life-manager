"use client";

import { useState, useEffect } from "react";
import {
  HeartPulse,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Phone,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { HealthProfileFormData, HealthProfileModal } from "./HealthProfileModal";
import { HealthInsuranceFormData, HealthInsuranceModal } from "./HealthInsuranceModal";

export interface HealthProfileItem {
  id: string;
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
  familyMember?: { id: string; name: string; relationship?: string } | null;
}

export interface HealthInsuranceItem {
  id: string;
  policyName: string;
  provider: string;
  policyNumber: string;
  sumInsured: number;
  premiumAmount: number;
  premiumFrequency: string;
  startDate: string | Date;
  expiryDate: string | Date;
  coveredMembers?: string | null;
  tpaContact?: string | null;
  cashlessHospitals?: string | null;
  notes?: string | null;
  status: string;
}

interface HealthSectionProps {
  familyMembers: Array<{ id: string; name: string }>;
}

export function HealthSection({ familyMembers }: HealthSectionProps) {
  const [subTab, setSubTab] = useState<"profiles" | "insurance">("profiles");
  const [profiles, setProfiles] = useState<HealthProfileItem[]>([]);
  const [policies, setPolicies] = useState<HealthInsuranceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<HealthProfileFormData | null>(null);

  const [isInsuranceModalOpen, setIsInsuranceModalOpen] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<HealthInsuranceFormData | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resHealth, resIns] = await Promise.all([
        fetch("/api/family/health"),
        fetch("/api/family/insurance"),
      ]);

      const dataHealth = await resHealth.json();
      const dataIns = await resIns.json();

      if (dataHealth.success && dataHealth.data?.profiles) {
        setProfiles(dataHealth.data.profiles);
      }
      if (dataIns.success && dataIns.data?.policies) {
        setPolicies(dataIns.data.policies);
      }
    } catch (err) {
      console.error("[HealthSection Load Error]:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  async function handleDeleteProfile(p: HealthProfileItem) {
    if (!confirm(`Are you sure you want to delete the health profile for ${p.memberName || "this member"}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/family/health/${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchData();
      } else {
        alert(data.error?.message || "Failed to delete profile");
      }
    } catch (err) {
      console.error("[Delete Health Profile Error]:", err);
      alert("Network error deleting health profile");
    }
  }

  async function handleDeleteInsurance(pol: HealthInsuranceItem) {
    if (!confirm(`Are you sure you want to delete policy "${pol.policyName}" (${pol.provider})?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/family/insurance/${pol.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchData();
      } else {
        alert(data.error?.message || "Failed to delete insurance policy");
      }
    } catch (err) {
      console.error("[Delete Insurance Error]:", err);
      alert("Network error deleting policy");
    }
  }

  return (
    <div className="space-y-6">
      {/* Sub Tabs Selection */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab("profiles")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              subTab === "profiles"
                ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Health Profiles ({profiles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("insurance")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              subTab === "insurance"
                ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Health Insurance ({policies.length})</span>
          </button>
        </div>

        {subTab === "profiles" ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingProfile(null);
              setIsProfileModalOpen(true);
            }}
            className="text-xs bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Health Profile</span>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingInsurance(null);
              setIsInsuranceModalOpen(true);
            }}
            className="text-xs bg-teal-600 hover:bg-teal-700 text-white inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Insurance Policy</span>
          </Button>
        )}
      </div>

      {/* Profiles View */}
      {subTab === "profiles" && (
        <div>
          {profiles.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center mx-auto">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  No health profiles created
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Record blood types, drug allergies, chronic conditions, regular prescriptions, and emergency doctors for family members.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEditingProfile(null);
                  setIsProfileModalOpen(true);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
              >
                Create First Health Profile
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profiles.map((p) => {
                const bmi =
                  p.height && p.weight && p.height > 0
                    ? (p.weight / ((p.height / 100) * (p.height / 100))).toFixed(1)
                    : null;

                return (
                  <div
                    key={p.id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-3.5"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                            {p.memberName || p.familyMember?.name || "Family Member"}
                          </h4>
                          {p.bloodGroup && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                              {p.bloodGroup}
                            </span>
                          )}
                        </div>
                        {p.familyMember?.relationship && (
                          <span className="text-[11px] text-slate-400 block capitalize">
                            Relation: {p.familyMember.relationship}
                          </span>
                        )}
                      </div>

                      {bmi && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">BMI</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {bmi}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Vitals */}
                    {(p.height || p.weight) && (
                      <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        {p.height && <span>Height: {p.height} cm</span>}
                        {p.weight && <span>Weight: {p.weight} kg</span>}
                      </div>
                    )}

                    {/* Allergies Warning */}
                    {p.allergies && (
                      <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs flex items-start gap-2 text-amber-900 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold block">Allergies:</strong>
                          <span>{p.allergies}</span>
                        </div>
                      </div>
                    )}

                    {/* Chronic conditions & medications */}
                    {(p.chronicConditions || p.medications) && (
                      <div className="space-y-1.5 text-xs">
                        {p.chronicConditions && (
                          <p className="text-slate-700 dark:text-slate-300">
                            <span className="text-slate-400 font-medium">Conditions: </span>
                            {p.chronicConditions}
                          </p>
                        )}
                        {p.medications && (
                          <p className="text-slate-700 dark:text-slate-300">
                            <span className="text-slate-400 font-medium">Regular Meds: </span>
                            {p.medications}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Contacts info */}
                    {(p.emergencyContactPhone || p.doctorPhone) && (
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        {p.emergencyContactPhone && (
                          <a
                            href={`tel:${p.emergencyContactPhone}`}
                            className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-rose-600 flex items-center gap-1.5 truncate transition-colors"
                          >
                            <Phone className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate">{p.emergencyContactName || "Emergency"}</span>
                          </a>
                        )}

                        {p.doctorPhone && (
                          <a
                            href={`tel:${p.doctorPhone}`}
                            className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-rose-600 flex items-center gap-1.5 truncate transition-colors"
                          >
                            <Phone className="w-3 h-3 text-teal-500 shrink-0" />
                            <span className="truncate">{p.doctorName || "Doctor"}</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {p.notes || "Medical Profile Active"}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProfile({
                              id: p.id,
                              familyMemberId: p.familyMemberId,
                              memberName: p.memberName,
                              bloodGroup: p.bloodGroup,
                              height: p.height,
                              weight: p.weight,
                              allergies: p.allergies,
                              chronicConditions: p.chronicConditions,
                              medications: p.medications,
                              emergencyContactName: p.emergencyContactName,
                              emergencyContactPhone: p.emergencyContactPhone,
                              doctorName: p.doctorName,
                              doctorPhone: p.doctorPhone,
                              notes: p.notes,
                            });
                            setIsProfileModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProfile(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete Profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Insurance View */}
      {subTab === "insurance" && (
        <div>
          {policies.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-500 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  No health insurance policies linked
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Keep policy coverage details, renewal expiry alarms, cashless hospital network info, and TPA helplines organized.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEditingInsurance(null);
                  setIsInsuranceModalOpen(true);
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs"
              >
                Add First Health Policy
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {policies.map((pol) => {
                const expDate = new Date(pol.expiryDate);
                const now = new Date();
                const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isExpired = diffDays < 0;
                const isExpiringSoon = diffDays >= 0 && diffDays <= 30;

                return (
                  <div
                    key={pol.id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-3.5"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                            {pol.policyName}
                          </h4>
                          {isExpired ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                              Expired
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{diffDays} days left</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {pol.provider} • Policy #{pol.policyNumber}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Coverage</span>
                        <strong className="text-sm sm:text-base font-bold text-teal-600 dark:text-teal-400">
                          {formatCurrency(pol.sumInsured, "USD")}
                        </strong>
                      </div>
                    </div>

                    {/* Policy Details */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Renewal Date:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatShortDate(pol.expiryDate)}
                        </span>
                      </div>
                      {pol.coveredMembers && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Covered:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {pol.coveredMembers}
                          </span>
                        </div>
                      )}
                      {pol.premiumAmount > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Premium:</span>
                          <span className="text-slate-700 dark:text-slate-300">
                            {formatCurrency(pol.premiumAmount, "USD")} / {pol.premiumFrequency}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Helpline & Cashless notes */}
                    {(pol.tpaContact || pol.cashlessHospitals) && (
                      <div className="space-y-1 text-xs">
                        {pol.tpaContact && (
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>TPA Helpline: {pol.tpaContact}</span>
                          </div>
                        )}
                        {pol.cashlessHospitals && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                            Network: {pol.cashlessHospitals}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">
                        {isExpired ? "Needs immediate renewal" : "Auto reminder scheduled"}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingInsurance({
                              id: pol.id,
                              policyName: pol.policyName,
                              provider: pol.provider,
                              policyNumber: pol.policyNumber,
                              sumInsured: pol.sumInsured,
                              premiumAmount: pol.premiumAmount,
                              premiumFrequency: pol.premiumFrequency,
                              startDate: String(pol.startDate),
                              expiryDate: String(pol.expiryDate),
                              coveredMembers: pol.coveredMembers,
                              tpaContact: pol.tpaContact,
                              cashlessHospitals: pol.cashlessHospitals,
                              notes: pol.notes,
                              status: pol.status,
                            });
                            setIsInsuranceModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Policy"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteInsurance(pol)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete Policy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <HealthProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSuccess={fetchData}
        initialData={editingProfile}
        familyMembers={familyMembers}
      />

      <HealthInsuranceModal
        isOpen={isInsuranceModalOpen}
        onClose={() => setIsInsuranceModalOpen(false)}
        onSuccess={fetchData}
        initialData={editingInsurance}
      />
    </div>
  );
}
