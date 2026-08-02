import { z } from "zod";

import { getFileIntegrationConfig } from "@/lib/files/server-config";
import { apiError } from "@/lib/http/api-response";
import {
  consumeRequestRateLimit,
  getRateLimitHeaders,
} from "@/lib/security/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const accessQuerySchema = z.object({
  operation: z.enum(["preview", "download"]).default("preview"),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const rateLimit = consumeRequestRateLimit(request, "file-access", {
    limit: 120,
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

  const query = accessQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success) {
    return apiError(request, {
      code: "invalid_request",
      message: "Operação de acesso inválida.",
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

  const { data: file } = await supabase
    .from("files")
    .select("id, status")
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
    message: "O acesso real depende do adapter Google Drive.",
    status: 501,
  });
}
