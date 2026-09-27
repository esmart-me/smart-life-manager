"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  Users,
  Shield,
  CreditCard,
  Mail,
  Calendar,
  Globe,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { SUPPORTED_REGIONS } from "@/lib/regions";

export interface CustomerDTO {
  id: string;
  email: string;
  name: string;
  country: string;
  currency: string;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
  lastActivity: string;
  documentsCount: number;
  vehiclesCount: number;
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

  const filteredCustomers = useMemo(() => {
    return initialCustomers
      .filter((c) => {
        // Search filter
        const matchSearch =
          search.trim() === "" ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase());

        // Country filter
        const matchCountry =
          selectedCountry === "ALL" ||
          c.country.toUpperCase() === selectedCountry.toUpperCase();

        // Plan filter
        const matchPlan =
          selectedPlan === "ALL" ||
          c.plan.toLowerCase() === selectedPlan.toLowerCase();

        // Status filter
        const matchStatus =
          selectedStatus === "ALL" ||
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

          {/* Country Filter */}
          <div>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Countries</option>
              {SUPPORTED_REGIONS.map((r) => (
                <option key={r.countryCode} value={r.countryCode}>
                  {r.flag} {r.country} ({r.countryCode})
                </option>
              ))}
            </select>
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
                <th className="py-3 px-4">Currency</th>
                <th className="py-3 px-4">Plan Tier</th>
                <th className="py-3 px-4">Subscription</th>
                <th className="py-3 px-4">Usage</th>
                <th className="py-3 px-4">Registered</th>
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
                      <span className="font-medium text-slate-300">{c.country}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-300 font-semibold">{c.currency}</span>
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
                        {c.plan}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                          c.subscriptionStatus === "active"
                            ? "text-emerald-400 bg-emerald-950/60"
                            : c.subscriptionStatus === "cancelled"
                            ? "text-rose-400 bg-rose-950/60"
                            : "text-amber-400 bg-amber-950/60"
                        }`}
                      >
                        {c.subscriptionStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {c.documentsCount} Docs &bull; {c.vehiclesCount} Cars
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
