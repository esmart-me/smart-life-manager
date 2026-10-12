"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Calendar,
  CreditCard,
  Laptop,
  Clock,
  Shield,
  UserX,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  Save,
  X,
  Loader2,
  Sparkles,
  Globe,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export interface CustomerDetailViewProps {
  customer: {
    account: {
      id: string;
      name: string;
      email: string;
      loginMethod: string;
      accountStatus: string;
      createdDate: string;
      firstLogin: string;
      lastLogin: string | null;
      lastActive: string;
      country: string;
      region: string;
      currency: string;
      timezone: string;
    };
    subscription: {
      plan: string;
      planName: string;
      status: string;
      startDate: string;
      expiryDate: string | null;
      premiumEnabled: boolean;
      daysRemaining: number | null;
      billingInterval: string;
      amount: number;
      currency: string;
      provider: string;
      cancelAtPeriodEnd: boolean;
    };
    payments: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      date: string;
      referenceId: string;
      method?: string;
    }>;
    devices: Array<{
      id: string;
      deviceId: string;
      os: string;
      appVersion: string;
      firstSeen: string;
      lastSeen: string;
      isActive: boolean;
    }>;
    loginHistory: Array<{
      id: string;
      timestamp: string;
      loginMethod: string;
      deviceId: string;
      os: string;
      appVersion: string;
    }>;
  };
}

