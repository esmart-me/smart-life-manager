import { requireUser } from "@/lib/auth/session";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { AppHeader } from "@/components/layout/AppHeader";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enforce server-side authentication
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Desktop Sidebar (hidden on mobile, visible on desktop) */}
      <DesktopSidebar user={user} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader user={user} />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto pb-24 lg:pb-10">
          {children}
        </main>

        {/* Mobile Bottom Navigation (visible on mobile, hidden on desktop) */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
