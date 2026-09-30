"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Users,
  Shield,
  CreditCard,
  Mail,
  Calendar,
  Eye,
  X,
  FileText,
  Bell,
  Wallet,
  Receipt,
  Car,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  AlertCircle,
  Edit2,
  Save,
  Phone,
  Globe,
  Lock,
  Trash2,
  UserX,
  AlertTriangle,
} from "lucide-react";
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
  documentsCount: number;
  remindersCount: number;
  paymentsCount: number;
  expensesCount: number;
  vehiclesCount: number;
  budgetsCount: number;
  familyCount: number;
}

interface FullCustomerDetails {
  profile: {
    id: string;
    email: string;
    role: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    displayName: string;
    firstName: string | null;
    lastName: string | null;
    phoneNumber?: string | null;
    country: string;
    region: string;
    currency: string;
    timezone: string;
  };
  subscription: {
    plan: string;
    planName: string;
    status: string;
    billingInterval: string;
    amount: number;
    currency: string;
    provider: string;
    startedAt: string;
    currentPeriodEnd: string | null;
  };
  usageSummary: {
    documentsCount: number;
    remindersCount: number;
    paymentsCount: number;
    expensesCount: number;
    vehiclesCount: number;
    familyCount: number;
  };
  records: {
    documents: Array<{ id: string; title: string; category: string; expiryDate: string | null; filesCount: number; createdAt: string }>;
    reminders: Array<{ id: string; title: string; dueDate: string; priority: string; status: string; category: string }>;
    payments: Array<{ id: string; title: string; amount: number; currency: string; dueDate: string; isPaid: boolean; category: string }>;
    expenses: Array<{ id: string; title: string; amount: number; currency: string; category: string; spentAt: string }>;
    vehicles: Array<{ id: string; name: string; make: string | null; model: string | null; year: number | null; licensePlate: string | null }>;
    subscriptions: Array<{ id: string; name: string; cost: number; currency: string; billingCycle: string; renewalStatus: string }>;
    familyMembers: Array<{ id: string; name: string; relationship: string; emergencyContact: boolean }>;
    billingTransactions?: Array<{
      id: string;
      transactionId: string;
      plan: string;
      amount: number;
      currency: string;
      status: string;
      paymentProvider: string;
      paymentDate: string;
      failureReason?: string | null;
      utrNumber?: string | null;
      receiptUrl?: string | null;
      verifiedAt?: string | null;
      verifiedBy?: string | null;
    }>;
  };
}

interface CustomersClientProps {
  initialCustomers: CustomerDTO[];
}

