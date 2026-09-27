"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { AlertBanner } from "@/components/ui/AlertBanner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setDevResetUrl(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || "Failed to process password reset request.");
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        data.message || "If an account with that email exists, we have sent instructions to reset your password."
      );

      // In local dev/testing environment, show direct link for testing
      if (data.debug?.resetUrl) {
        setDevResetUrl(data.debug.resetUrl);
      }
    } catch {
      setErrorMessage("Network error occurred. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>
          Enter the email address associated with your account and we&apos;ll help you reset it
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMessage && (
            <AlertBanner
              type="error"
              title="Request Failed"
              message={errorMessage}
            />
          )}

          {successMessage && (
            <div className="space-y-3">
              <AlertBanner
                type="success"
                title="Instructions Sent"
                message={successMessage}
              />

              {devResetUrl && (
                <div className="p-3 bg-brand-50/80 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 rounded-lg text-xs">
                  <p className="font-semibold text-brand-800 dark:text-brand-300 mb-1">
                    Development Quick Access:
                  </p>
                  <Link
                    href={devResetUrl}
                    className="text-brand-600 dark:text-brand-400 font-medium underline flex items-center gap-1 hover:text-brand-700"
                  >
                    <span>Click here to open Reset Password page</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {!successMessage && (
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
          )}

          {!successMessage && (
            <div className="pt-2">
              <Button
                type="submit"
                className="w-full gap-2"
                isLoading={isLoading}
              >
                <span>Send Reset Link</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
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
