import { ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-md w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white block leading-none">
              Smart Life
            </span>
            <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold tracking-wider uppercase">
              Manager
            </span>
          </div>
        </div>

        <ThemeToggle />
      </div>

      {/* Auth Card Container */}
      <div className="my-auto max-w-md w-full mx-auto py-8">
        {children}
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-400 dark:text-slate-500 max-w-md w-full mx-auto">
        <p>Smart Life Manager • Enterprise Grade Security & Data Isolation</p>
        <p className="mt-1">Never miss an important expiry, payment, or life event.</p>
      </footer>
    </div>
  );
}
