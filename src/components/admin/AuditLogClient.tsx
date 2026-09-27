"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  Clock,
  Terminal,
  ChevronDown,
  ChevronUp,
  FileCode,
} from "lucide-react";
import { Input } from "@/components/ui/Input";

export interface AuditLogDTO {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogClientProps {
  initialLogs: AuditLogDTO[];
}

export function AuditLogClient({ initialLogs }: AuditLogClientProps) {
  const [logs] = useState<AuditLogDTO[]>(initialLogs);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = logs.filter((l) => {
    const matchSearch =
      search.trim() === "" ||
      l.adminEmail.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.targetId && l.targetId.toLowerCase().includes(search.toLowerCase()));

    const matchAction =
      actionFilter === "ALL" || l.action.toLowerCase() === actionFilter.toLowerCase();

    return matchSearch && matchAction;
  });

  const getActionBadge = (action: string) => {
    if (action.includes("login")) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-950/70 text-blue-400 border border-blue-800">
          LOGIN
        </span>
      );
    }
    if (action.includes("price") || action.includes("plan")) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-950/70 text-purple-400 border border-purple-800">
          PLAN CONFIG
        </span>
      );
    }
    if (action.includes("override") || action.includes("sub")) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950/70 text-amber-400 border border-amber-800">
          OVERRIDE
        </span>
      );
    }
    if (action.includes("role")) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-950/70 text-rose-400 border border-rose-800">
          ROLE CHANGE
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <Input
            type="text"
            placeholder="Search by admin email, action name, or target ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 text-xs"
          />
        </div>

        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Audit Actions</option>
            <option value="admin_login">Admin Logins</option>
            <option value="plan_price_change">Plan Price Changes</option>
            <option value="subscription_override">Subscription Overrides</option>
            <option value="role_change">Role Changes</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Administrator</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 space-y-1">
                    <ShieldCheck className="w-8 h-8 mx-auto text-slate-600 opacity-60 mb-2" />
                    <p className="font-semibold text-slate-400">0 Audit Records Found</p>
                    <p className="text-[11px] text-slate-500">
                      Audit events are logged automatically whenever administrative actions occur.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white">{log.adminEmail}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {getActionBadge(log.action)}
                          <span className="font-mono text-[11px] text-slate-400">{log.action}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                        {log.targetType ? `${log.targetType}: ${log.targetId || "n/a"}` : "system"}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {log.ipAddress || "127.0.0.1"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {log.details ? (
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                          >
                            <span>Payload</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[11px]">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded JSON Inspector Modal / Card */}
      {expandedId && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <FileCode className="w-4 h-4 text-indigo-400" />
              <span>Audit Payload Viewer (ID: {expandedId})</span>
            </span>
            <button
              onClick={() => setExpandedId(null)}
              className="text-slate-500 hover:text-white"
            >
              Close
            </button>
          </div>
          <pre className="text-indigo-300 overflow-x-auto p-2 bg-slate-900 rounded-lg max-h-48 text-[11px]">
            {(() => {
              const item = logs.find((l) => l.id === expandedId);
              try {
                return JSON.stringify(JSON.parse(item?.details || "{}"), null, 2);
              } catch {
                return item?.details || "No details";
              }
            })()}
          </pre>
        </div>
      )}
    </div>
  );
}
