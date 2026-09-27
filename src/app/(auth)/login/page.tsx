"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { AlertBanner } from "@/components/ui/AlertBanner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const handleDemoLogin = () => {
    setEmail("demo@smartlifemanager.local");
    setPassword("SmartLife2026!");
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Sign in to your account</CardTitle>
        <CardDescription>
          Access your personal command center and private records securely
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMessage && (
            <AlertBanner
              type="error"
              title="Authentication Failed"
              message={errorMessage}
            />
          )}

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
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full text-center text-xs text-brand-600 dark:text-brand-400 hover:underline"
            >
              Fill Demo Credentials (demo@smartlifemanager.local)
            </button>
          </div>
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
      </form>
    </Card>
  );
}
