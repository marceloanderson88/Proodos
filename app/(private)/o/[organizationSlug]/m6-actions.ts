"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addStartupMemberSchema,
  createCohortSchema,
  createProgramSchema,
  createProgramTypeSchema,
  createStartupSchema,
  enrollStartupSchema,
  organizationSlugSchema,
  programLifecycleSchema,
  resolveProgramType,
  updateProgramSchema,
} from "@/lib/m6/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ModuleName = "programas" | "startups";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}

function feedbackUrl(
  organizationSlug: string,
  incubatorSlug: string,
  module: ModuleName,
  kind: "success" | "error",
  message: string,
) {
  const search = new URLSearchParams({ [kind]: message });
  const safeIncubatorSlug = organizationSlugSchema.parse(incubatorSlug);
  return `/o/${organizationSlug}/i/${safeIncubatorSlug}/${module}?${search.toString()}`;
}

function databaseMessage(code: string | undefined) {
  if (code === "23505")
    return "Já existe um registro com esse código ou identificador.";
  if (code === "23503")
    return "Um dos vínculos selecionados não está mais disponível.";
  if (code === "42501")
    return "Você não tem permissão para concluir esta operação.";
  if (code === "23514")
    return "O programa já possui uma startup vinculada e deve ser arquivado.";
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

export async function createProgramTypeAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await mutationContext(organizationSlug);
  const rawIncubatorId = value(formData, "incubatorId");
  const parsed = createProgramTypeSchema.safeParse({
    incubatorId: rawIncubatorId || null,
    preset: value(formData, "preset"),
    customName: value(formData, "customName"),
    description: value(formData, "description"),
  });
  if (!parsed.success) {
    redirect(
      feedbackUrl(
        context.organizationSlug,
        incubatorSlug,
        "programas",
        "error",
        "Confira os dados do tipo de programa.",
      ),
    );
  }

  const programType = resolveProgramType(parsed.data);
  const { error } = await context.supabase.from("program_types").insert({
    organization_id: context.organization.id,
    incubator_id: parsed.data.incubatorId,
    code: programType.code,
    name: programType.name,
    description: parsed.data.description,
    created_by: context.user.id,
  });
  if (error)
    redirect(
      feedbackUrl(
        context.organizationSlug,
        incubatorSlug,
        "programas",
        "error",
        databaseMessage(error.code),
      ),
    );

  revalidatePath(`/o/${context.organizationSlug}/programas`);
  redirect(
    feedbackUrl(
      context.organizationSlug,
      incubatorSlug,
      "programas",
      "success",
      "Tipo de programa criado.",
    ),
  );
}

export async function createProgramAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await mutationContext(organizationSlug);
  const parsed = createProgramSchema.safeParse({
    incubatorId: value(formData, "incubatorId"),
    typeId: value(formData, "typeId"),
    name: value(formData, "name"),
    description: value(formData, "description"),
    startsOn: value(formData, "startsOn"),
    endsOn: value(formData, "endsOn"),
  });
  if (!parsed.success) {
    redirect(
      feedbackUrl(
        context.organizationSlug,
        incubatorSlug,
        "programas",
        "error",
        "Confira o período e os demais dados do programa.",
      ),
    );
  }

  const { error } = await context.supabase.from("programs").insert({
    organization_id: context.organization.id,
    incubator_id: parsed.data.incubatorId,
    type_id: parsed.data.typeId,
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
        incubatorSlug,
        "programas",
        "error",
        databaseMessage(error.code),
      ),
    );

  revalidatePath(`/o/${context.organizationSlug}/programas`);
  redirect(
    feedbackUrl(
      context.organizationSlug,
      incubatorSlug,
      "programas",
      "success",
      "Programa criado em rascunho.",
    ),
  );
}

export async function updateProgramAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await mutationContext(organizationSlug);
  const parsed = updateProgramSchema.safeParse({
    programId: value(formData, "programId"),
    incubatorId: value(formData, "incubatorId"),
    typeId: value(formData, "typeId"),
    name: value(formData, "name"),
    description: value(formData, "description"),
    startsOn: value(formData, "startsOn"),
    endsOn: value(formData, "endsOn"),
    status: value(formData, "status"),
  });
  if (!parsed.success) {
    redirect(
      feedbackUrl(
        context.organizationSlug,
        incubatorSlug,
        "programas",
        "error",
        "Confira os dados da edição do programa.",
      ),
    );
  }

  const { data: updatedProgram, error } = await context.supabase
    .from("programs")
    .update({
      type_id: parsed.data.typeId,
      name: parsed.data.name,
      description: parsed.data.description,
      starts_on: parsed.data.startsOn,
      ends_on: parsed.data.endsOn,
      status: parsed.data.status,
    })
    .eq("id", parsed.data.programId)
    .eq("organization_id", context.organization.id)
    .eq("incubator_id", parsed.data.incubatorId)
    .neq("status", "archived")
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error || !updatedProgram)
    redirect(
      feedbackUrl(
        context.organizationSlug,
        incubatorSlug,
        "programas",
        "error",
        databaseMessage(error?.code),
      ),
    );

  revalidatePath(`/o/${context.organizationSlug}/programas`);
  redirect(
    feedbackUrl(
      context.organizationSlug,
      incubatorSlug,
      "programas",
      "success",
      "Programa atualizado.",
    ),
  );
}

