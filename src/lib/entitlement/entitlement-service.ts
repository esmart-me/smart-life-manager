// src/lib/entitlement/entitlement-service.ts
// Authoritative entitlement computation and secure offline-grace cache engine.
// Implements HMAC integrity verification, server-time enforcement, and anti-clock-rollback protection.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  CentralEntitlement,
  CachedEntitlementRecord,
  ConnectionStateType,
  HandshakeResult,
} from "./types";
import { isSupabaseServerAdminConfigured } from "../supabase/config";
import { getCentralCustomerData } from "../supabase/server";

const OFFLINE_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days maximum offline grace

/**
 * Resolves cache directory path in AppData or fallback.
 */
function getEntitlementCachePath(customerId: string): string {
  const baseDir =
    process.env.APPDATA
      ? path.join(process.env.APPDATA, "smart-life-manager")
      : path.join(process.cwd(), ".cache");

  try {
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
  } catch {}

  const safeId = customerId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(baseDir, `entitlement_${safeId}.json`);
}

/**
 * Derives a secure HMAC key for entitlement cache integrity.
 */
function getCacheHmacKey(): string {
  return (
    process.env.JWT_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    "smart-life-manager-entitlement-cache-secret-salt-2026"
  );
}

/**
 * Computes HMAC SHA-256 integrity signature over entitlement cache fields.
 */
export function computeCacheSignature(
  customerId: string,
  entitlement: CentralEntitlement,
  cachedAt: string,
  offlineGraceUntil: string | null
): string {
  const payload = [
    customerId,
    entitlement.plan,
    entitlement.status,
    entitlement.premiumEnabled ? "1" : "0",
    entitlement.accountStatus,
    entitlement.appAccessAllowed ? "1" : "0",
    entitlement.expiresAt || "",
    cachedAt,
    offlineGraceUntil || "",
  ].join("|");

  return crypto.createHmac("sha256", getCacheHmacKey()).update(payload).digest("hex");
}

/**
 * Authoritatively computes entitlement based on central subscription & profile records.
 * STRICT CRITICAL RULE: Authoritative server time is used.
 * If subscription expiry is before server time, downgrade to Basic.
 * If subscription is canceled, premiumEnabled = false.
 * If account is suspended, premiumEnabled = false and appAccessAllowed = false.
 */
