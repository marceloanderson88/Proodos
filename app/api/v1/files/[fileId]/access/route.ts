import { NextResponse } from "next/server";
import { z } from "zod";

import { getFileIntegrationConfig } from "@/lib/files/server-config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const accessQuerySchema = z.object({
  operation: z.enum(["preview", "download"]).default("preview"),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;
  if (!z.uuid().safeParse(fileId).success) {
    return NextResponse.json(
      {
        code: "invalid_file_id",
        message: "Identificador de arquivo inválido.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const query = accessQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success) {
    return NextResponse.json(
      { code: "invalid_request", message: "Operação de acesso inválida." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { code: "authentication_required", message: "Autenticação necessária." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { data: file } = await supabase
    .from("files")
    .select("id, status")
    .eq("id", fileId)
    .maybeSingle();
  if (!file) {
    return NextResponse.json(
      { code: "file_not_found", message: "Arquivo não encontrado." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!getFileIntegrationConfig().GOOGLE_DRIVE_UPLOAD_ENABLED) {
    return NextResponse.json(
      {
        code: "file_integration_disabled",
        message: "A integração de arquivos ainda não foi habilitada.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      code: "provider_not_implemented",
      message: "O acesso real depende do adapter Google Drive.",
    },
    { status: 501, headers: { "Cache-Control": "no-store" } },
  );
}
