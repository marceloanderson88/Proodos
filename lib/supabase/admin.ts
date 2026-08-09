import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "@/lib/env";
import { resolveSupabaseAdminKey } from "@/lib/supabase/admin-key";
import type { Database } from "@/lib/supabase/database.types";

export function createSupabaseAdminClient() {
  const env = getSupabasePublicEnv();
  const secretKey = resolveSupabaseAdminKey({
    appEnv: process.env.NEXT_PUBLIC_APP_ENV,
    localAdminKey: process.env.SUPABASE_LOCAL_ADMIN_KEY,
    secretKey: process.env.SUPABASE_SECRET_KEY,
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
  });

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getAppBaseUrl() {
  const value = process.env.APP_BASE_URL?.trim();
  if (!value) throw new Error("APP_BASE_URL_NOT_CONFIGURED");
  return new URL(value).origin;
}
