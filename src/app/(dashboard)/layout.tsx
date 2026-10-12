import { requireUser } from "@/lib/auth/session";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { AppHeader } from "@/components/layout/AppHeader";
import { FloatingAiAssistant } from "@/components/assistant/FloatingAiAssistant";
import { CustomerOnboardingModal } from "@/components/onboarding/CustomerOnboardingModal";
import { ReminderEngine } from "@/components/reminders/ReminderEngine";
import { EntitlementHeartbeat } from "@/components/entitlement/EntitlementHeartbeat";

import { PageTransitionWrapper } from "@/components/layout/PageTransitionWrapper";


export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enforce server-side authentication
  const user = await requireUser();

  return (
    <div className="min-h-screen flex transition-colors duration-200">
      {/* Desktop Sidebar (hidden on mobile, visible on desktop) */}
      <DesktopSidebar user={user} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Authoritative 24-Hour Entitlement Heartbeat & Expiry Notification */}
        <EntitlementHeartbeat />

        <AppHeader user={user} />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto pb-24 lg:pb-10">
          <PageTransitionWrapper>{children}</PageTransitionWrapper>
        </main>

        {/* Floating AI Assistant Entry Point */}
        <FloatingAiAssistant />

        {/* First-Time Customer Onboarding Flow */}
        <CustomerOnboardingModal />

        {/* Reminder Engine: browser notifications, snooze, due/overdue recovery */}
        <ReminderEngine />

        {/* Mobile Bottom Navigation (visible on mobile, hidden on desktop) */}
        <MobileBottomNav />

      </div>
    </div>
  );
}
