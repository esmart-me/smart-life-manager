import { requireUser } from "@/lib/auth/session";
import { FamilyHubClient } from "@/components/family/FamilyHubClient";

export const metadata = {
  title: "Family Circle | Smart Life Manager",
  description: "Manage household members, roles, and shared data permissions.",
};

export default async function FamilyCirclePage() {
  await requireUser();

  return <FamilyHubClient />;
}
