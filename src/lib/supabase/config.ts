// src/lib/supabase/config.ts
// Secure Supabase configuration and credential resolver.
// Enforces strict separation: service_role key is NEVER accessible to browser or client bundles.

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

function cleanValue(val?: string | null): string {
  if (!val) return "";
  return val.trim().replace(/^["']+|["']+$/g, "").trim();
}

/**
 * Returns the public / client-safe Supabase configuration.
 * Safe for use anywhere (client or server) because it only uses URL and Anon Key.
 */
export function getSupabaseClientConfig(): SupabaseConfig {
  const url = cleanValue(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  );
  const anonKey = cleanValue(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY
  );

  const isConfigured = Boolean(
    url &&
    url.length > 8 &&
    !url.includes("your-project-ref") &&
    anonKey &&
    anonKey.length > 20 &&
    !anonKey.includes("your-anon-key") &&
    !anonKey.includes("your-publishable-key")
  );

  return { url, anonKey, isConfigured };
}

/**
 * Returns the server-only Supabase Service Role Key.
 * CRITICAL SECURITY: Throws an error immediately if called in a client/browser environment.
 */
export function getSupabaseServiceRoleKey(): string | null {
  if (typeof window !== "undefined") {
    throw new Error(
      "[SECURITY VIOLATION] Attempted to access SUPABASE_SERVICE_ROLE_KEY from a client/browser context! " +
      "Service role keys must NEVER be exposed outside trusted server runtimes."
    );
  }

  const serviceKey = cleanValue(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY
  );
  if (
    !serviceKey ||
    serviceKey.includes("your-service-role-key") ||
    serviceKey.includes("your-secret-key")
  ) {
    return null;
  }
  return serviceKey;
}

/**
 * Checks whether the server environment has full administrative access to central Supabase.
 */
export function isSupabaseServerAdminConfigured(): boolean {
  if (typeof window !== "undefined") return false;
  const { isConfigured } = getSupabaseClientConfig();
  const serviceKey = getSupabaseServiceRoleKey();
  return isConfigured && Boolean(serviceKey && serviceKey.length > 20);
}
