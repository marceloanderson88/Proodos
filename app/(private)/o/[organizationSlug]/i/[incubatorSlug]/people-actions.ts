"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getIncubatorServerContext } from "@/lib/incubators/server-context";
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
