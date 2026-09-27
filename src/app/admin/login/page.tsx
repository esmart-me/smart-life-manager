"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Lock, Mail, ArrowRight, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertBanner } from "@/components/ui/AlertBanner";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam === "forbidden"
      ? "Access denied. Your account does not have administrator privileges."
      : errorParam === "super_admin_required"
      ? "Access denied. Super Administrator privileges are required."
      : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(
          data.error?.message || "Invalid administrator credentials or access denied."
        );
        setIsLoading(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      console.error("[Admin Login Error]:", err);
      setErrorMessage("Network error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-slate-950 pointer-events-none" />

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
            <AlertBanner
              type="error"
              title="Access Control"
              message={errorMessage}
            />
          )}

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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Master Password
              </label>
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
      </div>
    </div>
  );
}
