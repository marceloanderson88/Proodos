"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { dispatchPendingNotifications } from "@/lib/notifications/dispatcher";
import {
  bookMentoringRoundSessionSchema,
  createMentorAvailabilitySchema,
  createMentorAssignmentSchema,
  createMentorProfileSchema,
  createMentoringNoteSchema,
  createMentoringFeedbackSchema,
  createMentoringRecommendationSchema,
  createMentoringSessionSchema,
  createMentoringRoundSchema,
  deleteMentorAvailabilitySchema,
  inviteCohortMentorSchema,
  parseCommaSeparatedList,
  updateMentorAssignmentStatusSchema,
  updateMentoringSessionStatusSchema,
  rescheduleMentoringSessionSchema,
  respondCohortMentorInvitationSchema,
  setMentoringRoundMentorSchema,
  setMentoringRoundStatusSchema,
  updateMentoringRecommendationSchema,
  updateMentorProfileSchema,
  updateMentorProfileStatusSchema,
} from "@/lib/mentoring/schemas";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}

function mentoringUrl(
  organizationSlug: string,
  incubatorSlug: string,
  kind?: "success" | "error",
  message?: string,
) {
  const base = `/o/${organizationSlug}/i/${incubatorSlug}/mentorias`;
  return kind && message
    ? `${base}?${kind}=${encodeURIComponent(message)}`
    : base;
}

function mentoringSessionUrl(
  organizationSlug: string,
  incubatorSlug: string,
  sessionId: string,
  kind?: "success" | "error",
  message?: string,
) {
  const base = `${mentoringUrl(organizationSlug, incubatorSlug)}/sessoes/${sessionId}`;
  return kind && message
    ? `${base}?${kind}=${encodeURIComponent(message)}`
    : base;
}

function mentoringViewUrl(
  organizationSlug: string,
  incubatorSlug: string,
  view: "rodadas" | "equipe" | "agenda",
  kind?: "success" | "error",
  message?: string,
) {
  const query = new URLSearchParams({ view });
  if (kind && message) query.set(kind, message);
  return `${mentoringUrl(organizationSlug, incubatorSlug)}?${query}`;
}

function refreshMentoring(organizationSlug: string, incubatorSlug: string) {
  revalidatePath(mentoringUrl(organizationSlug, incubatorSlug));
  revalidatePath(
    `/o/${organizationSlug}/i/${incubatorSlug}/mentorias/sessoes/[sessionId]`,
    "page",
  );
}

export async function createMentoringRoundAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = createMentoringRoundSchema.safeParse({
    cohortId: value(formData, "cohortId"),
    name: value(formData, "name"),
    description: value(formData, "description"),
    bookingOpensAt: value(formData, "bookingOpensAt"),
    bookingClosesAt: value(formData, "bookingClosesAt"),
    sessionsStartAt: value(formData, "sessionsStartAt"),
    sessionsEndAt: value(formData, "sessionsEndAt"),
    timezone: value(formData, "timezone") || context.incubator.timezone,
    maxSessions: value(formData, "maxSessions") || "1",
    openNow: value(formData, "openNow") || "false",
  });
  if (!parsed.success)
    redirect(
      mentoringViewUrl(
        organizationSlug,
        incubatorSlug,
        "rodadas",
        "error",
        parsed.error.issues[0]?.message ?? "Rodada inválida.",
      ),
    );
  const { error } = await context.supabase.rpc("create_mentoring_round", {
    target_organization_id: context.organization.id,
    target_incubator_id: context.incubator.id,
    target_cohort_id: parsed.data.cohortId,
    round_name: parsed.data.name,
    round_description: parsed.data.description,
    booking_opens_local: parsed.data.bookingOpensAt,
    booking_closes_local: parsed.data.bookingClosesAt,
    sessions_start_local: parsed.data.sessionsStartAt,
    sessions_end_local: parsed.data.sessionsEndAt,
    round_timezone: parsed.data.timezone,
    max_sessions: parsed.data.maxSessions,
    open_now: parsed.data.openNow === "true",
  });
  if (error)
    redirect(
      mentoringViewUrl(
        organizationSlug,
        incubatorSlug,
        "rodadas",
        "error",
        error.message,
      ),
    );
  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringViewUrl(
      organizationSlug,
      incubatorSlug,
      "rodadas",
      "success",
      "Rodada criada. Associe os mentores da turma antes de abrir as reservas.",
    ),
  );
}

