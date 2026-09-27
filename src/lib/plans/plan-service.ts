import { prisma } from "@/lib/db/prisma";
import { DEFAULT_PLAN_DEFINITIONS, PlanTier } from "./constants";

export interface PlanLimitStatus {
  current: number;
  max: number; // -1 for unlimited
  isUnlimited: boolean;
  canCreate: boolean;
  percentUsed: number;
}

export interface UserPlanSummary {
  plan: PlanTier;
  planName: string;
  status: string;
  billingInterval: string;
  isPremiumOrFamily: boolean;
  isFamily: boolean;
  limits: {
    documents: PlanLimitStatus;
    vehicles: PlanLimitStatus;
    familyMembers: PlanLimitStatus;
  };
  features: {
    allowExports: boolean;
    allowAdvancedReports: boolean;
    allowSubscriptionTracking: boolean;
    allowCloudBackup: boolean;
    allowCustomRecurrence: boolean;
    allowAiAssistant: boolean;
    allowMultiDeviceSync: boolean;
  };
  pricing: {
    monthlyPrice: number;
    yearlyPrice: number;
    currency: string;
  };
}

/**
 * Ensures the database has the configurable PlanConfig records seeded.
 */
export async function ensureDefaultPlanConfigs() {
  const existing = await prisma.planConfig.findMany();
  const existingMap = new Map(existing.map((p) => [p.plan, p]));

  for (const [planKey, def] of Object.entries(DEFAULT_PLAN_DEFINITIONS)) {
    if (!existingMap.has(planKey)) {
      await prisma.planConfig.create({
        data: {
          plan: def.plan,
          name: def.name,
          description: def.description,
          monthlyPrice: def.monthlyPrice,
          yearlyPrice: def.yearlyPrice,
          currency: def.currency,
          maxDocuments: def.maxDocuments,
          maxVehicles: def.maxVehicles,
          maxFamilyMembers: def.maxFamilyMembers,
          allowAdvancedReports: def.allowAdvancedReports,
          allowExports: def.allowExports,
          allowSubscriptionTracking: def.allowSubscriptionTracking,
          allowCloudBackup: def.allowCloudBackup,
          allowCustomRecurrence: def.allowCustomRecurrence,
          allowAiAssistant: def.allowAiAssistant,
          allowMultiDeviceSync: def.allowMultiDeviceSync,
          isPopular: def.isPopular,
          isActive: true,
        },
      });
    }
  }
}

/**
 * Retrieves all active plan configurations from the database.
 */
export async function getAllPlans() {
  await ensureDefaultPlanConfigs();
  const plans = await prisma.planConfig.findMany({
    where: { isActive: true },
    orderBy: { monthlyPrice: "asc" },
  });

  return plans.map((p) => {
    const defaultDef = DEFAULT_PLAN_DEFINITIONS[p.plan as PlanTier];
    return {
      ...p,
      features: defaultDef ? defaultDef.features : [],
    };
  });
}

/**
 * Admin API: Updates configurable pricing or limits for a specific plan.
 */
export async function updatePlanConfig(
  plan: PlanTier,
  updates: {
    name?: string;
    description?: string;
    monthlyPrice?: number;
    yearlyPrice?: number;
    currency?: string;
    maxDocuments?: number;
    maxVehicles?: number;
    maxFamilyMembers?: number;
    allowAdvancedReports?: boolean;
    allowExports?: boolean;
    allowSubscriptionTracking?: boolean;
    allowCloudBackup?: boolean;
    allowCustomRecurrence?: boolean;
    allowAiAssistant?: boolean;
    allowMultiDeviceSync?: boolean;
    isPopular?: boolean;
  }
) {
  await ensureDefaultPlanConfigs();
  return prisma.planConfig.update({
    where: { plan },
    data: updates,
  });
}

/**
 * Gets or initializes the user's subscription record.
 */
