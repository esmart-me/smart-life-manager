import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading page content"
      className="flex flex-col items-center justify-center min-h-[60vh] gap-3 p-6"
    >
      <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-950/60 flex items-center justify-center text-brand-600 dark:text-brand-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        Loading Smart Life Manager...
      </p>
    </div>
  );
}
