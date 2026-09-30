"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admin Portal Error Boundary]:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center mx-auto text-rose-400">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Admin Dashboard Notice
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            An unexpected error occurred while loading this administrative view. Database records and configuration remain secure.
          </p>
          {error.message && (
            <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-rose-300/90 text-left overflow-x-auto max-h-24">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </Button>

          <Link
            href="/admin/customers"
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Customer Directory</span>
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to App</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
