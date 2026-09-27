import { prisma } from "@/lib/db/prisma";
import { SUPPORTED_REGIONS, getRegion, DEFAULT_REGION_CODE } from "@/lib/regions";
import { PlanTier } from "./constants";

export interface RegionalPlanPriceDTO {
  plan: PlanTier;
  regionCode: string;
  country: string;
  currency: string;
  currencySymbol: string;
  monthlyPrice: number;
  yearlyPrice: number;
  enabled: boolean;
}

/**
 * Seeds default regional prices for all 10 regions if not already seeded in database.
 */
export async function ensureDefaultRegionalPricings(): Promise<void> {
  const existing = await prisma.planRegionalPricing.findMany();
  const existingSet = new Set(existing.map((p) => `${p.plan}_${p.regionCode}`));

  const plans: PlanTier[] = ["free", "premium", "family"];

  for (const reg of SUPPORTED_REGIONS) {
    for (const plan of plans) {
      const key = `${plan}_${reg.countryCode}`;
      if (!existingSet.has(key)) {
        await prisma.planRegionalPricing.create({
          data: {
            plan,
            regionCode: reg.countryCode,
            country: reg.country,
            currency: reg.currencyCode,
            currencySymbol: reg.currencySymbol,
            monthlyPrice: reg.defaultMonthlyPrice[plan],
            yearlyPrice: reg.defaultYearlyPrice[plan],
            enabled: true,
          },
        });
      }
    }
  }
}

/**
 * Gets the regional pricing for all plans in a specific region.
 */
export async function getRegionalPricingForRegion(
  regionCode?: string | null
): Promise<RegionalPlanPriceDTO[]> {
  await ensureDefaultRegionalPricings();

  const code = (regionCode || DEFAULT_REGION_CODE).toUpperCase();
  let rows = await prisma.planRegionalPricing.findMany({
    where: { regionCode: code, enabled: true },
    orderBy: { monthlyPrice: "asc" },
  });

  // Fallback to US if region has no rows
  if (rows.length === 0) {
    rows = await prisma.planRegionalPricing.findMany({
      where: { regionCode: DEFAULT_REGION_CODE, enabled: true },
      orderBy: { monthlyPrice: "asc" },
    });
  }

  return rows.map((r) => ({
    plan: r.plan as PlanTier,
    regionCode: r.regionCode,
    country: r.country,
    currency: r.currency,
    currencySymbol: r.currencySymbol,
    monthlyPrice: r.monthlyPrice,
    yearlyPrice: r.yearlyPrice,
    enabled: r.enabled,
  }));
}

/**
 * Gets all regional pricing rows across all regions (for Admin Portal).
 */
export async function getAllRegionalPricings() {
  await ensureDefaultRegionalPricings();
  return prisma.planRegionalPricing.findMany({
    orderBy: [{ regionCode: "asc" }, { monthlyPrice: "asc" }],
  });
}

/**
 * Updates a regional price and logs an admin audit event.
 */
export async function updateRegionalPricing(
  plan: string,
  regionCode: string,
  updates: {
    monthlyPrice?: number;
    yearlyPrice?: number;
    enabled?: boolean;
  },
  admin: { id: string; email: string; ip?: string }
) {
  const code = regionCode.toUpperCase();
  const existing = await prisma.planRegionalPricing.findUnique({
    where: {
      plan_regionCode: {
        plan,
        regionCode: code,
      },
    },
  });

  if (!existing) {
    const reg = getRegion(code);
    await prisma.planRegionalPricing.create({
      data: {
        plan,
        regionCode: code,
        country: reg.country,
        currency: reg.currencyCode,
        currencySymbol: reg.currencySymbol,
        monthlyPrice: updates.monthlyPrice !== undefined ? updates.monthlyPrice : 0,
        yearlyPrice: updates.yearlyPrice !== undefined ? updates.yearlyPrice : 0,
        enabled: updates.enabled !== undefined ? updates.enabled : true,
      },
    });
  } else {
    await prisma.planRegionalPricing.update({
      where: {
        plan_regionCode: {
          plan,
          regionCode: code,
        },
      },
      data: updates,
    });
  }

  // Record audit log
  await prisma.adminAuditLog.create({
    data: {
      adminId: admin.id,
      adminEmail: admin.email,
      action: "plan_price_change",
      targetType: "plan_regional_pricing",
      targetId: `${plan}_${code}`,
      details: JSON.stringify({
        plan,
        regionCode: code,
        previous: existing
          ? {
              monthlyPrice: existing.monthlyPrice,
              yearlyPrice: existing.yearlyPrice,
              enabled: existing.enabled,
            }
          : null,
        updatedTo: updates,
      }),
      ipAddress: admin.ip || "127.0.0.1",
    },
  });

  return getRegionalPricingForRegion(code);
}

/**
 * Authoritative server-side price lookup.
 * NEVER trust the client price.
 */
export async function getAuthoritativePlanPrice(
  plan: string,
  regionCode: string,
  interval: "monthly" | "yearly" = "monthly"
): Promise<{
  amount: number;
  currency: string;
  currencySymbol: string;
  regionCode: string;
}> {
  await ensureDefaultRegionalPricings();

  const code = regionCode.toUpperCase();
  const pricing = await prisma.planRegionalPricing.findUnique({
    where: {
      plan_regionCode: {
        plan,
        regionCode: code,
      },
    },
  });

  if (pricing) {
    return {
      amount: interval === "yearly" ? pricing.yearlyPrice : pricing.monthlyPrice,
      currency: pricing.currency,
      currencySymbol: pricing.currencySymbol,
      regionCode: pricing.regionCode,
    };
  }

  // Fallback to default region (US)
  const fallback = await prisma.planRegionalPricing.findUnique({
    where: {
      plan_regionCode: {
        plan,
        regionCode: DEFAULT_REGION_CODE,
      },
    },
  });

  if (fallback) {
    return {
      amount: interval === "yearly" ? fallback.yearlyPrice : fallback.monthlyPrice,
      currency: fallback.currency,
      currencySymbol: fallback.currencySymbol,
      regionCode: fallback.regionCode,
    };
  }

  return {
    amount: 0,
    currency: "USD",
    currencySymbol: "$",
    regionCode: "US",
  };
}
