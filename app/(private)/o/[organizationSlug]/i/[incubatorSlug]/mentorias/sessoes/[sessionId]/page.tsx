import { notFound } from "next/navigation";

import { MentoringSessionDetail } from "@/components/mentoring/mentoring-session-detail";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { firstSearchValue } from "@/lib/m6/server-context";

export const dynamic = "force-dynamic";

export default async function MentoringSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{
    organizationSlug: string;
    incubatorSlug: string;
    sessionId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ organizationSlug, incubatorSlug, sessionId }, feedbackMessage] =
    await Promise.all([params, searchParams]);
  const { organization, incubator, supabase, user } =
    await getIncubatorServerContext(organizationSlug, incubatorSlug);

  const [manageResult, conductResult, sessionResult] = await Promise.all([
    supabase.rpc("has_incubator_permission", {
      target_organization_id: organization.id,
      target_incubator_id: incubator.id,
      target_permission_code: "mentoring.manage",
    }),
    supabase.rpc("has_incubator_permission", {
      target_organization_id: organization.id,
      target_incubator_id: incubator.id,
      target_permission_code: "mentoring.conduct",
    }),
    supabase
      .from("mentoring_sessions")
      .select(
        "id, assignment_id, objective, mode, timezone, scheduled_start_at, scheduled_end_at, meeting_url, location, status, cancellation_reason",
      )
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id)
      .eq("id", sessionId)
      .maybeSingle(),
  ]);

  if (manageResult.error || conductResult.error || sessionResult.error) {
    throw new Error("Falha ao carregar a sessão de mentoria.");
  }
  if (!sessionResult.data) notFound();

  const [assignmentResult, notesResult, recommendationsResult, feedbackResult] =
    await Promise.all([
      supabase
        .from("mentor_startup_assignments")
        .select("mentor_profile_id, startup_id")
        .eq("organization_id", organization.id)
        .eq("id", sessionResult.data.assignment_id)
        .maybeSingle(),
      supabase
        .from("mentoring_session_notes")
        .select("id, visibility, content, created_at")
        .eq("organization_id", organization.id)
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false }),
      supabase
        .from("mentoring_recommendations")
        .select("id, title, description, priority, status, due_on, created_by")
        .eq("organization_id", organization.id)
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false }),
      supabase
        .from("mentoring_feedback")
        .select(
          "id, author_user_id, kind, rating, strengths, improvements, is_shared",
        )
        .eq("organization_id", organization.id)
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false }),
    ]);

  if (
    assignmentResult.error ||
    notesResult.error ||
    recommendationsResult.error ||
    feedbackResult.error ||
    !assignmentResult.data
  ) {
    throw new Error("Falha ao carregar os registros da sessão de mentoria.");
  }

  const [mentorResult, startupResult, startupMemberResult] = await Promise.all([
    supabase
      .from("mentor_profiles")
      .select("user_id")
      .eq("organization_id", organization.id)
      .eq("id", assignmentResult.data.mentor_profile_id)
      .maybeSingle(),
    supabase
      .from("startups")
      .select("name")
      .eq("organization_id", organization.id)
      .eq("id", assignmentResult.data.startup_id)
      .maybeSingle(),
    supabase
      .from("startup_members")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("startup_id", assignmentResult.data.startup_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  if (mentorResult.error || startupResult.error || startupMemberResult.error) {
    throw new Error("Falha ao identificar os participantes da mentoria.");
  }

  const isAssignedMentor = mentorResult.data?.user_id === user.id;
  const isStartupMember = Boolean(startupMemberResult.data);
  const feedback = feedbackResult.data ?? [];

  return (
    <MentoringSessionDetail
      organizationSlug={organizationSlug}
      incubatorSlug={incubatorSlug}
      timezone={incubator.timezone}
      startupName={startupResult.data?.name ?? "Startup vinculada"}
      session={sessionResult.data}
      notes={notesResult.data ?? []}
      recommendations={recommendationsResult.data ?? []}
      feedback={feedback}
      canSchedule={Boolean(manageResult.data) || isAssignedMentor}
      canRecord={Boolean(conductResult.data)}
      canManage={Boolean(manageResult.data)}
      currentUserId={user.id}
      canFeedback={isAssignedMentor || isStartupMember}
      hasSubmittedFeedback={feedback.some(
        (item) => item.author_user_id === user.id,
      )}
      success={firstSearchValue(feedbackMessage.success)}
      error={firstSearchValue(feedbackMessage.error)}
    />
  );
}
