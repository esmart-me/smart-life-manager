"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { QuickActions } from "./QuickActions";
import { SummaryCards, DashboardStats } from "./SummaryCards";
import { AttentionRequired, AttentionItem } from "./AttentionRequired";
import { UpcomingSection, UpcomingEvent } from "./UpcomingSection";
import { QuickModalType } from "./QuickCreateModal";
import { ReminderFormModal } from "@/components/reminders/ReminderFormModal";
import { PaymentFormModal } from "@/components/finance/PaymentFormModal";
import { DocumentFormModal } from "@/components/documents/DocumentFormModal";
import { ExpenseFormModal } from "@/components/finance/ExpenseFormModal";

interface DashboardShellClientProps {
  stats: DashboardStats;
  attentionItems: AttentionItem[];
  upcomingEvents: UpcomingEvent[];
  userCurrency: string;
}

export function DashboardShellClient({
  stats,
  attentionItems,
  upcomingEvents,
  userCurrency,
}: DashboardShellClientProps) {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<QuickModalType>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleSuccess = (message: string) => {
    setActiveModal(null);
    setSuccessToast(message);
    router.refresh();
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-600 dark:bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-xl transition-all animate-in slide-in-from-bottom duration-200"
        >
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <span className="text-sm font-semibold tracking-tight">{successToast}</span>
        </div>
      )}

      {/* Main Grid: Attention Required (Alerts) & Upcoming Schedule (Priority 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Attention Required */}
        <AttentionRequired items={attentionItems} />

        {/* Right Column: Upcoming Schedule */}
        <UpcomingSection
          events={upcomingEvents}
          onOpenModal={(type) => setActiveModal(type)}
        />
      </div>

      {/* Quick Action Buttons (Fast Entry) */}
      <QuickActions onOpenModal={(type) => setActiveModal(type)} />

      {/* Real Data Summary Cards (Life Vault Overview) */}
      <SummaryCards stats={stats} onOpenModal={(type) => setActiveModal(type)} />

      {/* Canonical Form Modals */}
      <ReminderFormModal
        isOpen={activeModal === "reminder"}
        onClose={() => setActiveModal(null)}
        onSuccess={() => handleSuccess("Reminder saved successfully!")}
      />

      <PaymentFormModal
        isOpen={activeModal === "payment"}
        onClose={() => setActiveModal(null)}
        onSuccess={() => handleSuccess("Payment recorded successfully!")}
        userCurrency={userCurrency}
      />

      <DocumentFormModal
        isOpen={activeModal === "document"}
        onClose={() => setActiveModal(null)}
        onSuccess={() => handleSuccess("Document saved successfully!")}
      />

      <ExpenseFormModal
        isOpen={activeModal === "expense"}
        onClose={() => setActiveModal(null)}
        onSuccess={() => handleSuccess("Expense recorded successfully!")}
        userCurrency={userCurrency}
      />
    </div>
  );
}
