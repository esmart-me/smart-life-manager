"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, AlertCircle, X, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [shakeError, setShakeError] = useState(false);

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setShakeError(true);
    setTimeout(() => setShakeError(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setDevResetUrl(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      triggerError("Please enter your registered email address.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        triggerError(data?.error?.message || "Failed to process password recovery request.");
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        data.message || "If an account with that email exists, we have sent instructions to reset your password."
      );

      if (data.debug?.resetUrl) {
        setDevResetUrl(data.debug.resetUrl);
      }
    } catch {
      triggerError("Network error occurred. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#FAF7F2] overflow-x-hidden">
      {/* ========================================================
          LEFT: Warm Ivory / Cream Form Panel
          ======================================================== */}
      <div className="w-full lg:w-[48%] xl:w-[46%] min-h-screen flex flex-col justify-between px-8 sm:px-16 lg:px-20 py-10 sm:py-14 bg-[#FAF7F2] z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#063B2E] flex items-center justify-center text-[#C5A059] shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold tracking-[0.2em] text-[#063B2E] uppercase">
              Smart Life Manager
            </span>
          </div>
        </div>

        <div className="my-auto max-w-sm w-full mx-auto py-8">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#141E19]">
              Forgot password
            </h1>
            <div className="w-10 h-[3px] bg-[#C5A059] rounded-full mt-3" />
            <p className="text-xs text-[#738077] mt-3">
              Enter your email address to receive secure password recovery instructions.
            </p>
          </div>

          {errorMessage && (
            <div
              className={`mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 ${
                shakeError ? "animate-shake" : "animate-fade-in"
              }`}
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-rose-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 space-y-3 animate-fade-in">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{successMessage}</div>
              </div>

              {devResetUrl && (
                <div className="p-3 bg-[#FAF7F2] border border-[#DDD6CB] rounded-xl text-xs space-y-1">
                  <p className="font-semibold text-[#063B2E]">Local Development Link:</p>
                  <Link
                    href={devResetUrl}
                    className="text-[#9E7B44] hover:text-[#7A5E33] underline break-all font-medium"
                  >
                    Click here to open Reset Password page
                  </Link>
                </div>
              )}
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5 group">
                <div className="relative border-b-2 border-[#DDD6CB] focus-within:border-[#C5A059] transition-colors pb-1">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent pr-8 py-2 text-sm text-[#141E19] placeholder-[#8A968E] outline-none transition-all font-normal"
                  />
                  <Mail className="w-4 h-4 text-[#8A968E] group-focus-within:text-[#C5A059] absolute right-1 top-2.5 pointer-events-none transition-colors" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 rounded-full bg-[#063B2E] hover:bg-[#0B4A3A] active:scale-[0.99] text-white font-medium text-sm tracking-wide shadow-md shadow-[#063B2E]/20 hover:shadow-lg hover:shadow-[#063B2E]/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-[#738077] hover:text-[#063B2E] font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </Link>
          </div>
        </div>

        <div className="text-center lg:text-left text-[11px] text-[#8A968E]">
          <span>Protected by OS-backed hardware encryption & data isolation.</span>
        </div>
      </div>

      {/* ========================================================
          RIGHT: Deep Emerald Premium Branded Area
          ======================================================== */}
      <div className="w-full lg:w-[52%] xl:w-[54%] min-h-[420px] lg:min-h-screen relative flex flex-col justify-center px-10 sm:px-16 lg:px-20 py-16 bg-gradient-to-br from-[#063B2E] via-[#084335] to-[#03231B] text-white overflow-hidden shadow-2xl">
        <div className="hidden lg:block absolute inset-y-0 left-0 w-24 pointer-events-none">
          <svg
            className="h-full w-full"
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              d="M 0 0 C 45 250, 60 750, 0 1000"
              stroke="rgba(197, 160, 89, 0.35)"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-[#0B4A3A]/40 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-md space-y-6">
          <div className="flex items-center gap-2 text-[#C5A059]">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold tracking-[0.28em] uppercase">
              Smart Life Manager
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-white/95 leading-[1.08]">
              Restore your
            </h2>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif italic font-normal text-amber-100/95 leading-[1.08]">
              peace of mind.
            </h2>
          </div>

          <p className="text-sm sm:text-base text-emerald-100/80 font-normal leading-relaxed pt-2">
            Regain secure access to your personal operating system in moments.
          </p>
        </div>
      </div>
    </div>
  );
}