export async function inviteCohortMentorAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = inviteCohortMentorSchema.safeParse({
    cohortId: value(formData, "cohortId"),
    mentorProfileId: value(formData, "mentorProfileId"),
  });
  if (!parsed.success)
    redirect(
      mentoringViewUrl(
        organizationSlug,
        incubatorSlug,
        "equipe",
        "error",
        "Selecione a turma e o mentor.",
      ),
    );
  const { error } = await context.supabase.rpc("invite_mentor_to_cohort", {
    target_cohort_id: parsed.data.cohortId,
    target_mentor_profile_id: parsed.data.mentorProfileId,
  });
  if (error)
    redirect(
      mentoringViewUrl(
        organizationSlug,
        incubatorSlug,
        "equipe",
        "error",
        error.message,
      ),
    );
  let notice = " Convite registrado na plataforma.";
  try {
    const dispatched = await dispatchPendingNotifications({
      organizationId: context.organization.id,
      kinds: ["mentoring.cohort_invitation"],
    });
    notice = dispatched.configured
      ? ` ${dispatched.sent} e-mail(s) enviado(s).`
      : " O e-mail ficou na fila até a configuração do provedor.";
  } catch {
    notice = " O e-mail foi preservado na fila para nova tentativa.";
  }
  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringViewUrl(
      organizationSlug,
      incubatorSlug,
      "equipe",
      "success",
      `Mentor convidado para a equipe da turma.${notice}`,
    ),
  );
}

export async function respondCohortMentorInvitationAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const parsed = respondCohortMentorInvitationSchema.safeParse({
    teamId: value(formData, "teamId"),
    accept: value(formData, "accept"),
  });
  if (!parsed.success)
    redirect(
      mentoringViewUrl(
        organizationSlug,
        incubatorSlug,
        "equipe",
        "error",
        "Convite inválido.",
      ),
    );
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const { error } = await context.supabase.rpc(
    "respond_mentor_cohort_invitation",
    {
      target_team_id: parsed.data.teamId,
      accept_invitation: parsed.data.accept === "true",
    },
  );
  if (error)
    redirect(
      mentoringViewUrl(
        organizationSlug,
        incubatorSlug,
        "equipe",
        "error",
        error.message,
      ),
    );
  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringViewUrl(
      organizationSlug,
      incubatorSlug,
      "equipe",
      "success",
      parsed.data.accept === "true" ? "Convite aceito." : "Convite recusado.",
    ),
  );
}

export async function setMentoringRoundMentorAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const parsed = setMentoringRoundMentorSchema.safeParse({
    roundId: value(formData, "roundId"),
    cohortMentorId: value(formData, "cohortMentorId"),
    enabled: value(formData, "enabled"),
  });
  if (!parsed.success)
    redirect(
      mentoringViewUrl(
        organizationSlug,
        incubatorSlug,
        "rodadas",
        "error",
        "Associação inválida.",
      ),
    );
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const { error } = await context.supabase.rpc("set_mentoring_round_mentor", {
    target_round_id: parsed.data.roundId,
    target_cohort_mentor_id: parsed.data.cohortMentorId,
    enabled: parsed.data.enabled === "true",
  });
  if (error)
    redirect(
      mentoringViewUrl(
        organizationSlug,
        incubatorSlug,
        "rodadas",
        "error",
        error.message,
      ),
    );
  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringViewUrl(
      organizationSlug,
      incubatorSlug,
      "rodadas",
      "success",
      "Equipe da rodada atualizada.",
    ),
  );
}

