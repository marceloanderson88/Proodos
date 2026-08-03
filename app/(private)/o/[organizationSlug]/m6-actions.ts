"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addStartupMemberSchema,
  createCohortSchema,
  createProgramSchema,
  createStartupSchema,
  enrollStartupSchema,
  organizationSlugSchema,
  manageProgramMemberSchema,
  programLifecycleSchema,
  removeProgramMemberSchema,
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

async function mutationIncubatorContext(
  organizationSlug: string,
  incubatorSlug: string,
) {
  const context = await mutationContext(organizationSlug);
  const safeIncubatorSlug = organizationSlugSchema.parse(incubatorSlug);
  const { data: incubator } = await context.supabase
    .from("incubators")
    .select("id, slug")
    .eq("organization_id", context.organization.id)
    .eq("slug", safeIncubatorSlug)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (!incubator) redirect("/o");
  return { ...context, incubator };
}

type IncubatorMutationContext = Awaited<
  ReturnType<typeof mutationIncubatorContext>
>;

async function programBelongsToCurrentIncubator(
  context: IncubatorMutationContext,
  programId: string,
) {
  const { data } = await context.supabase
    .from("programs")
    .select("id")
    .eq("id", programId)
    .eq("organization_id", context.organization.id)
    .eq("incubator_id", context.incubator.id)
    .is("deleted_at", null)
    .maybeSingle();
  return Boolean(data);
}

async function startupBelongsToCurrentIncubator(
  context: IncubatorMutationContext,
  startupId: string,
) {
  const { data } = await context.supabase
    .from("startups")
    .select("id")
    .eq("id", startupId)
    .eq("organization_id", context.organization.id)
    .eq("incubator_id", context.incubator.id)
    .is("deleted_at", null)
    .maybeSingle();
  return Boolean(data);
}

async function cohortBelongsToCurrentIncubator(
  context: IncubatorMutationContext,
  cohortId: string,
) {
  const { data: cohort } = await context.supabase
    .from("cohorts")
    .select("program_id")
    .eq("id", cohortId)
    .eq("organization_id", context.organization.id)
    .is("deleted_at", null)
    .maybeSingle();
  return cohort
    ? programBelongsToCurrentIncubator(context, cohort.program_id)
    : false;
}

async function resolveIncubatorProgramType(
  context: Awaited<ReturnType<typeof mutationIncubatorContext>>,
  preset: "pre_incubation" | "incubation" | "acceleration" | "other",
  customName: string | null,
) {
  const programType = resolveProgramType({
    preset,
    customName,
    description: null,
  });
  const { data: existing } = await context.supabase
    .from("program_types")
    .select("id")
    .eq("organization_id", context.organization.id)
    .eq("incubator_id", context.incubator.id)
    .eq("code", programType.code)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await context.supabase
    .from("program_types")
    .insert({
      organization_id: context.organization.id,
      incubator_id: context.incubator.id,
      code: programType.code,
      name: programType.name,
      created_by: context.user.id,
    })
    .select("id")
    .single();
  if (!error && created) return created.id;
  if (error?.code !== "23505") throw error;

  const { data: raced, error: racedError } = await context.supabase
    .from("program_types")
    .select("id")
    .eq("organization_id", context.organization.id)
    .eq("incubator_id", context.incubator.id)
    .eq("code", programType.code)
    .single();
  if (racedError || !raced) throw racedError;
  return raced.id;
}

const logoMimeExtensions: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function logoFile(formData: FormData) {
  const candidate = formData.get("logo");
  if (!(candidate instanceof File) || candidate.size === 0) return null;
  if (!logoMimeExtensions[candidate.type] || candidate.size > 2 * 1024 * 1024)
    return "invalid" as const;
  return candidate;
}

async function uploadProgramLogo(
  context: Awaited<ReturnType<typeof mutationIncubatorContext>>,
  programId: string,
  file: File,
) {
  const extension = logoMimeExtensions[file.type];
  const path = `${context.organization.id}/${context.incubator.id}/${programId}/logo-${randomUUID()}.${extension}`;
  const { error } = await context.supabase.storage
    .from("program-logos")
    .upload(path, new Uint8Array(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: false,
    });
  if (error) throw error;
  return path;
}

