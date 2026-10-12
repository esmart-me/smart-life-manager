// src/lib/entitlement/types.ts
// Standardized entitlement types and states for Smart Life Manager central licensing.

export type PlanType = "basic" | "premium";
export type SubscriptionStatusType = "active" | "expired" | "canceled" | "suspended" | "trial";
export type AccountStatusType = "active" | "suspended" | "pending" | "archived";
export type ConnectionStateType = "ONLINE_VERIFIED" | "ONLINE_UNVERIFIED" | "OFFLINE";

export interface CentralEntitlement {
  plan: PlanType;
  status: SubscriptionStatusType;
  startsAt: string | null;
  expiresAt: string | null;
  premiumEnabled: boolean;
  accountStatus: AccountStatusType;
  appAccessAllowed: boolean;
  lastVerifiedAt: string;
  serverTime?: string;
  daysRemaining?: number | null;
}

export interface CachedEntitlementRecord {
  customerId: string;
  entitlement: CentralEntitlement;
  cachedAt: string;
  offlineGraceUntil: string | null;
  signature?: string;
}

export interface HandshakeResult {
  success: boolean;
  connectionState: ConnectionStateType;
  entitlement: CentralEntitlement;
  deviceId: string;
  message?: string;
}
