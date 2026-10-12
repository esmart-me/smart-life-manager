import { requireAdmin } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Strictly enforce server-side administrative role check
  // Unauthorized users / customers will be redirected to /admin/login?error=forbidden
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col lg:flex-row relative">
      <div className="fixed inset-0 pointer-events-none bg-theme-bg-gradient -z-10" />
      <AdminSidebar admin={admin} />
      <main className="flex-1 lg:pl-64 min-w-0 flex flex-col">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>

  );
}
