"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import {
  createStartupSchema,
  inviteStartupSchema,
  reviewStartupApplicationSchema,
  updateStartupSchema,
} from "@/lib/m6/schemas";
import { sendStartupOnboardingInvitation } from "@/lib/startups/onboarding";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}

function basePath(organizationSlug: string, incubatorSlug: string) {
  return `/o/${organizationSlug}/i/${incubatorSlug}/startups`;
}

function withFeedback(
  path: string,
  kind: "success" | "error",
  message: string,
) {
  return `${path}?${new URLSearchParams({ [kind]: message }).toString()}`;
}

function startupInput(formData: FormData) {
  return {
    name: value(formData, "name"),
    legalName: value(formData, "legalName"),
    taxId: value(formData, "taxId"),
    sector: value(formData, "sector"),
    businessModel: value(formData, "businessModel"),
    stage: value(formData, "stage"),
    city: value(formData, "city"),
    state: value(formData, "state"),
    websiteUrl: value(formData, "websiteUrl"),
  };
}

export async function createStartupDetailedAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = createStartupSchema.safeParse(startupInput(formData));
  if (!parsed.success) {
    redirect(
      withFeedback(
        `${basePath(organizationSlug, incubatorSlug)}/nova`,
        "error",
        "Confira os dados da startup.",
      ),
    );
  }
  const { data, error } = await context.supabase
    .from("startups")
    .insert({
      code: "",
      organization_id: context.organization.id,
      incubator_id: context.incubator.id,
      name: parsed.data.name,
      legal_name: parsed.data.legalName,
      tax_id: parsed.data.taxId,
      sector: parsed.data.sector,
      business_model: parsed.data.businessModel,
      stage: parsed.data.stage,
      city: parsed.data.city,
      state: parsed.data.state,
      website_url: parsed.data.websiteUrl,
      created_by: context.user.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    redirect(
      withFeedback(
        `${basePath(organizationSlug, incubatorSlug)}/nova`,
        "error",
        error?.code === "23505"
          ? "Já existe uma startup com este CNPJ ou registro."
          : "Não foi possível cadastrar a startup.",
      ),
    );
  }
  revalidatePath(basePath(organizationSlug, incubatorSlug));
  redirect(
    withFeedback(
      `${basePath(organizationSlug, incubatorSlug)}/${data.id}`,
      "success",
      "Startup cadastrada.",
    ),
  );
}

export async function updateStartupAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = updateStartupSchema.safeParse({
    ...startupInput(formData),
    startupId: value(formData, "startupId"),
    status: value(formData, "status"),
  });
  const editPath = `${basePath(organizationSlug, incubatorSlug)}/${value(formData, "startupId")}/editar`;
  if (!parsed.success)
    redirect(withFeedback(editPath, "error", "Confira os dados da edição."));
  const { data, error } = await context.supabase
    .from("startups")
    .update({
      name: parsed.data.name,
      legal_name: parsed.data.legalName,
      tax_id: parsed.data.taxId,
      sector: parsed.data.sector,
      business_model: parsed.data.businessModel,
      stage: parsed.data.stage,
      status: parsed.data.status,
      city: parsed.data.city,
      state: parsed.data.state,
      website_url: parsed.data.websiteUrl,
    })
    .eq("id", parsed.data.startupId)
    .eq("organization_id", context.organization.id)
    .eq("incubator_id", context.incubator.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error || !data)
    redirect(
      withFeedback(editPath, "error", "Não foi possível atualizar a startup."),
    );
  revalidatePath(basePath(organizationSlug, incubatorSlug));
  revalidatePath(`${basePath(organizationSlug, incubatorSlug)}/${data.id}`);
  redirect(
    withFeedback(
      `${basePath(organizationSlug, incubatorSlug)}/${data.id}`,
      "success",
      "Dados da startup atualizados.",
    ),
  );
}

export async function reviewStartupApplicationAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = reviewStartupApplicationSchema.safeParse({
    applicationId: value(formData, "applicationId"),
    decision: value(formData, "decision"),
    notes: value(formData, "notes"),
  });
  const path = basePath(organizationSlug, incubatorSlug);
  if (!parsed.success)
    redirect(withFeedback(path, "error", "Decisão inválida."));
  const { data, error } = await context.supabase.rpc(
    "review_startup_application",
    {
      target_application_id: parsed.data.applicationId,
      requested_decision: parsed.data.decision,
      review_notes: parsed.data.notes,
    },
  );
  if (error)
    redirect(
      withFeedback(path, "error", "Não foi possível analisar a solicitação."),
    );
  revalidatePath(path);
  redirect(
    withFeedback(
      path,
      "success",
      parsed.data.decision === "approve" && data
        ? "Startup aprovada e acesso ativado."
        : "Solicitação recusada.",
    ),
  );
}

export async function inviteStartupAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = inviteStartupSchema.safeParse({
    startupId: value(formData, "startupId"),
    startupName: value(formData, "startupName"),
    representativeName: value(formData, "representativeName"),
    email: value(formData, "email"),
    cohortId: value(formData, "cohortId"),
  });
  const path = basePath(organizationSlug, incubatorSlug);
  if (!parsed.success)
    redirect(withFeedback(path, "error", "Confira os dados do convite."));
  try {
    await sendStartupOnboardingInvitation(context, parsed.data);
  } catch (error) {
    const message =
      error instanceof Error &&
      error.message === "SUPABASE_SECRET_KEY_NOT_CONFIGURED"
        ? "Configure SUPABASE_SECRET_KEY na Vercel para enviar convites."
        : "Não foi possível enviar o convite. Verifique se já existe um convite pendente para o e-mail.";
    redirect(withFeedback(path, "error", message));
  }
  revalidatePath(path);
  redirect(
    withFeedback(
      path,
      "success",
      "Convite enviado. O vínculo será ativado após o aceite.",
    ),
  );
}
