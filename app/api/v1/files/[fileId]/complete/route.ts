import { z } from "zod";

import { completeUploadInputSchema } from "@/features/files/contracts";
import { getFileIntegrationConfig } from "@/lib/files/server-config";
import { apiError } from "@/lib/http/api-response";
import {
  consumeRequestRateLimit,
  getRateLimitHeaders,
} from "@/lib/security/rate-limit";
import { isTrustedMutationRequest } from "@/lib/security/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const completionBodySchema = completeUploadInputSchema.omit({ fileId: true });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  if (!isTrustedMutationRequest(request)) {
    return apiError(request, {
      code: "untrusted_origin",
      message: "Origem da requisição não autorizada.",
      status: 403,
    });
  }

  const rateLimit = consumeRequestRateLimit(request, "file-complete", {
    limit: 60,
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

  const { fileId } = await params;
  if (!z.uuid().safeParse(fileId).success) {
    return apiError(request, {
      code: "invalid_file_id",
      message: "Identificador de arquivo inválido.",
      status: 400,
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
  const parsed = completionBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(request, {
      code: "invalid_request",
      message: "Os metadados de conclusão são inválidos.",
      status: 400,
      details: { fields: parsed.error.flatten().fieldErrors },
    });
  }

  const { data: file } = await supabase
    .from("files")
    .select("id")
    .eq("id", fileId)
    .maybeSingle();
  if (!file) {
    return apiError(request, {
      code: "file_not_found",
      message: "Arquivo não encontrado.",
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
    message: "A conclusão real depende do adapter Google Drive.",
    status: 501,
  });
}
