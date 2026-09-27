import { getAllRegionalPricings } from "@/lib/plans/regional-pricing";
import { PlanManagementClient, PlanPricingRow } from "@/components/admin/PlanManagementClient";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  await requireAdmin();
  const pricings = await getAllRegionalPricings();

  const pricingRows: PlanPricingRow[] = pricings.map((p) => ({
    id: p.id,
    plan: p.plan,
    regionCode: p.regionCode,
    country: p.country,
    currency: p.currency,
    currencySymbol: p.currencySymbol,
    monthlyPrice: p.monthlyPrice,
    yearlyPrice: p.yearlyPrice,
    enabled: p.enabled,
  }));

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Plan & Regional Multi-Currency Management
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure country-specific subscription prices and currencies. Changes update customer pricing instantly with audit verification.
        </p>
      </div>

      <PlanManagementClient initialPricings={pricingRows} />
    </div>
  );
}
