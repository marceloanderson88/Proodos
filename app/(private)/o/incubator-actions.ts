"use server";

import { randomUUID } from "node:crypto";

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
    kind: value(formData, "kind"),
    customKind: value(formData, "customKind"),
    legalName: value(formData, "legalName"),
    shortDescription: value(formData, "shortDescription"),
    contactEmail: value(formData, "contactEmail"),
    phone: value(formData, "phone"),
    websiteUrl: value(formData, "websiteUrl"),
    city: value(formData, "city"),
    state: value(formData, "state"),
    countryCode: value(formData, "countryCode") || "BR",
    responsibleName: value(formData, "responsibleName"),
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

  const { data: incubator, error } = await supabase
    .from("incubators")
    .insert({
      organization_id: parsed.data.organizationId,
      name: parsed.data.name,
      slug,
      kind: parsed.data.kind,
      custom_kind: parsed.data.customKind,
      legal_name: parsed.data.legalName,
      short_description: parsed.data.shortDescription,
      contact_email: parsed.data.contactEmail,
      phone: parsed.data.phone,
      website_url: parsed.data.websiteUrl,
      city: parsed.data.city,
      state: parsed.data.state,
      country_code: parsed.data.countryCode,
      responsible_name: parsed.data.responsibleName,
      timezone: parsed.data.timezone,
      locale: parsed.data.locale,
      created_by: user.id,
      settings: {
        resources: {
          diagnostics: true,
          actionPlans: true,
          mentoring: true,
          learningTrails: true,
        },
      },
    })
    .select("id")
    .single();
  if (error || !incubator)
    redirect(feedbackUrl("error", databaseMessage(error?.code)));

  const logo = formData.get("logo");
  let logoWarning = false;
  if (logo instanceof File && logo.size > 0) {
    const extensions: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
    };
    const extension = extensions[logo.type];
    if (!extension || logo.size > 2 * 1024 * 1024) {
      logoWarning = true;
    } else {
      const path = `${parsed.data.organizationId}/${incubator.id}/logo-${randomUUID()}.${extension}`;
      const upload = await supabase.storage
        .from("incubator-logos")
        .upload(path, new Uint8Array(await logo.arrayBuffer()), {
          contentType: logo.type,
          upsert: false,
        });
      if (upload.error) {
        logoWarning = true;
      } else {
        const update = await supabase
          .from("incubators")
          .update({ logo_path: path })
          .eq("id", incubator.id)
          .eq("organization_id", parsed.data.organizationId);
        logoWarning = Boolean(update.error);
      }
    }
  }

  revalidatePath("/o");
  redirect(
    feedbackUrl(
      logoWarning ? "error" : "success",
      logoWarning
        ? "Incubadora criada, mas a logo não pôde ser salva. Ela pode ser adicionada nas configurações."
        : "Incubadora criada. Convide o primeiro gestor para concluir a implantação.",
    ),
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
