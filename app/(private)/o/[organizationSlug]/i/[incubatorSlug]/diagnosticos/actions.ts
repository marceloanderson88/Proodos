"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createDiagnosticAssessmentSchema,
  createDiagnosticCriterionSchema,
  createDiagnosticDimensionSchema,
  createDiagnosticTemplateSchema,
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

async function refreshScores(
  context: Awaited<ReturnType<typeof getIncubatorServerContext>>,
  assessmentId: string,
) {
  const [{ data: assessment }, { data: responses }] = await Promise.all([
    context.supabase
      .from("diagnostic_assessments")
      .select("template_id")
      .eq("id", assessmentId)
      .single(),
    context.supabase
      .from("diagnostic_responses")
      .select("criterion_id, self_value, validated_value, is_not_applicable")
      .eq("assessment_id", assessmentId),
  ]);
  if (!assessment) return;
  const { data: criteria } = await context.supabase
    .from("diagnostic_criteria")
    .select("id, weight, maximum_score")
    .eq("template_id", assessment.template_id);
  const calculate = (field: "self_value" | "validated_value") => {
    let score = 0;
    let weight = 0;
    for (const criterion of criteria ?? []) {
      const response = (responses ?? []).find(
        (item) => item.criterion_id === criterion.id,
      );
      if (!response || response.is_not_applicable) continue;
      const raw = response[field];
      const numeric = typeof raw === "number" ? raw : null;
      if (numeric === null) continue;
      score +=
        (numeric / Number(criterion.maximum_score)) * Number(criterion.weight);
      weight += Number(criterion.weight);
    }
    return weight ? Number(((score / weight) * 5).toFixed(3)) : null;
  };
  const validatedScore = calculate("validated_value");
  await context.supabase
    .from("diagnostic_assessments")
    .update({
      self_score: calculate("self_value"),
      validated_score: validatedScore,
    })
    .eq("id", assessmentId);
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
  const { error } = await context.supabase.from("diagnostic_templates").insert({
    organization_id: context.organization.id,
    incubator_id: context.incubator.id,
    name: parsed.data.name,
    description: parsed.data.description,
    instructions: parsed.data.instructions,
    created_by: context.user.id,
  });
  if (error)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      "Não foi possível criar o modelo.",
    );
  revalidatePath(path(organizationSlug, incubatorSlug));
  finish(
    organizationSlug,
    incubatorSlug,
    "success",
    "Modelo de diagnóstico criado como rascunho.",
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
    name: value(formData, "name"),
    description: value(formData, "description"),
    weight: value(formData, "weight"),
  });
  if (!parsed.success)
    finish(organizationSlug, incubatorSlug, "error", "Dimensão inválida.");
  const { count } = await context.supabase
    .from("diagnostic_dimensions")
    .select("id", { count: "exact", head: true })
    .eq("template_id", parsed.data.templateId);
  const { error } = await context.supabase
    .from("diagnostic_dimensions")
    .insert({
      organization_id: context.organization.id,
      incubator_id: context.incubator.id,
      template_id: parsed.data.templateId,
      name: parsed.data.name,
      description: parsed.data.description,
      weight: parsed.data.weight,
      position: count ?? 0,
    });
  if (error)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      "Não foi possível adicionar a dimensão.",
    );
  revalidatePath(path(organizationSlug, incubatorSlug));
  finish(organizationSlug, incubatorSlug, "success", "Dimensão adicionada.");
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
    prompt: value(formData, "prompt"),
    helpText: value(formData, "helpText"),
    responseType: value(formData, "responseType"),
    weight: value(formData, "weight"),
    maximumScore: value(formData, "maximumScore"),
    allowsNotApplicable: formData.get("allowsNotApplicable") === "on",
    options: value(formData, "options"),
  });
  if (!parsed.success)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      parsed.error.issues[0]?.message ?? "Critério inválido.",
    );
  const { count } = await context.supabase
    .from("diagnostic_criteria")
    .select("id", { count: "exact", head: true })
    .eq("dimension_id", parsed.data.dimensionId);
  const options: Json = parsed.data.options
    ? parsed.data.options
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const { error } = await context.supabase.from("diagnostic_criteria").insert({
    organization_id: context.organization.id,
    incubator_id: context.incubator.id,
    template_id: parsed.data.templateId,
    dimension_id: parsed.data.dimensionId,
    prompt: parsed.data.prompt,
    help_text: parsed.data.helpText,
    response_type: parsed.data.responseType,
    weight: parsed.data.weight,
    maximum_score: parsed.data.maximumScore,
    allows_not_applicable: parsed.data.allowsNotApplicable,
    options,
    position: count ?? 0,
  });
  if (error)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      "Não foi possível adicionar o critério.",
    );
  revalidatePath(path(organizationSlug, incubatorSlug));
  finish(organizationSlug, incubatorSlug, "success", "Critério adicionado.");
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
  const { count } = await context.supabase
    .from("diagnostic_criteria")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId);
  if (!count)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      "Inclua ao menos um critério antes de publicar.",
    );
  const { error } = await context.supabase
    .from("diagnostic_templates")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("organization_id", context.organization.id)
    .eq("incubator_id", context.incubator.id)
    .eq("id", templateId)
    .eq("status", "draft");
  if (error)
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      "Não foi possível publicar o modelo.",
    );
  revalidatePath(path(organizationSlug, incubatorSlug));
  finish(
    organizationSlug,
    incubatorSlug,
    "success",
    "Versão publicada e protegida contra alterações.",
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
    finish(
      organizationSlug,
      incubatorSlug,
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
    finish(
      organizationSlug,
      incubatorSlug,
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
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      "Não foi possível salvar a resposta.",
    );
  await context.supabase
    .from("diagnostic_assessments")
    .update({ status: "in_progress" })
    .eq("id", parsed.data.assessmentId)
    .eq("status", "draft");
  await refreshScores(context, parsed.data.assessmentId);
  revalidatePath(path(organizationSlug, incubatorSlug));
  finish(organizationSlug, incubatorSlug, "success", "Resposta salva.");
}

export async function validateDiagnosticResponseAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
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
    finish(
      organizationSlug,
      incubatorSlug,
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
    finish(
      organizationSlug,
      incubatorSlug,
      "error",
      "Não foi possível validar a resposta.",
    );
  await refreshScores(context, parsed.data.assessmentId);
  revalidatePath(path(organizationSlug, incubatorSlug));
  finish(
    organizationSlug,
    incubatorSlug,
    "success",
    "Nota validada sem substituir a autoavaliação.",
  );
}