export async function getUserSubscription(userId: string) {
  return prisma.userSubscription.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      plan: "free",
      planName: "Free Starter",
      status: "active",
      billingInterval: "monthly",
      billingCycle: "monthly",
    },
  });
}

/**
 * Fetches the user's current plan, resource usage, and active limits.
 */
export async function getUserPlanSummary(userId: string): Promise<UserPlanSummary> {
  await ensureDefaultPlanConfigs();

  const [sub, docCount, vehCount, familyMembersCount] = await Promise.all([
    getUserSubscription(userId),
    prisma.document.count({ where: { userId } }),
    prisma.vehicle.count({ where: { userId } }),
    prisma.familyGroupMember.count({
      where: {
        familyGroup: { ownerId: userId },
      },
    }),
  ]);

  const planKey = (sub.plan || "free") as PlanTier;
  const config =
    (await prisma.planConfig.findUnique({ where: { plan: planKey } })) ||
    DEFAULT_PLAN_DEFINITIONS[planKey] ||
    DEFAULT_PLAN_DEFINITIONS.free;

  const buildLimit = (current: number, max: number): PlanLimitStatus => {
    const isUnlimited = max === -1;
    return {
      current,
      max,
      isUnlimited,
      canCreate: isUnlimited || current < max,
      percentUsed: isUnlimited ? 0 : max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 100,
    };
  };

  return {
    plan: planKey,
    planName: config.name,
    status: sub.status,
    billingInterval: sub.billingInterval,
    isPremiumOrFamily: planKey === "premium" || planKey === "family",
    isFamily: planKey === "family",
    limits: {
      documents: buildLimit(docCount, config.maxDocuments),
      vehicles: buildLimit(vehCount, config.maxVehicles),
      familyMembers: buildLimit(familyMembersCount, config.maxFamilyMembers),
    },
    features: {
      allowExports: config.allowExports,
      allowAdvancedReports: config.allowAdvancedReports,
      allowSubscriptionTracking: config.allowSubscriptionTracking,
      allowCloudBackup: config.allowCloudBackup,
      allowCustomRecurrence: config.allowCustomRecurrence,
      allowAiAssistant: config.allowAiAssistant,
      allowMultiDeviceSync: config.allowMultiDeviceSync,
    },
    pricing: {
      monthlyPrice: config.monthlyPrice,
      yearlyPrice: config.yearlyPrice,
      currency: config.currency,
    },
  };
}

export type FeatureKey =
  | "create_document"
  | "create_vehicle"
  | "add_family_member"
  | "export_reports"
  | "advanced_reports"
  | "track_subscriptions"
  | "cloud_backup"
  | "custom_recurrence"
  | "ai_assistant";

export interface FeatureAccessResult {
  allowed: boolean;
  reason?: string;
  requiredPlan?: PlanTier;
  currentCount?: number;
  maxLimit?: number;
  softWarning?: boolean;
}

/**
 * Access-control evaluator for subscription features.
 * In development or non-strict mode, returns soft-warnings without breaking dev workflows.
 * In strict enforcement mode, returns allowed: false when limits are hit.
 */
