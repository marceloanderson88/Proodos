import { type NextRequest, NextResponse } from "next/server";

import { createRouteSupabaseClient } from "@/lib/supabase/route-client";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  const supabase = createRouteSupabaseClient(request, response);
  await supabase.auth.signOut();
  return response;
}
