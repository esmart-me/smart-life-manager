/**
 * Subscription Constants and Types
 */

export const SUBSCRIPTION_CATEGORIES = [
  "Entertainment",
  "Software & SaaS",
  "Utilities & Telecom",
  "Health & Fitness",
  "Education",
  "Work & Productivity",
  "Other",
] as const;

export type SubscriptionCategory = (typeof SUBSCRIPTION_CATEGORIES)[number];

export const SUBSCRIPTION_BILLING_CYCLES = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "weekly", label: "Weekly" },
] as const;

export type SubscriptionBillingCycle = "monthly" | "yearly" | "quarterly" | "weekly";

export const SUBSCRIPTION_STATUSES = [
  { value: "active", label: "Active" },
  { value: "cancelled", label: "Cancelled" },
  { value: "paused", label: "Paused" },
] as const;

export type SubscriptionRenewalStatus = "active" | "cancelled" | "paused";
