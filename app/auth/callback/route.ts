import { type NextRequest, NextResponse } from "next/server";

import { getSafeCallbackDestination } from "@/lib/auth/safe-redirect";
import { createRouteSupabaseClient } from "@/lib/supabase/route-client";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = getSafeCallbackDestination(
    request.nextUrl.searchParams.get("next"),
  );
  if (!code) {
    return NextResponse.redirect(
      new URL("/auth/erro?code=missing-code", request.url),
    );
  }

  const response = NextResponse.redirect(new URL(destination, request.url));
  const supabase = createRouteSupabaseClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    response.headers.set(
      "Location",
      new URL("/auth/erro?code=callback-failed", request.url).toString(),
    );
  }
  return response;
}
