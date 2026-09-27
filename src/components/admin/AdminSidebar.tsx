"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  Sparkles,
  ShieldCheck,
  LogOut,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Menu,
  X,
  KeyRound,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";
import { SessionUser } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface AdminSidebarProps {
  admin: SessionUser;
}

export const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
  { label: "Payments", href: "/admin/payments", icon: Receipt },
  { label: "Plans & Regional Pricing", href: "/admin/plans", icon: Sparkles },
  { label: "Security & Audit Log", href: "/admin/audit", icon: ShieldCheck },
];

export function AdminSidebar({ admin }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Change Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await fetch("/api/admin/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setPasswordError(data.error?.message || "Failed to update master password.");
        setIsChangingPassword(false);
        return;
      }

      setPasswordSuccess("Administrator master password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(null);
      }, 2500);
    } catch {
      setPasswordError("Network error occurred. Please try again.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-3.5 bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="font-bold text-xs tracking-wide">ADMIN PORTAL</span>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop for Mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-900/50">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white tracking-wider uppercase">
                  Admin Portal
                </h2>
                <span className="text-[10px] text-indigo-400 font-mono">
                  Smart Life Core
                </span>
              </div>
            </div>
          </div>

          {/* Admin User Info Card */}
          <div className="p-3 mx-3 my-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs">
              {admin.displayName?.charAt(0) || "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {admin.displayName || admin.email}
              </p>
              <span className="text-[10px] text-indigo-400 uppercase font-mono tracking-wider font-semibold">
                {admin.role}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white font-semibold shadow-xs shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-800 space-y-1 bg-slate-950/40">
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30 transition-colors text-left"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Change Password</span>
          </button>

          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Customer App</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors text-left"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Admin Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Admin Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Change Master Password</h3>
                <p className="text-slate-400 font-mono text-[11px]">{admin.email}</p>
              </div>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-[11px]">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Current Master Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                  <Input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-8 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  New Password (Minimum 8 characters)
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                  <Input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-8 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                  <Input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-8 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasswordModal(false)}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  isLoading={isChangingPassword}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Update Master Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