export async function createProgramAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await mutationIncubatorContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = createProgramSchema.safeParse({
    preset: value(formData, "preset"),
    customName: value(formData, "customName"),
    name: value(formData, "name"),
    description: value(formData, "description"),
    objectives: value(formData, "objectives"),
    targetAudience: value(formData, "targetAudience"),
    deliveryMode: value(formData, "deliveryMode"),
    durationWeeks: value(formData, "durationWeeks"),
    suggestedCapacity: value(formData, "suggestedCapacity"),
    startsOn: value(formData, "startsOn"),
    endsOn: value(formData, "endsOn"),
    isActive: formData.get("isActive") === "on",
  });
  const logo = logoFile(formData);
  if (!parsed.success || logo === "invalid") {
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

  let typeId: string;
  try {
    typeId = await resolveIncubatorProgramType(
      context,
      parsed.data.preset,
      parsed.data.customName,
    );
  } catch {
    redirect(
      feedbackUrl(
        context.organizationSlug,
        incubatorSlug,
        "programas",
        "error",
        "Não foi possível preparar o tipo do programa.",
      ),
    );
  }

  const { data: createdProgram, error } = await context.supabase
    .from("programs")
    .insert({
      code: "",
      organization_id: context.organization.id,
      incubator_id: context.incubator.id,
      type_id: typeId,
      name: parsed.data.name,
      description: parsed.data.description,
      objectives: parsed.data.objectives,
      target_audience: parsed.data.targetAudience,
      delivery_mode: parsed.data.deliveryMode,
      duration_weeks: parsed.data.durationWeeks,
      suggested_capacity: parsed.data.suggestedCapacity,
      starts_on: parsed.data.startsOn,
      ends_on: parsed.data.endsOn,
      status: parsed.data.isActive ? "active" : "draft",
      created_by: context.user.id,
    })
    .select("id")
    .single();
  if (error || !createdProgram)
    redirect(
      feedbackUrl(
        context.organizationSlug,
        incubatorSlug,
        "programas",
        "error",
        databaseMessage(error.code),
      ),
    );

  if (logo) {
    try {
      const logoPath = await uploadProgramLogo(
        context,
        createdProgram.id,
        logo,
      );
      const { error: logoUpdateError } = await context.supabase
        .from("programs")
        .update({ logo_path: logoPath })
        .eq("id", createdProgram.id)
        .eq("incubator_id", context.incubator.id);
      if (logoUpdateError) throw logoUpdateError;
    } catch {
      await context.supabase.rpc("manage_program_lifecycle", {
        target_program_id: createdProgram.id,
        requested_action: "delete",
      });
      redirect(
        feedbackUrl(
          context.organizationSlug,
          incubatorSlug,
          "programas",
          "error",
          "A logo não pôde ser enviada. O programa não foi mantido.",
        ),
      );
    }
  }

  revalidatePath(`/o/${context.organizationSlug}/i/${incubatorSlug}/programas`);
  redirect(
    feedbackUrl(
      context.organizationSlug,
      incubatorSlug,
      "programas",
      "success",
      parsed.data.isActive
        ? "Programa publicado e disponível para novas turmas."
        : "Programa salvo como rascunho.",
    ),
  );
}

