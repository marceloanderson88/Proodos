"use server";

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { selectionReceiptCookieName } from "@/lib/selection/public-receipt";
import {
  publicSelectionAppealSchema,
  publicSelectionApplicationSchema,
  publicSelectionConvocationSchema,
} from "@/lib/selection/schemas";
import type { PublicSelectionCall } from "@/lib/selection/types";
import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}

function destination(slug: string, key: "success" | "error", message: string) {
  return `/chamadas/${slug}?${new URLSearchParams({ [key]: message })}`;
}

async function requestFingerprint() {
  const requestHeaders = await headers();
  const address =
    requestHeaders.get("x-vercel-forwarded-for") ??
    requestHeaders.get("x-forwarded-for") ??
    "unknown";
  const clientAddress = address.split(",", 1)[0]?.trim().slice(0, 128);
  const userAgent =
    requestHeaders.get("user-agent")?.slice(0, 512) ?? "unknown";
  return createHash("sha256")
    .update(`${clientAddress || "unknown"}\n${userAgent}`)
    .digest("hex");
}

function publicErrorMessage(
  error: { code?: string; message?: string; details?: string },
  fallback: string,
) {
  if (
    error.details === "RATE_LIMITED" ||
    error.message?.includes("Muitas tentativas")
  )
    return "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
  return fallback;
}

export async function submitPublicSelectionApplicationAction(
  call: PublicSelectionCall,
  formData: FormData,
) {
  if (value(formData, "website"))
    redirect(destination(call.slug, "success", "Inscrição recebida."));
  const answers: Record<string, string | number | boolean | string[]> = {};
  for (const question of call.questions) {
    const entries = formData
      .getAll(`answer_${question.code}`)
      .filter((entry): entry is string => typeof entry === "string");
    answers[question.code] =
      question.kind === "multiple_choice" ? entries : (entries[0] ?? "");
  }
  const parsed = publicSelectionApplicationSchema.safeParse({
    applicantName: value(formData, "applicantName"),
    applicantEmail: value(formData, "applicantEmail"),
    applicantPhone: value(formData, "applicantPhone"),
    startupName: value(formData, "startupName"),
    legalName: value(formData, "legalName"),
    taxId: value(formData, "taxId"),
    city: value(formData, "city"),
    state: value(formData, "state"),
    sector: value(formData, "sector"),
    stage: value(formData, "stage"),
    summary: value(formData, "summary"),
    answers,
  });
  if (!parsed.success)
    redirect(
      destination(
        call.slug,
        "error",
        parsed.error.issues[0]?.message ?? "Confira os dados informados.",
      ),
    );
  const sessionClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("submit_selection_application", {
    call_slug: call.slug,
    applicant_name: parsed.data.applicantName,
    applicant_email: parsed.data.applicantEmail,
    applicant_phone: parsed.data.applicantPhone,
    startup_name: parsed.data.startupName,
    legal_name: parsed.data.legalName,
    tax_id: parsed.data.taxId,
    city: parsed.data.city,
    state: parsed.data.state,
    sector: parsed.data.sector,
    stage: parsed.data.stage,
    summary: parsed.data.summary,
    answers: parsed.data.answers as Json,
    request_fingerprint: await requestFingerprint(),
    authenticated_applicant_user_id:
      user?.email?.toLowerCase() === parsed.data.applicantEmail
        ? user.id
        : null,
  });
  if (error) {
    const message =
      error.code === "23505"
        ? "Já existe uma inscrição deste e-mail nesta chamada."
        : error.message?.includes("encerradas")
          ? "O período de inscrições não está aberto."
          : publicErrorMessage(error, "Não foi possível enviar a inscrição.");
    redirect(destination(call.slug, "error", message));
  }
  const cookieStore = await cookies();
  cookieStore.set(selectionReceiptCookieName(call.slug), data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: `/chamadas/${call.slug}`,
  });
  redirect(
    destination(
      call.slug,
      "success",
      "Inscrição enviada. Guarde o protocolo exibido abaixo.",
    ),
  );
}

export async function submitPublicSelectionAppealAction(
  slug: string,
  formData: FormData,
) {
  if (value(formData, "website"))
    redirect(destination(slug, "success", "Recurso recebido."));
  const parsed = publicSelectionAppealSchema.safeParse({
    protocol: value(formData, "protocol"),
    email: value(formData, "email"),
    grounds: value(formData, "grounds"),
  });
  if (!parsed.success)
    redirect(
      destination(
        slug,
        "error",
        parsed.error.issues[0]?.message ?? "Confira os dados do recurso.",
      ),
    );
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("submit_public_selection_appeal", {
    call_slug: slug,
    application_protocol: parsed.data.protocol,
    applicant_email: parsed.data.email,
    grounds: parsed.data.grounds,
    request_fingerprint: await requestFingerprint(),
  });
  if (error)
    redirect(
      destination(
        slug,
        "error",
        error.code === "23505"
          ? "Já existe um recurso para esta inscrição."
          : publicErrorMessage(error, "Não foi possível protocolar o recurso."),
      ),
    );
  redirect(destination(slug, "success", "Recurso protocolado com sucesso."));
}

export async function respondPublicSelectionConvocationAction(
  slug: string,
  formData: FormData,
) {
  if (value(formData, "website"))
    redirect(destination(slug, "success", "Resposta recebida."));
  const parsed = publicSelectionConvocationSchema.safeParse({
    protocol: value(formData, "protocol"),
    email: value(formData, "email"),
    response: value(formData, "response"),
  });
  if (!parsed.success)
    redirect(destination(slug, "error", "Confira os dados da convocação."));
  const supabase = createSupabaseAdminClient();
  const accept = parsed.data.response === "accept";
  const { error } = await supabase.rpc("respond_selection_convocation", {
    call_slug: slug,
    application_protocol: parsed.data.protocol,
    applicant_email: parsed.data.email,
    accept,
    request_fingerprint: await requestFingerprint(),
  });
  if (error)
    redirect(
      destination(
        slug,
        "error",
        publicErrorMessage(error, "Não foi possível responder à convocação."),
      ),
    );
  redirect(
    destination(
      slug,
      "success",
      accept
        ? "Convocação aceita. A incubadora concluirá sua matrícula."
        : "Convocação recusada.",
    ),
  );
}
