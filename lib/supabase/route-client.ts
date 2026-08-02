import { createServerClient } from "@supabase/ssr";
import { type NextRequest, type NextResponse } from "next/server";

import { getSupabasePublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export function createRouteSupabaseClient(
  request: NextRequest,
  response: NextResponse,
) {
  const env = getSupabasePublicEnv();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );
}
