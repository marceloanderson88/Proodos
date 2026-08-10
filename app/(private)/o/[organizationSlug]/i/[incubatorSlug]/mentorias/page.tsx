import { MentoringWorkspace } from "@/components/mentoring/mentoring-workspace";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { firstSearchValue } from "@/lib/m6/server-context";

export const dynamic = "force-dynamic";

const mentoringViews = new Set(["overview", "mentores", "vinculos", "agenda"]);

export default async function MentoringPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationSlug: string; incubatorSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ organizationSlug, incubatorSlug }, feedback] = await Promise.all([
    params,
    searchParams,
  ]);
  const requestedView = firstSearchValue(feedback.view) ?? "overview";
  const view = mentoringViews.has(requestedView) ? requestedView : "overview";
  const { organization, incubator, supabase, user } =
    await getIncubatorServerContext(organizationSlug, incubatorSlug);

  const [
    canManageResult,
    profilesResult,
    skillsResult,
    assignmentsResult,
    startupsResult,
    mentorRoleResult,
    availabilityResult,
    sessionsResult,
    assessmentsResult,
  ] = await Promise.all([
    supabase.rpc("has_incubator_permission", {
      target_organization_id: organization.id,
      target_incubator_id: incubator.id,
      target_permission_code: "mentoring.manage",
    }),
    supabase
      .from("mentor_profiles")
      .select(
        "id, user_id, headline, bio, timezone, linkedin_url, status, archived_at, created_at",
      )
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("mentor_skills")
      .select("id, mentor_profile_id, kind, name")
      .eq("organization_id", organization.id)
      .order("name"),
    supabase
      .from("mentor_startup_assignments")
      .select(
        "id, mentor_profile_id, startup_id, status, starts_on, ends_on, focus, created_at",
      )
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("startups")
      .select("id, name, stage, status")
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("roles")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("code", "mentor")
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("mentor_availability_slots")
      .select(
        "id, mentor_profile_id, weekday, starts_at, ends_at, timezone, effective_from, effective_until, is_active",
      )
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id)
      .eq("is_active", true)
      .order("weekday")
      .order("starts_at"),
    supabase
      .from("mentoring_sessions")
      .select(
        "id, assignment_id, diagnostic_assessment_id, objective, mode, timezone, scheduled_start_at, scheduled_end_at, meeting_url, location, status, cancellation_reason, created_at",
      )
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id)
      .order("scheduled_start_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("diagnostic_assessments")
      .select(
        "id, startup_id, cycle_label, status, evaluator_id, execution_mode",
      )
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id)
      .eq("execution_mode", "facilitated")
      .order("updated_at", { ascending: false }),
  ]);

  if (
    canManageResult.error ||
    profilesResult.error ||
    skillsResult.error ||
    assignmentsResult.error ||
    startupsResult.error ||
    mentorRoleResult.error ||
    availabilityResult.error ||
    sessionsResult.error ||
    assessmentsResult.error
  ) {
    throw new Error("Falha ao carregar o módulo de mentorias.");
  }

  const profileUserIds = (profilesResult.data ?? []).map(
    (profile) => profile.user_id,
  );
  let eligibleUserIds: string[] = [];
  if (canManageResult.data && mentorRoleResult.data) {
    const assignments = await supabase
      .from("role_assignments")
      .select("membership_id")
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id)
      .eq("role_id", mentorRoleResult.data.id);
    if (assignments.error)
      throw new Error("Falha ao consultar pessoas com papel Mentor.");

    const membershipIds = (assignments.data ?? []).map(
      (assignment) => assignment.membership_id,
    );
    if (membershipIds.length) {
      const memberships = await supabase
        .from("organization_memberships")
        .select("user_id")
        .eq("organization_id", organization.id)
        .eq("status", "active")
        .in("id", membershipIds);
      if (memberships.error)
        throw new Error("Falha ao consultar membros mentores.");
      eligibleUserIds = (memberships.data ?? []).map(
        (membership) => membership.user_id,
      );
    }
  }

  const allProfileIds = [...new Set([...profileUserIds, ...eligibleUserIds])];
  const peopleResult = allProfileIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", allProfileIds)
    : { data: [], error: null };
  if (peopleResult.error)
    throw new Error("Falha ao consultar a identidade dos mentores.");

  const people = peopleResult.data ?? [];
  const eligiblePeople = eligibleUserIds
    .filter((userId) => !profileUserIds.includes(userId))
    .map((userId) => {
      const person = people.find((item) => item.id === userId);
      return {
        userId,
        displayName: person?.display_name ?? person?.email ?? "Pessoa sem nome",
        email: person?.email ?? "E-mail indisponível",
      };
    });

  return (
    <MentoringWorkspace
      view={view as "overview" | "mentores" | "vinculos" | "agenda"}
      organizationSlug={organizationSlug}
      incubatorSlug={incubatorSlug}
      incubatorName={incubator.name}
      timezone={incubator.timezone}
      currentUserId={user.id}
      canManage={Boolean(canManageResult.data)}
      eligiblePeople={eligiblePeople}
      mentors={(profilesResult.data ?? []).map((profile) => {
        const person = people.find((item) => item.id === profile.user_id);
        return {
          ...profile,
          displayName:
            person?.display_name ?? person?.email ?? "Mentor sem nome",
          email: person?.email ?? "E-mail indisponível",
          skills: (skillsResult.data ?? [])
            .filter((skill) => skill.mentor_profile_id === profile.id)
            .map((skill) => ({ kind: skill.kind, name: skill.name })),
        };
      })}
      startups={startupsResult.data ?? []}
      assignments={assignmentsResult.data ?? []}
      availability={availabilityResult.data ?? []}
      sessions={sessionsResult.data ?? []}
      assessments={assessmentsResult.data ?? []}
      success={firstSearchValue(feedback.success)}
      error={firstSearchValue(feedback.error)}
    />
  );
}
