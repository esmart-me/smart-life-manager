"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Users,
  Shield,
  CreditCard,
  Mail,
  Calendar,
  Globe,
  Sparkles,
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
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SUPPORTED_REGIONS } from "@/lib/regions";

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

interface CustomersClientProps {
  initialCustomers: CustomerDTO[];
}

export function CustomersClient({ initialCustomers }: CustomersClientProps) {
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("ALL");
  const [selectedPlan, setSelectedPlan] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [activeCustomer, setActiveCustomer] = useState<CustomerDTO | null>(null);

  const filteredCustomers = useMemo(() => {
    return initialCustomers
      .filter((c) => {
        // Search filter (Name or Email)
        const matchSearch =
          search.trim() === "" ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase());

        // Country filter
        const matchCountry =
          selectedCountry === "ALL" ||
          c.country.toUpperCase() === selectedCountry.toUpperCase();

        // Plan filter (All, Free, Premium, Family)
        const matchPlan =
          selectedPlan === "ALL" ||
          c.plan.toLowerCase() === selectedPlan.toLowerCase();

        // Status filter (All, Active, Cancelled, Past Due, Inactive)
        const matchStatus =
          selectedStatus === "ALL" ||
          (selectedStatus === "active" && c.subscriptionStatus === "active") ||
          (selectedStatus === "inactive" && c.subscriptionStatus !== "active") ||
          c.subscriptionStatus.toLowerCase() === selectedStatus.toLowerCase();

        return matchSearch && matchCountry && matchPlan && matchStatus;
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
  }, [initialCustomers, search, selectedCountry, selectedPlan, selectedStatus, sortBy]);

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
            When customers register via email/password or Continue with Google, their accounts, subscription status, and usage telemetry will automatically appear here.
          </p>
        </div>
        <div className="pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Database is clean &bull; Admin account preserved &bull; Zero fake test records</span>
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

      {/* Customer Details Modal */}
      {activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
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

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
              {/* Profile Overview */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Customer Profile</span>
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

              {/* Usage Summary */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Customer Usage Telemetry (Module Counts)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-950 text-blue-400 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">{activeCustomer.documentsCount}</p>
                      <p className="text-[10px] text-slate-400 uppercase">Documents</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-950 text-amber-400 flex items-center justify-center">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">{activeCustomer.remindersCount}</p>
                      <p className="text-[10px] text-slate-400 uppercase">Reminders</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">{activeCustomer.paymentsCount}</p>
                      <p className="text-[10px] text-slate-400 uppercase">Payments / Bills</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-950 text-sky-400 flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">{activeCustomer.expensesCount}</p>
                      <p className="text-[10px] text-slate-400 uppercase">Expenses</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">{activeCustomer.vehiclesCount}</p>
                      <p className="text-[10px] text-slate-400 uppercase">Vehicles</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-950 text-purple-400 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">{activeCustomer.familyCount}</p>
                      <p className="text-[10px] text-slate-400 uppercase">Family Members</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-2.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Admin Read-Only View:</strong> Customer passwords, private encryption keys, and document attachments are protected by server-side zero-trust isolation and are never exposed to administrative views.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveCustomer(null)}
                className="text-xs border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
              >
                Close Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
