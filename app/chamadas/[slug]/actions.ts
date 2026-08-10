"use server";

import { redirect } from "next/navigation";

import { publicSelectionApplicationSchema } from "@/lib/selection/schemas";
import type { PublicSelectionCall } from "@/lib/selection/types";
import type { Json } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}

function destination(slug: string, key: "success" | "error", message: string) {
  return `/chamadas/${slug}?${new URLSearchParams({ [key]: message })}`;
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
  const supabase = await createServerSupabaseClient();
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
  });
  if (error) {
    const message =
      error.code === "23505"
        ? "Já existe uma inscrição deste e-mail nesta chamada."
        : error.message?.includes("encerradas")
          ? "O período de inscrições não está aberto."
          : "Não foi possível enviar a inscrição.";
    redirect(destination(call.slug, "error", message));
  }
  redirect(
    destination(call.slug, "success", `Inscrição enviada. Protocolo: ${data}`),
  );
}

export async function submitPublicSelectionAppealAction(
  slug: string,
  formData: FormData,
) {
  const grounds = value(formData, "grounds").trim();
  if (grounds.length < 30)
    redirect(
      destination(
        slug,
        "error",
        "O recurso deve ter pelo menos 30 caracteres.",
      ),
    );
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("submit_public_selection_appeal", {
    call_slug: slug,
    application_protocol: value(formData, "protocol"),
    applicant_email: value(formData, "email"),
    grounds,
  });
  if (error)
    redirect(
      destination(
        slug,
        "error",
        error.code === "23505"
          ? "Já existe um recurso para esta inscrição."
          : (error.message ?? "Não foi possível protocolar o recurso."),
      ),
    );
  redirect(destination(slug, "success", "Recurso protocolado com sucesso."));
}

export async function respondPublicSelectionConvocationAction(
  slug: string,
  formData: FormData,
) {
  const supabase = await createServerSupabaseClient();
  const accept = value(formData, "response") === "accept";
  const { error } = await supabase.rpc("respond_selection_convocation", {
    application_protocol: value(formData, "protocol"),
    applicant_email: value(formData, "email"),
    accept,
  });
  if (error)
    redirect(
      destination(
        slug,
        "error",
        error.message ?? "Não foi possível responder à convocação.",
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
