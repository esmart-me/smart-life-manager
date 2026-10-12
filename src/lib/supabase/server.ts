// src/lib/supabase/server.ts
// Secure server-side Supabase client and administrative central backend operations.
// STRICT SECURITY: Executed exclusively within trusted server-side environments.

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClientConfig, getSupabaseServiceRoleKey, isSupabaseServerAdminConfigured } from "./config";

/**
 * Creates a server-side Supabase client with administrative service-role privileges.
 * Used exclusively for authoritative licensing, payment webhooks, and secure audit logging.
 */
export function createServerAdminSupabaseClient(): SupabaseClient | null {
  if (typeof window !== "undefined") {
    throw new Error("[SECURITY VIOLATION] createServerAdminSupabaseClient cannot be run in the browser.");
  }

  const { url, isConfigured } = getSupabaseClientConfig();
  const serviceKey = getSupabaseServiceRoleKey();

  if (!isConfigured || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export interface EnsureCustomerProfileParams {
  customerId: string;
  email: string;
  fullName?: string | null;
}

/**
 * Idempotently ensures a customer profile exists in the central database.
 * Strictly prevents normal customers from assigning admin roles or modifying subscription flags.
 */
export async function ensureCentralCustomerProfile(
  params: EnsureCustomerProfileParams
): Promise<{ success: boolean; error?: string }> {
  const client = createServerAdminSupabaseClient();
  if (!client) {
    return { success: false, error: "Central backend not configured" };
  }

  try {
    const { data: existing, error: selectErr } = await client
      .from("customer_profiles")
      .select("id, account_status")
      .eq("id", params.customerId)
      .maybeSingle();

    if (selectErr) {
      console.warn("[Central Supabase] Error checking customer profile:", selectErr.message);
    }

    if (!existing) {
      const { error: insertErr } = await client
        .from("customer_profiles")
        .insert({
          id: params.customerId,
          email: params.email.trim().toLowerCase(),
          full_name: params.fullName || params.email.split("@")[0],
          account_status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
        });

      if (insertErr) {
        console.error("[Central Supabase] Failed to create customer profile:", insertErr.message);
        return { success: false, error: insertErr.message };
      }
    } else {
      // Update last active timestamp
      await client
        .from("customer_profiles")
        .update({
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.customerId);
    }

    return { success: true };
  } catch (error: any) {
    console.error("[Central Supabase] Profile operation exception:", error);
    return { success: false, error: error?.message || "Unknown error" };
  }
}

export interface RecordLoginEventParams {
  customerId: string;
  deviceId: string;
  loginMethod: string;
  os?: string;
  appVersion?: string;
}

/**
 * Records an immutable login event in public.login_events and updates profile login timestamps.
 */
export async function recordCentralLoginEvent(
  params: RecordLoginEventParams
): Promise<{ success: boolean; error?: string }> {
  const client = createServerAdminSupabaseClient();
  if (!client) {
    return { success: false, error: "Central backend not configured" };
  }

  try {
    const now = new Date().toISOString();
    const { error: insertErr } = await client
      .from("login_events")
      .insert({
        customer_id: params.customerId,
        device_id: params.deviceId || "unknown",
        login_method: params.loginMethod || "password",
        os: params.os || "windows",
        app_version: params.appVersion || "1.0.0",
        created_at: now,
      });

    if (insertErr) {
      console.warn("[Central Supabase] Failed to insert login event:", insertErr.message);
    }

    // Update profile last login time
    await client
      .from("customer_profiles")
      .update({
        last_login_at: now,
        last_active_at: now,
      })
      .eq("id", params.customerId);

    return { success: true };
  } catch (error: any) {
    console.error("[Central Supabase] recordCentralLoginEvent exception:", error);
    return { success: false, error: error?.message };
  }
}

export interface RegisterDeviceParams {
  customerId: string;
  deviceId: string;
  os?: string;
  appVersion?: string;
}

/**
 * Upserts a client device record in public.devices.
 */
export async function registerCentralDevice(
  params: RegisterDeviceParams
): Promise<{ success: boolean; error?: string }> {
  const client = createServerAdminSupabaseClient();
  if (!client) {
    return { success: false, error: "Central backend not configured" };
  }

  try {
    const now = new Date().toISOString();
    const { data: existing } = await client
      .from("devices")
      .select("id")
      .eq("customer_id", params.customerId)
      .eq("device_id", params.deviceId)
      .maybeSingle();

    if (existing) {
      await client
        .from("devices")
        .update({
          os: params.os || "windows",
          app_version: params.appVersion || "1.0.0",
          last_seen: now,
          is_active: true,
        })
        .eq("id", existing.id);
    } else {
      await client
        .from("devices")
        .insert({
          customer_id: params.customerId,
          device_id: params.deviceId,
          os: params.os || "windows",
          app_version: params.appVersion || "1.0.0",
          first_seen: now,
          last_seen: now,
          is_active: true,
        });
    }

    return { success: true };
  } catch (error: any) {
    console.error("[Central Supabase] registerCentralDevice exception:", error);
    return { success: false, error: error?.message };
  }
}

/**
 * Authoritatively retrieves customer profile and subscription from Supabase.
 */
export async function getCentralCustomerData(customerId: string): Promise<{
  profile: any | null;
  subscription: any | null;
  error?: string;
}> {
  const client = createServerAdminSupabaseClient();
  if (!client) {
    return { profile: null, subscription: null, error: "Central backend not configured" };
  }

  try {
    const [profileRes, subRes] = await Promise.all([
      client.from("customer_profiles").select("*").eq("id", customerId).maybeSingle(),
      client
        .from("subscriptions")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      profile: profileRes.data || null,
      subscription: subRes.data || null,
    };
  } catch (error: any) {
    console.error("[Central Supabase] getCentralCustomerData exception:", error);
    return { profile: null, subscription: null, error: error?.message };
  }
}

/**
 * Retrieves complete central control-plane customer detail:
 * Account, Subscription, Payments, Devices, and Login History.
 * NEVER reads private local files, documents, or expenses.
 */
export async function getCentralCustomerDetail(customerId: string): Promise<{
  profile: any | null;
  subscription: any | null;
  payments: any[];
  devices: any[];
  loginEvents: any[];
  error?: string;
}> {
  const client = createServerAdminSupabaseClient();
  if (!client) {
    return {
      profile: null,
      subscription: null,
      payments: [],
      devices: [],
      loginEvents: [],
      error: "Central backend not configured",
    };
  }

  try {
    const [profRes, subRes, payRes, devRes, logRes] = await Promise.all([
      client.from("customer_profiles").select("*").eq("id", customerId).maybeSingle(),
      client
        .from("subscriptions")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .from("payments")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(50),
      client
        .from("devices")
        .select("*")
        .eq("customer_id", customerId)
        .order("last_seen", { ascending: false }),
      client
        .from("login_events")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    return {
      profile: profRes.data || null,
      subscription: subRes.data || null,
      payments: payRes.data || [],
      devices: devRes.data || [],
      loginEvents: logRes.data || [],
    };
  } catch (err: any) {
    console.error("[Central Supabase] getCentralCustomerDetail exception:", err);
    return {
      profile: null,
      subscription: null,
      payments: [],
      devices: [],
      loginEvents: [],
      error: err?.message,
    };
  }
}

export interface MutateCentralSubscriptionParams {
  customerId: string;
  plan: "basic" | "premium";
  status: "active" | "expired" | "canceled";
  expiresAt: string | null;
  startsAt?: string;
  adminEmail: string;
  reason?: string;
}

/**
 * Server-side administrative mutation for customer subscriptions in Supabase.
 */
export async function mutateCentralSubscription(
  params: MutateCentralSubscriptionParams
): Promise<{ success: boolean; data?: any; error?: string }> {
  const client = createServerAdminSupabaseClient();
  if (!client) {
    return { success: false, error: "Central backend not configured" };
  }

  try {
    const now = new Date().toISOString();
    const { data: existing } = await client
      .from("subscriptions")
      .select("id")
      .eq("customer_id", params.customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let result;
    if (existing) {
      result = await client
        .from("subscriptions")
        .update({
          plan_id: params.plan,
          status: params.status,
          expires_at: params.expiresAt,
          updated_at: now,
        })
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      result = await client
        .from("subscriptions")
        .insert({
          customer_id: params.customerId,
          plan_id: params.plan,
          status: params.status,
          starts_at: params.startsAt || now,
          expires_at: params.expiresAt,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();
    }

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, data: result.data };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export interface RecordCentralPaymentParams {
  customerId: string;
  amount: number;
  currency: string;
  status: string;
  referenceId: string;
  provider?: string;
}

/**
 * Records a verified subscription payment in public.payments.
 */
export async function recordCentralPayment(
  params: RecordCentralPaymentParams
): Promise<{ success: boolean; data?: any; error?: string }> {
  const client = createServerAdminSupabaseClient();
  if (!client) {
    return { success: false, error: "Central backend not configured" };
  }

  try {
    const { data, error } = await client
      .from("payments")
      .insert({
        customer_id: params.customerId,
        amount: params.amount,
        currency: params.currency,
        status: params.status,
        reference_id: params.referenceId,
        payment_method: params.provider || "card",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.warn("[Central Supabase] Failed to record payment:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}


