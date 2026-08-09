"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addDiagnosticAssessmentNoteSchema,
  addDiagnosticExternalEvidenceSchema,
  createDiagnosticAssessmentSchema,
  createDiagnosticCampaignSchema,
  createDiagnosticCriterionSchema,
  createDiagnosticDimensionSchema,
  createDiagnosticTemplateSchema,
  assignDiagnosticEvaluatorSchema,
  assignDiagnosticRespondentSchema,
  autosaveDiagnosticResponseSchema,
  deleteDiagnosticCriterionSchema,
  deleteDiagnosticDimensionSchema,
  deleteDiagnosticEvidenceSchema,
  diagnosticAssessmentTransitionSchema,
  duplicateDiagnosticTemplateSchema,
  inviteDiagnosticRespondentSchema,
  installDiagnosticDemoCasesSchema,
  manageDiagnosticRespondentInvitationSchema,
  reorderDiagnosticCriteriaSchema,
  reorderDiagnosticDimensionsSchema,
  revokeDiagnosticRespondentSchema,
  saveDiagnosticIndicatorValueSchema,
  saveDiagnosticResponseSchema,
  updateDiagnosticCriterionSchema,
  updateDiagnosticDimensionSchema,
  validateDiagnosticResponseSchema,
} from "@/lib/diagnostics/schemas";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { sendIncubatorInvitation } from "@/lib/invitations/server";
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

export async function updateDiagnosticDimensionAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = updateDiagnosticDimensionSchema.safeParse({
    templateId: value(formData, "templateId"),
    dimensionId: value(formData, "dimensionId"),
    code: value(formData, "code"),
    name: value(formData, "name"),
    description: value(formData, "description"),
    weight: value(formData, "weight"),
    isEssential: formData.get("isEssential") === "on",
  });
  if (!parsed.success)
    finish(organizationSlug, incubatorSlug, "error", "Dimensão inválida.");
  const { error } = await context.supabase.rpc("update_diagnostic_dimension", {
    target_dimension_id: parsed.data.dimensionId,
    dimension_code: parsed.data.code.toUpperCase(),
    dimension_name: parsed.data.name,
    dimension_description: parsed.data.description,
    dimension_weight: parsed.data.weight,
    dimension_is_essential: parsed.data.isEssential,
  });
  const returnTo = `${path(organizationSlug, incubatorSlug)}/modelos/${parsed.data.templateId}`;
  if (error)
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      error.message || "Não foi possível editar a dimensão.",
    );
  revalidatePath(returnTo);
  finishAt(
    organizationSlug,
    incubatorSlug,
    returnTo,
    "success",
    "Dimensão atualizada.",
  );
}

export async function deleteDiagnosticDimensionAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = deleteDiagnosticDimensionSchema.safeParse({
    templateId: value(formData, "templateId"),
    dimensionId: value(formData, "dimensionId"),
  });
  if (!parsed.success)
    finish(organizationSlug, incubatorSlug, "error", "Dimensão inválida.");
  const { error } = await context.supabase.rpc("delete_diagnostic_dimension", {
    target_dimension_id: parsed.data.dimensionId,
  });
  const returnTo = `${path(organizationSlug, incubatorSlug)}/modelos/${parsed.data.templateId}`;
  if (error)
    finishAt(organizationSlug, incubatorSlug, returnTo, "error", error.message);
  revalidatePath(returnTo);
  finishAt(
    organizationSlug,
    incubatorSlug,
    returnTo,
    "success",
    "Dimensão excluída.",
  );
}

export async function reorderDiagnosticDimensionsAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = reorderDiagnosticDimensionsSchema.safeParse({
    templateId: value(formData, "templateId"),
    dimensionIds: formData
      .getAll("dimensionIds")
      .filter((item): item is string => typeof item === "string"),
  });
  if (!parsed.success)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      "Ordem das dimensões inválida.",
    );
  const { error } = await context.supabase.rpc(
    "reorder_diagnostic_dimensions",
    {
      target_template_id: parsed.data.templateId,
      ordered_dimension_ids: parsed.data.dimensionIds,
    },
  );
  const returnTo = `${path(organizationSlug, incubatorSlug)}/modelos/${parsed.data.templateId}`;
  if (error)
    finishAt(organizationSlug, incubatorSlug, returnTo, "error", error.message);
  revalidatePath(returnTo);
  finishAt(
    organizationSlug,
    incubatorSlug,
    returnTo,
    "success",
    "Dimensões reordenadas.",
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

export async function updateDiagnosticCriterionAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = updateDiagnosticCriterionSchema.safeParse({
    templateId: value(formData, "templateId"),
    dimensionId: value(formData, "dimensionId"),
    criterionId: value(formData, "criterionId"),
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
    "update_diagnostic_criterion_with_rubric",
    {
      target_criterion_id: parsed.data.criterionId,
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
  const returnTo = `${path(organizationSlug, incubatorSlug)}/modelos/${parsed.data.templateId}`;
  if (error)
    finishAt(organizationSlug, incubatorSlug, returnTo, "error", error.message);
  revalidatePath(returnTo);
  finishAt(
    organizationSlug,
    incubatorSlug,
    returnTo,
    "success",
    "Critério atualizado.",
  );
}

export async function deleteDiagnosticCriterionAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = deleteDiagnosticCriterionSchema.safeParse({
    templateId: value(formData, "templateId"),
    criterionId: value(formData, "criterionId"),
  });
  if (!parsed.success)
    finish(organizationSlug, incubatorSlug, "error", "Critério inválido.");
  const { error } = await context.supabase.rpc("delete_diagnostic_criterion", {
    target_criterion_id: parsed.data.criterionId,
  });
  const returnTo = `${path(organizationSlug, incubatorSlug)}/modelos/${parsed.data.templateId}`;
  if (error)
    finishAt(organizationSlug, incubatorSlug, returnTo, "error", error.message);
  revalidatePath(returnTo);
  finishAt(
    organizationSlug,
    incubatorSlug,
    returnTo,
    "success",
    "Critério excluído.",
  );
}

export async function reorderDiagnosticCriteriaAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = reorderDiagnosticCriteriaSchema.safeParse({
    templateId: value(formData, "templateId"),
    dimensionId: value(formData, "dimensionId"),
    criterionIds: formData
      .getAll("criterionIds")
      .filter((item): item is string => typeof item === "string"),
  });
  if (!parsed.success)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      "Ordem dos critérios inválida.",
    );
  const { error } = await context.supabase.rpc("reorder_diagnostic_criteria", {
    target_dimension_id: parsed.data.dimensionId,
    ordered_criterion_ids: parsed.data.criterionIds,
  });
  const returnTo = `${path(organizationSlug, incubatorSlug)}/modelos/${parsed.data.templateId}`;
  if (error)
    finishAt(organizationSlug, incubatorSlug, returnTo, "error", error.message);
  revalidatePath(returnTo);
  finishAt(
    organizationSlug,
    incubatorSlug,
    returnTo,
    "success",
    "Critérios reordenados.",
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
    executionMode: value(formData, "executionMode"),
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
    "create_diagnostic_campaign_with_mode",
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
      campaign_execution_mode: parsed.data.executionMode,
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

export async function addDiagnosticAssessmentNoteAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const returnTo = value(formData, "returnTo");
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = addDiagnosticAssessmentNoteSchema.safeParse({
    assessmentId: value(formData, "assessmentId"),
    body: value(formData, "body"),
    returnTo,
  });
  if (!parsed.success)
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      parsed.error.issues[0]?.message ?? "Revise a observação.",
    );

  const { error } = await context.supabase
    .from("diagnostic_assessment_notes")
    .insert({
      organization_id: context.organization.id,
      incubator_id: context.incubator.id,
      assessment_id: parsed.data.assessmentId,
      author_id: context.user.id,
      body: parsed.data.body,
    });
  if (error)
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      "Não foi possível registrar a observação.",
    );
  revalidatePath(returnTo);
  finishAt(
    organizationSlug,
    incubatorSlug,
    returnTo,
    "success",
    "Observação registrada no histórico da aplicação.",
  );
}

export async function installDiagnosticDemoCasesAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = installDiagnosticDemoCasesSchema.safeParse({
    confirmation: value(formData, "confirmation"),
  });
  if (!parsed.success)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      "Confirmação inválida para instalar os exemplos.",
    );
  const { data, error } = await context.supabase.rpc(
    "install_diagnostic_demo_cases",
    { target_incubator_id: context.incubator.id },
  );
  if (error)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      error.message || "Não foi possível instalar os exemplos.",
    );
  revalidatePath(path(organizationSlug, incubatorSlug));
  finish(
    organizationSlug,
    incubatorSlug,
    "success",
    Number(data) > 0
      ? `${data} aplicações fictícias instaladas.`
      : "Os exemplos fictícios já estavam instalados.",
  );
}

export async function inviteDiagnosticRespondentAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const returnTo = value(formData, "returnTo");
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = inviteDiagnosticRespondentSchema.safeParse({
    assessmentId: value(formData, "assessmentId"),
    invitedName: value(formData, "invitedName"),
    email: value(formData, "email"),
    roleId: value(formData, "roleId"),
    respondentRole: value(formData, "respondentRole"),
    returnTo,
  });
  if (!parsed.success)
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      parsed.error.issues[0]?.message ?? "Revise os dados do convite.",
    );

  const [assessmentResult, rolePermissionResult, roleScopeResult] =
    await Promise.all([
      context.supabase
        .from("diagnostic_assessments")
        .select("id,status")
        .eq("organization_id", context.organization.id)
        .eq("incubator_id", context.incubator.id)
        .eq("id", parsed.data.assessmentId)
        .maybeSingle(),
      context.supabase
        .from("role_permissions")
        .select("role_id")
        .eq("organization_id", context.organization.id)
        .eq("role_id", parsed.data.roleId)
        .eq("permission_code", "diagnostic.respond")
        .maybeSingle(),
      context.supabase
        .from("roles")
        .select("id")
        .eq("organization_id", context.organization.id)
        .eq("id", parsed.data.roleId)
        .eq("scope_type", "incubator")
        .is("archived_at", null)
        .maybeSingle(),
    ]);
  if (
    assessmentResult.error ||
    !assessmentResult.data ||
    ["validated", "cancelled"].includes(assessmentResult.data.status)
  )
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      "Esta avaliação não aceita novos respondentes.",
    );
  if (
    rolePermissionResult.error ||
    !rolePermissionResult.data ||
    roleScopeResult.error ||
    !roleScopeResult.data
  )
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      "Selecione um papel da incubadora que permita responder diagnósticos.",
    );

  let invitationId: string;
  try {
    const invitation = await sendIncubatorInvitation(context, {
      invitedName: parsed.data.invitedName,
      email: parsed.data.email,
      roleId: parsed.data.roleId,
      expiresInDays: 7,
    });
    invitationId = invitation.invitationId;
  } catch (error) {
    const message =
      error instanceof Error &&
      error.message === "SUPABASE_SECRET_KEY_NOT_CONFIGURED"
        ? "Configure SUPABASE_SECRET_KEY na Vercel para enviar convites."
        : "Não foi possível enviar o convite. Verifique se já existe um convite pendente para esse e-mail.";
    finishAt(organizationSlug, incubatorSlug, returnTo, "error", message);
  }

  const mapping = await context.supabase
    .from("diagnostic_respondent_invitations")
    .insert({
      organization_id: context.organization.id,
      incubator_id: context.incubator.id,
      assessment_id: parsed.data.assessmentId,
      invitation_id: invitationId,
      respondent_role: parsed.data.respondentRole,
      can_submit: parsed.data.respondentRole === "primary",
      created_by: context.user.id,
    });
  if (mapping.error) {
    await context.supabase
      .from("invitations")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", invitationId)
      .eq("status", "pending");
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      "O e-mail foi enviado, mas o vínculo falhou e o convite foi revogado.",
    );
  }
  revalidatePath(returnTo);
  finishAt(
    organizationSlug,
    incubatorSlug,
    returnTo,
    "success",
    `Convite enviado para ${parsed.data.email}. O acesso será liberado somente após o aceite.`,
  );
}

export async function manageDiagnosticRespondentInvitationAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const returnTo = value(formData, "returnTo");
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = manageDiagnosticRespondentInvitationSchema.safeParse({
    assessmentId: value(formData, "assessmentId"),
    invitationId: value(formData, "invitationId"),
    action: value(formData, "action"),
    returnTo,
  });
  if (!parsed.success)
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      "Convite inválido.",
    );
  const mapping = await context.supabase
    .from("diagnostic_respondent_invitations")
    .select("invitation_id,respondent_role")
    .eq("organization_id", context.organization.id)
    .eq("incubator_id", context.incubator.id)
    .eq("assessment_id", parsed.data.assessmentId)
    .eq("invitation_id", parsed.data.invitationId)
    .is("accepted_at", null)
    .maybeSingle();
  const invitation = await context.supabase
    .from("invitations")
    .select("id,invited_name,email,role_id,status")
    .eq("organization_id", context.organization.id)
    .eq("incubator_id", context.incubator.id)
    .eq("id", parsed.data.invitationId)
    .maybeSingle();
  if (
    mapping.error ||
    !mapping.data ||
    invitation.error ||
    !invitation.data ||
    invitation.data.status !== "pending"
  )
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      "Este convite não está mais pendente.",
    );

  const revoked = await context.supabase
    .from("invitations")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", invitation.data.id)
    .eq("status", "pending");
  if (revoked.error)
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      "Não foi possível revogar o convite.",
    );

  if (parsed.data.action === "resend") {
    try {
      const replacement = await sendIncubatorInvitation(context, {
        invitedName:
          invitation.data.invited_name ??
          invitation.data.email.split("@")[0] ??
          "Pessoa convidada",
        email: invitation.data.email,
        roleId: invitation.data.role_id,
        expiresInDays: 7,
      });
      const replacementMapping = await context.supabase
        .from("diagnostic_respondent_invitations")
        .insert({
          organization_id: context.organization.id,
          incubator_id: context.incubator.id,
          assessment_id: parsed.data.assessmentId,
          invitation_id: replacement.invitationId,
          respondent_role: mapping.data.respondent_role,
          can_submit: mapping.data.respondent_role === "primary",
          created_by: context.user.id,
        });
      if (replacementMapping.error) {
        await context.supabase
          .from("invitations")
          .update({ status: "revoked", revoked_at: new Date().toISOString() })
          .eq("id", replacement.invitationId);
        throw replacementMapping.error;
      }
    } catch {
      finishAt(
        organizationSlug,
        incubatorSlug,
        returnTo,
        "error",
        "O convite anterior foi revogado, mas o reenvio falhou.",
      );
    }
  }
  revalidatePath(returnTo);
  finishAt(
    organizationSlug,
    incubatorSlug,
    returnTo,
    "success",
    parsed.data.action === "resend"
      ? "Novo convite enviado."
      : "Convite revogado.",
  );
}

export async function assignDiagnosticRespondentAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const returnTo = value(formData, "returnTo");
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = assignDiagnosticRespondentSchema.safeParse({
    assessmentId: value(formData, "assessmentId"),
    userId: value(formData, "userId"),
    role: value(formData, "role"),
    returnTo,
  });
  if (!parsed.success)
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      "Selecione a pessoa e o papel do respondente.",
    );
  const { error } = await context.supabase.rpc("assign_diagnostic_respondent", {
    target_assessment_id: parsed.data.assessmentId,
    target_user_id: parsed.data.userId,
    target_role: parsed.data.role,
  });
  if (error)
    finishAt(organizationSlug, incubatorSlug, returnTo, "error", error.message);
  revalidatePath(returnTo);
  finishAt(
    organizationSlug,
    incubatorSlug,
    returnTo,
    "success",
    "Respondente vinculado.",
  );
}

export async function revokeDiagnosticRespondentAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const returnTo = value(formData, "returnTo");
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = revokeDiagnosticRespondentSchema.safeParse({
    assessmentId: value(formData, "assessmentId"),
    userId: value(formData, "userId"),
    returnTo,
  });
  if (!parsed.success)
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      "Respondente inválido.",
    );
  const { error } = await context.supabase.rpc("revoke_diagnostic_respondent", {
    target_assessment_id: parsed.data.assessmentId,
    target_user_id: parsed.data.userId,
  });
  if (error)
    finishAt(organizationSlug, incubatorSlug, returnTo, "error", error.message);
  revalidatePath(returnTo);
  finishAt(
    organizationSlug,
    incubatorSlug,
    returnTo,
    "success",
    "Respondente removido.",
  );
}

export async function assignDiagnosticEvaluatorAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const returnTo = value(formData, "returnTo");
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = assignDiagnosticEvaluatorSchema.safeParse({
    assessmentId: value(formData, "assessmentId"),
    userId: value(formData, "userId"),
    returnTo,
  });
  if (!parsed.success)
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      "Selecione um avaliador.",
    );
  const { error } = await context.supabase.rpc("assign_diagnostic_evaluator", {
    target_assessment_id: parsed.data.assessmentId,
    target_user_id: parsed.data.userId,
  });
  if (error)
    finishAt(organizationSlug, incubatorSlug, returnTo, "error", error.message);
  revalidatePath(returnTo);
  finishAt(
    organizationSlug,
    incubatorSlug,
    returnTo,
    "success",
    "Avaliador definido.",
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

export type DiagnosticAutosaveResult =
  | {
      ok: true;
      responseId: string;
      lockVersion: number;
      savedAt: string;
    }
  | {
      ok: false;
      kind: "conflict" | "validation" | "forbidden" | "error";
      message: string;
    };

export type DiagnosticIndicatorSaveResult =
  | {
      ok: true;
      indicatorValueId: string;
      lockVersion: number;
      savedAt: string;
    }
  | {
      ok: false;
      kind: "conflict" | "validation" | "forbidden" | "error";
      message: string;
    };

export async function saveDiagnosticIndicatorValueAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
): Promise<DiagnosticIndicatorSaveResult> {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = saveDiagnosticIndicatorValueSchema.safeParse({
    assessmentId: value(formData, "assessmentId"),
    indicatorDefinitionId: value(formData, "indicatorDefinitionId"),
    lockVersion: value(formData, "lockVersion"),
    numericValue: value(formData, "numericValue"),
    targetValue: value(formData, "targetValue"),
    evidenceNotes: value(formData, "evidenceNotes"),
    isNotApplicable: formData.get("isNotApplicable") === "on",
    notApplicableJustification: value(formData, "notApplicableJustification"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      kind: "validation",
      message: parsed.error.issues[0]?.message ?? "Indicador inválido.",
    };
  }
  const parseNumber = (entry: string) => {
    if (!entry) return null;
    const normalized = entry.includes(",")
      ? entry.replaceAll(".", "").replace(",", ".")
      : entry;
    return Number(normalized);
  };
  const numericValue = parsed.data.isNotApplicable
    ? null
    : parseNumber(parsed.data.numericValue);
  const targetValue = parseNumber(parsed.data.targetValue);
  if (
    (numericValue !== null && !Number.isFinite(numericValue)) ||
    (targetValue !== null && !Number.isFinite(targetValue))
  ) {
    return {
      ok: false,
      kind: "validation",
      message: "Informe valores numéricos válidos.",
    };
  }
  const { data, error } = await context.supabase.rpc(
    "save_diagnostic_indicator_value",
    {
      target_assessment_id: parsed.data.assessmentId,
      target_indicator_definition_id: parsed.data.indicatorDefinitionId,
      expected_lock_version: parsed.data.lockVersion,
      target_numeric_value: numericValue,
      target_target_value: targetValue,
      target_is_not_applicable: parsed.data.isNotApplicable,
      target_not_applicable_justification:
        parsed.data.notApplicableJustification || null,
      target_evidence_notes: parsed.data.evidenceNotes,
    },
  );
  if (error) {
    if (error.code === "40001") {
      return {
        ok: false,
        kind: "conflict",
        message:
          "Outra sessão alterou este diagnóstico. Recarregue antes de continuar.",
      };
    }
    return {
      ok: false,
      kind: error.code === "42501" ? "forbidden" : "error",
      message:
        error.code === "42501"
          ? "Você não possui permissão para salvar este indicador."
          : "Não foi possível salvar o indicador.",
    };
  }
  const saved = data?.[0];
  if (!saved) {
    return {
      ok: false,
      kind: "error",
      message: "O banco não confirmou o salvamento do indicador.",
    };
  }
  revalidatePath(path(organizationSlug, incubatorSlug));
  return {
    ok: true,
    indicatorValueId: saved.indicator_value_id,
    lockVersion: Number(saved.lock_version),
    savedAt: saved.saved_at,
  };
}

export async function autosaveDiagnosticResponseAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
): Promise<DiagnosticAutosaveResult> {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = autosaveDiagnosticResponseSchema.safeParse({
    assessmentId: value(formData, "assessmentId"),
    criterionId: value(formData, "criterionId"),
    lockVersion: value(formData, "lockVersion"),
    responseType: value(formData, "responseType"),
    value: value(formData, "value"),
    comment: value(formData, "comment"),
    evidenceNotes: value(formData, "evidenceNotes"),
    isNotApplicable: formData.get("isNotApplicable") === "on",
    notApplicableJustification: value(formData, "notApplicableJustification"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      kind: "validation",
      message: parsed.error.issues[0]?.message ?? "Resposta inválida.",
    };
  }
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
  ) {
    return {
      ok: false,
      kind: "validation",
      message: "Informe um valor numérico válido.",
    };
  }

  const { data, error } = await context.supabase.rpc(
    "autosave_diagnostic_response",
    {
      target_assessment_id: parsed.data.assessmentId,
      target_criterion_id: parsed.data.criterionId,
      expected_lock_version: parsed.data.lockVersion,
      target_self_value: responseValue,
      target_is_not_applicable: parsed.data.isNotApplicable,
      target_not_applicable_justification:
        parsed.data.notApplicableJustification || null,
      target_self_comment: parsed.data.comment,
      target_evidence_notes: parsed.data.evidenceNotes,
    },
  );
  if (error) {
    if (error.code === "40001") {
      return {
        ok: false,
        kind: "conflict",
        message:
          "Outra sessão alterou este diagnóstico. Recarregue antes de continuar.",
      };
    }
    return {
      ok: false,
      kind: error.code === "42501" ? "forbidden" : "error",
      message:
        error.code === "42501"
          ? "Você não possui permissão para salvar esta resposta."
          : "Não foi possível salvar automaticamente.",
    };
  }
  const saved = data?.[0];
  if (!saved) {
    return {
      ok: false,
      kind: "error",
      message: "O banco não confirmou o salvamento.",
    };
  }
  revalidatePath(path(organizationSlug, incubatorSlug));
  return {
    ok: true,
    responseId: saved.response_id,
    lockVersion: Number(saved.lock_version),
    savedAt: saved.saved_at,
  };
}

export async function addDiagnosticExternalEvidenceAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const returnTo = value(formData, "returnTo");
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = addDiagnosticExternalEvidenceSchema.safeParse({
    responseId: value(formData, "responseId"),
    label: value(formData, "label"),
    externalUrl: value(formData, "externalUrl"),
    returnTo,
  });
  if (!parsed.success)
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      "Informe um nome e uma URL HTTPS válida para a evidência.",
    );
  const { error } = await context.supabase
    .from("diagnostic_response_evidence")
    .insert({
      organization_id: context.organization.id,
      incubator_id: context.incubator.id,
      response_id: parsed.data.responseId,
      kind: "external_link",
      external_url: parsed.data.externalUrl,
      label: parsed.data.label,
      status: "available",
      created_by: context.user.id,
    });
  if (error)
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      "Não foi possível vincular a evidência.",
    );
  revalidatePath(returnTo);
  finishAt(
    organizationSlug,
    incubatorSlug,
    returnTo,
    "success",
    "Evidência vinculada.",
  );
}

export async function deleteDiagnosticEvidenceAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const returnTo = value(formData, "returnTo");
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = deleteDiagnosticEvidenceSchema.safeParse({
    evidenceId: value(formData, "evidenceId"),
    returnTo,
  });
  if (!parsed.success)
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      "Evidência inválida.",
    );
  const { error } = await context.supabase
    .from("diagnostic_response_evidence")
    .update({ status: "deleted", deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.evidenceId);
  if (error)
    finishAt(
      organizationSlug,
      incubatorSlug,
      returnTo,
      "error",
      "Não foi possível remover a evidência.",
    );
  revalidatePath(returnTo);
  finishAt(
    organizationSlug,
    incubatorSlug,
    returnTo,
    "success",
    "Evidência removida.",
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
  rpcName: "reopen_diagnostic_assessment" | "finalize_diagnostic_assessment",
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
  const assessment = await context.supabase
    .from("diagnostic_assessments")
    .select("execution_mode")
    .eq("organization_id", context.organization.id)
    .eq("incubator_id", context.incubator.id)
    .eq("id", parsed.data.assessmentId)
    .maybeSingle();
  if (assessment.error || !assessment.data)
    finishAt(
      organizationSlug,
      incubatorSlug,
      parsed.data.returnTo,
      "error",
      "Avaliação não encontrada.",
    );
  const facilitated = assessment.data.execution_mode === "facilitated";
  const { error } = await context.supabase.rpc(
    facilitated
      ? "complete_facilitated_diagnostic_assessment"
      : "submit_diagnostic_assessment",
    { target_assessment_id: parsed.data.assessmentId },
  );
  if (error)
    finishAt(
      organizationSlug,
      incubatorSlug,
      parsed.data.returnTo,
      "error",
      error.message || "Não foi possível concluir a avaliação.",
    );
  revalidatePath(parsed.data.returnTo);
  finishAt(
    organizationSlug,
    incubatorSlug,
    parsed.data.returnTo,
    "success",
    facilitated
      ? "Diagnóstico conduzido concluído e registrado como resultado oficial."
      : "Autodiagnóstico enviado para validação.",
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
