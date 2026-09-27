import { requireUser } from "@/lib/auth/session";
import { ReportsHubClient } from "@/components/reports/ReportsHubClient";

export default async function ReportsPage() {
  await requireUser();

  return <ReportsHubClient />;
}