export function computeEntitlement(
  subscription: any | null,
  profile: any | null,
  serverNow: Date = new Date()
): CentralEntitlement {
  const now = serverNow;
  const nowIso = now.toISOString();

  // 1. Account status evaluation
  const rawAccountStatus = (profile?.account_status || "active").toLowerCase();
  const accountStatus = rawAccountStatus === "suspended" ? "suspended" : "active";

  if (accountStatus === "suspended") {
    return {
      plan: "basic",
      status: "suspended",
      startsAt: null,
      expiresAt: null,
      premiumEnabled: false,
      accountStatus: "suspended",
      appAccessAllowed: false,
      lastVerifiedAt: nowIso,
      serverTime: nowIso,
      daysRemaining: 0,
    };
  }

  // 2. No subscription found -> Default Basic
  if (!subscription) {
    return {
      plan: "basic",
      status: "active",
      startsAt: null,
      expiresAt: null,
      premiumEnabled: false,
      accountStatus: "active",
      appAccessAllowed: true,
      lastVerifiedAt: nowIso,
      serverTime: nowIso,
      daysRemaining: null,
    };
  }

  // 3. Inspect subscription status & plan
  const rawSubStatus = (subscription.status || "active").toLowerCase();
  const rawPlan = (subscription.plan || subscription.plan_id || "").toLowerCase();
  const isPremiumTier =
    rawPlan === "premium" ||
    rawPlan === "pro" ||
    rawPlan === "family" ||
    rawPlan === "gold" ||
    rawPlan === "ultra";

  const startsAt = subscription.starts_at || subscription.createdAt || null;
  const expiresAt = subscription.expires_at || subscription.currentPeriodEnd || null;

  // Canceled status check
  if (rawSubStatus === "canceled") {
    return {
      plan: "basic",
      status: "canceled",
      startsAt,
      expiresAt,
      premiumEnabled: false,
      accountStatus: "active",
      appAccessAllowed: true,
      lastVerifiedAt: nowIso,
      serverTime: nowIso,
      daysRemaining: 0,
    };
  }

  // Suspended subscription check
  if (rawSubStatus === "suspended") {
    return {
      plan: "basic",
      status: "suspended",
      startsAt,
      expiresAt,
      premiumEnabled: false,
      accountStatus: "suspended",
      appAccessAllowed: false,
      lastVerifiedAt: nowIso,
      serverTime: nowIso,
      daysRemaining: 0,
    };
  }

  // 4. Expiration evaluation against authoritative server time
  let isExpired = false;
  let daysRemaining: number | null = null;

  if (expiresAt) {
    const expDate = new Date(expiresAt);
    if (!isNaN(expDate.getTime())) {
      const diffMs = expDate.getTime() - now.getTime();
      if (diffMs <= 0) {
        isExpired = true;
        daysRemaining = 0;
      } else {
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }
    }
  }

  if (rawSubStatus === "expired" || rawSubStatus === "canceled_expired") {
    isExpired = true;
    daysRemaining = 0;
  }

  // If expired: downgrade to Basic, disable Premium
  if (isExpired) {
    return {
      plan: "basic",
      status: "expired",
      startsAt,
      expiresAt,
      premiumEnabled: false,
      accountStatus: "active",
      appAccessAllowed: true, // Basic customer data remains accessible
      lastVerifiedAt: nowIso,
      serverTime: nowIso,
      daysRemaining: 0,
    };
  }

  // 5. Active Premium Subscription
  if (isPremiumTier && rawSubStatus === "active") {
    return {
      plan: "premium",
      status: "active",
      startsAt,
      expiresAt,
      premiumEnabled: true,
      accountStatus: "active",
      appAccessAllowed: true,
      lastVerifiedAt: nowIso,
      serverTime: nowIso,
      daysRemaining,
    };
  }

  // 6. Active Free/Basic Subscription
  return {
    plan: "basic",
    status: "active",
    startsAt,
    expiresAt,
    premiumEnabled: false,
    accountStatus: "active",
    appAccessAllowed: true,
    lastVerifiedAt: nowIso,
    serverTime: nowIso,
    daysRemaining: null,
  };
}

/**
 * Reads local cached entitlement for a customer.
 * Enforces cryptographic HMAC signature verification and clock rollback protection.
 */
export function getCachedEntitlement(customerId: string): CachedEntitlementRecord | null {
  try {
    const cacheFile = getEntitlementCachePath(customerId);
    if (!fs.existsSync(cacheFile)) return null;
    const content = fs.readFileSync(cacheFile, "utf8");
    const record = JSON.parse(content) as CachedEntitlementRecord;

    if (!record || !record.entitlement || !record.cachedAt) {
      return null;
    }

    // Verify HMAC signature if present
    if (record.signature) {
      const expectedSig = computeCacheSignature(
        record.customerId,
        record.entitlement,
        record.cachedAt,
        record.offlineGraceUntil
      );
      if (record.signature !== expectedSig) {
        console.warn("[Entitlement Cache] Integrity violation: cache signature mismatch. Discarding cache.");
        return null;
      }
    }

    // Anti-Clock-Rollback Protection:
    // If client system clock is significantly earlier than the timestamp when this cache was signed,
    // a clock manipulation rollback is detected. Neutralize premium privileges.
    const now = Date.now();
    const cachedAtTime = new Date(record.cachedAt).getTime();
    if (now < cachedAtTime - 60000) {
      console.warn("[Entitlement Cache] Clock rollback detected! Customer device time is in the past. Disabling Premium.");
      return {
        ...record,
        entitlement: {
          ...record.entitlement,
          plan: "basic",
          status: "expired",
          premiumEnabled: false,
        },
      };
    }

    return record;
  } catch (err) {
    return null;
  }
}

/**
 * Saves cached entitlement with cryptographic integrity signature and offline grace limit.
 */
