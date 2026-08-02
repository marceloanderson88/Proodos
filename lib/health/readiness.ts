import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

const readinessTimeoutMs = 3_000;

export async function checkDatabaseReadiness() {
  const env = getSupabasePublicEnv();
  const supabase = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );

  const timeout = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error("readiness_timeout")),
      readinessTimeoutMs,
    );
  });
  const result = await Promise.race([
    supabase.rpc("system_readiness"),
    timeout,
  ]);
  return result.error === null && result.data === true;
}
