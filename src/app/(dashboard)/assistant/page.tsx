// src/app/(dashboard)/assistant/page.tsx
// Authenticated Personal AI Assistant page for Smart Life Manager customers.

import { Suspense } from "react";
import { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getAiConfigStatus } from "@/lib/ai/gemini-service";
import { AssistantClient } from "@/components/assistant/AssistantClient";

export const metadata: Metadata = {
  title: "AI Personal Assistant | Smart Life Manager",
  description:
    "Grounded, read-only AI Assistant to understand and organize your personal life data.",
};

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const user = await requireUser();
  const initialStatus = getAiConfigStatus();

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-xs text-slate-500 animate-pulse">
            Loading AI Assistant...
          </div>
        </div>
      }
    >
      <AssistantClient initialStatus={initialStatus} user={user} />
    </Suspense>
  );
}
