"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { dispatchPendingNotifications } from "@/lib/notifications/dispatcher";
import { createSelectionCallSchema } from "@/lib/selection/schemas";
import { sendStartupOnboardingInvitation } from "@/lib/startups/onboarding";
import type { Json } from "@/lib/supabase/database.types";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}

function basePath(organizationSlug: string, incubatorSlug: string) {
  return `/o/${organizationSlug}/i/${incubatorSlug}/chamadas`;
}

function feedback(
  organizationSlug: string,
  incubatorSlug: string,
  view: string,
  kind: "success" | "error",
  message: string,
) {
  const query = new URLSearchParams({ view, [kind]: message });
  return `${basePath(organizationSlug, incubatorSlug)}?${query}`;
}

function isoOrNull(raw: string) {
  return raw ? new Date(raw).toISOString() : null;
}

async function dispatchSelectionNotifications(organizationId: string) {
  try {
    const result = await dispatchPendingNotifications({
      organizationId,
      kinds: ["selection.assignment"],
    });
    if (!result.configured)
      return " Os avisos ficaram na fila até a configuração do provedor de e-mail.";
    if (result.failed)
      return ` ${result.sent} e-mail(s) enviado(s); ${result.failed} seguirá(ão) na fila para nova tentativa.`;
    return result.sent ? ` ${result.sent} e-mail(s) enviado(s).` : "";
  } catch {
    return " Os avisos foram preservados na fila para nova tentativa.";
  }
}

function rpcMessage(
  error: { code?: string; message?: string } | null,
  fallback: string,
) {
  if (!error) return fallback;
  if (error.code === "23505") return "Já existe um registro com esses dados.";
  if (error.code === "23514" || error.code === "22023")
    return error.message ?? fallback;
  return fallback;
}

export async function createSelectionCallAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  let questions: unknown;
  let criteria: unknown;
  try {
    questions = JSON.parse(value(formData, "questions"));
    criteria = JSON.parse(value(formData, "criteria"));
  } catch {
    redirect(
      feedback(
        organizationSlug,
        incubatorSlug,
        "calls",
        "error",
        "Formulário ou critérios inválidos.",
      ),
    );
  }
  const parsed = createSelectionCallSchema.safeParse({
    cohortId: value(formData, "cohortId"),
    code: value(formData, "code"),
    slug: value(formData, "slug"),
    title: value(formData, "title"),
    summary: value(formData, "summary"),
    applicationsOpenAt: value(formData, "applicationsOpenAt"),
    applicationsCloseAt: value(formData, "applicationsCloseAt"),
    evaluationsOpenAt: value(formData, "evaluationsOpenAt"),
    evaluationsCloseAt: value(formData, "evaluationsCloseAt"),
    appealsOpenAt: value(formData, "appealsOpenAt"),
    appealsCloseAt: value(formData, "appealsCloseAt"),
    totalVacancies: value(formData, "totalVacancies"),
    waitlistSize: value(formData, "waitlistSize"),
    reviewersPerApplication: value(formData, "reviewersPerApplication"),
    divergenceThreshold: value(formData, "divergenceThreshold"),
    quotaField: value(formData, "quotaField"),
    quotaValues: value(formData, "quotaValues"),
    quotaPercentage: value(formData, "quotaPercentage"),
    questions,
    criteria,
  });
  if (!parsed.success) {
    redirect(
      feedback(
        organizationSlug,
        incubatorSlug,
        "calls",
        "error",
        parsed.error.issues[0]?.message ?? "Confira a chamada.",
      ),
    );
  }
  const { error } = await context.supabase.rpc("create_selection_call", {
    target_organization_id: context.organization.id,
    target_incubator_id: context.incubator.id,
    target_cohort_id: parsed.data.cohortId,
    call_code: parsed.data.code,
    call_slug: parsed.data.slug,
    call_title: parsed.data.title,
    call_summary: parsed.data.summary,
    applications_open_at: new Date(
      parsed.data.applicationsOpenAt,
    ).toISOString(),
    applications_close_at: new Date(
      parsed.data.applicationsCloseAt,
    ).toISOString(),
    evaluations_open_at: isoOrNull(parsed.data.evaluationsOpenAt),
    evaluations_close_at: isoOrNull(parsed.data.evaluationsCloseAt),
    appeals_open_at: isoOrNull(parsed.data.appealsOpenAt),
    appeals_close_at: isoOrNull(parsed.data.appealsCloseAt),
    total_vacancies: parsed.data.totalVacancies,
    waitlist_size: parsed.data.waitlistSize,
    reviewers_per_application: parsed.data.reviewersPerApplication,
    divergence_threshold:
      parsed.data.divergenceThreshold === ""
        ? null
        : parsed.data.divergenceThreshold,
    quota_rules: parsed.data.quotaField
      ? ([
          {
            name: "Política territorial",
            field: parsed.data.quotaField,
            values: parsed.data.quotaValues
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
            minimumPercentage: parsed.data.quotaPercentage,
          },
        ] as Json)
      : ([] as Json),
    questions: parsed.data.questions as Json,
    criteria: parsed.data.criteria as Json,
  });
  if (error)
    redirect(
      feedback(
        organizationSlug,
        incubatorSlug,
        "calls",
        "error",
        rpcMessage(error, "Não foi possível criar a chamada."),
      ),
    );
  revalidatePath(basePath(organizationSlug, incubatorSlug));
  redirect(
    feedback(
      organizationSlug,
      incubatorSlug,
      "calls",
      "success",
      "Chamada criada como rascunho.",
    ),
  );
}

