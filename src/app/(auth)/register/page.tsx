"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shakeError, setShakeError] = useState(false);

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setShakeError(true);
    setTimeout(() => setShakeError(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedFullName) {
      triggerError("Please enter your full name.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      triggerError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      triggerError("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);

    const nameParts = trimmedFullName.split(/\s+/);
    const firstName = nameParts[0] || "User";
    const lastName = nameParts.slice(1).join(" ") || "";

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          displayName: trimmedFullName,
          email: trimmedEmail,
          password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        triggerError(data?.error?.message || "Failed to create account. Please try again.");
        setIsLoading(false);
        return;
      }

      // Persist session if on desktop so new accounts stay signed in
      if (data?.data?.token && typeof window !== "undefined" && (window as any).desktopAPI?.persistSession) {
        try {
          await (window as any).desktopAPI.persistSession(data.data.token);
        } catch (err) {
          console.warn("[Desktop Persistence Warning]:", err);
        }
      }

      router.push("/");
      router.refresh();
    } catch {
      triggerError("Network error occurred. Unable to contact registration server.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);

    const isDesktopApp = typeof window !== "undefined" && Boolean((window as any).desktopAPI?.isDesktop);

    try {
      if (isDesktopApp) {
        const authRes = await fetch("/api/auth/google?isDesktop=true&format=json");
        const authData = await authRes.json();

        if (!authData.success || !authData.authUrl || !authData.csrf) {
          setIsGoogleLoading(false);
          triggerError("Failed to initiate Google sign up.");
          return;
        }

        if (typeof (window as any).desktopAPI?.openExternal === "function") {
          (window as any).desktopAPI.openExternal(authData.authUrl);
        } else {
          window.open(authData.authUrl, "_blank");
        }

        const csrfToken = authData.csrf;
        const maxPollAttempts = 90;
        let attempts = 0;

        const pollInterval = setInterval(async () => {
          attempts++;
          if (attempts > maxPollAttempts) {
            clearInterval(pollInterval);
            setIsGoogleLoading(false);
            triggerError("Google authentication timed out.");
            return;
          }

          try {
            const handshakeRes = await fetch(
              `/api/auth/google/desktop-handshake?state=${encodeURIComponent(csrfToken)}`
            );
            const handshakeData = await handshakeRes.json();

            if (handshakeData.success) {
              clearInterval(pollInterval);
              setIsGoogleLoading(false);

              if (handshakeData.sessionToken && (window as any).desktopAPI?.persistSession) {
                try {
                  await (window as any).desktopAPI.persistSession(handshakeData.sessionToken);
                } catch {}
              }

              if (typeof (window as any).desktopAPI?.focusWindow === "function") {
                (window as any).desktopAPI.focusWindow();
              }

              router.push("/");
              router.refresh();
            }
          } catch {}
        }, 1000);
      } else {
        window.location.href = "/api/auth/google";
      }
    } catch {
      setIsGoogleLoading(false);
      triggerError("Network error initializing Google registration.");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#FAF7F2] overflow-x-hidden">
      {/* ========================================================
          LEFT: Deep Emerald Premium Branded Area (Register layout)
          ======================================================== */}
      <div className="w-full lg:w-[50%] xl:w-[52%] min-h-[400px] lg:min-h-screen relative flex flex-col justify-center px-10 sm:px-16 lg:px-20 py-16 bg-gradient-to-br from-[#063B2E] via-[#084335] to-[#03231B] text-white overflow-hidden shadow-2xl order-2 lg:order-1">
        {/* Curved Divider Line Overlay along Right Edge */}
        <div className="hidden lg:block absolute inset-y-0 right-0 w-24 pointer-events-none">
          <svg
            className="h-full w-full"
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              d="M 100 0 C 40 250, 30 750, 100 1000"
              stroke="rgba(197, 160, 89, 0.35)"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        {/* Ambient Radial Halo Background Accent */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#0B4A3A]/40 rounded-full blur-2xl pointer-events-none" />

        {/* Branded Content */}
        <div className="relative z-10 max-w-md space-y-6">
          <div className="flex items-center gap-2 text-[#C5A059]">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold tracking-[0.28em] uppercase">
              Smart Life Manager
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-white/95 leading-[1.08]">
              Start the
            </h2>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif italic font-normal text-amber-100/95 leading-[1.08]">
              first page.
            </h2>
          </div>

          <p className="text-sm sm:text-base text-emerald-100/80 font-normal leading-relaxed pt-2">
            One account for every document, every vehicle, and every reminder you own.
          </p>

          <div className="pt-6 flex flex-wrap gap-2 text-[11px] text-emerald-200/70 font-medium">
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-xs">
              Zero Cloud Lock-in
            </span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-xs">
              Hardware Protected
            </span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-xs">
              Full Privacy Isolation
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          RIGHT: Warm Ivory / Cream Registration Form Panel
          ======================================================== */}
      <div className="w-full lg:w-[50%] xl:w-[48%] min-h-screen flex flex-col justify-between px-8 sm:px-16 lg:px-20 py-10 sm:py-14 bg-[#FAF7F2] z-10 order-1 lg:order-2">
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
              Create account
            </h1>
            <div className="w-10 h-[3px] bg-[#C5A059] rounded-full mt-3" />
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div className="space-y-1.5 group">
              <div className="relative border-b-2 border-[#DDD6CB] focus-within:border-[#C5A059] transition-colors pb-1">
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-transparent pr-8 py-2 text-sm text-[#141E19] placeholder-[#8A968E] outline-none transition-all font-normal"
                />
                <User className="w-4 h-4 text-[#8A968E] group-focus-within:text-[#C5A059] absolute right-1 top-2.5 pointer-events-none transition-colors" />
              </div>
            </div>

            {/* Email Address */}
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

            {/* Password */}
            <div className="space-y-1.5 group">
              <div className="relative border-b-2 border-[#DDD6CB] focus-within:border-[#C5A059] transition-colors pb-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent pr-8 py-2 text-sm text-[#141E19] placeholder-[#8A968E] outline-none transition-all font-normal"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-2 text-[#8A968E] hover:text-[#141E19] group-focus-within:text-[#C5A059] transition-colors p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Requirement / Hint */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-1">
                  <div
                    className={`w-5 h-1 rounded-full transition-colors ${
                      password.length >= 8 ? "bg-[#063B2E]" : "bg-stone-300"
                    }`}
                  />
                  <div
                    className={`w-5 h-1 rounded-full transition-colors ${
                      password.length >= 10 ? "bg-[#063B2E]" : "bg-stone-300"
                    }`}
                  />
                  <div
                    className={`w-5 h-1 rounded-full transition-colors ${
                      password.length >= 12 ? "bg-[#063B2E]" : "bg-stone-300"
                    }`}
                  />
                </div>
                <span className="text-[11px] text-[#738077]">Use 8 characters or more.</span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-full bg-[#063B2E] hover:bg-[#0B4A3A] active:scale-[0.99] text-white font-medium text-sm tracking-wide shadow-md shadow-[#063B2E]/20 hover:shadow-lg hover:shadow-[#063B2E]/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Create account</span>
                )}
              </button>
            </div>

            {/* Alternative: Sign Up with Google */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E5DFD5]" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-[#FAF7F2] px-3 text-[#8A968E]">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={isGoogleLoading || isLoading}
              className="w-full py-3 px-4 rounded-full border border-[#DDD6CB] hover:border-[#C5A059] bg-white/70 hover:bg-white text-[#141E19] text-xs font-medium transition-all shadow-2xs hover:shadow-xs flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isGoogleLoading ? "Connecting to Google..." : "Sign up with Google"}</span>
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-[#738077]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#141E19] hover:text-[#063B2E] underline underline-offset-4 decoration-[#C5A059] transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center lg:text-left text-[11px] text-[#8A968E]">
          <span>Protected by OS-backed hardware encryption & data isolation.</span>
        </div>
      </div>
    </div>
  );
}
