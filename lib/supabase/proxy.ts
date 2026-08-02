import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSafeAuthDestination } from "@/lib/auth/safe-redirect";
import { getSupabasePublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export async function refreshAuthSession(
  request: NextRequest,
  requestHeaders = new Headers(request.headers),
) {
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const env = getSupabasePublicEnv();
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
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

  const { data } = await supabase.auth.getClaims();
  const isPrivateRoute =
    request.nextUrl.pathname === "/o" ||
    request.nextUrl.pathname.startsWith("/o/") ||
    request.nextUrl.pathname === "/sem-organizacao";

  if (isPrivateRoute && !data?.claims) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set(
      "next",
      getSafeAuthDestination(
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      ),
    );
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
