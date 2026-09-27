"use client";

import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Shield,
  FileText,
  Wallet,
  Car,
  Check,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Settings,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Mail,
  Eye,
  Edit3,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FamilyRole } from "@/lib/plans/constants";
import { UserPlanSummary } from "@/lib/plans/plan-service";
import Link from "next/link";

interface MemberItem {
  id: string;
  name: string;
  email: string | null;
  role: FamilyRole;
  canViewDocuments: boolean;
  canEditDocuments: boolean;
  canViewFinance: boolean;
  canEditFinance: boolean;
  canViewVehicles: boolean;
  canEditVehicles: boolean;
  status: string;
  createdAt: string;
}

interface FamilyGroupData {
  id: string;
  name: string;
  ownerId: string;
  members: MemberItem[];
}

export function FamilyHubClient() {
  const [group, setGroup] = useState<FamilyGroupData | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [planSummary, setPlanSummary] = useState<UserPlanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberItem | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    role: FamilyRole;
    canViewDocuments: boolean;
    canEditDocuments: boolean;
    canViewFinance: boolean;
    canEditFinance: boolean;
    canViewVehicles: boolean;
    canEditVehicles: boolean;
  }>({
    name: "",
    email: "",
    role: "Member",
    canViewDocuments: true,
    canEditDocuments: false,
    canViewFinance: false,
    canEditFinance: false,
    canViewVehicles: true,
    canEditVehicles: false,
  });

  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const fetchFamilyData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/family");
      const data = await res.json();

      if (data.success && data.data) {
        setGroup(data.data.familyGroup);
        setMembers(data.data.members || []);
        setPlanSummary(data.data.planSummary);
      }
    } catch (err) {
      console.error("Failed to load family data:", err);
      setNotification({
        type: "error",
        message: "Failed to load family circle members.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyData();
  }, []);

  const handleRoleChange = (newRole: FamilyRole) => {
    if (newRole === "View Only") {
      setFormData((prev) => ({
        ...prev,
        role: newRole,
        canViewDocuments: true,
        canEditDocuments: false,
        canViewFinance: false,
        canEditFinance: false,
        canViewVehicles: true,
        canEditVehicles: false,
      }));
    } else if (newRole === "Admin" || newRole === "Owner") {
      setFormData((prev) => ({
        ...prev,
        role: newRole,
        canViewDocuments: true,
        canEditDocuments: true,
        canViewFinance: true,
        canEditFinance: true,
        canViewVehicles: true,
        canEditVehicles: true,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        role: newRole,
        canViewDocuments: true,
        canEditDocuments: false,
        canViewFinance: false,
        canEditFinance: false,
        canViewVehicles: true,
        canEditVehicles: false,
      }));
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsSubmitting(true);
      setNotification(null);

      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setNotification({
          type: "success",
          message: data.data?.message || "Family member successfully added!",
        });
        setShowAddModal(false);
        setFormData({
          name: "",
          email: "",
          role: "Member",
          canViewDocuments: true,
          canEditDocuments: false,
          canViewFinance: false,
          canEditFinance: false,
          canViewVehicles: true,
          canEditVehicles: false,
        });
        fetchFamilyData();
      } else {
        setNotification({
          type: "error",
          message: data.error?.message || "Failed to add member.",
        });
      }
    } catch (err) {
      console.error("Add family member error:", err);
      setNotification({
        type: "error",
        message: "Network error adding family member.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      setIsSubmitting(true);
      setNotification(null);

      const res = await fetch(`/api/family/${editingMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editingMember.role,
          canViewDocuments: editingMember.canViewDocuments,
          canEditDocuments: editingMember.canEditDocuments,
          canViewFinance: editingMember.canViewFinance,
          canEditFinance: editingMember.canEditFinance,
          canViewVehicles: editingMember.canViewVehicles,
          canEditVehicles: editingMember.canEditVehicles,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNotification({
          type: "success",
          message: `Permissions updated for ${editingMember.name}`,
        });
        setEditingMember(null);
        fetchFamilyData();
      } else {
        setNotification({
          type: "error",
          message: data.error?.message || "Failed to update permissions.",
        });
      }
    } catch (err) {
      console.error("Update error:", err);
      setNotification({
        type: "error",
        message: "Failed to save permissions.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (member: MemberItem) => {
    if (member.role === "Owner") {
      alert("Cannot remove the primary Family Owner.");
      return;
    }

    if (!confirm(`Are you sure you want to remove ${member.name} from the Family Circle?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/family/${member.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.success) {
        setNotification({
          type: "success",
          message: `${member.name} was removed from your Family Circle.`,
        });
        fetchFamilyData();
      } else {
        setNotification({
          type: "error",
          message: data.error?.message || "Failed to remove member.",
        });
      }
    } catch (err) {
      console.error("Remove error:", err);
      setNotification({
        type: "error",
        message: "Failed to remove member.",
      });
    }
  };

  const handleUpgradeToFamily = async () => {
    try {
      const res = await fetch("/api/subscription/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "family",
          billingInterval: "monthly",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({
          type: "success",
          message: "Upgraded to Family Circle Plus! Multi-member sharing enabled.",
        });
        fetchFamilyData();
      }
    } catch (err) {
      console.error("Upgrade error:", err);
    }
  };

  const isFamilyTier = planSummary?.isFamily ?? false;

  const getRoleBadgeVariant = (role: FamilyRole) => {
    switch (role) {
      case "Owner":
        return "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
      case "Admin":
        return "bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "Member":
        return "bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800";
      case "View Only":
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Family Circle
            </h1>
            <Badge variant={isFamilyTier ? "success" : "outline"}>
              {isFamilyTier ? "Family Circle Plus" : "Preview Mode"}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Share selected documents, vehicles, and bill reminders with household members under strict permission controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/premium"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 hover:bg-brand-100 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Manage Plans</span>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="text-xs font-semibold gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Member</span>
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Plan Status Banner (if on Free or Premium tier) */}
      {!isFamilyTier && (
        <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 dark:from-indigo-950/30 dark:via-slate-900 dark:to-purple-950/30 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                  Family Circle Architecture Preview
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                You are currently on the <strong>{planSummary?.planName || "Free"}</strong> tier. In this environment, you can test family member creation and role configurations. Upgrade to Family Circle Plus to activate full multi-user sharing.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpgradeToFamily}
              className="text-xs font-semibold gap-1.5 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <span>Activate Family Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Roles & Permissions Reference Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-xs space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="font-bold text-slate-900 dark:text-white">Owner</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Household owner. Manages billing, subscription, and all data.
          </p>
        </div>

        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-xs space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="font-bold text-slate-900 dark:text-white">Admin</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Can invite members, edit documents, bills, and vehicles.
          </p>
        </div>

        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-xs space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span className="font-bold text-slate-900 dark:text-white">Member</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Can view and edit specifically assigned modules and records.
          </p>
        </div>

        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-xs space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="font-bold text-slate-900 dark:text-white">View Only</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Strictly read-only access to selected shared information.
          </p>
        </div>
      </div>

      {/* Member List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Family Circle Members ({members.length} /{" "}
            {planSummary?.limits.familyMembers.isUnlimited
              ? "∞"
              : planSummary?.limits.familyMembers.max ?? 6}
            )
          </h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Group: {group?.name || "My Family Circle"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 font-bold text-sm flex items-center justify-center shrink-0">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {member.name}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeVariant(
                        member.role
                      )}`}
                    >
                      {member.role}
                    </span>
                    {member.status === "invited" && (
                      <Badge variant="outline" className="text-[10px]">
                        Pending Invite
                      </Badge>
                    )}
                  </div>
                  {member.email ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {member.email}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 italic">
                      Managed Household Profile (No external login)
                    </p>
                  )}
                </div>
              </div>

              {/* Granular Permission Badges */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span
                  className={`px-2 py-1 rounded-md border flex items-center gap-1 ${
                    member.canViewDocuments
                      ? member.canEditDocuments
                        ? "bg-brand-50 dark:bg-brand-950/40 border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      : "bg-slate-50 dark:bg-slate-800/40 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 opacity-60"
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  Docs: {member.canEditDocuments ? "Edit" : member.canViewDocuments ? "View" : "None"}
                </span>

                <span
                  className={`px-2 py-1 rounded-md border flex items-center gap-1 ${
                    member.canViewFinance
                      ? member.canEditFinance
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      : "bg-slate-50 dark:bg-slate-800/40 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 opacity-60"
                  }`}
                >
                  <Wallet className="w-3 h-3" />
                  Finance: {member.canEditFinance ? "Edit" : member.canViewFinance ? "View" : "None"}
                </span>

                <span
                  className={`px-2 py-1 rounded-md border flex items-center gap-1 ${
                    member.canViewVehicles
                      ? member.canEditVehicles
                        ? "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      : "bg-slate-50 dark:bg-slate-800/40 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 opacity-60"
                  }`}
                >
                  <Car className="w-3 h-3" />
                  Vehicles: {member.canEditVehicles ? "Edit" : member.canViewVehicles ? "View" : "None"}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end md:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingMember(member)}
                  className="text-xs gap-1"
                >
                  <Settings className="w-3 h-3 text-slate-500" />
                  <span>Permissions</span>
                </Button>

                {member.role !== "Owner" && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-brand-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Add Family Member
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Sarah Smith, Junior"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="sarah@example.com (Leave blank for offline household profile)"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Family Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleRoleChange(e.target.value as FamilyRole)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Admin">Admin (Full management of shared records)</option>
                  <option value="Member">Member (Customized access)</option>
                  <option value="View Only">View Only (Read-only access)</option>
                </select>
              </div>

              {/* Granular Permission Toggles */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Shared Data Permissions
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <input
                      type="checkbox"
                      checked={formData.canViewDocuments}
                      onChange={(e) =>
                        setFormData({ ...formData, canViewDocuments: e.target.checked })
                      }
                      className="rounded text-brand-600"
                    />
                    <span>View Documents</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <input
                      type="checkbox"
                      disabled={formData.role === "View Only"}
                      checked={formData.canEditDocuments}
                      onChange={(e) =>
                        setFormData({ ...formData, canEditDocuments: e.target.checked })
                      }
                      className="rounded text-brand-600 disabled:opacity-40"
                    />
                    <span>Edit Documents</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <input
                      type="checkbox"
                      checked={formData.canViewFinance}
                      onChange={(e) =>
                        setFormData({ ...formData, canViewFinance: e.target.checked })
                      }
                      className="rounded text-brand-600"
                    />
                    <span>View Finances</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <input
                      type="checkbox"
                      disabled={formData.role === "View Only"}
                      checked={formData.canEditFinance}
                      onChange={(e) =>
                        setFormData({ ...formData, canEditFinance: e.target.checked })
                      }
                      className="rounded text-brand-600 disabled:opacity-40"
                    />
                    <span>Edit Finances</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <input
                      type="checkbox"
                      checked={formData.canViewVehicles}
                      onChange={(e) =>
                        setFormData({ ...formData, canViewVehicles: e.target.checked })
                      }
                      className="rounded text-brand-600"
                    />
                    <span>View Vehicles</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <input
                      type="checkbox"
                      disabled={formData.role === "View Only"}
                      checked={formData.canEditVehicles}
                      onChange={(e) =>
                        setFormData({ ...formData, canEditVehicles: e.target.checked })
                      }
                      className="rounded text-brand-600 disabled:opacity-40"
                    />
                    <span>Edit Vehicles</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  className="gap-1.5"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Member</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Permissions: {editingMember.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Family Role
                </label>
                <select
                  disabled={editingMember.role === "Owner"}
                  value={editingMember.role}
                  onChange={(e) =>
                    setEditingMember({
                      ...editingMember,
                      role: e.target.value as FamilyRole,
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50"
                >
                  {editingMember.role === "Owner" ? (
                    <option value="Owner">Owner (Primary Account)</option>
                  ) : (
                    <>
                      <option value="Admin">Admin</option>
                      <option value="Member">Member</option>
                      <option value="View Only">View Only</option>
                    </>
                  )}
                </select>
              </div>

              {/* Granular Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Access Permissions
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    <input
                      type="checkbox"
                      checked={editingMember.canViewDocuments}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          canViewDocuments: e.target.checked,
                        })
                      }
                      className="rounded text-brand-600"
                    />
                    <span>View Documents</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    <input
                      type="checkbox"
                      disabled={editingMember.role === "View Only"}
                      checked={editingMember.canEditDocuments}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          canEditDocuments: e.target.checked,
                        })
                      }
                      className="rounded text-brand-600 disabled:opacity-40"
                    />
                    <span>Edit Documents</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    <input
                      type="checkbox"
                      checked={editingMember.canViewFinance}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          canViewFinance: e.target.checked,
                        })
                      }
                      className="rounded text-brand-600"
                    />
                    <span>View Finances</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    <input
                      type="checkbox"
                      disabled={editingMember.role === "View Only"}
                      checked={editingMember.canEditFinance}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          canEditFinance: e.target.checked,
                        })
                      }
                      className="rounded text-brand-600 disabled:opacity-40"
                    />
                    <span>Edit Finances</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    <input
                      type="checkbox"
                      checked={editingMember.canViewVehicles}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          canViewVehicles: e.target.checked,
                        })
                      }
                      className="rounded text-brand-600"
                    />
                    <span>View Vehicles</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    <input
                      type="checkbox"
                      disabled={editingMember.role === "View Only"}
                      checked={editingMember.canEditVehicles}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          canEditVehicles: e.target.checked,
                        })
                      }
                      className="rounded text-brand-600 disabled:opacity-40"
                    />
                    <span>Edit Vehicles</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingMember(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  className="gap-1.5"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Changes</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