export async function manageProgramLifecycleAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await mutationContext(organizationSlug);
  const parsed = programLifecycleSchema.safeParse({
    programId: value(formData, "programId"),
    action: value(formData, "action"),
  });
  if (!parsed.success) {
    redirect(
      feedbackUrl(
        context.organizationSlug,
        incubatorSlug,
        "programas",
        "error",
        "Ação de programa inválida.",
      ),
    );
  }

  const { error } = await context.supabase.rpc("manage_program_lifecycle", {
    target_program_id: parsed.data.programId,
    requested_action: parsed.data.action,
  });
  if (error)
    redirect(
      feedbackUrl(
        context.organizationSlug,
        incubatorSlug,
        "programas",
        "error",
        databaseMessage(error.code),
      ),
    );

  revalidatePath(`/o/${context.organizationSlug}/programas`);
  revalidatePath(`/o/${context.organizationSlug}/startups`);
  redirect(
    feedbackUrl(
      context.organizationSlug,
      incubatorSlug,
      "programas",
      "success",
      parsed.data.action === "delete"
        ? "Programa excluído com segurança."
        : "Programa arquivado com todo o histórico preservado.",
    ),
  );
}

export async function createCohortAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await mutationContext(organizationSlug);
  const parsed = createCohortSchema.safeParse({
    programId: value(formData, "programId"),
    name: value(formData, "name"),
    startsOn: value(formData, "startsOn"),
    endsOn: value(formData, "endsOn"),
    capacity: value(formData, "capacity"),
  });
  if (!parsed.success) {
    redirect(
      feedbackUrl(
        context.organizationSlug,
        incubatorSlug,
        "programas",
        "error",
        "Confira o período e a capacidade da turma.",
      ),
    );
  }

  const { error } = await context.supabase.from("cohorts").insert({
    organization_id: context.organization.id,
    program_id: parsed.data.programId,
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
        incubatorSlug,
        "programas",
        "error",
        databaseMessage(error.code),
      ),
    );

  revalidatePath(`/o/${context.organizationSlug}/programas`);
  redirect(
    feedbackUrl(
      context.organizationSlug,
      incubatorSlug,
      "programas",
      "success",
      "Turma criada e pronta para receber startups.",
    ),
  );
}

export async function createStartupAction(
  organizationSlug: string,
  incubatorSlug: string,
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
        incubatorSlug,
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
        incubatorSlug,
        "startups",
        "error",
        databaseMessage(error.code),
      ),
    );

  revalidatePath(`/o/${context.organizationSlug}/startups`);
  redirect(
    feedbackUrl(
      context.organizationSlug,
      incubatorSlug,
      "startups",
      "success",
      "Startup cadastrada no portfólio.",
    ),
  );
}

export async function addStartupMemberAction(
  organizationSlug: string,
  incubatorSlug: string,
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
        incubatorSlug,
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
        incubatorSlug,
        "startups",
        "error",
        databaseMessage(error.code),
      ),
    );

  revalidatePath(`/o/${context.organizationSlug}/startups`);
  redirect(
    feedbackUrl(
      context.organizationSlug,
      incubatorSlug,
      "startups",
      "success",
      "Membro adicionado à equipe.",
    ),
  );
}

export async function enrollStartupAction(
  organizationSlug: string,
  incubatorSlug: string,
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
        incubatorSlug,
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
        incubatorSlug,
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
        incubatorSlug,
        "startups",
        "error",
        databaseMessage(error.code),
      ),
    );

  revalidatePath(`/o/${context.organizationSlug}`);
  redirect(
    feedbackUrl(
      context.organizationSlug,
      incubatorSlug,
      "startups",
      "success",
      currentEnrollment
        ? "Startup transferida e histórico anterior preservado."
        : "Startup vinculada à turma com histórico preservado.",
    ),
  );
}
