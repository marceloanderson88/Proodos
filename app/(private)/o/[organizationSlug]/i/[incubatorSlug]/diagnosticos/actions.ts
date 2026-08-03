"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createDiagnosticAssessmentSchema,
  createDiagnosticCampaignSchema,
  createDiagnosticCriterionSchema,
  createDiagnosticDimensionSchema,
  createDiagnosticTemplateSchema,
  diagnosticAssessmentTransitionSchema,
  duplicateDiagnosticTemplateSchema,
  saveDiagnosticResponseSchema,
  validateDiagnosticResponseSchema,
} from "@/lib/diagnostics/schemas";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import type { Json } from "@/lib/supabase/database.types";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}

function path(organizationSlug: string, incubatorSlug: string) {
  return `/o/${organizationSlug}/i/${incubatorSlug}/diagnosticos`;
}

function finish(
  organizationSlug: string,
  incubatorSlug: string,
  kind: "success" | "error",
  message: string,
): never {
  redirect(
    `${path(organizationSlug, incubatorSlug)}?${kind}=${encodeURIComponent(message)}`,
  );
}

function finishAt(
  organizationSlug: string,
  incubatorSlug: string,
  requestedPath: string,
  kind: "success" | "error",
  message: string,
): never {
  const base = path(organizationSlug, incubatorSlug);
  const destination = requestedPath.startsWith(`${base}/`)
    ? requestedPath
    : base;
  redirect(`${destination}?${kind}=${encodeURIComponent(message)}`);
}

export async function createDiagnosticTemplateAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = createDiagnosticTemplateSchema.safeParse({
    name: value(formData, "name"),
    description: value(formData, "description"),
    instructions: value(formData, "instructions"),
  });
  if (!parsed.success)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      "Revise os dados do modelo.",
    );
  const { data, error } = await context.supabase.rpc(
    "create_diagnostic_template_draft",
    {
      target_incubator_id: context.incubator.id,
      template_name: parsed.data.name,
      template_description: parsed.data.description,
      template_instructions: parsed.data.instructions,
    },
  );
  if (error || !data)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      "Não foi possível criar o modelo.",
    );
  revalidatePath(path(organizationSlug, incubatorSlug));
  redirect(
    `${path(organizationSlug, incubatorSlug)}/modelos/${data}?success=${encodeURIComponent("Modelo criado como rascunho.")}`,
  );
}

export async function addDiagnosticDimensionAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = createDiagnosticDimensionSchema.safeParse({
    templateId: value(formData, "templateId"),
    code: value(formData, "code"),
    name: value(formData, "name"),
    description: value(formData, "description"),
    weight: value(formData, "weight"),
    isEssential: formData.get("isEssential") === "on",
  });
  if (!parsed.success)
    finish(organizationSlug, incubatorSlug, "error", "Dimensão inválida.");
  const { error } = await context.supabase.rpc("add_diagnostic_dimension", {
    target_template_id: parsed.data.templateId,
    dimension_code: parsed.data.code.toUpperCase(),
    dimension_name: parsed.data.name,
    dimension_description: parsed.data.description,
    dimension_weight: parsed.data.weight,
    dimension_is_essential: parsed.data.isEssential,
  });
  if (error)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      "Não foi possível adicionar a dimensão.",
    );
  const returnTo = `${path(organizationSlug, incubatorSlug)}/modelos/${parsed.data.templateId}`;
  revalidatePath(returnTo);
  finishAt(
    organizationSlug,
    incubatorSlug,
    returnTo,
    "success",
    "Dimensão adicionada.",
  );
}

export async function addDiagnosticCriterionAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = createDiagnosticCriterionSchema.safeParse({
    templateId: value(formData, "templateId"),
    dimensionId: value(formData, "dimensionId"),
    code: value(formData, "code"),
    prompt: value(formData, "prompt"),
    helpText: value(formData, "helpText"),
    weight: value(formData, "weight"),
    allowsNotApplicable: formData.get("allowsNotApplicable") === "on",
    requiresNotApplicableJustification:
      formData.get("requiresNotApplicableJustification") === "on",
    evidenceRequiredFrom: value(formData, "evidenceRequiredFrom"),
    rubric0: value(formData, "rubric0"),
    rubric1: value(formData, "rubric1"),
    rubric2: value(formData, "rubric2"),
    rubric3: value(formData, "rubric3"),
    rubric4: value(formData, "rubric4"),
  });
  if (!parsed.success)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      parsed.error.issues[0]?.message ?? "Critério inválido.",
    );
  const { error } = await context.supabase.rpc(
    "add_diagnostic_criterion_with_rubric",
    {
      target_dimension_id: parsed.data.dimensionId,
      criterion_code: parsed.data.code.toUpperCase(),
      criterion_prompt: parsed.data.prompt,
      criterion_help_text: parsed.data.helpText,
      criterion_weight: parsed.data.weight,
      criterion_allows_na: parsed.data.allowsNotApplicable,
      criterion_requires_na_justification:
        parsed.data.requiresNotApplicableJustification,
      criterion_evidence_required_from:
        parsed.data.evidenceRequiredFrom === ""
          ? null
          : parsed.data.evidenceRequiredFrom,
      rubric_descriptions: [
        parsed.data.rubric0,
        parsed.data.rubric1,
        parsed.data.rubric2,
        parsed.data.rubric3,
        parsed.data.rubric4,
      ],
    },
  );
  if (error)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      "Não foi possível adicionar o critério.",
    );
  const returnTo = `${path(organizationSlug, incubatorSlug)}/modelos/${parsed.data.templateId}`;
  revalidatePath(returnTo);
  finishAt(
    organizationSlug,
    incubatorSlug,
    returnTo,
    "success",
    "Critério adicionado.",
  );
}

export async function duplicateDiagnosticTemplateAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = duplicateDiagnosticTemplateSchema.safeParse({
    templateId: value(formData, "templateId"),
    versionLabel: value(formData, "versionLabel"),
    changelog: value(formData, "changelog"),
  });
  if (!parsed.success)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      "Revise os dados da nova versão.",
    );
  const { data, error } = await context.supabase.rpc(
    "duplicate_diagnostic_template_version",
    {
      source_template_id: parsed.data.templateId,
      new_version_label: parsed.data.versionLabel || undefined,
      version_changelog: parsed.data.changelog,
    },
  );
  if (error || !data)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      error?.message || "Não foi possível criar a versão.",
    );
  redirect(
    `${path(organizationSlug, incubatorSlug)}/modelos/${data}?success=${encodeURIComponent("Nova versão criada como rascunho.")}`,
  );
}

export async function publishDiagnosticTemplateAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const templateId = value(formData, "templateId");
  const { error } = await context.supabase.rpc(
    "publish_diagnostic_template_version",
    { target_template_id: templateId },
  );
  if (error)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      error.message || "Não foi possível publicar o modelo.",
    );
  revalidatePath(path(organizationSlug, incubatorSlug));
  finish(
    organizationSlug,
    incubatorSlug,
    "success",
    "Versão publicada e protegida contra alterações.",
  );
}

export async function createDiagnosticCampaignAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = createDiagnosticCampaignSchema.safeParse({
    name: value(formData, "name"),
    templateId: value(formData, "templateId"),
    programId: value(formData, "programId"),
    cohortId: value(formData, "cohortId"),
    evaluatorId: value(formData, "evaluatorId"),
    startsAt: value(formData, "startsAt"),
    endsAt: value(formData, "endsAt"),
    startupIds: formData
      .getAll("startupIds")
      .filter((item): item is string => typeof item === "string"),
    communicationSubject: value(formData, "communicationSubject"),
    communicationMessage: value(formData, "communicationMessage"),
  });
  if (!parsed.success)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      parsed.error.issues[0]?.message ?? "Revise os dados da campanha.",
    );

  const { data, error } = await context.supabase.rpc(
    "create_diagnostic_campaign",
    {
      target_incubator_id: context.incubator.id,
      target_template_id: parsed.data.templateId,
      campaign_name: parsed.data.name,
      campaign_starts_at: parsed.data.startsAt.toISOString(),
      campaign_ends_at: parsed.data.endsAt.toISOString(),
      target_startup_ids: parsed.data.startupIds,
      target_program_id: parsed.data.programId || undefined,
      target_cohort_id: parsed.data.cohortId || undefined,
      target_evaluator_id: parsed.data.evaluatorId || undefined,
      campaign_timezone: "America/Sao_Paulo",
      communication_subject: parsed.data.communicationSubject,
      communication_message: parsed.data.communicationMessage,
    },
  );
  if (error || !data)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      error?.message || "Não foi possível criar a campanha.",
    );

  revalidatePath(path(organizationSlug, incubatorSlug));
  redirect(
    `${path(organizationSlug, incubatorSlug)}/campanhas/${data}?success=${encodeURIComponent("Campanha criada e aplicações geradas.")}`,
  );
}

export async function createDiagnosticAssessmentAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = createDiagnosticAssessmentSchema.safeParse({
    startupId: value(formData, "startupId"),
    templateId: value(formData, "templateId"),
    cycleLabel: value(formData, "cycleLabel"),
  });
  if (!parsed.success)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      "Selecione startup, modelo e ciclo.",
    );
  const { error } = await context.supabase
    .from("diagnostic_assessments")
    .insert({
      organization_id: context.organization.id,
      incubator_id: context.incubator.id,
      startup_id: parsed.data.startupId,
      template_id: parsed.data.templateId,
      cycle_label: parsed.data.cycleLabel,
      started_by: context.user.id,
    });
  if (error)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      "A aplicação exige uma startup e uma versão publicada desta incubadora.",
    );
  revalidatePath(path(organizationSlug, incubatorSlug));
  finish(
    organizationSlug,
    incubatorSlug,
    "success",
    "Diagnóstico iniciado para a startup.",
  );
}