async function contextAndId(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
  key: string,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  return { context, id: value(formData, key) };
}

export async function publishSelectionCallAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const { context, id } = await contextAndId(
    organizationSlug,
    incubatorSlug,
    formData,
    "callId",
  );
  const { error } = await context.supabase.rpc("publish_selection_call", {
    target_call_id: id,
  });
  if (error)
    redirect(
      feedback(
        organizationSlug,
        incubatorSlug,
        "calls",
        "error",
        rpcMessage(error, "Não foi possível publicar a chamada."),
      ),
    );
  revalidatePath(basePath(organizationSlug, incubatorSlug));
  redirect(
    feedback(
      organizationSlug,
      incubatorSlug,
      "calls",
      "success",
      "Chamada publicada e formulário congelado.",
    ),
  );
}

export async function reviewEligibilityAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const { context, id } = await contextAndId(
    organizationSlug,
    incubatorSlug,
    formData,
    "applicationId",
  );
  const eligible = value(formData, "decision") === "eligible";
  const { error } = await context.supabase.rpc("review_selection_eligibility", {
    target_application_id: id,
    eligible,
    notes: value(formData, "notes"),
  });
  if (error)
    redirect(
      feedback(
        organizationSlug,
        incubatorSlug,
        "applications",
        "error",
        rpcMessage(error, "Não foi possível concluir a habilitação."),
      ),
    );
  revalidatePath(basePath(organizationSlug, incubatorSlug));
  redirect(
    feedback(
      organizationSlug,
      incubatorSlug,
      "applications",
      "success",
      eligible
        ? "Inscrição habilitada."
        : "Inscrição inabilitada com justificativa.",
    ),
  );
}

export async function addSelectionReviewerAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const { error } = await context.supabase.rpc("add_selection_reviewer", {
    target_call_id: value(formData, "callId"),
    reviewer_user_id: value(formData, "userId"),
  });
  if (error)
    redirect(
      feedback(
        organizationSlug,
        incubatorSlug,
        "reviewers",
        "error",
        rpcMessage(error, "Não foi possível adicionar o avaliador."),
      ),
    );
  revalidatePath(basePath(organizationSlug, incubatorSlug));
  redirect(
    feedback(
      organizationSlug,
      incubatorSlug,
      "reviewers",
      "success",
      "Avaliador incluído na chamada.",
    ),
  );
}

export async function assignSelectionReviewerAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const { error } = await context.supabase.rpc("assign_selection_reviewer", {
    target_application_id: value(formData, "applicationId"),
    target_reviewer_id: value(formData, "reviewerId"),
  });
  if (error)
    redirect(
      feedback(
        organizationSlug,
        incubatorSlug,
        "reviewers",
        "error",
        rpcMessage(error, "Não foi possível distribuir a proposta."),
      ),
    );
  const notificationFeedback = await dispatchSelectionNotifications(
    context.organization.id,
  );
  revalidatePath(basePath(organizationSlug, incubatorSlug));
  redirect(
    feedback(
      organizationSlug,
      incubatorSlug,
      "reviewers",
      "success",
      `Proposta atribuída sem apagar o histórico anterior.${notificationFeedback}`,
    ),
  );
}

export async function autoAssignSelectionReviewersAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const { data, error } = await context.supabase.rpc(
    "auto_assign_selection_reviewers",
    { target_call_id: value(formData, "callId") },
  );
  if (error)
    redirect(
      feedback(
        organizationSlug,
        incubatorSlug,
        "reviewers",
        "error",
        rpcMessage(error, "Não foi possível distribuir automaticamente."),
      ),
    );
  const notificationFeedback = await dispatchSelectionNotifications(
    context.organization.id,
  );
  revalidatePath(basePath(organizationSlug, incubatorSlug));
  redirect(
    feedback(
      organizationSlug,
      incubatorSlug,
      "reviewers",
      "success",
      `${data} atribuição(ões) criada(s) por sorteio com balanceamento de carga.${notificationFeedback}`,
    ),
  );
}

export async function acceptSelectionConfidentialityAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const { error } = await context.supabase.rpc(
    "accept_selection_confidentiality",
    { target_call_id: value(formData, "callId") },
  );
  if (error)
    redirect(
      feedback(
        organizationSlug,
        incubatorSlug,
        "reviews",
        "error",
        rpcMessage(error, "Não foi possível registrar o aceite."),
      ),
    );
  revalidatePath(basePath(organizationSlug, incubatorSlug));
  redirect(
    feedback(
      organizationSlug,
      incubatorSlug,
      "reviews",
      "success",
      "Termo de confidencialidade aceito.",
    ),
  );
}

export async function submitSelectionReviewAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const scores: Record<string, number> = {};
  for (const [key, entry] of formData.entries()) {
    if (key.startsWith("score_") && typeof entry === "string")
      scores[key.slice(6)] = Number(entry);
  }
  const { error } = await context.supabase.rpc("submit_selection_review", {
    target_assignment_id: value(formData, "assignmentId"),
    scores: scores as Json,
    general_justification: value(formData, "generalJustification"),
    private_notes: value(formData, "privateNotes"),
  });
  if (error)
    redirect(
      feedback(
        organizationSlug,
        incubatorSlug,
        "reviews",
        "error",
        rpcMessage(error, "Não foi possível enviar a avaliação."),
      ),
    );
  revalidatePath(basePath(organizationSlug, incubatorSlug));
  redirect(
    feedback(
      organizationSlug,
      incubatorSlug,
      "reviews",
      "success",
      "Avaliação enviada e preservada no histórico.",
    ),
  );
}

export async function declareSelectionConflictAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const { error } = await context.supabase.rpc("declare_selection_conflict", {
    target_assignment_id: value(formData, "assignmentId"),
    reason_type: value(formData, "reasonType"),
    justification: value(formData, "justification"),
  });
  if (error)
    redirect(
      feedback(
        organizationSlug,
        incubatorSlug,
        "reviews",
        "error",
        rpcMessage(error, "Não foi possível registrar o impedimento."),
      ),
    );
  revalidatePath(basePath(organizationSlug, incubatorSlug));
  redirect(
    feedback(
      organizationSlug,
      incubatorSlug,
      "reviews",
      "success",
      "Impedimento registrado; nenhum dado anterior foi apagado.",
    ),
  );
}

export async function generateSelectionRankingAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const { context, id } = await contextAndId(
    organizationSlug,
    incubatorSlug,
    formData,
    "callId",
  );
  const { data, error } = await context.supabase.rpc(
    "generate_selection_ranking",
    { target_call_id: id },
  );
  if (error)
    redirect(
      feedback(
        organizationSlug,
        incubatorSlug,
        "ranking",
        "error",
        rpcMessage(error, "Não foi possível gerar o ranking."),
      ),
    );
  revalidatePath(basePath(organizationSlug, incubatorSlug));
  redirect(
    feedback(
      organizationSlug,
      incubatorSlug,
      "ranking",
      "success",
      `Ranking versão ${data} gerado.`,
    ),
  );
}