export async function setMentoringRoundStatusAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const parsed = setMentoringRoundStatusSchema.safeParse({
    roundId: value(formData, "roundId"),
    status: value(formData, "status"),
  });
  if (!parsed.success)
    redirect(
      mentoringViewUrl(
        organizationSlug,
        incubatorSlug,
        "rodadas",
        "error",
        "Status inválido.",
      ),
    );
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const { error } = await context.supabase.rpc("set_mentoring_round_status", {
    target_round_id: parsed.data.roundId,
    requested_status: parsed.data.status,
  });
  if (error)
    redirect(
      mentoringViewUrl(
        organizationSlug,
        incubatorSlug,
        "rodadas",
        "error",
        error.message,
      ),
    );
  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringViewUrl(
      organizationSlug,
      incubatorSlug,
      "rodadas",
      "success",
      "Status da rodada atualizado.",
    ),
  );
}

export async function bookMentoringRoundSessionAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const parsed = bookMentoringRoundSessionSchema.safeParse({
    roundId: value(formData, "roundId"),
    assignmentId: value(formData, "assignmentId"),
    objective: value(formData, "objective"),
    mode: value(formData, "mode"),
    timezone: value(formData, "timezone"),
    scheduledStartAt: value(formData, "scheduledStartAt"),
    scheduledEndAt: value(formData, "scheduledEndAt"),
    meetingUrl: value(formData, "meetingUrl"),
    location: value(formData, "location"),
  });
  if (!parsed.success)
    redirect(
      mentoringViewUrl(
        organizationSlug,
        incubatorSlug,
        "rodadas",
        "error",
        parsed.error.issues[0]?.message ?? "Agendamento inválido.",
      ),
    );
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const { error } = await context.supabase.rpc("book_mentoring_round_session", {
    target_round_id: parsed.data.roundId,
    target_assignment_id: parsed.data.assignmentId,
    session_objective: parsed.data.objective,
    session_mode: parsed.data.mode,
    session_timezone: parsed.data.timezone,
    scheduled_start_local: parsed.data.scheduledStartAt,
    scheduled_end_local: parsed.data.scheduledEndAt,
    session_meeting_url: parsed.data.meetingUrl,
    session_location: parsed.data.location,
  });
  if (error)
    redirect(
      mentoringViewUrl(
        organizationSlug,
        incubatorSlug,
        "rodadas",
        "error",
        error.message,
      ),
    );
  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringViewUrl(
      organizationSlug,
      incubatorSlug,
      "rodadas",
      "success",
      "Mentoria agendada dentro da rodada.",
    ),
  );
}

export async function createMentorProfileAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = createMentorProfileSchema.safeParse({
    userId: value(formData, "userId"),
    headline: value(formData, "headline"),
    bio: value(formData, "bio"),
    timezone: value(formData, "timezone") || context.incubator.timezone,
    linkedinUrl: value(formData, "linkedinUrl"),
    specialties: parseCommaSeparatedList(value(formData, "specialties")),
    segments: parseCommaSeparatedList(value(formData, "segments")),
  });
  if (!parsed.success) {
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        parsed.error.issues[0]?.message ?? "Perfil de mentor inválido.",
      ),
    );
  }

  const { error } = await context.supabase.rpc("create_mentor_profile", {
    target_organization_id: context.organization.id,
    target_incubator_id: context.incubator.id,
    mentor_user_id: parsed.data.userId,
    profile_headline: parsed.data.headline,
    profile_bio: parsed.data.bio,
    profile_timezone: parsed.data.timezone,
    profile_linkedin_url: parsed.data.linkedinUrl,
    specialty_names: parsed.data.specialties,
    segment_names: parsed.data.segments,
  });
  if (error) {
    const message =
      error.code === "23505"
        ? "Essa pessoa já possui um perfil de mentor nesta incubadora."
        : error.code === "23514"
          ? "A pessoa precisa ter o papel Mentor ativo nesta incubadora."
          : "Não foi possível cadastrar o perfil de mentor.";
    redirect(mentoringUrl(organizationSlug, incubatorSlug, "error", message));
  }

  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringUrl(
      organizationSlug,
      incubatorSlug,
      "success",
      "Perfil de mentor criado com especialidades e segmentos.",
    ),
  );
}