export async function saveDiagnosticResponseAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const returnTo = value(formData, "returnTo");
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = saveDiagnosticResponseSchema.safeParse({
    assessmentId: value(formData, "assessmentId"),
    criterionId: value(formData, "criterionId"),
    responseType: value(formData, "responseType"),
    value: value(formData, "value"),
    comment: value(formData, "comment"),
    evidenceNotes: value(formData, "evidenceNotes"),
    isNotApplicable: formData.get("isNotApplicable") === "on",
    notApplicableJustification: value(formData, "notApplicableJustification"),
  });
  if (!parsed.success)
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      parsed.error.issues[0]?.message ?? "Resposta inválida.",
    );
  const numeric = ["numeric", "currency", "percentage"].includes(
    parsed.data.responseType,
  );
  const responseValue: Json | null = parsed.data.isNotApplicable
    ? null
    : numeric
      ? Number(parsed.data.value.replace(",", "."))
      : parsed.data.value;
  if (
    numeric &&
    typeof responseValue === "number" &&
    !Number.isFinite(responseValue)
  )
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      "Informe um valor numérico válido.",
    );
  const { error } = await context.supabase.from("diagnostic_responses").upsert(
    {
      organization_id: context.organization.id,
      incubator_id: context.incubator.id,
      assessment_id: parsed.data.assessmentId,
      criterion_id: parsed.data.criterionId,
      self_value: responseValue,
      is_not_applicable: parsed.data.isNotApplicable,
      not_applicable_justification:
        parsed.data.notApplicableJustification || null,
      self_comment: parsed.data.comment,
      evidence_notes: parsed.data.evidenceNotes,
    },
    { onConflict: "assessment_id,criterion_id" },
  );
  if (error)
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      "Não foi possível salvar a resposta.",
    );
  const { error: transitionError } = await context.supabase.rpc(
    "mark_diagnostic_assessment_in_progress",
    { target_assessment_id: parsed.data.assessmentId },
  );
  if (transitionError)
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      "A resposta foi salva, mas não foi possível atualizar o andamento.",
    );
  revalidatePath(path(organizationSlug, incubatorSlug));
  finishAt(
    organizationSlug,
    incubatorSlug,
    returnTo,
    "success",
    "Resposta salva.",
  );
}

export async function validateDiagnosticResponseAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const returnTo = value(formData, "returnTo");
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = validateDiagnosticResponseSchema.safeParse({
    assessmentId: value(formData, "assessmentId"),
    responseId: value(formData, "responseId"),
    criterionId: value(formData, "criterionId"),
    score: value(formData, "score"),
    evaluatorComment: value(formData, "evaluatorComment"),
  });
  if (!parsed.success)
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      "Informe nota e parecer de validação.",
    );
  const { error } = await context.supabase
    .from("diagnostic_responses")
    .update({
      validated_value: parsed.data.score,
      evaluator_comment: parsed.data.evaluatorComment,
      validated_by: context.user.id,
      validated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.responseId)
    .eq("assessment_id", parsed.data.assessmentId)
    .eq("criterion_id", parsed.data.criterionId);
  if (error)
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      "Não foi possível validar a resposta.",
    );
  revalidatePath(path(organizationSlug, incubatorSlug));
  finishAt(
    organizationSlug,
    incubatorSlug,
    returnTo,
    "success",
    "Nota validada sem substituir a autoavaliação.",
  );
}

async function transitionDiagnosticAssessment(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
  rpcName:
    | "submit_diagnostic_assessment"
    | "reopen_diagnostic_assessment"
    | "finalize_diagnostic_assessment",
  successMessage: string,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = diagnosticAssessmentTransitionSchema.safeParse({
    assessmentId: value(formData, "assessmentId"),
    returnTo: value(formData, "returnTo"),
  });
  if (!parsed.success)
    finish(organizationSlug, incubatorSlug, "error", "Avaliação inválida.");
  const { error } = await context.supabase.rpc(rpcName, {
    target_assessment_id: parsed.data.assessmentId,
  });
  if (error)
    finishAt(
      organizationSlug,
      incubatorSlug,
      parsed.data.returnTo,
      "error",
      error.message || "Não foi possível alterar o estado da avaliação.",
    );
  revalidatePath(parsed.data.returnTo);
  finishAt(
    organizationSlug,
    incubatorSlug,
    parsed.data.returnTo,
    "success",
    successMessage,
  );
}

export async function submitDiagnosticAssessmentAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  return transitionDiagnosticAssessment(
    organizationSlug,
    incubatorSlug,
    formData,
    "submit_diagnostic_assessment",
    "Autoavaliação enviada para validação.",
  );
}

export async function reopenDiagnosticAssessmentAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  return transitionDiagnosticAssessment(
    organizationSlug,
    incubatorSlug,
    formData,
    "reopen_diagnostic_assessment",
    "Avaliação reaberta para ajustes.",
  );
}

export async function finalizeDiagnosticAssessmentAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  return transitionDiagnosticAssessment(
    organizationSlug,
    incubatorSlug,
    formData,
    "finalize_diagnostic_assessment",
    "Validação concluída e registrada no histórico.",
  );
}
