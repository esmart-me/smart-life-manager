// src/lib/supabase/client.ts
// Client-safe Supabase factory utilizing Anon Key and user JWT tokens.
// Fully compliant with Row Level Security (RLS). Zero privileged secrets.

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClientConfig } from "./config";

/**
 * Creates a standard client-safe Supabase client.
 * Bound to the public Anon Key.
 * @param accessToken Optional user JWT (e.g. from auth session) to evaluate auth.uid() in RLS
 */
export function createSafeSupabaseClient(accessToken?: string): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseClientConfig();
  if (!isConfigured) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}
