import { NextResponse } from "next/server";

import { uploadSessionRequestSchema } from "@/features/files/contracts";
import { getFileIntegrationConfig } from "@/lib/files/server-config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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

  const body: unknown = await request.json().catch(() => null);
  const parsed = uploadSessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "invalid_request",
        message: "Os metadados do arquivo são inválidos.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", parsed.data.organizationSlug)
    .maybeSingle();

  if (!organization) {
    return NextResponse.json(
      {
        code: "organization_not_found",
        message: "Organização não encontrada.",
      },
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
      message: "O adapter Google Drive depende do spike institucional.",
    },
    { status: 501, headers: { "Cache-Control": "no-store" } },
  );
}