export function CustomerDetailView({ customer }: CustomerDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"account" | "subscription" | "payments" | "devices" | "logins">("account");
  const [accountStatus, setAccountStatus] = useState(customer.account.accountStatus);
  const [subscriptionPlan, setSubscriptionPlan] = useState(customer.subscription.plan);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStatus, setEditStatus] = useState(customer.account.accountStatus);
  const [editPlan, setEditPlan] = useState(customer.subscription.plan);
  const [editSaving, setEditSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isSuspended = accountStatus === "suspended";
  const isPremium = customer.subscription.premiumEnabled;

  const handleToggleSuspend = async () => {
    const nextStatus = isSuspended ? "active" : "suspended";
    setIsUpdatingStatus(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/customers/${customer.account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          reason: `Admin toggle status to ${nextStatus}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAccountStatus(nextStatus);
        setActionMessage({
          type: "success",
          text: `Customer status updated to ${nextStatus.toUpperCase()}.`,
        });
        router.refresh();
      } else {
        setActionMessage({
          type: "error",
          text: data.error?.message || "Failed to update status",
        });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Network error" });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveEdit = async () => {
    setEditSaving(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/customers/${customer.account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          plan: editPlan,
          reason: `Administrative control update via customer detail page.`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAccountStatus(editStatus);
        setSubscriptionPlan(editPlan);
        setShowEditModal(false);
        setActionMessage({
          type: "success",
          text: "Customer account & subscription updated successfully.",
        });
        router.refresh();
      } else {
        setActionMessage({
          type: "error",
          text: data.error?.message || "Failed to save changes",
        });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Network error" });
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customer Directory</span>
        </Link>
        <span className="text-[11px] text-slate-500 font-mono">
          Customer Control Plane &bull; {customer.account.id}
        </span>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`p-3 rounded-lg flex items-center justify-between text-xs border ${
            actionMessage.type === "success"
              ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
              : "bg-red-950/40 border-red-800 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Customer Header Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-indigo-900/30">
              {customer.account.name.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  {customer.account.name}
                </h1>
                <Badge
                  variant={isSuspended ? "danger" : "success"}
                  className="capitalize text-[10px]"
                >
                  {accountStatus}
                </Badge>
                <Badge
                  variant={isPremium ? "info" : "default"}
                  className="capitalize text-[10px]"
                >
                  {subscriptionPlan}
                </Badge>
                {isPremium ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-indigo-400 font-medium">
                    <Sparkles className="w-3 h-3" />
                    Premium Entitlement Active
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Basic Entitlement Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1 font-mono">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {customer.account.email}
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                  ID: {customer.account.id}
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  {customer.account.country} &bull; {customer.account.currency}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditStatus(accountStatus);
                setEditPlan(subscriptionPlan);
                setShowEditModal(true);
              }}
              className="text-xs h-8 border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Edit Plan/Status</span>
            </Button>
            <Button
              size="sm"
              variant={isSuspended ? "primary" : "danger"}
              disabled={isUpdatingStatus}
              onClick={handleToggleSuspend}
              className="text-xs h-8"
            >
              {isUpdatingStatus ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : isSuspended ? (
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              ) : (
                <UserX className="w-3.5 h-3.5 mr-1.5" />
              )}
              <span>{isSuspended ? "Reactivate Account" : "Suspend Account"}</span>
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 mt-6 gap-1 overflow-x-auto">
          {[
            { id: "account", label: "Account Overview", icon: Shield },
            { id: "subscription", label: "Subscription & Entitlement", icon: CreditCard },
            { id: "payments", label: `Payments (${customer.payments.length})`, icon: CreditCard },
            { id: "devices", label: `Enrolled Devices (${customer.devices.length})`, icon: Laptop },
            { id: "logins", label: `Login History (${customer.loginHistory.length})`, icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-indigo-500 text-indigo-400 bg-indigo-500/10"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm min-h-[360px]">
        {/* TAB 1: ACCOUNT */}
        {activeTab === "account" && (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-white">Central Account Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Customer ID</span>
                <p className="text-xs text-white font-mono mt-1 select-all">{customer.account.id}</p>
              </div>
              <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Email Address</span>
                <p className="text-xs text-white font-mono mt-1 select-all">{customer.account.email}</p>
              </div>
              <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Display Name</span>
                <p className="text-xs text-white mt-1">{customer.account.name}</p>
              </div>
              <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Account Status</span>
                <p className="text-xs text-white mt-1 capitalize font-medium">{customer.account.accountStatus}</p>
              </div>
              <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Login Method</span>
                <p className="text-xs text-white mt-1 capitalize">{customer.account.loginMethod || "Email / Password"}</p>
              </div>
              <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Country / Region</span>
                <p className="text-xs text-white mt-1">{customer.account.country || "US"} ({customer.account.region || "Default"})</p>
              </div>
              <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Preferred Currency</span>
                <p className="text-xs text-white mt-1 font-mono">{customer.account.currency || "USD"}</p>
              </div>
              <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Account Created</span>
                <p className="text-xs text-white mt-1">{new Date(customer.account.createdDate).toLocaleString()}</p>
              </div>
              <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Last Active Timestamp</span>
                <p className="text-xs text-white mt-1">{customer.account.lastActive ? new Date(customer.account.lastActive).toLocaleString() : "Never"}</p>
              </div>
            </div>

            <div className="p-4 bg-indigo-950/20 border border-indigo-900/40 rounded-lg flex items-start gap-3">
              <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-indigo-300">Privacy Boundary Guarantee</p>
                <p className="text-slate-400 leading-relaxed">
                  The Central Admin Portal operates exclusively on control-plane metadata (identities, entitlements, billing, telemetry). Customer private documents, receipts, vehicles, expenses, and personal records remain strictly encrypted in their local database and are never accessible to this portal.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SUBSCRIPTION */}
        {activeTab === "subscription" && (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-white">Subscription & Entitlement Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Plan Tier</span>
                <p className="text-xs text-indigo-300 font-bold mt-1 uppercase tracking-wider">{customer.subscription.plan}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{customer.subscription.planName}</p>
              </div>
              <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Subscription Status</span>
                <p className="text-xs text-white font-medium mt-1 capitalize">{customer.subscription.status}</p>
              </div>
              <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Premium Feature Access</span>
                <p className={`text-xs font-bold mt-1 ${isPremium ? "text-emerald-400" : "text-slate-400"}`}>
                  {isPremium ? "ENABLED (Full Access)" : "DISABLED (Basic Tier)"}
                </p>
              </div>
              <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Billing Cycle</span>
                <p className="text-xs text-white mt-1 capitalize">{customer.subscription.billingInterval}</p>
              </div>
              <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Period Start</span>
                <p className="text-xs text-white mt-1">
                  {customer.subscription.startDate ? new Date(customer.subscription.startDate).toLocaleDateString() : "N/A"}
                </p>
              </div>
              <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Period End / Expiry</span>
                <p className="text-xs text-white mt-1">
                  {customer.subscription.expiryDate ? new Date(customer.subscription.expiryDate).toLocaleDateString() : "Never (Lifetime/Open)"}
                </p>
                {customer.subscription.daysRemaining !== null && (
                  <p className="text-[11px] text-amber-400 mt-0.5">
                    {customer.subscription.daysRemaining > 0
                      ? `${customer.subscription.daysRemaining} days remaining`
                      : "Subscription period expired"}
                  </p>
                )}
              </div>
              <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Payment Provider</span>
                <p className="text-xs text-white mt-1 capitalize">{customer.subscription.provider || "Manual / Central"}</p>
              </div>
              <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Renewal Status</span>
                <p className="text-xs text-white mt-1">
                  {customer.subscription.cancelAtPeriodEnd ? "Cancels at period end" : "Active auto-renewal"}
                </p>
              </div>
              <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Amount / Currency</span>
                <p className="text-xs text-white font-mono mt-1">
                  {customer.subscription.amount} {customer.subscription.currency}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PAYMENTS */}
        {activeTab === "payments" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Central Payment Ledger</h3>
            {customer.payments.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>No billing or payment records found for this customer.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Transaction / Ref</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {customer.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 text-slate-300">
                          {new Date(p.date).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 select-all">
                          {p.referenceId || p.id}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">
                          {p.amount} {p.currency}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                              p.status === "completed" || p.status === "paid"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : "bg-amber-950 text-amber-400 border border-amber-800"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 capitalize">
                          {p.method || "card / qr"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DEVICES */}
        {activeTab === "devices" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Enrolled Client Devices</h3>
            {customer.devices.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <Laptop className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>No active or registered devices recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Device ID</th>
                      <th className="py-2.5 px-3">OS Platform</th>
                      <th className="py-2.5 px-3">App Version</th>
                      <th className="py-2.5 px-3">First Seen</th>
                      <th className="py-2.5 px-3">Last Seen</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {customer.devices.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 text-slate-300 select-all">
                          {d.deviceId}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 capitalize font-sans">
                          {d.os}
                        </td>
                        <td className="py-2.5 px-3 text-indigo-400">
                          v{d.appVersion}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {new Date(d.firstSeen).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {new Date(d.lastSeen).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                              d.isActive
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : "bg-slate-800 text-slate-500 border border-slate-700"
                            }`}
                          >
                            {d.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: LOGIN HISTORY */}
        {activeTab === "logins" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Central Authentication Events</h3>
            {customer.loginHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>No central login events recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Auth Method</th>
                      <th className="py-2.5 px-3">Device ID</th>
                      <th className="py-2.5 px-3">OS</th>
                      <th className="py-2.5 px-3">App Version</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {customer.loginHistory.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 text-slate-300">
                          {new Date(l.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-indigo-400 capitalize font-sans">
                          {l.loginMethod}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 select-all">
                          {l.deviceId}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 capitalize font-sans">
                          {l.os}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          v{l.appVersion}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* QUICK EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                Edit Account Control
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Customer Email</label>
                <input
                  type="text"
                  readOnly
                  value={customer.account.email}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-400 font-mono text-xs cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Account Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="archived">Archived / Deactivated</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Subscription Entitlement Plan</label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
                >
                  <option value="basic">Basic Tier (Free)</option>
                  <option value="premium">Life Pro Premium</option>
                  <option value="family">Family Circle Plus</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEditModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={editSaving}
                onClick={handleSaveEdit}
                className="text-xs bg-indigo-600 hover:bg-indigo-700"
              >
                {editSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                )}
                Save Control Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
