"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  AlertCircle,
  X,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shakeError, setShakeError] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<{
    configured: boolean;
    redirectUri: string;
  } | null>(null);

  // 1. Session Restoration on App Startup (Electron Persistent Login)
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).desktopAPI?.getPersistedSession) {
      (window as any).desktopAPI
        .getPersistedSession()
        .then(async (token: string | null) => {
          if (token && typeof token === "string" && token.length > 20) {
            setIsRestoringSession(true);
            try {
              const res = await fetch("/api/auth/session/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
              });
              const data = await res.json();
              if (res.ok && data.success) {
                router.replace("/");
                return;
              } else {
                // If token expired or revoked, purge it cleanly
                await (window as any).desktopAPI?.clearPersistedSession();
              }
            } catch {
              // Network fallback: remain on login screen
            } finally {
              setIsRestoringSession(false);
            }
          }
        })
        .catch(() => {});
    }
  }, [router]);

  // 2. Query param handling and Google OAuth status check
  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "google_not_configured") {
      setErrorMessage("Google OAuth is not configured yet. Please sign in with your email and password.");
      setShowGoogleModal(true);
    } else if (err === "google_auth_failed") {
      setErrorMessage("Google authentication could not be completed. Please try again or sign in with your password.");
    } else if (err === "google_access_denied") {
      setErrorMessage("Google sign-in was cancelled. You can sign in with your email and password below.");
    } else if (err === "google_invalid_state") {
      setErrorMessage("Google sign-in session expired. Please try signing in again.");
    }

    const paramEmail = searchParams.get("email");
    if (paramEmail && !email) {
      setEmail(paramEmail);
    }

    const isDesktopApp = typeof window !== "undefined" && Boolean((window as any).desktopAPI?.isDesktop);
    fetch(`/api/auth/google/status${isDesktopApp ? "?isDesktop=true" : ""}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setGoogleStatus({
            configured: data.data.configured,
            redirectUri: data.data.redirectUri,
          });
        }
      })
      .catch(() => {
        setGoogleStatus({
          configured: false,
          redirectUri: "http://127.0.0.1:32100/api/auth/google/callback",
        });
      });
  }, [searchParams]);

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setShakeError(true);
    setTimeout(() => setShakeError(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      triggerError("Please enter your username or email address.");
      return;
    }
    if (!password) {
      triggerError("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password, rememberMe }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        triggerError(data?.error?.message || "Invalid credentials. Please verify your email and password.");
        setPassword("");
        setIsLoading(false);
        return;
      }

      // Persist session token via Electron safeStorage if on Desktop
      if (rememberMe && data?.data?.token && typeof window !== "undefined" && (window as any).desktopAPI?.persistSession) {
        try {
          await (window as any).desktopAPI.persistSession(data.data.token);
        } catch (err) {
          console.warn("[Desktop Persistence Warning]:", err);
        }
      }

      router.push("/");
      router.refresh();
    } catch {
      triggerError("Network connection error. Unable to contact authentication service.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);

    const isDesktopApp = typeof window !== "undefined" && Boolean((window as any).desktopAPI?.isDesktop);

    try {
      const statusRes = await fetch(`/api/auth/google/status${isDesktopApp ? "?isDesktop=true" : ""}`);
      const statusData = await statusRes.json();

      if (!statusData.data?.configured) {
        setIsGoogleLoading(false);
        setShowGoogleModal(true);
        return;
      }

      if (isDesktopApp) {
        const authRes = await fetch("/api/auth/google?isDesktop=true&format=json");
        const authData = await authRes.json();

        if (!authData.success || !authData.authUrl || !authData.csrf) {
          setIsGoogleLoading(false);
          triggerError("Failed to initiate Desktop Google sign-in. Please try again.");
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
            triggerError("Google authentication timed out. Please try again.");
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

              // Persist Google desktop session token if provided
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
          } catch {
            // Wait for loopback completion
          }
        }, 1000);
      } else {
        window.location.href = "/api/auth/google";
      }
    } catch {
      setIsGoogleLoading(false);
      triggerError("Network error initializing Google authentication.");
    }
  };

  if (isRestoringSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF7F2] p-6 text-center animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#063B2E] to-[#0B4A3A] flex items-center justify-center text-[#C5A059] shadow-xl shadow-[#063B2E]/20 mb-5 animate-pulse">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-semibold text-[#141E19] tracking-tight mb-1">
          Restoring your session...
        </h2>
        <p className="text-xs text-[#738077]">
          Verifying security credentials and central entitlements
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#FAF7F2] overflow-x-hidden">
      {/* ========================================================
          LEFT: Warm Ivory / Cream Authentication Form Panel
          ======================================================== */}
      <div className="w-full lg:w-[48%] xl:w-[46%] min-h-screen flex flex-col justify-between px-8 sm:px-16 lg:px-20 py-10 sm:py-14 bg-[#FAF7F2] z-10">
        {/* Subtle Top Brand Header (Mobile & Small screens) */}
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

        {/* Main Form Center Area */}
        <div className="my-auto max-w-sm w-full mx-auto py-8">
          {/* Heading with Elegant Short Gold Underline */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#141E19]">
              Sign in
            </h1>
            <div className="w-10 h-[3px] bg-[#C5A059] rounded-full mt-3" />
          </div>

          {/* Error Banner with Subtle Shake */}
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
            {/* Username or Email Input */}
            <div className="space-y-1.5 group">
              <div className="relative border-b-2 border-[#DDD6CB] focus-within:border-[#C5A059] transition-colors pb-1">
                <input
                  id="email"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="Username or email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent pr-8 py-2 text-sm text-[#141E19] placeholder-[#8A968E] outline-none transition-all font-normal"
                />
                <User className="w-4 h-4 text-[#8A968E] group-focus-within:text-[#C5A059] absolute right-1 top-2.5 pointer-events-none transition-colors" />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5 group">
              <div className="relative border-b-2 border-[#DDD6CB] focus-within:border-[#C5A059] transition-colors pb-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
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
            </div>

            {/* Keep me signed in & Forgot password row */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-[#2B3830]">
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                    rememberMe
                      ? "bg-[#063B2E] text-white shadow-xs"
                      : "border border-[#C5BDB0] bg-white hover:border-[#063B2E]"
                  }`}
                >
                  {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="font-medium">Keep me signed in</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-[#9E7B44] hover:text-[#7A5E33] font-medium underline underline-offset-4 decoration-[#C5A059]/60 hover:decoration-[#C5A059] transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Primary Pill Button: Sign In */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-full bg-[#063B2E] hover:bg-[#0B4A3A] active:scale-[0.99] text-white font-medium text-sm tracking-wide shadow-md shadow-[#063B2E]/20 hover:shadow-lg hover:shadow-[#063B2E]/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </div>

            {/* Alternative: Sign In with Google */}
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
              onClick={handleGoogleSignIn}
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
              <span>{isGoogleLoading ? "Connecting to Google..." : "Sign in with Google"}</span>
            </button>
          </form>

          {/* Switch to Create Account */}
          <div className="mt-8 text-center">
            <p className="text-xs text-[#738077]">
              New to Smart Life Manager?{" "}
              <Link
                href="/register"
                className="font-semibold text-[#141E19] hover:text-[#063B2E] underline underline-offset-4 decoration-[#C5A059] transition-colors"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center lg:text-left text-[11px] text-[#8A968E]">
          <span>Protected by OS-backed hardware encryption & data isolation.</span>
        </div>
      </div>

      {/* ========================================================
          RIGHT: Deep Emerald Premium Branded Area
          ======================================================== */}
      <div className="w-full lg:w-[52%] xl:w-[54%] min-h-[420px] lg:min-h-screen relative flex flex-col justify-center px-10 sm:px-16 lg:px-20 py-16 bg-gradient-to-br from-[#063B2E] via-[#084335] to-[#03231B] text-white overflow-hidden shadow-2xl">
        {/* Curved Divider Line Overlay along Left Edge */}
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

        {/* Ambient Radial Halo Background Accent */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-[#0B4A3A]/40 rounded-full blur-2xl pointer-events-none" />

        {/* Branded Editorial Content */}
        <div className="relative z-10 max-w-md space-y-6">
          {/* Tracking Uppercase Brand */}
          <div className="flex items-center gap-2 text-[#C5A059]">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold tracking-[0.28em] uppercase">
              Smart Life Manager
            </span>
          </div>

          {/* Hero Editorial Headline */}
          <div className="space-y-1">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-white/95 leading-[1.08]">
              Welcome
            </h2>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif italic font-normal text-amber-100/95 leading-[1.08]">
              back.
            </h2>
          </div>

          {/* Supporting Text */}
          <p className="text-sm sm:text-base text-emerald-100/80 font-normal leading-relaxed pt-2">
            Your life, your documents, and your family are exactly where you left them.
          </p>

          {/* Refined Feature Pill Highlights */}
          <div className="pt-6 flex flex-wrap gap-2 text-[11px] text-emerald-200/70 font-medium">
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-xs">
              Private Local Database
            </span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-xs">
              Automated Expiry Alerts
            </span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-xs">
              Offline Ready
            </span>
          </div>
        </div>
      </div>

      {/* Google OAuth Configuration Guidance Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-2xl p-6 space-y-4 text-stone-900">
            <button
              onClick={() => setShowGoogleModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Google OAuth Configuration Required
                </h3>
                <p className="text-xs text-stone-500">Setup instructions for administrator</p>
              </div>
            </div>

            {typeof window !== "undefined" && Boolean((window as any).desktopAPI?.isDesktop) ? (
              <div className="space-y-3">
                <p className="text-xs text-stone-600 leading-relaxed">
                  The Windows Desktop application utilizes Google&apos;s standard <strong>Desktop App (RFC 8252 Loopback)</strong> flow.
                </p>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1 text-stone-600">
                  <p className="font-semibold text-stone-800">1. In Google Cloud Console:</p>
                  <p>Create OAuth Client ID with Application type: <strong>Desktop app</strong>.</p>
                  <p className="font-semibold text-stone-800 pt-1">2. In Admin Portal:</p>
                  <p>Visit <strong>Admin Portal &gt; System &amp; AI Settings</strong> to save your Client ID.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-stone-600 leading-relaxed">
                  Google Sign-In is awaiting OAuth 2.0 Web Client credentials in your environment.
                </p>
              </div>
            )}

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-emerald-800">
                <strong>Email + Password authentication is 100% operational.</strong> You can sign in immediately using your credentials.
              </p>
            </div>

            <button
              onClick={() => setShowGoogleModal(false)}
              className="w-full py-2.5 rounded-full bg-[#063B2E] text-white text-xs font-medium hover:bg-[#0B4A3A] transition-colors"
            >
              Continue with Email &amp; Password
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] text-[#738077] text-sm">
          Loading sign in...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