export async function checkFeatureAccess(
  userId: string,
  feature: FeatureKey,
  options?: { strict?: boolean }
): Promise<FeatureAccessResult> {
  const summary = await getUserPlanSummary(userId);
  const strict = options?.strict ?? false;

  switch (feature) {
    case "create_document": {
      const limit = summary.limits.documents;
      if (!limit.canCreate) {
        if (strict) {
          return {
            allowed: false,
            reason: `Free plan limit reached (${limit.current}/${limit.max} documents). Upgrade to Premium for unlimited storage.`,
            requiredPlan: "premium",
            currentCount: limit.current,
            maxLimit: limit.max,
          };
        }
        return {
          allowed: true,
          softWarning: true,
          reason: `Document limit reached (${limit.current}/${limit.max}). You are using development non-blocking mode.`,
          currentCount: limit.current,
          maxLimit: limit.max,
        };
      }
      return { allowed: true };
    }

    case "create_vehicle": {
      const limit = summary.limits.vehicles;
      if (!limit.canCreate) {
        if (strict) {
          return {
            allowed: false,
            reason: `Free plan is limited to ${limit.max} vehicle. Upgrade to Premium for unlimited vehicles.`,
            requiredPlan: "premium",
            currentCount: limit.current,
            maxLimit: limit.max,
          };
        }
        return {
          allowed: true,
          softWarning: true,
          reason: `Vehicle limit reached (${limit.current}/${limit.max}).`,
          currentCount: limit.current,
          maxLimit: limit.max,
        };
      }
      return { allowed: true };
    }

    case "add_family_member": {
      if (!summary.isFamily) {
        if (strict) {
          return {
            allowed: false,
            reason: "Family sharing requires the Family Circle Plus plan.",
            requiredPlan: "family",
          };
        }
        return {
          allowed: true,
          softWarning: true,
          reason: "Family sharing is a Family plan feature (dev preview enabled).",
        };
      }
      const limit = summary.limits.familyMembers;
      if (!limit.canCreate) {
        return {
          allowed: false,
          reason: `Maximum family member limit reached (${limit.current}/${limit.max}).`,
        };
      }
      return { allowed: true };
    }

    case "export_reports": {
      if (!summary.features.allowExports) {
        if (strict) {
          return {
            allowed: false,
            reason: "Exporting to PDF, CSV, and Image cards is a Premium feature.",
            requiredPlan: "premium",
          };
        }
        return {
          allowed: true,
          softWarning: true,
          reason: "Exports are a Premium feature (dev preview active).",
        };
      }
      return { allowed: true };
    }

    case "advanced_reports": {
      if (!summary.features.allowAdvancedReports) {
        if (strict) {
          return {
            allowed: false,
            reason: "Advanced financial & vehicle reports require a Premium subscription.",
            requiredPlan: "premium",
          };
        }
        return { allowed: true, softWarning: true };
      }
      return { allowed: true };
    }

    case "track_subscriptions": {
      if (!summary.features.allowSubscriptionTracking) {
        if (strict) {
          return {
            allowed: false,
            reason: "Subscription tracking and burn rate analytics require Life Pro Premium.",
            requiredPlan: "premium",
          };
        }
        return { allowed: true, softWarning: true };
      }
      return { allowed: true };
    }

    case "custom_recurrence": {
      if (!summary.features.allowCustomRecurrence) {
        if (strict) {
          return {
            allowed: false,
            reason: "Custom recurring frequencies require a Premium subscription.",
            requiredPlan: "premium",
          };
        }
        return { allowed: true, softWarning: true };
      }
      return { allowed: true };
    }

    case "cloud_backup":
    case "ai_assistant": {
      if (!summary.isPremiumOrFamily) {
        if (strict) {
          return {
            allowed: false,
            reason: "This capability requires a Premium or Family subscription.",
            requiredPlan: "premium",
          };
        }
        return { allowed: true, softWarning: true };
      }
      return { allowed: true };
    }

    default:
      return { allowed: true };
  }
}

/**
 * Testing & Simulation: Switches user subscription tier without requiring real payment processing.
 */
export async function simulateUserPlanChange(
  userId: string,
  targetPlan: PlanTier,
  billingInterval: "monthly" | "yearly" = "monthly"
) {
  const current = await getUserSubscription(userId);

  const now = new Date();
  const periodEnd = new Date(now);
  if (billingInterval === "yearly") {
    periodEnd.setFullYear(now.getFullYear() + 1);
  } else {
    periodEnd.setMonth(now.getMonth() + 1);
  }

  const updated = await prisma.userSubscription.update({
    where: { id: current.id },
    data: {
      plan: targetPlan,
      status: "active",
      billingInterval,
      currentPeriodStart: now,
      currentPeriodEnd: targetPlan === "free" ? null : periodEnd,
      cancelAtPeriodEnd: false,
    },
  });

  return updated;
}