export async function createMentorAssignmentAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = createMentorAssignmentSchema.safeParse({
    mentorProfileId: value(formData, "mentorProfileId"),
    startupId: value(formData, "startupId"),
    startsOn: value(formData, "startsOn"),
    endsOn: value(formData, "endsOn"),
    focus: value(formData, "focus"),
  });
  if (!parsed.success) {
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        parsed.error.issues[0]?.message ?? "Vínculo inválido.",
      ),
    );
  }

  const { error } = await context.supabase
    .from("mentor_startup_assignments")
    .insert({
      organization_id: context.organization.id,
      incubator_id: context.incubator.id,
      mentor_profile_id: parsed.data.mentorProfileId,
      startup_id: parsed.data.startupId,
      starts_on: parsed.data.startsOn,
      ends_on: parsed.data.endsOn,
      focus: parsed.data.focus,
      created_by: context.user.id,
    });
  if (error) {
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        error.code === "23505"
          ? "Já existe um vínculo ativo entre esse mentor e essa startup."
          : "Não foi possível vincular o mentor à startup.",
      ),
    );
  }

  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringUrl(
      organizationSlug,
      incubatorSlug,
      "success",
      "Mentor vinculado à startup.",
    ),
  );
}

export async function updateMentorProfileAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = updateMentorProfileSchema.safeParse({
    profileId: value(formData, "profileId"),
    userId: value(formData, "userId"),
    headline: value(formData, "headline"),
    bio: value(formData, "bio"),
    timezone: value(formData, "timezone") || context.incubator.timezone,
    linkedinUrl: value(formData, "linkedinUrl"),
    specialties: parseCommaSeparatedList(value(formData, "specialties")),
    segments: parseCommaSeparatedList(value(formData, "segments")),
  });
  if (!parsed.success) {
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        parsed.error.issues[0]?.message ?? "Perfil de mentor inválido.",
      ),
    );
  }

  const { error } = await context.supabase.rpc("update_mentor_profile", {
    target_profile_id: parsed.data.profileId,
    profile_headline: parsed.data.headline,
    profile_bio: parsed.data.bio,
    profile_timezone: parsed.data.timezone,
    profile_linkedin_url: parsed.data.linkedinUrl,
    specialty_names: parsed.data.specialties,
    segment_names: parsed.data.segments,
  });
  if (error) {
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Não foi possível atualizar o perfil do mentor.",
      ),
    );
  }

  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringUrl(
      organizationSlug,
      incubatorSlug,
      "success",
      "Perfil de mentor atualizado.",
    ),
  );
}

export async function updateMentorProfileStatusAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = updateMentorProfileStatusSchema.safeParse({
    profileId: value(formData, "profileId"),
    status: value(formData, "status"),
  });
  if (!parsed.success) {
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Perfil de mentor inválido.",
      ),
    );
  }

  const { error } = await context.supabase.rpc("set_mentor_profile_status", {
    target_profile_id: parsed.data.profileId,
    requested_status: parsed.data.status,
  });
  if (error) {
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        error.code === "23514"
          ? "Encerre os vínculos ativos antes de inativar o mentor."
          : "Não foi possível alterar o status do mentor.",
      ),
    );
  }

  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringUrl(
      organizationSlug,
      incubatorSlug,
      "success",
      parsed.data.status === "active"
        ? "Mentor reativado."
        : "Mentor inativado.",
    ),
  );
}

export async function updateMentorAssignmentStatusAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = updateMentorAssignmentStatusSchema.safeParse({
    assignmentId: value(formData, "assignmentId"),
    action: value(formData, "action"),
  });
  if (!parsed.success) {
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Vínculo inválido.",
      ),
    );
  }

  const nextStatus =
    parsed.data.action === "pause"
      ? ("paused" as const)
      : parsed.data.action === "resume"
        ? ("active" as const)
        : ("ended" as const);
  const { error } = await context.supabase.rpc(
    "update_mentor_assignment_status",
    {
      target_assignment_id: parsed.data.assignmentId,
      requested_status: nextStatus,
    },
  );
  if (error) {
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Não foi possível atualizar o vínculo.",
      ),
    );
  }

  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringUrl(
      organizationSlug,
      incubatorSlug,
      "success",
      parsed.data.action === "end"
        ? "Acompanhamento encerrado."
        : parsed.data.action === "pause"
          ? "Acompanhamento pausado."
          : "Acompanhamento retomado.",
    ),
  );
}

export async function createMentorAvailabilityAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = createMentorAvailabilitySchema.safeParse({
    mentorProfileId: value(formData, "mentorProfileId"),
    weekday: value(formData, "weekday"),
    startsAt: value(formData, "startsAt"),
    endsAt: value(formData, "endsAt"),
    timezone: value(formData, "timezone") || context.incubator.timezone,
    effectiveFrom: value(formData, "effectiveFrom"),
    effectiveUntil: value(formData, "effectiveUntil"),
  });
  if (!parsed.success)
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        parsed.error.issues[0]?.message ?? "Disponibilidade inválida.",
      ),
    );
  const { error } = await context.supabase
    .from("mentor_availability_slots")
    .insert({
      organization_id: context.organization.id,
      incubator_id: context.incubator.id,
      mentor_profile_id: parsed.data.mentorProfileId,
      weekday: parsed.data.weekday,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      timezone: parsed.data.timezone,
      effective_from: parsed.data.effectiveFrom,
      effective_until: parsed.data.effectiveUntil,
      created_by: context.user.id,
    });
  if (error)
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Não foi possível registrar a disponibilidade.",
      ),
    );
  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringUrl(
      organizationSlug,
      incubatorSlug,
      "success",
      "Disponibilidade adicionada.",
    ),
  );
}

export async function deleteMentorAvailabilityAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = deleteMentorAvailabilitySchema.safeParse({
    availabilityId: value(formData, "availabilityId"),
  });
  if (!parsed.success)
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Disponibilidade inválida.",
      ),
    );
  const { error } = await context.supabase
    .from("mentor_availability_slots")
    .delete()
    .eq("organization_id", context.organization.id)
    .eq("incubator_id", context.incubator.id)
    .eq("id", parsed.data.availabilityId);
  if (error)
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Não foi possível remover a disponibilidade.",
      ),
    );
  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringUrl(
      organizationSlug,
      incubatorSlug,
      "success",
      "Disponibilidade removida.",
    ),
  );
}

export async function createMentoringSessionAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = createMentoringSessionSchema.safeParse({
    assignmentId: value(formData, "assignmentId"),
    diagnosticAssessmentId: value(formData, "diagnosticAssessmentId"),
    objective: value(formData, "objective"),
    mode: value(formData, "mode"),
    timezone: value(formData, "timezone") || context.incubator.timezone,
    scheduledStartAt: value(formData, "scheduledStartAt"),
    scheduledEndAt: value(formData, "scheduledEndAt"),
    meetingUrl: value(formData, "meetingUrl"),
    location: value(formData, "location"),
  });
  if (!parsed.success)
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        parsed.error.issues[0]?.message ?? "Sessão inválida.",
      ),
    );
  const { data: sessionId, error } = await context.supabase.rpc(
    "create_mentoring_session",
    {
      target_assignment_id: parsed.data.assignmentId,
      target_diagnostic_assessment_id: parsed.data.diagnosticAssessmentId,
      session_objective: parsed.data.objective,
      session_mode: parsed.data.mode,
      session_timezone: parsed.data.timezone,
      scheduled_start_local: parsed.data.scheduledStartAt,
      scheduled_end_local: parsed.data.scheduledEndAt,
      session_meeting_url: parsed.data.meetingUrl,
      session_location: parsed.data.location,
    },
  );
  if (error)
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        error.code === "23P01"
          ? "O mentor já possui sessão nesse horário."
          : "Não foi possível criar a sessão.",
      ),
    );
  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringSessionUrl(
      organizationSlug,
      incubatorSlug,
      sessionId,
      "success",
      "Sessão registrada na agenda.",
    ),
  );
}

export async function updateMentoringSessionStatusAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = updateMentoringSessionStatusSchema.safeParse({
    sessionId: value(formData, "sessionId"),
    status: value(formData, "status"),
    reason: value(formData, "reason"),
  });
  if (
    !parsed.success ||
    (parsed.data.status === "cancelled" && !parsed.data.reason)
  )
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Informe os dados necessários para atualizar a sessão.",
      ),
    );
  const { error } = await context.supabase.rpc(
    "update_mentoring_session_status",
    {
      target_session_id: parsed.data.sessionId,
      requested_status: parsed.data.status,
      reason: parsed.data.reason,
    },
  );
  if (error)
    redirect(
      mentoringSessionUrl(
        organizationSlug,
        incubatorSlug,
        parsed.data.sessionId,
        "error",
        "Não foi possível atualizar a sessão. Verifique o horário e o status atual.",
      ),
    );
  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringSessionUrl(
      organizationSlug,
      incubatorSlug,
      parsed.data.sessionId,
      "success",
      parsed.data.status === "completed"
        ? "Sessão concluída."
        : parsed.data.status === "cancelled"
          ? "Sessão cancelada."
          : "Sessão confirmada.",
    ),
  );
}

export async function rescheduleMentoringSessionAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = rescheduleMentoringSessionSchema.safeParse({
    sessionId: value(formData, "sessionId"),
    timezone: value(formData, "timezone") || context.incubator.timezone,
    scheduledStartAt: value(formData, "scheduledStartAt"),
    scheduledEndAt: value(formData, "scheduledEndAt"),
  });
  if (!parsed.success)
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        parsed.error.issues[0]?.message ?? "Horário inválido.",
      ),
    );
  const { error } = await context.supabase.rpc("reschedule_mentoring_session", {
    target_session_id: parsed.data.sessionId,
    scheduled_start_local: parsed.data.scheduledStartAt,
    scheduled_end_local: parsed.data.scheduledEndAt,
    session_timezone: parsed.data.timezone,
  });
  if (error)
    redirect(
      mentoringSessionUrl(
        organizationSlug,
        incubatorSlug,
        parsed.data.sessionId,
        "error",
        error.code === "23P01"
          ? "O mentor já possui sessão nesse horário."
          : "Não foi possível reagendar a sessão.",
      ),
    );
  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringSessionUrl(
      organizationSlug,
      incubatorSlug,
      parsed.data.sessionId,
      "success",
      "Sessão reagendada.",
    ),
  );
}

export async function createMentoringNoteAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = createMentoringNoteSchema.safeParse({
    sessionId: value(formData, "sessionId"),
    visibility: value(formData, "visibility"),
    content: value(formData, "content"),
  });
  if (!parsed.success)
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        parsed.error.issues[0]?.message ?? "Registro inválido.",
      ),
    );
  const { error } = await context.supabase
    .from("mentoring_session_notes")
    .insert({
      organization_id: context.organization.id,
      session_id: parsed.data.sessionId,
      visibility: parsed.data.visibility,
      content: parsed.data.content,
      author_user_id: context.user.id,
    });
  if (error)
    redirect(
      mentoringSessionUrl(
        organizationSlug,
        incubatorSlug,
        parsed.data.sessionId,
        "error",
        "Não foi possível salvar o registro da sessão.",
      ),
    );
  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringSessionUrl(
      organizationSlug,
      incubatorSlug,
      parsed.data.sessionId,
      "success",
      "Registro da sessão salvo.",
    ),
  );
}

