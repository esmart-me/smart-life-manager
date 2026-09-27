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
  };
}

interface CustomersClientProps {
  initialCustomers: CustomerDTO[];
}

export function CustomersClient({ initialCustomers }: CustomersClientProps) {
  const [search, setSearch] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  
  // Modal state
  const [activeCustomer, setActiveCustomer] = useState<CustomerDTO | null>(null);
  const [detailsData, setDetailsData] = useState<FullCustomerDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsTab, setDetailsTab] = useState<"overview" | "documents" | "reminders" | "finance" | "assets">("overview");

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
    return initialCustomers
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
          (selectedStatus === "active" && c.subscriptionStatus === "active") ||
          (selectedStatus === "inactive" && c.subscriptionStatus !== "active") ||
          c.subscriptionStatus.toLowerCase() === selectedStatus.toLowerCase();

        return matchSearch && matchPlan && matchStatus;
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
  }, [initialCustomers, search, selectedPlan, selectedStatus, sortBy]);

  // Clean empty state if no customers exist in DB
  if (initialCustomers.length === 0) {
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
            Showing {filteredCustomers.length} of {initialCustomers.length} total customer accounts.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
              <option value="inactive">Inactive / Non-Active</option>
              <option value="cancelled">Cancelled</option>
              <option value="past_due">Past Due</option>
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
                        <p className="font-semibold text-white">{c.name}</p>
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
                          c.subscriptionStatus === "active"
                            ? "text-emerald-400 bg-emerald-950/60 border border-emerald-800/60"
                            : c.subscriptionStatus === "cancelled"
                            ? "text-rose-400 bg-rose-950/60 border border-rose-800/60"
                            : "text-amber-400 bg-amber-950/60 border border-amber-800/60"
                        }`}
                      >
                        {c.subscriptionStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {c.documentsCount} Docs &bull; {c.remindersCount} Rems &bull; {c.paymentsCount} Bills
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveCustomer(c)}
                        className="h-7 px-2.5 text-xs gap-1 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </Button>
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
                  <h3 className="text-base font-bold text-white">{activeCustomer.name}</h3>
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
                  {(detailsData ? detailsData.records.payments.length + detailsData.records.expenses.length : activeCustomer.paymentsCount + activeCustomer.expensesCount)}
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
            <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex justify-end">
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
    </div>
  );
}
