export type PlanTier = "free" | "premium" | "family";

export type FamilyRole = "Owner" | "Admin" | "Member" | "View Only";

export interface PlanFeature {
  name: string;
  included: boolean;
  highlight?: boolean;
}

export interface DefaultPlanDefinition {
  plan: PlanTier;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  maxDocuments: number; // -1 for unlimited
  maxVehicles: number; // -1 for unlimited
  maxFamilyMembers: number;
  allowAdvancedReports: boolean;
  allowExports: boolean;
  allowSubscriptionTracking: boolean;
  allowCloudBackup: boolean;
  allowCustomRecurrence: boolean;
  allowAiAssistant: boolean;
  allowMultiDeviceSync: boolean;
  isPopular: boolean;
  features: PlanFeature[];
}

export const DEFAULT_PLAN_DEFINITIONS: Record<PlanTier, DefaultPlanDefinition> = {
  free: {
    plan: "free",
    name: "Free Starter",
    description: "Essential life tracking and expiry alerts for individuals.",
    monthlyPrice: 0.0,
    yearlyPrice: 0.0,
    currency: "USD",
    maxDocuments: 5,
    maxVehicles: 1,
    maxFamilyMembers: 0,
    allowAdvancedReports: false,
    allowExports: false,
    allowSubscriptionTracking: false,
    allowCloudBackup: false,
    allowCustomRecurrence: false,
    allowAiAssistant: false,
    allowMultiDeviceSync: false,
    isPopular: false,
    features: [
      { name: "Up to 5 documents with expiry tracking", included: true },
      { name: "1 vehicle with service & registration alerts", included: true },
      { name: "Basic reminders (Daily & Weekly)", included: true },
      { name: "Basic expense tracking & budget ledger", included: true },
      { name: "Basic reports on screen", included: true },
      { name: "Local storage & private device usage", included: true },
      { name: "Unlimited documents & vehicles", included: false },
      { name: "Export to PDF, CSV & Image cards", included: false },
      { name: "Subscription tracking & burn rate analysis", included: false },
      { name: "Family sharing & permission roles", included: false },
      { name: "Future AI assistant", included: false },
    ],
  },
  premium: {
    plan: "premium",
    name: "Life Pro Premium",
    description: "Unlimited power, multi-device synchronization, and advanced analytics.",
    monthlyPrice: 9.99,
    yearlyPrice: 89.99, // ~25% annual discount
    currency: "USD",
    maxDocuments: -1, // Unlimited
    maxVehicles: -1, // Unlimited
    maxFamilyMembers: 0,
    allowAdvancedReports: true,
    allowExports: true,
    allowSubscriptionTracking: true,
    allowCloudBackup: true,
    allowCustomRecurrence: true,
    allowAiAssistant: true,
    allowMultiDeviceSync: true,
    isPopular: true,
    features: [
      { name: "Unlimited documents with cloud file vault", included: true, highlight: true },
      { name: "Unlimited vehicles & fleet maintenance logs", included: true, highlight: true },
      { name: "Advanced reports & budget utilization audits", included: true },
      { name: "Export to PDF, Excel CSV & WhatsApp Image cards", included: true, highlight: true },
      { name: "Subscription tracking & annual burn rate metrics", included: true },
      { name: "Advanced custom recurrence & milestone reminders", included: true },
      { name: "Cloud backup & multi-device synchronization", included: true },
      { name: "Priority notifications & ad-free experience", included: true },
      { name: "Future AI assistant early access", included: true },
      { name: "Family member profiles & shared vault", included: false },
    ],
  },
  family: {
    plan: "family",
    name: "Family Circle Plus",
    description: "Complete peace of mind for your household with role-based sharing.",
    monthlyPrice: 19.99,
    yearlyPrice: 179.99, // ~25% annual discount
    currency: "USD",
    maxDocuments: -1, // Unlimited
    maxVehicles: -1, // Unlimited
    maxFamilyMembers: 6, // Up to 6 members
    allowAdvancedReports: true,
    allowExports: true,
    allowSubscriptionTracking: true,
    allowCloudBackup: true,
    allowCustomRecurrence: true,
    allowAiAssistant: true,
    allowMultiDeviceSync: true,
    isPopular: false,
    features: [
      { name: "Everything in Life Pro Premium", included: true, highlight: true },
      { name: "Up to 6 family member accounts", included: true, highlight: true },
      { name: "Selective data sharing across family vault", included: true },
      { name: "Granular roles: Owner, Admin, Member, View Only", included: true, highlight: true },
      { name: "Shared vehicle maintenance schedules", included: true },
      { name: "Family emergency contact & medical profile sharing", included: true },
      { name: "Shared household bill & payment reminders", included: true },
      { name: "Centralized family subscription manager", included: true },
      { name: "Family-wide priority customer support", included: true },
    ],
  },
};

export const FAMILY_ROLES: Array<{
  role: FamilyRole;
  description: string;
  canManageMembers: boolean;
  canEditData: boolean;
}> = [
  {
    role: "Owner",
    description: "Full administrative control, billing manager, and group master.",
    canManageMembers: true,
    canEditData: true,
  },
  {
    role: "Admin",
    description: "Can manage members, invite others, and create/edit shared records.",
    canManageMembers: true,
    canEditData: true,
  },
  {
    role: "Member",
    description: "Can create and edit their own and permitted shared records.",
    canManageMembers: false,
    canEditData: true,
  },
  {
    role: "View Only",
    description: "Read-only access to permitted family records. Cannot edit or delete.",
    canManageMembers: false,
    canEditData: false,
  },
];
