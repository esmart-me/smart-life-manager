import { requireUser } from "@/lib/auth/session";
import { PremiumScreenClient } from "@/components/plans/PremiumScreenClient";

export const metadata = {
  title: "Upgrade to Life Pro & Family Circle | Smart Life Manager",
  description: "Explore subscription tiers, dynamic pricing, and family sharing controls.",
};

export default async function PremiumPage() {
  await requireUser();

  return <PremiumScreenClient />;
}
