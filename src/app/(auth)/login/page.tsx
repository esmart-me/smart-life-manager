"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, ArrowRight, HelpCircle, X, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { AlertBanner } from "@/components/ui/AlertBanner";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<{
    configured: boolean;
    redirectUri: string;
  } | null>(null);

  useEffect(() => {
    // Check initial query parameters
    const err = searchParams.get("error");
    if (err === "google_not_configured") {
      setErrorMessage("Google OAuth is not configured yet. Please sign in with Email & Password or add Google credentials.");
      setShowGoogleModal(true);
    } else if (err === "google_auth_failed") {
      setErrorMessage("Google authentication failed. Please try again or sign in with password.");
    }

    // Check Google OAuth status
    fetch("/api/auth/google/status")
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
          redirectUri: "http://localhost:3000/api/auth/google/callback",
        });
      });
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || "Invalid credentials. Please try again.");
        setIsLoading(false);
        return;
      }

      // Successful login
      router.push("/");
      router.refresh();
    } catch {
      setErrorMessage("Network error occurred. Please check your connection.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);

    try {
      const res = await fetch("/api/auth/google/status");
      const data = await res.json();

      if (data.data?.configured) {
        window.location.href = "/api/auth/google";
      } else {
        setIsGoogleLoading(false);
        setShowGoogleModal(true);
      }
    } catch {
      setIsGoogleLoading(false);
      setShowGoogleModal(true);
    }
  };

  return (
    <>
      <Card className="border-slate-200 dark:border-slate-800 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Sign in to your account</CardTitle>
          <CardDescription>
            Access your personal command center and private records securely
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMessage && (
            <AlertBanner
              type="error"
              title="Authentication Notice"
              message={errorMessage}
            />
          )}

          {/* Method A: Continue with Google */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.67-5.17 3.67-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.24v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.24C.45 8.18 0 9.95 0 12s.45 3.82 1.24 5.39l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.24 6.61l4.03 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              <span>{isGoogleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
            </button>
            {googleStatus && !googleStatus.configured && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 text-center">
                Requires OAuth credentials in .env &bull;{" "}
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(true)}
                  className="text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-0.5"
                >
                  <HelpCircle className="w-3 h-3" /> Setup guide
                </button>
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-500 font-medium">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Method B: Email & Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                label="Email address"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-8 pointer-events-none" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full gap-2"
                isLoading={isLoading}
              >
                <span>Sign In with Email</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
            >
              Create free account
            </Link>
          </p>
        </CardFooter>
      </Card>

      {/* Google OAuth Configuration Guidance Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <button
              onClick={() => setShowGoogleModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Google OAuth Configuration Required
                </h3>
                <p className="text-xs text-slate-500">Setup instructions for administrator</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Google Sign-In is awaiting OAuth 2.0 Web Client credentials. To activate it in your deployment:
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                1. Set environment variables in your <code className="text-brand-600">.env</code>:
              </p>
              <pre className="p-2 rounded bg-slate-100 dark:bg-slate-900 text-[11px] font-mono text-slate-800 dark:text-slate-200 overflow-x-auto">
{`GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"`}
              </pre>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                2. In Google Cloud Console (APIs & Services &gt; Credentials):
              </p>
              <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1 pl-1">
                <li>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Authorized JavaScript origin:</span>{" "}
                  <code className="text-brand-600">http://localhost:3000</code>
                </li>
                <li>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Authorized redirect URI:</span>{" "}
                  <code className="text-brand-600">
                    {googleStatus?.redirectUri || "http://localhost:3000/api/auth/google/callback"}
                  </code>
                </li>
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-emerald-700 dark:text-emerald-300">
                <strong>Email + Password authentication is 100% operational.</strong> You can log in or register immediately using the form below.
              </p>
            </div>

            <Button
              onClick={() => setShowGoogleModal(false)}
              className="w-full text-xs"
            >
              Continue with Email & Password
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