export async function updateProgramAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await mutationIncubatorContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = updateProgramSchema.safeParse({
    programId: value(formData, "programId"),
    preset: value(formData, "preset"),
    customName: value(formData, "customName"),
    name: value(formData, "name"),
    description: value(formData, "description"),
    objectives: value(formData, "objectives"),
    targetAudience: value(formData, "targetAudience"),
    deliveryMode: value(formData, "deliveryMode"),
    durationWeeks: value(formData, "durationWeeks"),
    suggestedCapacity: value(formData, "suggestedCapacity"),
    startsOn: value(formData, "startsOn"),
    endsOn: value(formData, "endsOn"),
    isActive: formData.get("isActive") === "on",
    removeLogo: formData.get("removeLogo") === "on",
  });
  const logo = logoFile(formData);
  if (!parsed.success || logo === "invalid") {
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

  let typeId: string;
  try {
    typeId = await resolveIncubatorProgramType(
      context,
      parsed.data.preset,
      parsed.data.customName,
    );
  } catch {
    redirect(
      feedbackUrl(
        context.organizationSlug,
        incubatorSlug,
        "programas",
        "error",
        "Não foi possível preparar o tipo do programa.",
      ),
    );
  }

  const { data: currentProgram } = await context.supabase
    .from("programs")
    .select("logo_path")
    .eq("id", parsed.data.programId)
    .eq("organization_id", context.organization.id)
    .eq("incubator_id", context.incubator.id)
    .is("deleted_at", null)
    .maybeSingle();
  let nextLogoPath = parsed.data.removeLogo ? null : currentProgram?.logo_path;
  if (logo) {
    try {
      nextLogoPath = await uploadProgramLogo(
        context,
        parsed.data.programId,
        logo,
      );
    } catch {
      redirect(
        feedbackUrl(
          context.organizationSlug,
          incubatorSlug,
          "programas",
          "error",
          "A nova logo não pôde ser enviada.",
        ),
      );
    }
  }

  const { data: updatedProgram, error } = await context.supabase
    .from("programs")
    .update({
      type_id: typeId,
      name: parsed.data.name,
      description: parsed.data.description,
      objectives: parsed.data.objectives,
      target_audience: parsed.data.targetAudience,
      delivery_mode: parsed.data.deliveryMode,
      duration_weeks: parsed.data.durationWeeks,
      suggested_capacity: parsed.data.suggestedCapacity,
      starts_on: parsed.data.startsOn,
      ends_on: parsed.data.endsOn,
      status: parsed.data.isActive ? "active" : "draft",
      logo_path: nextLogoPath ?? null,
    })
    .eq("id", parsed.data.programId)
    .eq("organization_id", context.organization.id)
    .eq("incubator_id", context.incubator.id)
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

  if (
    currentProgram?.logo_path &&
    currentProgram.logo_path !== nextLogoPath &&
    (parsed.data.removeLogo || logo)
  ) {
    await context.supabase.storage
      .from("program-logos")
      .remove([currentProgram.logo_path]);
  }

  revalidatePath(`/o/${context.organizationSlug}/i/${incubatorSlug}/programas`);
  revalidatePath(
    `/o/${context.organizationSlug}/i/${incubatorSlug}/programas/${parsed.data.programId}`,
  );
  redirect(
    `/o/${context.organizationSlug}/i/${incubatorSlug}/programas/${parsed.data.programId}?success=${encodeURIComponent("Programa atualizado.")}`,
  );
}

export async function manageProgramLifecycleAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await mutationIncubatorContext(
    organizationSlug,
    incubatorSlug,
  );
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

  if (!(await programBelongsToCurrentIncubator(context, parsed.data.programId)))
    redirect(
      feedbackUrl(
        context.organizationSlug,
        incubatorSlug,
        "programas",
        "error",
        "O programa não pertence à incubadora atual.",
      ),
    );

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

  revalidatePath(`/o/${context.organizationSlug}/i/${incubatorSlug}/programas`);
  revalidatePath(`/o/${context.organizationSlug}/i/${incubatorSlug}/startups`);
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

export async function addProgramMemberAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await mutationIncubatorContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = manageProgramMemberSchema.safeParse({
    programId: value(formData, "programId"),
    userId: value(formData, "userId"),
    role: value(formData, "role"),
  });
  if (
    !parsed.success ||
    !(await programBelongsToCurrentIncubator(context, parsed.data.programId))
  ) {
    redirect(
      feedbackUrl(
        context.organizationSlug,
        incubatorSlug,
        "programas",
        "error",
        "Pessoa, papel ou programa inválido.",
      ),
    );
  }
  const { error } = await context.supabase.from("program_members").insert({
    organization_id: context.organization.id,
    program_id: parsed.data.programId,
    user_id: parsed.data.userId,
    role: parsed.data.role,
    created_by: context.user.id,
  });
  if (error)
    redirect(
      feedbackUrl(
        context.organizationSlug,
        incubatorSlug,
        "programas",
        "error",
        error.code === "23505"
          ? "Essa pessoa já participa do programa."
          : databaseMessage(error.code),
      ),
    );
  revalidatePath(
    `/o/${context.organizationSlug}/i/${incubatorSlug}/programas/${parsed.data.programId}`,
  );
  redirect(
    `/o/${context.organizationSlug}/i/${incubatorSlug}/programas/${parsed.data.programId}?success=${encodeURIComponent("Pessoa adicionada à equipe do programa.")}`,
  );
}

