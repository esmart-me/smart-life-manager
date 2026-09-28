"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, HelpCircle, X, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { AlertBanner } from "@/components/ui/AlertBanner";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDuplicateEmail, setIsDuplicateEmail] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<{
    configured: boolean;
    redirectUri: string;
  } | null>(null);

  useEffect(() => {
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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsDuplicateEmail(false);

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedFirstName) {
      setErrorMessage("First name is required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter your password.");
      return;
    }

    setIsLoading(true);

    let res: Response;
    try {
      res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          email: trimmedEmail,
          password,
        }),
      });
    } catch {
      // ONLY triggered when the network request actually fails (offline, connection refused)
      setErrorMessage("Network error occurred. Unable to contact authentication server. Please check your connection.");
      setIsLoading(false);
      return;
    }

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      setErrorMessage(`Server error (${res.status}). The service returned an invalid response. Please try again.`);
      setIsLoading(false);
      return;
    }

    if (!res.ok || !data?.success) {
      const errorMsg =
        data?.error?.message ||
        (res.status === 409
          ? "This email is already registered. Please sign in instead."
          : `Registration failed (${res.status}). Please try again.`);

      setErrorMessage(errorMsg);
      if (data?.error?.code === "EMAIL_EXISTS" || res.status === 409) {
        setIsDuplicateEmail(true);
      }
      // For security, clear sensitive password inputs but retain first/last name and email
      setPassword("");
      setConfirmPassword("");
      setIsLoading(false);
      return;
    }

    // Successful registration & auto-login
    router.push("/");
    router.refresh();
  };

  const handleGoogleSignUp = async () => {
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
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Get started with your personal Smart Life Manager vault
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="space-y-3">
              <AlertBanner
                type="error"
                title="Registration Notice"
                message={errorMessage}
                onDismiss={() => {
                  setErrorMessage(null);
                  setIsDuplicateEmail(false);
                }}
              />
              {isDuplicateEmail && (
                <div className="p-3 bg-brand-50 dark:bg-brand-950/40 rounded-xl border border-brand-200 dark:border-brand-800 text-xs flex items-center justify-between">
                  <span className="text-brand-800 dark:text-brand-300 font-medium">
                    Already have an account with this email?
                  </span>
                  <Link
                    href={`/login?email=${encodeURIComponent(email.trim())}`}
                    className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Sign In Now &rarr;
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Method A: Continue with Google */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignUp}
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
              <span>{isGoogleLoading ? "Connecting to Google..." : "Sign up with Google"}</span>
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
                Or register with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First name"
                required
                placeholder="Alex"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Input
                label="Last name"
                placeholder="Morgan"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <div className="relative">
              <Input
                label="Email address"
                type="email"
                required
                autoComplete="email"
                placeholder="alex@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-8 pointer-events-none" />
            </div>

            <div className="relative">
              <Input
                label="Password"
                type="password"
                required
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-8 pointer-events-none" />
            </div>

            <div className="relative">
              <Input
                label="Confirm password"
                type="password"
                required
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-8 pointer-events-none" />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full gap-2"
                isLoading={isLoading}
              >
                <span>Create Account with Email</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
            >
              Sign in
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
              Google Sign-Up is awaiting OAuth 2.0 Web Client credentials. To activate it in your deployment:
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
                <strong>Email registration is 100% operational.</strong> You can register your account immediately using the form below.
              </p>
            </div>

            <Button
              onClick={() => setShowGoogleModal(false)}
              className="w-full text-xs"
            >
              Continue with Email Registration
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
