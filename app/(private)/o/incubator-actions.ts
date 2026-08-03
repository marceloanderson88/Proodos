"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createIncubatorSchema,
  incubatorLifecycleSchema,
  slugifyIncubatorName,
  updateIncubatorSchema,
} from "@/lib/incubators/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

function feedbackUrl(kind: "success" | "error", message: string) {
  return `/o?${kind}=${encodeURIComponent(message)}`;
}

function databaseMessage(code?: string) {
  if (code === "23505") return "Já existe uma incubadora com esse nome.";
  if (code === "23514")
    return "Esta incubadora possui dados vinculados e deve ser arquivada.";
  if (code === "42501")
    return "Seu perfil não possui permissão administrativa no Proodos.";
  return "Não foi possível concluir a operação com a incubadora.";
}

async function authenticatedClient() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fo");
  return { supabase, user };
}

export async function createIncubatorAction(formData: FormData) {
  const parsed = createIncubatorSchema.safeParse({
    organizationId: value(formData, "organizationId"),
    name: value(formData, "name"),
    timezone: value(formData, "timezone") || "America/Sao_Paulo",
    locale: value(formData, "locale") || "pt-BR",
  });
  if (!parsed.success)
    redirect(
      feedbackUrl(
        "error",
        parsed.error.issues[0]?.message ?? "Dados inválidos.",
      ),
    );

  const { supabase, user } = await authenticatedClient();
  const slug = slugifyIncubatorName(parsed.data.name);
  if (!slug)
    redirect(feedbackUrl("error", "O nome não gerou um identificador válido."));

  const { error } = await supabase.from("incubators").insert({
    organization_id: parsed.data.organizationId,
    name: parsed.data.name,
    slug,
    timezone: parsed.data.timezone,
    locale: parsed.data.locale,
    created_by: user.id,
  });
  if (error) redirect(feedbackUrl("error", databaseMessage(error.code)));

  revalidatePath("/o");
  redirect(
    feedbackUrl("success", "Incubadora criada e pronta para configuração."),
  );
}

export async function updateIncubatorAction(formData: FormData) {
  const parsed = updateIncubatorSchema.safeParse({
    organizationId: value(formData, "organizationId"),
    incubatorId: value(formData, "incubatorId"),
    name: value(formData, "name"),
    timezone: value(formData, "timezone") || "America/Sao_Paulo",
    locale: value(formData, "locale") || "pt-BR",
  });
  if (!parsed.success)
    redirect(
      feedbackUrl(
        "error",
        parsed.error.issues[0]?.message ?? "Dados inválidos.",
      ),
    );

  const { supabase } = await authenticatedClient();
  const { data, error } = await supabase
    .from("incubators")
    .update({
      name: parsed.data.name,
      timezone: parsed.data.timezone,
      locale: parsed.data.locale,
    })
    .eq("id", parsed.data.incubatorId)
    .eq("organization_id", parsed.data.organizationId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error || !data)
    redirect(feedbackUrl("error", databaseMessage(error?.code)));

  revalidatePath("/o");
  redirect(feedbackUrl("success", "Dados da incubadora atualizados."));
}

export async function manageIncubatorLifecycleAction(formData: FormData) {
  const parsed = incubatorLifecycleSchema.safeParse({
    incubatorId: value(formData, "incubatorId"),
    action: value(formData, "action"),
  });
  if (!parsed.success)
    redirect(feedbackUrl("error", "Ação de incubadora inválida."));

  const { supabase } = await authenticatedClient();
  const { error } = await supabase.rpc("manage_incubator_lifecycle", {
    target_incubator_id: parsed.data.incubatorId,
    requested_action: parsed.data.action,
  });
  if (error) redirect(feedbackUrl("error", databaseMessage(error.code)));

  const messages = {
    delete: "Incubadora vazia excluída.",
    archive: "Incubadora arquivada com o histórico preservado.",
    restore: "Incubadora reativada.",
  } as const;
  revalidatePath("/o");
  redirect(feedbackUrl("success", messages[parsed.data.action]));
}
