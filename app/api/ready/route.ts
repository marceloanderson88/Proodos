import { checkDatabaseReadiness } from "@/lib/health/readiness";
import { apiError, apiSuccess } from "@/lib/http/api-response";
import {
  consumeRequestRateLimit,
  getRateLimitHeaders,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = consumeRequestRateLimit(request, "readiness", {
    limit: 60,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return apiError(request, {
      code: "rate_limit_exceeded",
      message: "Limite temporário da verificação de prontidão excedido.",
      status: 429,
      headers: getRateLimitHeaders(rateLimit),
    });
  }

  try {
    if (!(await checkDatabaseReadiness())) {
      return apiError(request, {
        code: "service_not_ready",
        message: "Serviço temporariamente indisponível.",
        status: 503,
      });
    }
  } catch {
    return apiError(request, {
      code: "service_not_ready",
      message: "Serviço temporariamente indisponível.",
      status: 503,
    });
  }

  return apiSuccess(request, {
    status: "ready",
    dependencies: { database: "ok" },
  });
}
