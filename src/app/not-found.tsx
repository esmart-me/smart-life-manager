import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 mb-4 shadow-xs">
        <FileQuestion className="w-7 h-7" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
        Page Not Found
      </h2>

      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
        The page or resource you are looking for does not exist or has been relocated.
      </p>

      <Link
        href="/"
        className="inline-flex items-center justify-center text-sm font-medium px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors gap-2"
      >
        <Home className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}
