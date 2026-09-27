"use client";

import { useState } from "react";
import { QuickActions } from "./QuickActions";
import { SummaryCards, DashboardStats } from "./SummaryCards";
import { AttentionRequired, AttentionItem } from "./AttentionRequired";
import { UpcomingSection, UpcomingEvent } from "./UpcomingSection";
import { QuickCreateModal, QuickModalType } from "./QuickCreateModal";

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
  const [activeModal, setActiveModal] = useState<QuickModalType>(null);

  return (
    <div className="space-y-6">
      {/* Quick Action Buttons */}
      <QuickActions onOpenModal={(type) => setActiveModal(type)} />

      {/* Real Data Summary Cards (4 Cards) */}
      <SummaryCards stats={stats} onOpenModal={(type) => setActiveModal(type)} />

      {/* Main Grid: Attention Required & Upcoming Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Attention Required */}
        <AttentionRequired items={attentionItems} />

        {/* Right Column: Upcoming Schedule */}
        <UpcomingSection
          events={upcomingEvents}
          onOpenModal={(type) => setActiveModal(type)}
        />
      </div>

      {/* Quick Add Modal */}
      <QuickCreateModal
        type={activeModal}
        onClose={() => setActiveModal(null)}
        userCurrency={userCurrency}
      />
    </div>
  );
}
