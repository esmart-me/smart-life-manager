// scripts/verify-supabase-connection.ts
// Safe, read-only connection and schema diagnostic for Central Supabase.
// STRICT SAFETY:
// 1. Never logs or exposes raw secrets/keys.
// 2. Performs strictly read-only queries (SELECT with limit(1)).
// 3. ZERO inserts, updates, deletes, or modifications to customer records.

import {
  getSupabaseClientConfig,
  getSupabaseServiceRoleKey,
  isSupabaseServerAdminConfigured,
} from "../src/lib/supabase/config";
import { createSafeSupabaseClient } from "../src/lib/supabase/client";
import { createServerAdminSupabaseClient } from "../src/lib/supabase/server";

function maskKey(key: string | null): string {
  if (!key) return "NOT CONFIGURED";
  if (key.length <= 10) return "CONFIGURED (length < 10)";
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-4);
  return `${prefix}...${suffix} (length: ${key.length})`;
}

async function verifySupabaseConnection() {
  console.log("===============================================================================");
  console.log("SMART LIFE MANAGER — CENTRAL SUPABASE SAFE CONNECTION VERIFICATION");
  console.log("===============================================================================\n");

  const { url, anonKey, isConfigured: clientConfigured } = getSupabaseClientConfig();
  const serviceKey = getSupabaseServiceRoleKey();
  const adminConfigured = isSupabaseServerAdminConfigured();

  console.log("1. ENVIRONMENT CONFIGURATION AUDIT");
  console.log("----------------------------------");
  console.log(`- Project URL         : ${url ? url : "NOT CONFIGURED"}`);
  console.log(`- Client (Anon) Key   : ${maskKey(anonKey)}`);
  console.log(`- Service Role Key    : ${maskKey(serviceKey)}`);
  console.log(`- Client Configured   : ${clientConfigured ? "YES" : "NO"}`);
  console.log(`- Admin Configured    : ${adminConfigured ? "YES" : "NO"}\n`);

  if (!url || !anonKey || !serviceKey || !adminConfigured) {
    console.log("STATUS: MISSING LIVE CREDENTIALS");
    console.log("--------------------------------");
    console.log("Live Supabase credentials are not yet configured in your .env file.");
    console.log("\nTo enable Central Supabase connectivity, please populate in D:\\MyApp\\.env:\n");
    console.log("NEXT_PUBLIC_SUPABASE_URL=\"https://<your-project-ref>.supabase.co\"");
    console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY=\"<your-anon-or-publishable-key>\"");
    console.log("SUPABASE_SERVICE_ROLE_KEY=\"<your-service-role-or-secret-key>\"\n");
    console.log("Then re-run: npx tsx scripts/verify-supabase-connection.ts");
    console.log("===============================================================================\n");
    process.exit(0);
  }

  // ---------------------------------------------------------------------------
  // 2. Read-Only Public / Client Connectivity Test
  // ---------------------------------------------------------------------------
  console.log("2. PUBLIC / CLIENT READ-ONLY CONNECTIVITY CHECK");
  console.log("----------------------------------------------");
  try {
    const client = createSafeSupabaseClient();
    if (!client) {
      console.log("[FAIL] Could not instantiate safe Supabase client.\n");
    } else {
      const startTime = Date.now();
      const { data, error } = await client
        .from("plans")
        .select("id")
        .limit(1);

      const latencyMs = Date.now() - startTime;
      if (error) {
        console.log(`[WARN] Client query returned error: ${error.message} (latency: ${latencyMs}ms)`);
        console.log("       Note: If 'plans' table is empty or requires specific auth, checking app_versions...");
        const { error: versionErr } = await client.from("app_versions").select("id").limit(1);
        if (versionErr) {
          console.log(`[FAIL] Client verification failed: ${versionErr.message}`);
        } else {
          console.log(`[PASS] Public / Client connection verified via app_versions (${latencyMs}ms latency).\n`);
        }
      } else {
        console.log(`[PASS] Public / Client connection verified (${latencyMs}ms latency). Read 0 rows modified.\n`);
      }
    }
  } catch (err: any) {
    console.log(`[FAIL] Public / Client connection threw error: ${err?.message}\n`);
  }

  // ---------------------------------------------------------------------------
  // 3. Read-Only Administrative Service Role Connectivity Check
  // ---------------------------------------------------------------------------
  console.log("3. ADMIN SERVICE-ROLE READ-ONLY CONNECTIVITY CHECK");
  console.log("--------------------------------------------------");
  try {
    const adminClient = createServerAdminSupabaseClient();
    if (!adminClient) {
      console.log("[FAIL] Could not instantiate admin Supabase client.\n");
    } else {
      const startTime = Date.now();
      // Read-only inspection of control-plane tables (zero writes, zero mutations)
      const [profilesRes, subsRes, paymentsRes] = await Promise.all([
        adminClient.from("customer_profiles").select("id").limit(1),
        adminClient.from("subscriptions").select("id").limit(1),
        adminClient.from("payments").select("id").limit(1),
      ]);

      const latencyMs = Date.now() - startTime;
      let tablesOk = true;

      if (profilesRes.error) {
        console.log(`- customer_profiles: [FAIL] ${profilesRes.error.message}`);
        tablesOk = false;
      } else {
        console.log(`- customer_profiles: [ACCESSIBLE] (read-only query succeeded)`);
      }

      if (subsRes.error) {
        console.log(`- subscriptions    : [FAIL] ${subsRes.error.message}`);
        tablesOk = false;
      } else {
        console.log(`- subscriptions    : [ACCESSIBLE] (read-only query succeeded)`);
      }

      if (paymentsRes.error) {
        console.log(`- payments         : [FAIL] ${paymentsRes.error.message}`);
        tablesOk = false;
      } else {
        console.log(`- payments         : [ACCESSIBLE] (read-only query succeeded)`);
      }

      if (tablesOk) {
        console.log(`\n[PASS] Server admin service-role connection verified (${latencyMs}ms latency).`);
        console.log("       All control-plane tables reachable with ZERO data modifications.\n");
      } else {
        console.log("\n[FAIL] One or more central tables could not be queried with service-role key.\n");
      }
    }
  } catch (err: any) {
    console.log(`[FAIL] Admin service-role connection threw error: ${err?.message}\n`);
  }

  console.log("===============================================================================");
  console.log("SAFE VERIFICATION COMPLETE (0 CUSTOMER RECORDS MODIFIED)");
  console.log("===============================================================================\n");
}

verifySupabaseConnection().catch(console.error);