export async function removeProgramMemberAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await mutationIncubatorContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = removeProgramMemberSchema.safeParse({
    programId: value(formData, "programId"),
    programMemberId: value(formData, "programMemberId"),
  });
  if (
    !parsed.success ||
    !(await programBelongsToCurrentIncubator(context, parsed.data.programId))
  )
    redirect(
      feedbackUrl(
        context.organizationSlug,
        incubatorSlug,
        "programas",
        "error",
        "Vínculo inválido.",
      ),
    );
  const { error } = await context.supabase
    .from("program_members")
    .delete()
    .eq("id", parsed.data.programMemberId)
    .eq("organization_id", context.organization.id)
    .eq("program_id", parsed.data.programId);
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
  revalidatePath(
    `/o/${context.organizationSlug}/i/${incubatorSlug}/programas/${parsed.data.programId}`,
  );
  redirect(
    `/o/${context.organizationSlug}/i/${incubatorSlug}/programas/${parsed.data.programId}?success=${encodeURIComponent("Pessoa removida da equipe do programa.")}`,
  );
}

export async function createCohortAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await mutationIncubatorContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = createCohortSchema.safeParse({
    programId: value(formData, "programId"),
    name: value(formData, "name"),
    launchesOn: value(formData, "launchesOn"),
    enrollmentStartsOn: value(formData, "enrollmentStartsOn"),
    enrollmentEndsOn: value(formData, "enrollmentEndsOn"),
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

  if (!(await programBelongsToCurrentIncubator(context, parsed.data.programId)))
    redirect(
      feedbackUrl(
        context.organizationSlug,
        incubatorSlug,
        "programas",
        "error",
        "O programa selecionado não pertence à incubadora atual.",
      ),
    );

  const { error } = await context.supabase.from("cohorts").insert({
    code: "",
    organization_id: context.organization.id,
    program_id: parsed.data.programId,
    name: parsed.data.name,
    launches_on: parsed.data.launchesOn,
    enrollment_starts_on: parsed.data.enrollmentStartsOn,
    enrollment_ends_on: parsed.data.enrollmentEndsOn,
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

  revalidatePath(`/o/${context.organizationSlug}/i/${incubatorSlug}/programas`);
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
  const context = await mutationIncubatorContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = createStartupSchema.safeParse({
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

  revalidatePath(`/o/${context.organizationSlug}/i/${incubatorSlug}/startups`);
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
  const context = await mutationIncubatorContext(
    organizationSlug,
    incubatorSlug,
  );
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

  if (!(await startupBelongsToCurrentIncubator(context, parsed.data.startupId)))
    redirect(
      feedbackUrl(
        context.organizationSlug,
        incubatorSlug,
        "startups",
        "error",
        "A startup selecionada não pertence à incubadora atual.",
      ),
    );

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

  revalidatePath(`/o/${context.organizationSlug}/i/${incubatorSlug}/startups`);
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
  const context = await mutationIncubatorContext(
    organizationSlug,
    incubatorSlug,
  );
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

  const [startupIsLocal, cohortIsLocal] = await Promise.all([
    startupBelongsToCurrentIncubator(context, parsed.data.startupId),
    cohortBelongsToCurrentIncubator(context, parsed.data.cohortId),
  ]);
  if (!startupIsLocal || !cohortIsLocal)
    redirect(
      feedbackUrl(
        context.organizationSlug,
        incubatorSlug,
        "startups",
        "error",
        "Startup e turma devem pertencer à incubadora atual.",
      ),
    );

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

  revalidatePath(`/o/${context.organizationSlug}/i/${incubatorSlug}/startups`);
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
