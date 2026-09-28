"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  X,
  CheckCircle2,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertBanner } from "@/components/ui/AlertBanner";

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isClearingSession, setIsClearingSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam === "forbidden"
      ? "Access denied. Your active account does not have administrator privileges. Please authenticate below or sign out to switch accounts."
      : errorParam === "super_admin_required"
      ? "Access denied. Super Administrator privileges are required."
      : null
  );

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(
          data.error?.message || "Invalid administrator credentials or access denied."
        );
        setIsLoading(false);
        return;
      }

      // Hard redirect to ensure clean session cookie transmission & avoid stale Next.js router cache
      window.location.href = "/admin";
    } catch (err) {
      console.error("[Admin Login Error]:", err);
      setErrorMessage("Network error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleClearSession = async () => {
    setIsClearingSession(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/admin/login";
    } catch {
      window.location.href = "/admin/login";
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotLoading(true);
    setForgotMessage(null);

    try {
      const res = await fetch("/api/admin/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await res.json();
      setForgotMessage(data.message || "Password recovery initiated.");
    } catch {
      setForgotMessage(
        "Failed to initiate password recovery. Please contact systems administrator."
      );
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md space-y-6">
      {/* Header Branding */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-2 shadow-lg shadow-indigo-950/50">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white">
          Admin Management Portal
        </h1>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Authorized administrative access only. All authentication attempts and actions are monitored and logged.
        </p>
      </div>

      {/* Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-5 backdrop-blur-md">
        {errorMessage && (
          <div className="space-y-3">
            <AlertBanner
              type="error"
              title="Access Control"
              message={errorMessage}
            />
            {errorParam === "forbidden" && (
              <button
                type="button"
                onClick={handleClearSession}
                disabled={isClearingSession}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  {isClearingSession
                    ? "Clearing Active Session..."
                    : "Sign Out of Customer Account to Switch"}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Google Admin SSO */}
        <div>
          <a
            href="/api/auth/google?returnTo=/admin"
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-700/80 bg-slate-950/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold shadow-xs transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.42l4.02-3.13z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
              />
            </svg>
            <span>Continue with Google (Admin SSO)</span>
          </a>
        </div>

        <div className="relative flex items-center justify-center my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative px-3 bg-slate-900 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Or Master Password
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Administrator Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <Input
                type="email"
                required
                placeholder="admin@smartlifemanager.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Master Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setShowForgotModal(true);
                }}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline"
              >
                Forgot master password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <Input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full justify-center bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 font-semibold text-xs tracking-wide shadow-lg shadow-indigo-600/30"
            >
              <span>Authenticate Admin Session</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </form>

        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>TLS 256-bit Encrypted</span>
          </span>
          <Link
            href="/"
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Customer Portal</span>
          </Link>
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-600">
        Smart Life Manager Core System &bull; Unauthorized access prohibited
      </p>

      {/* Forgot Admin Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <button
              onClick={() => {
                setShowForgotModal(false);
                setForgotMessage(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Administrator Recovery</h3>
                <p className="text-slate-400 text-[11px]">Issue security token for password reset</p>
              </div>
            </div>

            {forgotMessage ? (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">Recovery Request Dispatched</span>
                </div>
                <p className="text-[11px] text-slate-300">{forgotMessage}</p>
                <p className="text-[10px] text-slate-400 pt-1">
                  Or use the secure CLI provisioner on your server: <code className="text-indigo-400">npm run admin:create</code>
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3.5">
                <p className="text-slate-400 text-[11px]">
                  Enter your registered administrator email. A secure recovery token will be logged and dispatched according to your security policy.
                </p>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Admin Email Address
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="admin@smartlifemanager.local"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white text-xs"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowForgotModal(false)}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    variant="primary"
                    isLoading={isForgotLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                  >
                    Initiate Recovery
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-slate-950 pointer-events-none" />
      <Suspense
        fallback={
          <div className="text-center text-slate-500 text-xs animate-pulse">
            Loading Admin Portal...
          </div>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
