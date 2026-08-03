import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { validateDeploymentEnvironment } from "@/lib/security/deployment-environment";
import { createRequestId } from "@/lib/security/request";
import { refreshAuthSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const requestId = createRequestId(request.headers.get("x-vercel-id"));
  const environment = validateDeploymentEnvironment({
    VERCEL_ENV: process.env.VERCEL_ENV,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    PRODUCTION_SUPABASE_PROJECT_REF: process.env.PRODUCTION_SUPABASE_PROJECT_REF,
  });
  if (process.env.VERCEL_ENV === "preview" && !environment.success) {
    return new NextResponse(
      "Preview protegido: configure um projeto Supabase de staging separado para habilitar este ambiente.",
      {
        status: 503,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "retry-after": "3600",
          "x-request-id": requestId,
        },
      },
    );
  }
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
