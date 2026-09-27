"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Application Error Caught]:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4 shadow-xs">
        <AlertCircle className="w-7 h-7" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
        Something unexpected occurred
      </h2>

      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-6">
        {error.message || "An unexpected error occurred while processing your request. Your data remains secure."}
      </p>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => reset()}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </Button>

        <Link
          href="/"
          className="inline-flex items-center justify-center text-sm font-medium px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>

      {process.env.NODE_ENV === "development" && error.digest && (
        <p className="mt-8 text-[11px] font-mono text-slate-400 dark:text-slate-600">
          Digest: {error.digest}
        </p>
      )}
    </div>
  );
}