export async function decideSelectionAppealAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const status = value(formData, "status") as
    "granted" | "partially_granted" | "denied";
  const adjustment = value(formData, "scoreAdjustment");
  const { error } = await context.supabase.rpc("decide_selection_appeal", {
    target_appeal_id: value(formData, "appealId"),
    decision_status: status,
    decision_text: value(formData, "decision"),
    score_adjustment: adjustment ? Number(adjustment) : null,
  });
  if (error)
    redirect(
      feedback(
        organizationSlug,
        incubatorSlug,
        "appeals",
        "error",
        rpcMessage(error, "Não foi possível decidir o recurso."),
      ),
    );
  revalidatePath(basePath(organizationSlug, incubatorSlug));
  redirect(
    feedback(
      organizationSlug,
      incubatorSlug,
      "appeals",
      "success",
      "Recurso decidido e auditado.",
    ),
  );
}

export async function publishSelectionResultAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const phase = value(formData, "phase");
  const { error } = await context.supabase.rpc("publish_selection_result", {
    target_call_id: value(formData, "callId"),
    publication_phase: phase,
    publication_title: value(formData, "title"),
    publication_content: value(formData, "content"),
  });
  if (error)
    redirect(
      feedback(
        organizationSlug,
        incubatorSlug,
        "results",
        "error",
        rpcMessage(error, "Não foi possível publicar o resultado."),
      ),
    );
  revalidatePath(basePath(organizationSlug, incubatorSlug));
  redirect(
    feedback(
      organizationSlug,
      incubatorSlug,
      "results",
      "success",
      phase === "final"
        ? "Resultado final publicado."
        : "Resultado preliminar publicado.",
    ),
  );
}

export async function createSelectionConvocationsAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const { data, error } = await context.supabase.rpc(
    "create_selection_convocations",
    {
      target_call_id: value(formData, "callId"),
      deadline_at: new Date(value(formData, "deadlineAt")).toISOString(),
    },
  );
  if (error)
    redirect(
      feedback(
        organizationSlug,
        incubatorSlug,
        "results",
        "error",
        rpcMessage(error, "Não foi possível convocar os selecionados."),
      ),
    );
  revalidatePath(basePath(organizationSlug, incubatorSlug));
  redirect(
    feedback(
      organizationSlug,
      incubatorSlug,
      "results",
      "success",
      `${data} convocação(ões) preparada(s).`,
    ),
  );
}

export async function convertSelectionApplicationAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const applicationId = value(formData, "applicationId");
  const { data, error } = await context.supabase.rpc(
    "convert_selection_application_with_onboarding",
    { target_application_id: applicationId },
  );
  if (error)
    redirect(
      feedback(
        organizationSlug,
        incubatorSlug,
        "results",
        "error",
        rpcMessage(error, "Não foi possível criar a startup e a matrícula."),
      ),
    );
  const conversion = data as unknown as {
    startupId: string;
    applicantUserId: string | null;
    applicantName: string;
    applicantEmail: string;
    startupName: string;
    cohortId: string;
    onboardingPending: boolean;
  };
  if (conversion.onboardingPending && conversion.startupId) {
    try {
      await sendStartupOnboardingInvitation(context, {
        startupId: conversion.startupId,
        startupName: conversion.startupName,
        representativeName: conversion.applicantName,
        email: conversion.applicantEmail,
        cohortId: conversion.cohortId,
      });
    } catch {
      redirect(
        feedback(
          organizationSlug,
          incubatorSlug,
          "results",
          "error",
          "A startup foi criada, mas o convite de acesso não pôde ser enviado. Tente a conversão novamente para reenviar o convite.",
        ),
      );
    }
  }
  revalidatePath(basePath(organizationSlug, incubatorSlug));
  revalidatePath(`/o/${organizationSlug}/i/${incubatorSlug}/startups`);
  redirect(
    feedback(
      organizationSlug,
      incubatorSlug,
      "results",
      "success",
      conversion.onboardingPending
        ? "Startup criada e matrícula reservada. O representante recebeu o convite para ativar o acesso."
        : "Startup, representante e matrícula criados de forma transacional.",
    ),
  );
}