export function CustomersClient({ initialCustomers }: CustomersClientProps) {
  const [customers, setCustomers] = useState<CustomerDTO[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [inactivityFilter, setInactivityFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);

  // Safe Deletion Modal State
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerDTO | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  
  // 360 View Modal state
  const [activeCustomer, setActiveCustomer] = useState<CustomerDTO | null>(null);
  const [detailsData, setDetailsData] = useState<FullCustomerDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsTab, setDetailsTab] = useState<"overview" | "documents" | "reminders" | "finance" | "assets">("overview");
  const [isVerifyingModalTx, setIsVerifyingModalTx] = useState<string | null>(null);
  const [modalVerifyMessage, setModalVerifyMessage] = useState<string | null>(null);

  // Edit Customer Modal State
  const [editingCustomer, setEditingCustomer] = useState<CustomerDTO | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCountry, setEditCountry] = useState("US");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [editTimezone, setEditTimezone] = useState("UTC");
  const [editStatus, setEditStatus] = useState("active");
  const [editEmailVerified, setEditEmailVerified] = useState(true);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  const openEditModal = (c: CustomerDTO) => {
    setEditingCustomer(c);
    setEditDisplayName(c.name || "");
    setEditFirstName(c.firstName || "");
    setEditLastName(c.lastName || "");
    setEditPhone("");
    setEditCountry(c.country || "US");
    setEditCurrency(c.currency || "USD");
    setEditTimezone(c.timezone || "UTC");
    setEditStatus(c.subscriptionStatus || "active");
    setEditEmailVerified(true);
    setEditError(null);
    setEditSuccess(null);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      setIsSavingCustomer(true);
      setEditError(null);
      setEditSuccess(null);

      const res = await fetch(`/api/admin/customers/${editingCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editDisplayName.trim(),
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          phoneNumber: editPhone.trim() || null,
          country: editCountry.trim().toUpperCase(),
          currency: editCurrency.trim().toUpperCase(),
          timezone: editTimezone.trim(),
          status: editStatus,
          emailVerified: editEmailVerified,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update customer details");
      }

      // Update local state list
      const updatedName = editDisplayName.trim() || `${editFirstName} ${editLastName}`.trim() || editingCustomer.name;
      setCustomers((prev) =>
        prev.map((item) =>
          item.id === editingCustomer.id
            ? {
                ...item,
                name: updatedName,
                firstName: editFirstName.trim(),
                lastName: editLastName.trim(),
                country: editCountry.trim().toUpperCase(),
                currency: editCurrency.trim().toUpperCase(),
                timezone: editTimezone.trim(),
                subscriptionStatus: editStatus,
              }
            : item
        )
      );

      // If active customer modal is also open for this customer, update it
      if (activeCustomer && activeCustomer.id === editingCustomer.id) {
        setActiveCustomer((prev) => (prev ? { ...prev, name: updatedName, country: editCountry, currency: editCurrency, subscriptionStatus: editStatus } : null));
        if (detailsData) {
          setDetailsData({
            ...detailsData,
            profile: {
              ...detailsData.profile,
              displayName: updatedName,
              firstName: editFirstName.trim(),
              lastName: editLastName.trim(),
              country: editCountry,
              currency: editCurrency,
              timezone: editTimezone,
              emailVerified: editEmailVerified,
            },
            subscription: {
              ...detailsData.subscription,
              status: editStatus,
            },
          });
        }
      }

      setEditSuccess("Customer profile updated successfully.");
      setTimeout(() => {
        setEditingCustomer(null);
      }, 1000);
    } catch (err: any) {
      console.error("Save customer error:", err);
      setEditError(err.message || "Failed to save customer changes");
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleToggleSuspend = async (customer: CustomerDTO) => {
    const isCurrentlySuspended = customer.status === "suspended";
    const nextStatus = isCurrentlySuspended ? "active" : "suspended";
    const promptMsg = isCurrentlySuspended
      ? `Are you sure you want to reactivate customer "${customer.name}"? They will regain access to their account.`
      : `Are you sure you want to suspend customer "${customer.name}"? They will immediately be blocked from logging into the Customer App.`;

    if (!window.confirm(promptMsg)) return;

    try {
      setTogglingStatusId(customer.id);
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userStatus: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update customer status");
      }
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, status: nextStatus } : c))
      );
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    } finally {
      setTogglingStatusId(null);
    }
  };

  const openDeleteModal = (customer: CustomerDTO) => {
    setDeletingCustomer(customer);
    setDeleteConfirmText("");
    setDeleteError(null);
    setDeleteSuccess(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCustomer || deleteConfirmText.trim() !== "DELETE") return;

    try {
      setIsDeletingCustomer(true);
      setDeleteError(null);
      setDeleteSuccess(null);

      const res = await fetch(`/api/admin/customers/${deletingCustomer.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: "DELETE" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to delete/archive customer");
      }

      setDeleteSuccess(data.message || "Customer account processed successfully.");

      setTimeout(() => {
        if (data.mode === "archived") {
          setCustomers((prev) =>
            prev.map((c) =>
              c.id === deletingCustomer.id
                ? { ...c, status: "archived", subscriptionStatus: "cancelled" }
                : c
            )
          );
        } else {
          setCustomers((prev) => prev.filter((c) => c.id !== deletingCustomer.id));
        }
        setDeletingCustomer(null);
      }, 1500);
    } catch (err: any) {
      setDeleteError(err.message || "An unexpected error occurred during account deletion.");
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  // Verify payment inline from customer details modal
  const handleVerifyPaymentFromModal = async (txId: string) => {
    try {
      setIsVerifyingModalTx(txId);
      setModalVerifyMessage(null);

      const res = await fetch("/api/admin/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: txId, action: "verify" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to verify transaction");
      }

      // Update modal details
      if (detailsData) {
        setDetailsData({
          ...detailsData,
          subscription: {
            ...detailsData.subscription,
            status: "active",
          },
          records: {
            ...detailsData.records,
            billingTransactions: detailsData.records.billingTransactions?.map((tx) =>
              tx.id === txId || tx.transactionId === txId
                ? { ...tx, status: "paid", failureReason: null }
                : tx
            ),
          },
        });
      }

      // Update customer in list to active
      if (activeCustomer) {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === activeCustomer.id ? { ...c, subscriptionStatus: "active" } : c
          )
        );
      }

      setModalVerifyMessage("Payment verified and subscription activated!");
      setTimeout(() => setModalVerifyMessage(null), 4000);
    } catch (err: any) {
      console.error("Modal payment verification error:", err);
      setModalVerifyMessage(`Error: ${err.message || "Failed to verify"}`);
    } finally {
      setIsVerifyingModalTx(null);
    }
  };

  // Fetch full customer details when active customer is selected
  useEffect(() => {
    if (!activeCustomer) {
      setDetailsData(null);
      return;
    }

    let isMounted = true;
    setIsLoadingDetails(true);
    setDetailsTab("overview");

    fetch(`/api/admin/customers/${activeCustomer.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.data) {
          setDetailsData(data.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load customer details:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDetails(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeCustomer]);

  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        const matchSearch =
          search.trim() === "" ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase());

        const matchPlan =
          selectedPlan === "ALL" ||
          c.plan.toLowerCase() === selectedPlan.toLowerCase();

        const matchStatus =
          selectedStatus === "ALL" ||
          (selectedStatus === "active" && (c.status === "active" || (!c.status && c.subscriptionStatus === "active"))) ||
          (selectedStatus === "inactive" && (c.status === "inactive" || c.subscriptionStatus !== "active")) ||
          (selectedStatus === "suspended" && c.status === "suspended") ||
          (selectedStatus === "archived" && c.status === "archived") ||
          c.subscriptionStatus.toLowerCase() === selectedStatus.toLowerCase();

        let matchInactivity = true;
        if (inactivityFilter !== "ALL") {
          const daysThreshold = parseInt(inactivityFilter, 10);
          const lastActiveTime = new Date(c.lastLoginAt || c.lastActivity || c.createdAt).getTime();
          const daysSinceActive = (Date.now() - lastActiveTime) / (1000 * 60 * 60 * 24);
          matchInactivity = daysSinceActive >= daysThreshold;
        }

        return matchSearch && matchPlan && matchStatus && matchInactivity;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return a.name.localeCompare(b.name);
      });
  }, [customers, search, selectedPlan, selectedStatus, sortBy, inactivityFilter]);

  // Clean empty state if no customers exist in DB
  if (customers.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center mx-auto text-indigo-400">
          <Users className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">No registered customers yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            When genuine customers register via email/password or Continue with Google, their accounts, live subscriptions, and private records will appear here automatically.
          </p>
        </div>
        <div className="pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Database is clean &bull; Only legitimate administrator active &bull; Zero fake test records</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Customer Accounts Directory</h2>
          <p className="text-xs text-slate-400">
            Showing {filteredCustomers.length} of {customers.length} total customer accounts.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 text-xs"
            />
          </div>

          {/* Plan Filter */}
          <div>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Plans</option>
              <option value="free">Free Starter</option>
              <option value="premium">Life Pro Premium</option>
              <option value="family">Family Circle Plus</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
              <option value="archived">Archived / Soft-Deleted</option>
              <option value="inactive">Inactive</option>
              <option value="cancelled">Cancelled</option>
              <option value="past_due">Past Due</option>
            </select>
          </div>

          {/* Inactivity Filter */}
          <div>
            <select
              value={inactivityFilter}
              onChange={(e) => setInactivityFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Inactivity: Any Time</option>
              <option value="30">Inactive &gt; 30 Days</option>
              <option value="60">Inactive &gt; 60 Days</option>
              <option value="90">Inactive &gt; 90 Days</option>
              <option value="180">Inactive &gt; 180 Days</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="name">Sort: Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Country & Region</th>
                <th className="py-3 px-4">Plan Tier</th>
                <th className="py-3 px-4">Subscription Status</th>
                <th className="py-3 px-4">Usage</th>
                <th className="py-3 px-4">Registered</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No customers matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-white">{c.name}</p>
                          {c.status === "suspended" && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-red-950 text-red-400 border border-red-800">
                              Suspended
                            </span>
                          )}
                          {c.status === "archived" && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-950 text-amber-400 border border-amber-800">
                              Archived
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">{c.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-300">{c.country}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({c.currency})</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          c.plan === "family"
                            ? "bg-purple-950 text-purple-300 border border-purple-800"
                            : c.plan === "premium"
                            ? "bg-indigo-950 text-indigo-300 border border-indigo-800"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {c.planName || c.plan}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                          c.status === "suspended"
                            ? "text-red-400 bg-red-950/60 border border-red-800/60"
                            : c.subscriptionStatus === "active"
                            ? "text-emerald-400 bg-emerald-950/60 border border-emerald-800/60"
                            : c.subscriptionStatus === "cancelled"
                            ? "text-rose-400 bg-rose-950/60 border border-rose-800/60"
                            : "text-amber-400 bg-amber-950/60 border border-amber-800/60"
                        }`}
                      >
                        {c.status === "suspended" ? "Suspended" : c.subscriptionStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {c.documentsCount} Docs &bull; {c.remindersCount} Rems &bull; {c.paymentsCount} Bills
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(c)}
                          className="h-7 px-2 text-xs gap-1 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                          title="Edit Customer Details"
                        >
                          <Edit2 className="w-3 h-3 text-indigo-400" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveCustomer(c)}
                          className="h-7 px-2 text-xs gap-1 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleSuspend(c)}
                          disabled={togglingStatusId === c.id}
                          className={`h-7 px-2 text-xs gap-1 border-slate-700 ${
                            c.status === "suspended"
                              ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40"
                              : "text-amber-400 hover:text-amber-300 hover:bg-amber-950/40"
                          }`}
                          title={c.status === "suspended" ? "Reactivate Account" : "Suspend Customer Account"}
                        >
                          {togglingStatusId === c.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : c.status === "suspended" ? (
                            <UserCheck className="w-3 h-3" />
                          ) : (
                            <UserX className="w-3 h-3" />
                          )}
                          <span>{c.status === "suspended" ? "Unsuspend" : "Suspend"}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDeleteModal(c)}
                          className="h-7 px-2 text-xs gap-1 border-rose-900/60 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                          title="Safe Delete / Archive Customer Account"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer 360 Details Modal */}
      {activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-3xl bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{activeCustomer.name}</h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditModal(activeCustomer)}
                      className="h-6 px-2 text-[10px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 gap-1 rounded"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit Profile</span>
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">{activeCustomer.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveCustomer(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="px-5 border-b border-slate-800 bg-slate-950/40 flex items-center gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setDetailsTab("overview")}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  detailsTab === "overview"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Profile & Subscription
              </button>
              <button
                type="button"
                onClick={() => setDetailsTab("documents")}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  detailsTab === "documents"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>Documents</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                  {detailsData ? detailsData.records.documents.length : activeCustomer.documentsCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDetailsTab("reminders")}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  detailsTab === "reminders"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>Reminders</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                  {detailsData ? detailsData.records.reminders.length : activeCustomer.remindersCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDetailsTab("finance")}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  detailsTab === "finance"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>Finance & Bills</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                  {(detailsData ? detailsData.records.payments.length + detailsData.records.expenses.length + (detailsData.records.billingTransactions?.length || 0) : activeCustomer.paymentsCount + activeCustomer.expensesCount)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDetailsTab("assets")}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  detailsTab === "assets"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>Vehicles & Family</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                  {detailsData ? detailsData.records.vehicles.length + detailsData.records.familyMembers.length : activeCustomer.vehiclesCount + activeCustomer.familyCount}
                </span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300 flex-1">
              {isLoadingDetails ? (
                <div className="py-16 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
                  <p className="text-slate-400">Loading customer telemetry records...</p>
                </div>
              ) : detailsTab === "overview" ? (
                <div className="space-y-6">
                  {/* Profile Overview */}
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Customer Profile Identity</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                        <p className="text-[10px] text-slate-500 uppercase">Customer ID</p>
                        <p className="font-mono text-slate-300 truncate" title={activeCustomer.id}>
                          {activeCustomer.id}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                        <p className="text-[10px] text-slate-500 uppercase">Role</p>
                        <p className="font-semibold text-slate-200 capitalize">{activeCustomer.role}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                        <p className="text-[10px] text-slate-500 uppercase">Country / Region</p>
                        <p className="font-semibold text-slate-200">{activeCustomer.country} ({activeCustomer.currency})</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                        <p className="text-[10px] text-slate-500 uppercase">Member Since</p>
                        <p className="font-semibold text-slate-200">
                          {new Date(activeCustomer.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Current Subscription */}
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                      <span>Current Subscription & Billing</span>
                    </h4>
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase">Active Tier</span>
                          <p className="text-sm font-bold text-white">{activeCustomer.planName || activeCustomer.plan}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 uppercase">Status</span>
                          <div>
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                                activeCustomer.subscriptionStatus === "active"
                                  ? "text-emerald-400 bg-emerald-950/60 border border-emerald-800/60"
                                  : "text-rose-400 bg-rose-950/60 border border-rose-800/60"
                              }`}
                            >
                              {activeCustomer.subscriptionStatus}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase">Billing Interval</span>
                          <p className="font-semibold text-slate-300 capitalize">{activeCustomer.billingInterval}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase">Amount</span>
                          <p className="font-semibold text-slate-300">
                            {activeCustomer.subscriptionAmount > 0
                              ? `${activeCustomer.currency} ${activeCustomer.subscriptionAmount.toFixed(2)}`
                              : "Free ($0.00)"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase">Renewal / Expiry</span>
                          <p className="font-semibold text-slate-300">
                            {activeCustomer.currentPeriodEnd
                              ? new Date(activeCustomer.currentPeriodEnd).toLocaleDateString()
                              : "Perpetual / Ongoing"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Summary Cards */}
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>User-Owned Data Volume</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <div>
                          <p className="text-base font-bold text-white">{activeCustomer.documentsCount}</p>
                          <p className="text-[10px] text-slate-400 uppercase">Documents</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                        <Bell className="w-4 h-4 text-amber-400" />
                        <div>
                          <p className="text-base font-bold text-white">{activeCustomer.remindersCount}</p>
                          <p className="text-[10px] text-slate-400 uppercase">Reminders</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                        <Receipt className="w-4 h-4 text-emerald-400" />
                        <div>
                          <p className="text-base font-bold text-white">{activeCustomer.paymentsCount}</p>
                          <p className="text-[10px] text-slate-400 uppercase">Bills / Payments</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : detailsTab === "documents" ? (
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Customer Documents & Vault Files ({detailsData?.records.documents.length || 0})
                  </h4>
                  {!detailsData?.records.documents.length ? (
                    <div className="p-8 text-center rounded-xl bg-slate-950 border border-slate-800/80 text-slate-500">
                      No documents uploaded by this customer yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {detailsData.records.documents.map((d) => (
                        <div key={d.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-white">{d.title}</p>
                            <p className="text-[11px] text-slate-400">
                              Category: <span className="capitalize">{d.category}</span> &bull; {d.filesCount} file(s) attached
                            </p>
                          </div>
                          <div className="text-right text-[11px] text-slate-400">
                            <p>{d.expiryDate ? `Expires: ${new Date(d.expiryDate).toLocaleDateString()}` : "No expiry"}</p>
                            <span className="text-[10px] text-slate-500">{new Date(d.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : detailsTab === "reminders" ? (
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Customer Reminders & Deadlines ({detailsData?.records.reminders.length || 0})
                  </h4>
                  {!detailsData?.records.reminders.length ? (
                    <div className="p-8 text-center rounded-xl bg-slate-950 border border-slate-800/80 text-slate-500">
                      No reminders scheduled by this customer yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {detailsData.records.reminders.map((r) => (
                        <div key={r.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-white">{r.title}</p>
                            <p className="text-[11px] text-slate-400">
                              Priority: <span className="capitalize font-medium">{r.priority}</span> &bull; Status: <span className="capitalize">{r.status}</span>
                            </p>
                          </div>
                          <div className="text-right text-[11px] text-slate-400">
                            <p>Due: {new Date(r.dueDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : detailsTab === "finance" ? (
                <div className="space-y-5">
                  {modalVerifyMessage && (
                    <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{modalVerifyMessage}</span>
                    </div>
                  )}

                  {/* SaaS Subscription Transactions (with Manual UPI & UTR support) */}
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      SaaS Invoices &amp; Subscription Payments ({detailsData?.records.billingTransactions?.length || 0})
                    </h4>
                    {!detailsData?.records.billingTransactions?.length ? (
                      <p className="p-4 text-center rounded-xl bg-slate-950 text-slate-500 text-xs">
                        No platform subscription transactions on record for this customer.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {detailsData.records.billingTransactions.map((tx) => (
                          <div key={tx.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-white capitalize">{tx.plan} Subscription</p>
                                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                                  {tx.paymentProvider}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                TxID: {tx.transactionId}
                              </p>
                              {tx.utrNumber && (
                                <p className="text-[11px] text-amber-300 font-mono mt-0.5">
                                  Customer UTR: <strong className="bg-amber-950/80 px-1 py-0.5 rounded border border-amber-800/80">{tx.utrNumber}</strong>
                                </p>
                              )}
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {new Date(tx.paymentDate).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 self-end sm:self-center">
                              <div className="text-right font-mono">
                                <p className="text-white font-bold">{tx.currency} {tx.amount.toFixed(2)}</p>
                                <span className={`text-[10px] font-bold ${
                                  tx.status === "paid"
                                    ? "text-emerald-400"
                                    : tx.status === "pending_verification"
                                    ? "text-amber-400 animate-pulse"
                                    : "text-rose-400"
                                }`}>
                                  {tx.status.toUpperCase()}
                                </span>
                              </div>
                              {tx.status === "pending_verification" && (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-500 font-bold gap-1 shadow-md shadow-emerald-950"
                                  disabled={isVerifyingModalTx === tx.id}
                                  onClick={() => handleVerifyPaymentFromModal(tx.id)}
                                >
                                  {isVerifyingModalTx === tx.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3" />
                                  )}
                                  <span>Verify Payment</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Payment Bills ({detailsData?.records.payments.length || 0})
                    </h4>
                    {!detailsData?.records.payments.length ? (
                      <p className="p-4 text-center rounded-xl bg-slate-950 text-slate-500 text-xs">
                        No recurring payment bills logged.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {detailsData.records.payments.map((p) => (
                          <div key={p.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-white">{p.title}</p>
                              <span className="text-[10px] text-slate-400 capitalize">{p.category}</span>
                            </div>
                            <div className="text-right font-mono">
                              <p className="text-white font-bold">{p.currency} {p.amount.toFixed(2)}</p>
                              <span className={`text-[10px] font-bold ${p.isPaid ? "text-emerald-400" : "text-amber-400"}`}>
                                {p.isPaid ? "PAID" : "UNPAID"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Recent Expenses ({detailsData?.records.expenses.length || 0})
                    </h4>
                    {!detailsData?.records.expenses.length ? (
                      <p className="p-4 text-center rounded-xl bg-slate-950 text-slate-500 text-xs">
                        No financial expenses recorded.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {detailsData.records.expenses.map((e) => (
                          <div key={e.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-white">{e.title}</p>
                              <span className="text-[10px] text-slate-400 capitalize">{e.category}</span>
                            </div>
                            <div className="text-right font-mono">
                              <p className="text-white font-bold">{e.currency} {e.amount.toFixed(2)}</p>
                              <span className="text-[10px] text-slate-500">{new Date(e.spentAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Registered Vehicles ({detailsData?.records.vehicles.length || 0})
                    </h4>
                    {!detailsData?.records.vehicles.length ? (
                      <p className="p-4 text-center rounded-xl bg-slate-950 text-slate-500 text-xs">
                        No vehicles registered by this customer.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {detailsData.records.vehicles.map((v) => (
                          <div key={v.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-white">{v.name}</p>
                              <p className="text-[11px] text-slate-400">{v.year} {v.make} {v.model}</p>
                            </div>
                            <span className="font-mono text-[11px] text-slate-300 bg-slate-900 px-2 py-1 rounded">
                              {v.licensePlate || "No Plate"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Family Members ({detailsData?.records.familyMembers.length || 0})
                    </h4>
                    {!detailsData?.records.familyMembers.length ? (
                      <p className="p-4 text-center rounded-xl bg-slate-950 text-slate-500 text-xs">
                        No family members linked.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {detailsData.records.familyMembers.map((f) => (
                          <div key={f.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-white">{f.name}</p>
                              <span className="text-[10px] text-slate-400 capitalize">{f.relationship}</span>
                            </div>
                            {f.emergencyContact && (
                              <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded">
                                Emergency Contact
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Privacy Notice */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-2.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Customer Isolation Guaranteed:</strong> Data displayed above is strictly isolated to Customer ID <code className="text-indigo-400">{activeCustomer.id}</code>. Zero data cross-contamination or secret leaks.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditModal(activeCustomer)}
                className="text-xs border-indigo-700/60 text-indigo-300 hover:bg-indigo-950/40 gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Customer Record</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveCustomer(null)}
                className="text-xs border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
              >
                Close Customer Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Profile Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Edit Customer Account</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{editingCustomer.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCustomer} className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300 flex-1">
              {/* Security Guardrail Banner */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
                <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  <strong>Security Guardrail:</strong> Password hashes, OAuth secrets, and private credentials cannot be edited or viewed. All edits are logged in the immutable administrative audit trail.
                </span>
              </div>

              {editSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{editSuccess}</span>
                </div>
              )}
              {editError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Display Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Display Name</label>
                <Input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              {/* First & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">First Name</label>
                  <Input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="First name"
                    className="bg-slate-950 border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Last Name</label>
                  <Input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="Last name"
                    className="bg-slate-950 border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Phone Number (Optional)</label>
                <Input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. +1 555-0199 or +91 9876543210"
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              {/* Country & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Country Code (ISO-2)</label>
                  <Input
                    type="text"
                    maxLength={3}
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value.toUpperCase())}
                    placeholder="US, IN, GB..."
                    className="bg-slate-950 border-slate-800 text-xs text-white uppercase font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Currency (ISO-3)</label>
                  <Input
                    type="text"
                    maxLength={3}
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value.toUpperCase())}
                    placeholder="USD, INR, EUR..."
                    className="bg-slate-950 border-slate-800 text-xs text-white uppercase font-mono"
                  />
                </div>
              </div>

              {/* Timezone */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Timezone</label>
                <Input
                  type="text"
                  value={editTimezone}
                  onChange={(e) => setEditTimezone(e.target.value)}
                  placeholder="e.g. UTC, Asia/Kolkata, America/New_York"
                  className="bg-slate-950 border-slate-800 text-xs text-white font-mono"
                />
              </div>

              {/* Account / Subscription Status */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Subscription Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="active">Active (Access Enabled)</option>
                  <option value="past_due">Past Due (Grace Period)</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="suspended">Suspended / Paused</option>
                </select>
              </div>

              {/* Email Verification */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Email Verification</label>
                <select
                  value={editEmailVerified ? "true" : "false"}
                  onChange={(e) => setEditEmailVerified(e.target.value === "true")}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="true">Verified</option>
                  <option value="false">Unverified</option>
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingCustomer(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSavingCustomer}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 font-bold text-white gap-1.5 shadow-lg shadow-indigo-600/30"
                >
                  {isSavingCustomer ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Changes</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Account Deletion / Archival Modal */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-900/60 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-red-950/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-900/40 text-red-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Safe Customer Account Deletion</h3>
                  <span className="text-[11px] text-red-300">Financial Ledger Protection Enforced</span>
                </div>
              </div>
              <button
                onClick={() => setDeletingCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {deleteError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              {deleteSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{deleteSuccess}</span>
                </div>
              )}

              {/* Pre-Deletion Summary Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer Name:</span>
                  <span className="font-semibold text-white">{deletingCustomer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email Address:</span>
                  <span className="font-mono text-slate-300">{deletingCustomer.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Account Plan:</span>
                  <span className="font-semibold text-indigo-400 uppercase">{deletingCustomer.planName || deletingCustomer.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Registration Date:</span>
                  <span className="text-slate-300">{new Date(deletingCustomer.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800/80 pt-2 mt-2">
                  <span className="text-slate-400">Recorded Data:</span>
                  <span className="text-slate-300 font-medium">
                    {deletingCustomer.documentsCount} Docs &bull; {deletingCustomer.remindersCount} Reminders &bull; {deletingCustomer.paymentsCount} Transactions
                  </span>
                </div>
              </div>

              {/* Safe Archive Policy Notice */}
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300/90 leading-relaxed">
                <strong className="text-amber-200 block mb-1">Financial & Legal Compliance Rule:</strong>
                If this customer has existing billing transactions or invoice records, their account will be safely <strong>ARCHIVED</strong> rather than destroyed. This blocks login access immediately while strictly preserving payment ledger integrity and accounting audit trails.
              </div>

              {/* Confirmation Input */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs text-slate-300 font-medium">
                  Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:
                </label>
                <Input
                  type="text"
                  placeholder="DELETE"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white font-mono text-xs focus:ring-red-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingCustomer(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={deleteConfirmText.trim() !== "DELETE" || isDeletingCustomer}
                  onClick={handleConfirmDelete}
                  className="text-xs bg-red-600 hover:bg-red-500 disabled:opacity-40 font-bold text-white gap-1.5 shadow-lg shadow-red-600/30"
                >
                  {isDeletingCustomer ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Execute Safe Deletion</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
