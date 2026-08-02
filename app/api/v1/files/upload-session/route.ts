import { uploadSessionRequestSchema } from "@/features/files/contracts";
import { getFileIntegrationConfig } from "@/lib/files/server-config";
import { apiError } from "@/lib/http/api-response";
import {
  consumeRequestRateLimit,
  getRateLimitHeaders,
} from "@/lib/security/rate-limit";
import { isTrustedMutationRequest } from "@/lib/security/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return apiError(request, {
      code: "untrusted_origin",
      message: "Origem da requisição não autorizada.",
      status: 403,
    });
  }

  const rateLimit = consumeRequestRateLimit(request, "file-upload-session", {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return apiError(request, {
      code: "rate_limit_exceeded",
      message: "Muitas solicitações. Tente novamente em instantes.",
      status: 429,
      headers: getRateLimitHeaders(rateLimit),
    });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError(request, {
      code: "authentication_required",
      message: "Autenticação necessária.",
      status: 401,
    });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = uploadSessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(request, {
      code: "invalid_request",
      message: "Os metadados do arquivo são inválidos.",
      status: 400,
      details: { fields: parsed.error.flatten().fieldErrors },
    });
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", parsed.data.organizationSlug)
    .maybeSingle();

  if (!organization) {
    return apiError(request, {
      code: "organization_not_found",
      message: "Organização não encontrada.",
      status: 404,
    });
  }

  if (!getFileIntegrationConfig().GOOGLE_DRIVE_UPLOAD_ENABLED) {
    return apiError(request, {
      code: "file_integration_disabled",
      message: "A integração de arquivos ainda não foi habilitada.",
      status: 503,
    });
  }

  return apiError(request, {
    code: "provider_not_implemented",
    message: "O adapter Google Drive depende do spike institucional.",
    status: 501,
  });
}
