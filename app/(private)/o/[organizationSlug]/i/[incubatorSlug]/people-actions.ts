"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { updateIncubatorOperationsSchema } from "@/lib/incubators/schemas";
import type { Json } from "@/lib/supabase/database.types";
import {
  manageIncubatorPersonRoleSchema,
  removeIncubatorPersonRoleSchema,
} from "@/lib/m6/schemas";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}

function feedbackUrl(
  organizationSlug: string,
  incubatorSlug: string,
  kind: "success" | "error",
  message: string,
) {
  return `/o/${organizationSlug}/i/${incubatorSlug}/gestao-incubadora?${kind}=${encodeURIComponent(message)}`;
}

export async function updateIncubatorOperationsAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = updateIncubatorOperationsSchema.safeParse({
    description: value(formData, "description"),
    contactEmail: value(formData, "contactEmail"),
    phone: value(formData, "phone"),
    website: value(formData, "website"),
    timezone: value(formData, "timezone"),
    locale: value(formData, "locale"),
    diagnosticsEnabled: formData.get("diagnosticsEnabled") === "on",
    actionPlansEnabled: formData.get("actionPlansEnabled") === "on",
    mentoringEnabled: formData.get("mentoringEnabled") === "on",
    learningTrailsEnabled: formData.get("learningTrailsEnabled") === "on",
  });
  if (!parsed.success)
    redirect(
      feedbackUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        parsed.error.issues[0]?.message ?? "Configurações inválidas.",
      ),
    );

  const current = await context.supabase
    .from("incubators")
    .select("settings")
    .eq("organization_id", context.organization.id)
    .eq("id", context.incubator.id)
    .single();
  if (current.error)
    redirect(
      feedbackUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Não foi possível consultar a incubadora.",
      ),
    );

  const previous =
    current.data.settings &&
    typeof current.data.settings === "object" &&
    !Array.isArray(current.data.settings)
      ? current.data.settings
      : {};
  const settings: Json = {
    ...previous,
    description: parsed.data.description,
    contact: {
      email: parsed.data.contactEmail,
      phone: parsed.data.phone,
      website: parsed.data.website,
    },
    resources: {
      diagnostics: parsed.data.diagnosticsEnabled,
      actionPlans: parsed.data.actionPlansEnabled,
      mentoring: parsed.data.mentoringEnabled,
      learningTrails: parsed.data.learningTrailsEnabled,
    },
  };
  const { error } = await context.supabase
    .from("incubators")
    .update({
      timezone: parsed.data.timezone,
      locale: parsed.data.locale,
      settings,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", context.incubator.id);
  if (error)
    redirect(
      feedbackUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Você não tem permissão ou a configuração é inválida.",
      ),
    );
  revalidatePath(`/o/${organizationSlug}/i/${incubatorSlug}/gestao-incubadora`);
  redirect(
    feedbackUrl(
      organizationSlug,
      incubatorSlug,
      "success",
      "Configurações da incubadora atualizadas.",
    ),
  );
}

export async function assignIncubatorPersonRoleAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = manageIncubatorPersonRoleSchema.safeParse({
    membershipId: value(formData, "membershipId"),
    roleId: value(formData, "roleId"),
  });
  if (!parsed.success)
    redirect(
      feedbackUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Selecione uma pessoa e um papel.",
      ),
    );

  const { error } = await context.supabase.from("role_assignments").insert({
    organization_id: context.organization.id,
    membership_id: parsed.data.membershipId,
    role_id: parsed.data.roleId,
    incubator_id: context.incubator.id,
    unit_id: null,
    created_by: context.user.id,
  });
  if (error)
    redirect(
      feedbackUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        error.code === "23505"
          ? "Essa pessoa já possui o papel selecionado."
          : "Não foi possível atribuir o papel.",
      ),
    );

  const path = `/o/${organizationSlug}/i/${incubatorSlug}/gestao-incubadora`;
  revalidatePath(path);
  redirect(
    feedbackUrl(
      organizationSlug,
      incubatorSlug,
      "success",
      "Papel atribuído à pessoa.",
    ),
  );
}

export async function removeIncubatorPersonRoleAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = removeIncubatorPersonRoleSchema.safeParse({
    assignmentId: value(formData, "assignmentId"),
  });
  if (!parsed.success)
    redirect(
      feedbackUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Atribuição inválida.",
      ),
    );

  const { error } = await context.supabase
    .from("role_assignments")
    .delete()
    .eq("id", parsed.data.assignmentId)
    .eq("organization_id", context.organization.id)
    .eq("incubator_id", context.incubator.id);
  if (error)
    redirect(
      feedbackUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Não foi possível remover o papel.",
      ),
    );

  const path = `/o/${organizationSlug}/i/${incubatorSlug}/gestao-incubadora`;
  revalidatePath(path);
  redirect(
    feedbackUrl(
      organizationSlug,
      incubatorSlug,
      "success",
      "Papel removido da pessoa.",
    ),
  );
}
