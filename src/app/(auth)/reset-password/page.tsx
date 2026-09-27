"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { AlertBanner } from "@/components/ui/AlertBanner";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorMessage("No password reset token was provided in the link. Please request a new one.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage("Missing reset token. Please request a new link.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || "Failed to reset password.");
        setIsLoading(false);
        return;
      }

      setSuccessMessage(data.message || "Your password has been reset successfully.");
    } catch {
      setErrorMessage("Network error occurred. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Set a new password</CardTitle>
        <CardDescription>
          Choose a strong password to protect your personal vault
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMessage && (
            <AlertBanner
              type="error"
              title="Reset Failed"
              message={errorMessage}
            />
          )}

          {successMessage && (
            <div className="space-y-4">
              <AlertBanner
                type="success"
                title="Success"
                message={successMessage}
              />

              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors text-sm"
              >
                <span>Sign in with new password</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {!successMessage && (
            <>
              <div className="relative">
                <Input
                  label="New password"
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
                  label="Confirm new password"
                  type="password"
                  required
                  placeholder="Re-enter new password"
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
                  disabled={!token}
                >
                  <span>Reset Password</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to sign in</span>
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Card className="border-slate-200 dark:border-slate-800 p-8 text-center animate-pulse">
          <p className="text-xs text-slate-400">Loading reset session...</p>
        </Card>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
