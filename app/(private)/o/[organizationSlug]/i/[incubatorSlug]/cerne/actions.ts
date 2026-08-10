"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createCerneCycleSchema,
  registerCerneEvidenceSchema,
} from "@/lib/cerne/schemas";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import type { Json } from "@/lib/supabase/database.types";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}

function basePath(organizationSlug: string, incubatorSlug: string) {
  return `/o/${organizationSlug}/i/${incubatorSlug}/cerne`;
}

function finish(
  organizationSlug: string,
  incubatorSlug: string,
  view: string,
  kind: "success" | "error",
  message: string,
): never {
  revalidatePath(basePath(organizationSlug, incubatorSlug));
  redirect(
    `${basePath(organizationSlug, incubatorSlug)}?${new URLSearchParams({ view, [kind]: message })}`,
  );
}

function message(
  error: { code?: string; message?: string } | null,
  fallback: string,
) {
  return error?.code === "23505" ||
    error?.code === "23514" ||
    error?.code === "22023"
    ? (error.message ?? fallback)
    : fallback;
}

export async function createCerneCycleAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const parsed = createCerneCycleSchema.safeParse({
    name: value(formData, "name"),
    referenceYear: value(formData, "referenceYear"),
    targetLevel: value(formData, "targetLevel"),
    startsOn: value(formData, "startsOn"),
    endsOn: value(formData, "endsOn"),
  });
  if (!parsed.success)
    finish(
      organizationSlug,
      incubatorSlug,
      "overview",
      "error",
      parsed.error.issues[0]?.message ?? "Confira o ciclo.",
    );
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const { error } = await context.supabase.rpc("create_cerne_cycle", {
    target_organization_id: context.organization.id,
    target_incubator_id: context.incubator.id,
    cycle_name: parsed.data.name,
    reference_year: parsed.data.referenceYear,
    target_level: parsed.data.targetLevel,
    starts_on: parsed.data.startsOn,
    ends_on: parsed.data.endsOn,
  });
  if (error)
    finish(
      organizationSlug,
      incubatorSlug,
      "overview",
      "error",
      message(error, "Não foi possível criar o ciclo CERNE."),
    );
  finish(
    organizationSlug,
    incubatorSlug,
    "overview",
    "success",
    "Ciclo e estrutura de pastas criados.",
  );
}

export async function registerCerneEvidenceAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const parsed = registerCerneEvidenceSchema.safeParse({
    cycleId: value(formData, "cycleId"),
    practiceCode: value(formData, "practiceCode"),
    requirementId: value(formData, "requirementId"),
    title: value(formData, "title"),
    description: value(formData, "description"),
    externalUrl: value(formData, "externalUrl"),
    sourceModule: value(formData, "sourceModule"),
    sourceEntityType: value(formData, "sourceEntityType"),
    sourceEntityId: value(formData, "sourceEntityId"),
    scopeType: value(formData, "scopeType"),
    scopeEntityId: value(formData, "scopeEntityId"),
  });
  if (!parsed.success)
    finish(
      organizationSlug,
      incubatorSlug,
      "evidences",
      "error",
      parsed.error.issues[0]?.message ?? "Confira a evidência.",
    );
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const { error } = await context.supabase.rpc("register_cerne_evidence", {
    target_cycle_id: parsed.data.cycleId,
    target_practice_code: parsed.data.practiceCode,
    target_requirement_id: parsed.data.requirementId,
    evidence_title: parsed.data.title,
    evidence_description: parsed.data.description || null,
    external_url: parsed.data.externalUrl || null,
    source_module: parsed.data.sourceModule || null,
    source_entity_type:
      parsed.data.sourceEntityType ||
      (parsed.data.scopeType === "incubator" ? null : parsed.data.scopeType),
    source_entity_id:
      parsed.data.sourceEntityId || parsed.data.scopeEntityId || null,
    source_snapshot: {} as Json,
    scope_type: parsed.data.scopeType,
    scope_entity_id: parsed.data.scopeEntityId || null,
  });
  if (error)
    finish(
      organizationSlug,
      incubatorSlug,
      "evidences",
      "error",
      message(error, "Não foi possível registrar a evidência."),
    );
  finish(
    organizationSlug,
    incubatorSlug,
    "evidences",
    "success",
    "Evidência registrada no dossiê CERNE.",
  );
}

export async function assignCerneOwnerAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const { error } = await context.supabase.rpc("assign_cerne_practice_owner", {
    target_cycle_id: value(formData, "cycleId"),
    target_practice_code: value(formData, "practiceCode"),
    target_user_id: value(formData, "userId") || null,
    implementation_status:
      value(formData, "implementationStatus") || "to_validate",
  });
  if (error)
    finish(
      organizationSlug,
      incubatorSlug,
      "matrix",
      "error",
      message(error, "Não foi possível definir o responsável."),
    );
  finish(
    organizationSlug,
    incubatorSlug,
    "matrix",
    "success",
    "Responsável e situação atualizados.",
  );
}

export async function acknowledgeCerneAlertAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const { error } = await context.supabase.rpc("acknowledge_cerne_alert", {
    target_alert_id: value(formData, "alertId"),
  });
  if (error)
    finish(
      organizationSlug,
      incubatorSlug,
      "alerts",
      "error",
      "Não foi possível reconhecer o alerta.",
    );
  finish(
    organizationSlug,
    incubatorSlug,
    "alerts",
    "success",
    "Alerta reconhecido.",
  );
}

export async function assignCerneReviewerAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const { error } = await context.supabase.rpc("assign_cerne_reviewer", {
    target_cycle_id: value(formData, "cycleId"),
    target_reviewer_user_id: value(formData, "reviewerUserId"),
    target_practice_code: value(formData, "practiceCode") || null,
  });
  if (error)
    finish(
      organizationSlug,
      incubatorSlug,
      "review",
      "error",
      message(error, "Não foi possível convidar o avaliador."),
    );
  finish(
    organizationSlug,
    incubatorSlug,
    "review",
    "success",
    "Avaliador convidado para a banca.",
  );
}

export async function acceptCerneConfidentialityAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const { error } = await context.supabase.rpc("accept_cerne_confidentiality", {
    target_assignment_id: value(formData, "assignmentId"),
  });
  if (error)
    finish(
      organizationSlug,
      incubatorSlug,
      "review",
      "error",
      "Não foi possível aceitar o termo.",
    );
  finish(
    organizationSlug,
    incubatorSlug,
    "review",
    "success",
    "Termo aceito. A banca foi liberada.",
  );
}

export async function reviewCerneEvidenceAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const result = value(formData, "result") as "valid" | "partial" | "invalid";
  const { error } = await context.supabase.rpc("review_cerne_evidence", {
    target_evidence_id: value(formData, "evidenceId"),
    review_result: result,
    review_notes: value(formData, "notes"),
  });
  if (error)
    finish(
      organizationSlug,
      incubatorSlug,
      "review",
      "error",
      message(error, "Não foi possível avaliar a evidência."),
    );
  finish(
    organizationSlug,
    incubatorSlug,
    "review",
    "success",
    "Parecer registrado.",
  );
}
