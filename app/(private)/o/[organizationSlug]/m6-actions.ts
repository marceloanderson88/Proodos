"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addStartupMemberSchema,
  createCohortSchema,
  createIncubatorSchema,
  createProgramSchema,
  createProgramTypeSchema,
  createStartupSchema,
  enrollStartupSchema,
  organizationSlugSchema,
} from "@/lib/m6/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ModuleName = "programas" | "startups";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}

function feedbackUrl(
  organizationSlug: string,
  module: ModuleName,
  kind: "success" | "error",
  message: string,
) {
  const search = new URLSearchParams({ [kind]: message });
  return `/o/${organizationSlug}/${module}?${search.toString()}`;
}

function databaseMessage(code: string | undefined) {
  if (code === "23505")
    return "Já existe um registro com esse código ou identificador.";
  if (code === "23503")
    return "Um dos vínculos selecionados não está mais disponível.";
  if (code === "42501")
    return "Você não tem permissão para concluir esta operação.";
  return "Não foi possível salvar. Revise os dados e tente novamente.";
}

async function mutationContext(rawSlug: string) {
  const organizationSlug = organizationSlugSchema.parse(rawSlug);
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, slug")
    .eq("slug", organizationSlug)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (!organization) redirect("/o");
  return { organization, organizationSlug, supabase, user };
}

export async function createIncubatorAction(
  organizationSlug: string,
  formData: FormData,
) {
  const context = await mutationContext(organizationSlug);
  const parsed = createIncubatorSchema.safeParse({
    name: value(formData, "name"),
    slug: value(formData, "slug"),
  });
  if (!parsed.success) {
    redirect(
      feedbackUrl(
        context.organizationSlug,
        "programas",
        "error",
        "Confira o nome e o identificador da incubadora.",
      ),
    );
  }

  const { error } = await context.supabase.from("incubators").insert({
    organization_id: context.organization.id,
    name: parsed.data.name,
    slug: parsed.data.slug,
    created_by: context.user.id,
  });
  if (error)
    redirect(
      feedbackUrl(
        context.organizationSlug,
        "programas",
        "error",
        databaseMessage(error.code),
      ),
    );

  revalidatePath(`/o/${context.organizationSlug}`);
  redirect(
    feedbackUrl(
      context.organizationSlug,
      "programas",
      "success",
      "Incubadora criada com segurança.",
    ),
  );
}

export async function createProgramTypeAction(
  organizationSlug: string,
  formData: FormData,
) {
  const context = await mutationContext(organizationSlug);
  const rawIncubatorId = value(formData, "incubatorId");
  const parsed = createProgramTypeSchema.safeParse({
    incubatorId: rawIncubatorId || null,
    code: value(formData, "code"),
    name: value(formData, "name"),
    description: value(formData, "description"),
  });
  if (!parsed.success) {
    redirect(
      feedbackUrl(
        context.organizationSlug,
        "programas",
        "error",
        "Confira os dados do tipo de programa.",
      ),
    );
  }

  const { error } = await context.supabase.from("program_types").insert({
    organization_id: context.organization.id,
    incubator_id: parsed.data.incubatorId,
    code: parsed.data.code,
    name: parsed.data.name,
    description: parsed.data.description,
    created_by: context.user.id,
  });
  if (error)
    redirect(
      feedbackUrl(
        context.organizationSlug,
        "programas",
        "error",
        databaseMessage(error.code),
      ),
    );

  revalidatePath(`/o/${context.organizationSlug}/programas`);
  redirect(
    feedbackUrl(
      context.organizationSlug,
      "programas",
      "success",
      "Tipo de programa criado.",
    ),
  );
}

export async function createProgramAction(
  organizationSlug: string,
  formData: FormData,
) {
  const context = await mutationContext(organizationSlug);
  const parsed = createProgramSchema.safeParse({
    incubatorId: value(formData, "incubatorId"),
    typeId: value(formData, "typeId"),
    code: value(formData, "code"),
    name: value(formData, "name"),
    description: value(formData, "description"),
    startsOn: value(formData, "startsOn"),
    endsOn: value(formData, "endsOn"),
  });
  if (!parsed.success) {
    redirect(
      feedbackUrl(
        context.organizationSlug,
        "programas",
        "error",
        "Confira código, período e demais dados do programa.",
      ),
    );
  }

  const { error } = await context.supabase.from("programs").insert({
    organization_id: context.organization.id,
    incubator_id: parsed.data.incubatorId,
    type_id: parsed.data.typeId,
    code: parsed.data.code,
    name: parsed.data.name,
    description: parsed.data.description,
    starts_on: parsed.data.startsOn,
    ends_on: parsed.data.endsOn,
    created_by: context.user.id,
  });
  if (error)
    redirect(
      feedbackUrl(
        context.organizationSlug,
        "programas",
        "error",
        databaseMessage(error.code),
      ),
    );

  revalidatePath(`/o/${context.organizationSlug}/programas`);
  redirect(
    feedbackUrl(
      context.organizationSlug,
      "programas",
      "success",
      "Programa criado em rascunho.",
    ),
  );
}