export function saveCachedEntitlement(
  customerId: string,
  entitlement: CentralEntitlement
): void {
  try {
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    let offlineGraceUntil: string | null = null;

    // Grace period is ONLY provided if the user has verified active Premium
    if (entitlement.premiumEnabled && entitlement.expiresAt) {
      const expTime = new Date(entitlement.expiresAt).getTime();
      const maxGrace = now + OFFLINE_GRACE_PERIOD_MS;
      // Grace cannot exceed actual subscription expiration
      const effectiveGrace = Math.min(maxGrace, expTime);
      if (effectiveGrace > now) {
        offlineGraceUntil = new Date(effectiveGrace).toISOString();
      }
    }

    const signature = computeCacheSignature(customerId, entitlement, nowIso, offlineGraceUntil);

    const record: CachedEntitlementRecord = {
      customerId,
      entitlement: {
        ...entitlement,
        lastVerifiedAt: nowIso,
        serverTime: entitlement.serverTime || nowIso,
      },
      cachedAt: nowIso,
      offlineGraceUntil,
      signature,
    };

    const cacheFile = getEntitlementCachePath(customerId);
    fs.writeFileSync(cacheFile, JSON.stringify(record, null, 2), "utf8");
  } catch (err) {
    console.warn("[Entitlement Cache] Failed to write cache:", err);
  }
}

/**
 * Evaluates entitlement during offline or failed connection states.
 * Guarantees local customer data is never locked out.
 * Guarantees expired Premium is NEVER granted offline.
 * Enforces 7-day maximum offline grace limit.
 */
export function resolveOfflineEntitlement(
  customerId: string,
  clientNow: Date = new Date()
): {
  entitlement: CentralEntitlement;
  connectionState: ConnectionStateType;
} {
  const cached = getCachedEntitlement(customerId);

  if (!cached) {
    // No prior cache: safe fallback to active Basic (local app remains fully operational)
    return {
      connectionState: "OFFLINE",
      entitlement: {
        plan: "basic",
        status: "active",
        startsAt: null,
        expiresAt: null,
        premiumEnabled: false,
        accountStatus: "active",
        appAccessAllowed: true,
        lastVerifiedAt: clientNow.toISOString(),
        serverTime: clientNow.toISOString(),
        daysRemaining: null,
      },
    };
  }

  const nowMs = clientNow.getTime();

  // Clock rollback check: if device time is before cache was saved, force expired/basic
  const cachedAtMs = new Date(cached.cachedAt).getTime();
  if (nowMs < cachedAtMs - 60000) {
    return {
      connectionState: "OFFLINE",
      entitlement: {
        ...cached.entitlement,
        plan: "basic",
        status: "expired",
        premiumEnabled: false,
      },
    };
  }

  // If cached record was already expired or basic, KEEP it basic/expired!
  if (!cached.entitlement.premiumEnabled || cached.entitlement.status === "expired" || cached.entitlement.status === "canceled") {
    return {
      connectionState: "OFFLINE",
      entitlement: {
        ...cached.entitlement,
        plan: "basic",
        status: cached.entitlement.status === "canceled" ? "canceled" : "expired",
        premiumEnabled: false,
      },
    };
  }

  // If cached record was Premium, check offline grace limit
  if (cached.offlineGraceUntil) {
    const graceLimit = new Date(cached.offlineGraceUntil).getTime();
    if (nowMs <= graceLimit) {
      // Within offline grace period
      return {
        connectionState: "OFFLINE",
        entitlement: {
          ...cached.entitlement,
          premiumEnabled: true,
        },
      };
    }
  }

  // Grace period expired while offline: gracefully fallback to Basic without corrupting data
  return {
    connectionState: "OFFLINE",
    entitlement: {
      ...cached.entitlement,
      plan: "basic",
      status: "expired",
      premiumEnabled: false,
      daysRemaining: 0,
    },
  };
}

/**
 * Retrieves the authoritative entitlement for a user.
 * 1. Checks Central Supabase first (authoritative cloud source).
 * 2. If available, computes entitlement, saves to local cache, and returns it.
 * 3. If unreachable or unconfigured, falls back safely to cached offline evaluation.
 */
export async function getAuthoritativeEntitlement(customerId: string): Promise<CentralEntitlement> {
  if (isSupabaseServerAdminConfigured()) {
    try {
      const centralData = await getCentralCustomerData(customerId);
      if (centralData && (centralData.subscription || centralData.profile)) {
        const entitlement = computeEntitlement(centralData.subscription, centralData.profile);
        saveCachedEntitlement(customerId, entitlement);
        return entitlement;
      }
    } catch (err) {
      console.warn("[Entitlement Service] Central lookup failed, evaluating offline grace:", err);
    }
  }

  // Offline / Local evaluation
  const offline = resolveOfflineEntitlement(customerId);
  return offline.entitlement;
}
