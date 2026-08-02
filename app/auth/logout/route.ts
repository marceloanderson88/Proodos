import { type NextRequest, NextResponse } from "next/server";

import { apiError } from "@/lib/http/api-response";
import { isTrustedMutationRequest } from "@/lib/security/request";
import { createRouteSupabaseClient } from "@/lib/supabase/route-client";

export async function POST(request: NextRequest) {
  if (!isTrustedMutationRequest(request)) {
    return apiError(request, {
      code: "untrusted_origin",
      message: "Origem da requisição não autorizada.",
      status: 403,
    });
  }
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  const supabase = createRouteSupabaseClient(request, response);
  await supabase.auth.signOut();
  return response;
}
