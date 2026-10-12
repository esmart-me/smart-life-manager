"use client";

import { useState, useRef } from "react";
import {
  Download,
  Upload,
  FileJson,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  Database,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";

// CSV export sections
const CSV_SECTIONS = [
  { id: "reminders", label: "Reminders" },
  { id: "documents", label: "Documents" },
  { id: "vehicles", label: "Vehicles" },
  { id: "payments", label: "Payments" },
  { id: "expenses", label: "Expenses" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "dates", label: "Dates & Events" },
  { id: "family", label: "Family Members" },
];

type Status = { type: "success" | "error" | "info"; message: string } | null;

export function BackupDataClient() {
  // Backup/export state
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [csvLoading, setCsvLoading] = useState<string | null>(null);
  const [csvExpanded, setCsvExpanded] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("slm_last_backup") || null;
    }
    return null;
  });
  const [status, setStatus] = useState<Status>(null);

  // Restore state
  const [restorePhase, setRestorePhase] = useState<"idle" | "confirm" | "restoring" | "done">("idle");
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<Record<string, unknown> | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showStatus = (type: "success" | "error" | "info", message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 6000);
  };

  // ── JSON Backup / Export ──────────────────────────────────────────────────────

  const handleExportJson = async () => {
    setIsExportingJson(true);
    setStatus(null);
    try {
      const res = await fetch("/api/user/export?format=json");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `slm-backup-${today()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      const ts = new Date().toLocaleString();
      setLastBackupTime(ts);
      if (typeof window !== "undefined") localStorage.setItem("slm_last_backup", ts);
      showStatus("success", "Backup downloaded successfully. Keep this file in a safe place.");
    } catch (err) {
      showStatus("error", err instanceof Error ? err.message : "Failed to download backup.");
    } finally {
      setIsExportingJson(false);
    }
  };

  // ── CSV Export ────────────────────────────────────────────────────────────────

  const handleExportCsv = async (section: string) => {
    setCsvLoading(section);
    setStatus(null);
    try {
      const res = await fetch(`/api/user/export?format=csv&section=${section}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "CSV export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `slm-${section}-${today()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showStatus("success", `${section} data exported as CSV.`);
    } catch (err) {
      showStatus("error", err instanceof Error ? err.message : "Failed to export CSV.");
    } finally {
      setCsvLoading(null);
    }
  };

  // ── Restore Flow ──────────────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError(null);

    // Client-side validation
    if (!file.name.endsWith(".json")) {
      setRestoreError("Only .json backup files are accepted.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setRestoreError("Backup file exceeds 10 MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        // Basic client-side schema check
        if (!parsed._meta || parsed._meta.schema !== "slm-backup") {
          setRestoreError("This is not a valid Smart Life Manager backup file.");
          return;
        }
        setRestoreFile(file);
        setRestorePreview(parsed);
        setRestorePhase("confirm");
      } catch {
        setRestoreError("The file could not be parsed. It may be corrupted.");
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be re-selected after cancel
    e.target.value = "";
  };

  const handleRestoreCancel = () => {
    setRestorePhase("idle");
    setRestoreFile(null);
    setRestorePreview(null);
    setRestoreError(null);
  };

  const handleRestoreConfirm = async () => {
    if (!restoreFile || !restorePreview) return;
    setRestorePhase("restoring");
    setRestoreError(null);
    try {
      const text = await restoreFile.text();
      const res = await fetch("/api/user/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": String(restoreFile.size) },
        body: text,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || "Restore failed");
      }
      setRestorePhase("done");
      showStatus("success", "Backup restored successfully. Your data has been replaced.");
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : "Restore failed. Your data was not changed.");
      setRestorePhase("confirm");
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const meta = restorePreview?._meta as Record<string, string> | undefined;
  const counts = restorePreview
    ? {
        reminders: (restorePreview.reminders as unknown[])?.length ?? 0,
        documents: (restorePreview.documents as unknown[])?.length ?? 0,
        vehicles: (restorePreview.vehicles as unknown[])?.length ?? 0,
        payments: (restorePreview.payments as unknown[])?.length ?? 0,
        expenses: (restorePreview.expenses as unknown[])?.length ?? 0,
        subscriptions: (restorePreview.subscriptions as unknown[])?.length ?? 0,
        importantDates: (restorePreview.importantDates as unknown[])?.length ?? 0,
        familyMembers: (restorePreview.familyMembers as unknown[])?.length ?? 0,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* ── Section Header ── */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Backup &amp; Data Export</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Download a complete backup of your data or export individual sections as CSV.
          </p>
        </div>
      </div>

      {/* ── Status Banner ── */}
      {status && (
        <div
          className={`flex items-start gap-2.5 p-3 rounded-xl border text-sm ${
            status.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : status.type === "error"
              ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
              : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          ) : status.type === "error" ? (
            <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      {/* ── Card: JSON Backup ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileJson className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              <CardTitle className="text-sm">Full Data Backup (JSON)</CardTitle>
            </div>
            {lastBackupTime && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Last backup: {lastBackupTime}
              </span>
            )}
          </div>
          <CardDescription>
            Downloads a complete, portable backup of all your data including reminders, documents,
            vehicles, finance, subscriptions, family, important dates, and preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* What's included */}
            <div className="p-3.5 rounded-xl glass-subtle text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Info className="w-3 h-3" />
                What&apos;s included:
              </p>
              <p>✓ Profile &amp; preferences &nbsp; ✓ Reminders &amp; history &nbsp; ✓ Documents (metadata only) &nbsp; ✓ Vehicles</p>
              <p>✓ Finance &amp; expenses &amp; budgets &nbsp; ✓ Subscriptions &nbsp; ✓ Dates &amp; events &nbsp; ✓ Family members</p>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-300/30 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Shield className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                <strong>Security:</strong> Passwords, session tokens, payment secrets, API keys, and admin data are{" "}
                <strong>never</strong> included in backups.
              </span>
            </div>

            <Button
              type="button"
              onClick={handleExportJson}
              isLoading={isExportingJson}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Full Backup</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Card: CSV Exports ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-sm">Export as CSV</CardTitle>
            </div>
            <button
              type="button"
              onClick={() => setCsvExpanded((v) => !v)}
              className="text-xs text-brand-600 dark:text-brand-400 flex items-center gap-1 hover:underline"
            >
              {csvExpanded ? "Hide" : "Show all sections"}
              {csvExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          <CardDescription>
            Export individual data sections as CSV spreadsheets — ideal for import into Excel, Google Sheets, or other apps.
          </CardDescription>
        </CardHeader>
        {csvExpanded && (
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {CSV_SECTIONS.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  disabled={csvLoading === sec.id}
                  onClick={() => handleExportCsv(sec.id)}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10
                    glass-card glass-card-hover
                    text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 text-left"
                >
                  <span>{sec.label}</span>
                  {csvLoading === sec.id ? (
                    <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                  ) : (
                    <Download className="w-3 h-3 shrink-0 text-slate-400" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Card: Restore ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <CardTitle className="text-sm">Restore from Backup</CardTitle>
          </div>
          <CardDescription>
            Restore your data from a previously downloaded .json backup file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ── IDLE: Upload button ── */}
          {restorePhase === "idle" && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  <strong>Warning:</strong> Restoring a backup will permanently replace your current reminders, documents,
                  vehicles, finance, subscriptions, family, and dates with the backup contents.
                  Your account login and security settings will remain unchanged.
                </span>
              </div>

              {restoreError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{restoreError}</span>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Select backup file"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 border-amber-400 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                <Upload className="w-4 h-4" />
                <span>Select Backup File (.json)</span>
              </Button>
            </div>
          )}

          {/* ── CONFIRM: Show preview, ask for confirmation ── */}
          {restorePhase === "confirm" && restorePreview && counts && (
            <div className="space-y-4">
              {/* Backup metadata */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs space-y-1 text-slate-600 dark:text-slate-400">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Backup Details</p>
                {meta?.exportedAt && (
                  <p>📅 Exported: {new Date(meta.exportedAt).toLocaleString()}</p>
                )}
                {meta?.userEmail && <p>👤 Account: {meta.userEmail}</p>}
                {meta?.version && <p>🔢 Version: {meta.version}</p>}
              </div>

              {/* Record counts preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(counts).map(([key, count]) => (
                  <div
                    key={key}
                    className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center"
                  >
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{count}</p>
                    <p className="text-[11px] text-slate-500 capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  <strong>This action cannot be undone.</strong> All your current application data will be
                  permanently replaced with the backup contents. We recommend downloading a fresh backup first.
                </span>
              </div>

              {restoreError && (
                <div className="p-3 rounded-lg bg-rose-100 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{restoreError}</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={handleRestoreConfirm}
                  className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Restore Now</span>
                </Button>
                <Button type="button" variant="outline" onClick={handleRestoreCancel}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportJson}
                  disabled={isExportingJson}
                  className="text-xs"
                >
                  {isExportingJson ? "Downloading..." : "Download current data first"}
                </Button>
              </div>
            </div>
          )}

          {/* ── RESTORING: Loading ── */}
          {restorePhase === "restoring" && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
              <Loader2 className="w-5 h-5 animate-spin text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Restoring backup…</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Please do not close this page.</p>
              </div>
            </div>
          )}

          {/* ── DONE: Success ── */}
          {restorePhase === "done" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Backup restored successfully!</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    All your data has been replaced with the backup contents.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRestorePhase("idle");
                  setRestoreFile(null);
                  setRestorePreview(null);
                  window.location.reload();
                }}
              >
                Reload Page
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Security Note ── */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2.5">
        <Shield className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <span>
          Backups are generated on-demand and downloaded directly to your device. No backup data is stored on our servers.
          Backups never contain passwords, authentication tokens, payment secrets, or admin data.
          Restore is verified server-side to ensure only your own backup can be restored into your account.
        </span>
      </div>
    </div>
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