export async function createCohortAction(
  organizationSlug: string,
  formData: FormData,
) {
  const context = await mutationContext(organizationSlug);
  const parsed = createCohortSchema.safeParse({
    programId: value(formData, "programId"),
    code: value(formData, "code"),
    name: value(formData, "name"),
    startsOn: value(formData, "startsOn"),
    endsOn: value(formData, "endsOn"),
    capacity: value(formData, "capacity"),
  });
  if (!parsed.success) {
    redirect(
      feedbackUrl(
        context.organizationSlug,
        "programas",
        "error",
        "Confira código, período e capacidade da turma.",
      ),
    );
  }

  const { error } = await context.supabase.from("cohorts").insert({
    organization_id: context.organization.id,
    program_id: parsed.data.programId,
    code: parsed.data.code,
    name: parsed.data.name,
    starts_on: parsed.data.startsOn,
    ends_on: parsed.data.endsOn,
    capacity: parsed.data.capacity,
    created_by: context.user.id,
  });
  if (error)
    redirect(
      feedbackUrl(
        context.organizationSlug,
        "programas",
        "error",
        databaseMessage(error.code),
      ),
    );

  revalidatePath(`/o/${context.organizationSlug}/programas`);
  redirect(
    feedbackUrl(
      context.organizationSlug,
      "programas",
      "success",
      "Turma criada e pronta para receber startups.",
    ),
  );
}

export async function createStartupAction(
  organizationSlug: string,
  formData: FormData,
) {
  const context = await mutationContext(organizationSlug);
  const parsed = createStartupSchema.safeParse({
    incubatorId: value(formData, "incubatorId"),
    name: value(formData, "name"),
    legalName: value(formData, "legalName"),
    taxId: value(formData, "taxId"),
    sector: value(formData, "sector"),
    businessModel: value(formData, "businessModel"),
    stage: value(formData, "stage"),
    city: value(formData, "city"),
    state: value(formData, "state"),
    websiteUrl: value(formData, "websiteUrl"),
  });
  if (!parsed.success) {
    redirect(
      feedbackUrl(
        context.organizationSlug,
        "startups",
        "error",
        "Confira os dados institucionais da startup.",
      ),
    );
  }

  const { error } = await context.supabase.from("startups").insert({
    organization_id: context.organization.id,
    incubator_id: parsed.data.incubatorId,
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
  });
  if (error)
    redirect(
      feedbackUrl(
        context.organizationSlug,
        "startups",
        "error",
        databaseMessage(error.code),
      ),
    );

  revalidatePath(`/o/${context.organizationSlug}/startups`);
  redirect(
    feedbackUrl(
      context.organizationSlug,
      "startups",
      "success",
      "Startup cadastrada no portfólio.",
    ),
  );
}

export async function addStartupMemberAction(
  organizationSlug: string,
  formData: FormData,
) {
  const context = await mutationContext(organizationSlug);
  const parsed = addStartupMemberSchema.safeParse({
    startupId: value(formData, "startupId"),
    fullName: value(formData, "fullName"),
    email: value(formData, "email"),
    role: value(formData, "role"),
    roleTitle: value(formData, "roleTitle"),
    isRepresentative: formData.get("isRepresentative") === "on",
  });
  if (!parsed.success) {
    redirect(
      feedbackUrl(
        context.organizationSlug,
        "startups",
        "error",
        "Confira os dados do membro da equipe.",
      ),
    );
  }

  const { error } = await context.supabase.from("startup_members").insert({
    organization_id: context.organization.id,
    startup_id: parsed.data.startupId,
    full_name: parsed.data.fullName,
    email: parsed.data.email,
    role: parsed.data.role,
    role_title: parsed.data.roleTitle,
    is_representative: parsed.data.isRepresentative,
    created_by: context.user.id,
  });
  if (error)
    redirect(
      feedbackUrl(
        context.organizationSlug,
        "startups",
        "error",
        databaseMessage(error.code),
      ),
    );

  revalidatePath(`/o/${context.organizationSlug}/startups`);
  redirect(
    feedbackUrl(
      context.organizationSlug,
      "startups",
      "success",
      "Membro adicionado à equipe.",
    ),
  );
}

export async function enrollStartupAction(
  organizationSlug: string,
  formData: FormData,
) {
  const context = await mutationContext(organizationSlug);
  const parsed = enrollStartupSchema.safeParse({
    startupId: value(formData, "startupId"),
    cohortId: value(formData, "cohortId"),
    entryDate: value(formData, "entryDate"),
  });
  if (!parsed.success) {
    redirect(
      feedbackUrl(
        context.organizationSlug,
        "startups",
        "error",
        "Selecione startup, turma e data de entrada.",
      ),
    );
  }

  const { data: currentEnrollment, error: lookupError } = await context.supabase
    .from("startup_enrollments")
    .select("id, cohort_id")
    .eq("organization_id", context.organization.id)
    .eq("startup_id", parsed.data.startupId)
    .in("status", ["invited", "active", "suspended"])
    .order("entry_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lookupError) {
    redirect(
      feedbackUrl(
        context.organizationSlug,
        "startups",
        "error",
        databaseMessage(lookupError.code),
      ),
    );
  }

  const { error } = currentEnrollment
    ? await context.supabase.rpc("transfer_startup_enrollment", {
        target_startup_id: parsed.data.startupId,
        target_cohort_id: parsed.data.cohortId,
        transfer_on: parsed.data.entryDate,
      })
    : await context.supabase.from("startup_enrollments").insert({
        organization_id: context.organization.id,
        startup_id: parsed.data.startupId,
        cohort_id: parsed.data.cohortId,
        entry_date: parsed.data.entryDate,
        created_by: context.user.id,
      });
  if (error)
    redirect(
      feedbackUrl(
        context.organizationSlug,
        "startups",
        "error",
        databaseMessage(error.code),
      ),
    );

  revalidatePath(`/o/${context.organizationSlug}`);
  redirect(
    feedbackUrl(
      context.organizationSlug,
      "startups",
      "success",
      currentEnrollment
        ? "Startup transferida e histórico anterior preservado."
        : "Startup vinculada à turma com histórico preservado.",
    ),
  );
}