export async function createMentoringRecommendationAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = createMentoringRecommendationSchema.safeParse({
    sessionId: value(formData, "sessionId"),
    title: value(formData, "title"),
    description: value(formData, "description"),
    priority: value(formData, "priority"),
    dueOn: value(formData, "dueOn"),
  });
  if (!parsed.success)
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        parsed.error.issues[0]?.message ?? "Recomendação inválida.",
      ),
    );
  const { error } = await context.supabase
    .from("mentoring_recommendations")
    .insert({
      organization_id: context.organization.id,
      session_id: parsed.data.sessionId,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      due_on: parsed.data.dueOn,
      created_by: context.user.id,
    });
  if (error)
    redirect(
      mentoringSessionUrl(
        organizationSlug,
        incubatorSlug,
        parsed.data.sessionId,
        "error",
        "Não foi possível salvar a recomendação.",
      ),
    );
  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringSessionUrl(
      organizationSlug,
      incubatorSlug,
      parsed.data.sessionId,
      "success",
      "Recomendação registrada.",
    ),
  );
}

export async function updateMentoringRecommendationAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = updateMentoringRecommendationSchema.safeParse({
    recommendationId: value(formData, "recommendationId"),
    status: value(formData, "status"),
    ownerUserId: value(formData, "ownerUserId"),
  });
  if (!parsed.success)
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Recomendação inválida.",
      ),
    );
  const recommendationResult = await context.supabase
    .from("mentoring_recommendations")
    .select("session_id")
    .eq("organization_id", context.organization.id)
    .eq("id", parsed.data.recommendationId)
    .maybeSingle();
  if (recommendationResult.error || !recommendationResult.data)
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Recomendação indisponível.",
      ),
    );
  const { error } = await context.supabase
    .from("mentoring_recommendations")
    .update({
      status: parsed.data.status,
      owner_user_id: parsed.data.ownerUserId,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", parsed.data.recommendationId);
  if (error)
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        "Não foi possível atualizar a recomendação.",
      ),
    );
  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringSessionUrl(
      organizationSlug,
      incubatorSlug,
      recommendationResult.data.session_id,
      "success",
      "Recomendação atualizada.",
    ),
  );
}

export async function createMentoringFeedbackAction(
  organizationSlug: string,
  incubatorSlug: string,
  formData: FormData,
) {
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const parsed = createMentoringFeedbackSchema.safeParse({
    sessionId: value(formData, "sessionId"),
    rating: value(formData, "rating"),
    strengths: value(formData, "strengths"),
    improvements: value(formData, "improvements"),
    isShared: value(formData, "isShared") === "on",
  });
  if (!parsed.success)
    redirect(
      mentoringUrl(
        organizationSlug,
        incubatorSlug,
        "error",
        parsed.error.issues[0]?.message ?? "Feedback inválido.",
      ),
    );
  const { error } = await context.supabase.rpc("create_mentoring_feedback", {
    target_session_id: parsed.data.sessionId,
    feedback_rating: parsed.data.rating,
    feedback_strengths: parsed.data.strengths,
    feedback_improvements: parsed.data.improvements,
    share_feedback: parsed.data.isShared,
  });
  if (error)
    redirect(
      mentoringSessionUrl(
        organizationSlug,
        incubatorSlug,
        parsed.data.sessionId,
        "error",
        error.code === "23505"
          ? "Você já enviou feedback para esta sessão."
          : "Não foi possível salvar o feedback.",
      ),
    );
  refreshMentoring(organizationSlug, incubatorSlug);
  redirect(
    mentoringSessionUrl(
      organizationSlug,
      incubatorSlug,
      parsed.data.sessionId,
      "success",
      "Feedback salvo.",
    ),
  );
}
