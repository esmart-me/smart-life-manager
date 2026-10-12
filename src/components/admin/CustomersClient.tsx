"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Users,
  CreditCard,
  Mail,
  Calendar,
  Eye,
  X,
  Clock,
  Filter,
  Loader2,
  AlertCircle,
  Edit2,
  Save,
  Globe,
  Trash2,
  UserX,
  Laptop,
  CheckCircle2,
  XCircle,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface CustomerDTO {
  id: string;
  email: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  status?: string;
  lastLoginAt?: string | null;
  country: string;
  region: string;
  currency: string;
  timezone: string;
  plan: string;
  planName: string;
  billingInterval: string;
  subscriptionStatus: string;
  subscriptionAmount: number;
  currentPeriodEnd: string | null;
  createdAt: string;
  lastActivity: string;
  deviceCount: number;
  appVersion: string;
  premiumEnabled: boolean;
}

export interface CentralCustomerDetail {
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
    currency: string;
  };
  subscription: {
    plan: string;
    status: string;
    startDate: string;
    expiryDate: string | null;
    premiumEnabled: boolean;
    daysRemaining: number | null;
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
}

interface CustomersClientProps {
  initialCustomers: CustomerDTO[];
}

export function CustomersClient({ initialCustomers }: CustomersClientProps) {
  const [customers, setCustomers] = useState<CustomerDTO[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "lastActive">("lastActive");

  // Control Details Modal State
  const [activeCustomer, setActiveCustomer] = useState<CustomerDTO | null>(null);
  const [detailsData, setDetailsData] = useState<CentralCustomerDetail | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsTab, setDetailsTab] = useState<"account" | "subscription" | "payments" | "devices" | "logins">("account");

  // Account Status / Archival Modal State
  const [deactivatingCustomer, setDeactivatingCustomer] = useState<CustomerDTO | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Quick Edit State
  const [editingCustomer, setEditingCustomer] = useState<CustomerDTO | null>(null);
  const [editStatus, setEditStatus] = useState("active");
  const [editPlan, setEditPlan] = useState("basic");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Filter & Search Logic
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q);

      const matchPlan =
        selectedPlan === "ALL" ||
        (selectedPlan === "premium" && (c.plan === "premium" || c.plan === "pro" || c.plan === "family")) ||
        (selectedPlan === "basic" && (c.plan === "basic" || c.plan === "free"));

      const matchStatus = selectedStatus === "ALL" || (c.status || "active") === selectedStatus;

      return matchSearch && matchPlan && matchStatus;
    });
  }, [customers, search, selectedPlan, selectedStatus]);

  // Sorting Logic
  const sortedCustomers = useMemo(() => {
    const list = [...filteredCustomers];
    if (sortBy === "newest") {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "oldest") {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === "lastActive") {
      list.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    }
    return list;
  }, [filteredCustomers, sortBy]);

  const totalPages = Math.ceil(sortedCustomers.length / pageSize) || 1;
  const paginatedCustomers = sortedCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Fetch Central Control Detail
  const handleOpenDetails = async (customer: CustomerDTO) => {
    setActiveCustomer(customer);
    setDetailsData(null);
    setIsLoadingDetails(true);
    setDetailsTab("account");

    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setDetailsData(data.data);
      }
    } catch (err) {
      console.error("Failed to load customer details:", err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Toggle Account Suspension
  const handleToggleSuspend = async (customer: CustomerDTO) => {
    const newStatus = customer.status === "suspended" ? "active" : "suspended";
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountStatus: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === customer.id ? { ...c, status: newStatus } : c))
        );
      }
    } catch (err) {
      console.error("Failed to toggle suspension:", err);
    }
  };

  // Handle Safe Archival / Deactivation
  const handleDeactivate = async () => {
    if (!deactivatingCustomer || confirmText !== "DELETE") return;
    setIsProcessingAction(true);
    try {
      const res = await fetch(`/api/admin/customers/${deactivatingCustomer.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: "DELETE" }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message);
        setCustomers((prev) =>
          prev.map((c) => (c.id === deactivatingCustomer.id ? { ...c, status: "archived" } : c))
        );
        setTimeout(() => {
          setDeactivatingCustomer(null);
          setConfirmText("");
          setActionMessage(null);
        }, 1500);
      }
    } catch (err) {
      console.error("Failed to deactivate account:", err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Save Quick Edit
  const handleSaveEdit = async () => {
    if (!editingCustomer) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/customers/${editingCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountStatus: editStatus,
          plan: editPlan,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === editingCustomer.id
              ? {
                  ...c,
                  status: editStatus,
                  plan: editPlan,
                  planName: editPlan === "premium" ? "Premium Tier" : "Basic Tier",
                  premiumEnabled: editPlan === "premium" && editStatus === "active",
                }
              : c
          )
        );
        setEditingCustomer(null);
      }
    } catch (err) {
      console.error("Failed to save customer edit:", err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Toolbar */}
      <div className="p-4 rounded-2xl glass-card border border-white/[0.08] flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or customer ID..."
            className="pl-10 bg-slate-950/60 border-slate-800 text-xs text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Plan Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="ALL">All Plans</option>
              <option value="basic">Basic Tier</option>
              <option value="premium">Premium Tier</option>
            </select>
          </div>

          {/* Account Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="ALL">All Account Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="lastActive">Sort: Last Active</option>
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="rounded-2xl glass-card border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800/80 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Plan & Entitlement</th>
                <th className="py-3 px-4">Subscription Expiry</th>
                <th className="py-3 px-4">Telemetry / Hardware</th>
                <th className="py-3 px-4">Last Active</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-slate-200">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No matching customer records found.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-white text-xs">{c.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{c.email}</p>
                        <span className="text-[10px] text-slate-500 font-mono">ID: {c.id.slice(0, 12)}...</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          c.status === "suspended"
                            ? "bg-rose-950/80 text-rose-300 border border-rose-800"
                            : c.status === "archived"
                            ? "bg-slate-800 text-slate-400 border border-slate-700"
                            : "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                        }`}
                      >
                        {c.status || "active"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            c.premiumEnabled
                              ? "bg-indigo-950 text-indigo-300 border border-indigo-800"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {c.plan}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {c.premiumEnabled ? "Premium Active" : "Basic Entitlement"}
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-400">
                      {c.currentPeriodEnd ? (
                        <div>
                          <p>{new Date(c.currentPeriodEnd).toISOString().slice(0, 10)}</p>
                          <span
                            className={`text-[10px] ${
                              new Date(c.currentPeriodEnd).getTime() < Date.now()
                                ? "text-amber-400 font-bold"
                                : "text-emerald-400"
                            }`}
                          >
                            {new Date(c.currentPeriodEnd).getTime() < Date.now()
                              ? "Expired"
                              : "Active Period"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">None / Lifetime</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                        <Laptop className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{c.deviceCount} Device{c.deviceCount > 1 ? "s" : ""}</span>
                        <span className="text-slate-500">&bull;</span>
                        <span className="text-[10px] text-slate-400 font-mono">v{c.appVersion}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-400">
                      <p>{new Date(c.lastActivity).toISOString().slice(0, 10)}</p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(c.lastActivity).toISOString().slice(11, 16)} UTC
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDetails(c)}
                          className="h-7 px-2 text-indigo-400 hover:text-white hover:bg-indigo-600/20 text-xs"
                          title="Quick View Control Metadata"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          <span>View</span>
                        </Button>
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="h-7 px-2 inline-flex items-center text-slate-400 hover:text-white hover:bg-slate-800 rounded text-xs transition-colors"
                          title="Open Dedicated Full Page"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingCustomer(c);
                            setEditStatus(c.status || "active");
                            setEditPlan(c.plan || "basic");
                          }}
                          className="h-7 px-2 text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
                          title="Edit Account Status or Plan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleSuspend(c)}
                          className={`h-7 px-2 text-xs ${
                            c.status === "suspended"
                              ? "text-emerald-400 hover:bg-emerald-950/40"
                              : "text-amber-400 hover:bg-amber-950/40"
                          }`}
                          title={c.status === "suspended" ? "Unsuspend Account" : "Suspend Account"}
                        >
                          {c.status === "suspended" ? "Activate" : "Suspend"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setDeactivatingCustomer(c);
                            setConfirmText("");
                          }}
                          className="h-7 px-2 text-rose-400 hover:text-white hover:bg-rose-950/40 text-xs"
                          title="Deactivate / Archive Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, sortedCustomers.length)} of {sortedCustomers.length} customers
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="h-7 text-xs bg-slate-900 border-slate-800 text-slate-300"
            >
              Previous
            </Button>
            <span className="text-xs text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="h-7 text-xs bg-slate-900 border-slate-800 text-slate-300"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* 360 Central Control Modal */}
      {activeCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-white">{activeCustomer.name}</h2>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      activeCustomer.status === "suspended"
                        ? "bg-rose-950 text-rose-300 border border-rose-800"
                        : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                    }`}
                  >
                    {activeCustomer.status || "active"}
                  </span>
                  <Link
                    href={`/admin/customers/${activeCustomer.id}`}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                  >
                    <span>Full Profile Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{activeCustomer.email}</p>
              </div>
              <button
                onClick={() => setActiveCustomer(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs: PURE CONTROL METADATA ONLY */}
            <div className="border-b border-slate-800 bg-slate-950/20 px-6 flex items-center gap-4 text-xs font-semibold">
              <button
                onClick={() => setDetailsTab("account")}
                className={`py-3 border-b-2 transition-all ${
                  detailsTab === "account"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Account
              </button>
              <button
                onClick={() => setDetailsTab("subscription")}
                className={`py-3 border-b-2 transition-all ${
                  detailsTab === "subscription"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Subscription
              </button>
              <button
                onClick={() => setDetailsTab("payments")}
                className={`py-3 border-b-2 transition-all ${
                  detailsTab === "payments"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Payments ({detailsData?.payments?.length || 0})
              </button>
              <button
                onClick={() => setDetailsTab("devices")}
                className={`py-3 border-b-2 transition-all ${
                  detailsTab === "devices"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Devices ({detailsData?.devices?.length || 0})
              </button>
              <button
                onClick={() => setDetailsTab("logins")}
                className={`py-3 border-b-2 transition-all ${
                  detailsTab === "logins"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Login History ({detailsData?.loginHistory?.length || 0})
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {isLoadingDetails ? (
                <div className="py-16 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
                  <p className="text-xs text-slate-400">Loading Central Control Plane records...</p>
                </div>
              ) : detailsData ? (
                <>
                  {/* Account Tab */}
                  {detailsTab === "account" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Customer ID</span>
                        <p className="font-mono text-white text-xs">{detailsData.account.id}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Account Status</span>
                        <p className="font-bold text-white text-xs uppercase">{detailsData.account.accountStatus}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Login Method</span>
                        <p className="font-bold text-indigo-400 text-xs uppercase">{detailsData.account.loginMethod}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Created Date</span>
                        <p className="text-slate-300">{new Date(detailsData.account.createdDate).toLocaleString()}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Last Login</span>
                        <p className="text-slate-300">
                          {detailsData.account.lastLogin ? new Date(detailsData.account.lastLogin).toLocaleString() : "None"}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Last Active</span>
                        <p className="text-slate-300">{new Date(detailsData.account.lastActive).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {/* Subscription Tab */}
                  {detailsTab === "subscription" && (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Current Plan</span>
                          <p className="font-bold text-white text-base uppercase">{detailsData.subscription.plan}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Entitlement Status</span>
                          <p className="font-bold text-emerald-400 text-base uppercase">{detailsData.subscription.status}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Days Remaining</span>
                          <p className="font-bold text-amber-400 text-base">
                            {detailsData.subscription.daysRemaining !== null ? `${detailsData.subscription.daysRemaining} days` : "Lifetime / Free"}
                          </p>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Subscription Dates</span>
                        <div className="flex justify-between text-slate-300">
                          <span>Starts At: {new Date(detailsData.subscription.startDate).toLocaleDateString()}</span>
                          <span>
                            Expires At:{" "}
                            {detailsData.subscription.expiryDate ? new Date(detailsData.subscription.expiryDate).toLocaleDateString() : "Never"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payments Tab */}
                  {detailsTab === "payments" && (
                    <div className="space-y-3">
                      {detailsData.payments.length === 0 ? (
                        <p className="py-8 text-center text-xs text-slate-500">No payment records found.</p>
                      ) : (
                        detailsData.payments.map((p) => (
                          <div key={p.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-bold text-white">${p.amount.toFixed(2)} {p.currency}</p>
                              <span className="text-[10px] text-slate-500 font-mono">Ref: {p.referenceId}</span>
                            </div>
                            <div className="text-right">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                                {p.status}
                              </span>
                              <p className="text-[10px] text-slate-500 mt-1">{new Date(p.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Devices Tab */}
                  {detailsTab === "devices" && (
                    <div className="space-y-3">
                      {detailsData.devices.length === 0 ? (
                        <p className="py-8 text-center text-xs text-slate-500">No registered devices found.</p>
                      ) : (
                        detailsData.devices.map((d) => (
                          <div key={d.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <Laptop className="w-4 h-4 text-indigo-400" />
                              <div>
                                <p className="font-bold text-white font-mono">{d.deviceId}</p>
                                <span className="text-[10px] text-slate-400">OS: {d.os} &bull; App Version: v{d.appVersion}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${d.isActive ? "bg-emerald-950 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
                                {d.isActive ? "Active" : "Inactive"}
                              </span>
                              <p className="text-[10px] text-slate-500 mt-1">Last seen: {new Date(d.lastSeen).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Logins Tab */}
                  {detailsTab === "logins" && (
                    <div className="space-y-3">
                      {detailsData.loginHistory.length === 0 ? (
                        <p className="py-8 text-center text-xs text-slate-500">No login events recorded.</p>
                      ) : (
                        detailsData.loginHistory.map((l) => (
                          <div key={l.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-bold text-white uppercase">{l.loginMethod} Login</p>
                              <span className="text-[10px] text-slate-500 font-mono">Device: {l.deviceId} ({l.os})</span>
                            </div>
                            <div className="text-right">
                              <p className="text-slate-300 text-[11px]">{new Date(l.timestamp).toLocaleString()}</p>
                              <span className="text-[10px] text-slate-500 font-mono">v{l.appVersion}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="py-8 text-center text-xs text-rose-400">Failed to load customer control plane metadata.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Metadata Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Edit Customer Control Plan &amp; Status</h3>
            <p className="text-xs text-slate-400">Updating metadata for {editingCustomer.email}</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Account Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Entitlement Plan</label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                >
                  <option value="basic">Basic (Free)</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingCustomer(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DEACTIVATION / ARCHIVE CONFIRMATION MODAL */}
      {deactivatingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-900/60 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-400 shrink-0">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Deactivate Customer Account</h3>
                <p className="text-[11px] text-slate-400 font-mono">{deactivatingCustomer.email}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/40 text-xs text-rose-200/90 space-y-2">
              <p className="font-semibold text-rose-300">Safe Deactivation Policy:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-300">
                <li>Account status will be changed to <strong className="text-white">Archived</strong>.</li>
                <li>Any active subscription and premium privileges will be canceled.</li>
                <li>All local customer data (documents, expenses, vehicles, etc.) is preserved safely.</li>
              </ul>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block text-slate-300 font-medium">
                To confirm deactivation, type <span className="font-mono text-rose-400 font-bold">DELETE</span> below:
              </label>
              <Input
                type="text"
                placeholder="DELETE"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDeactivatingCustomer(null);
                  setConfirmText("");
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDeactivate}
                disabled={confirmText !== "DELETE" || isProcessingAction}
                className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs gap-1.5"
              >
                {isProcessingAction ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deactivating...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Deactivate Customer</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
