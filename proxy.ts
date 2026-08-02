import type { NextRequest } from "next/server";

import { createRequestId } from "@/lib/security/request";
import { refreshAuthSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const requestId = createRequestId(request.headers.get("x-vercel-id"));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const response = await refreshAuthSession(request, requestHeaders);
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
