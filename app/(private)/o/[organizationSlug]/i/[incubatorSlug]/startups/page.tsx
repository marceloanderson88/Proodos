import { StartupsWorkspace } from "@/components/m6/startups-workspace";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { firstSearchValue } from "@/lib/m6/server-context";

export const dynamic = "force-dynamic";

export default async function IncubatorStartupsPage({
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
  const { organization, incubator, supabase } = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const [
    startupsResult,
    membersResult,
    programsResult,
    cohortsResult,
    enrollmentsResult,
    applicationsResult,
    onboardingInvitationsResult,
  ] = await Promise.all([
    supabase
      .from("startups")
      .select("id, code, name, legal_name, sector, stage, status, city, state")
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("startup_members")
      .select("id, startup_id, full_name, role, role_title, is_representative")
      .eq("organization_id", organization.id)
      .eq("status", "active")
      .order("full_name"),
    supabase
      .from("programs")
      .select("id, name")
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id)
      .is("deleted_at", null)
      .neq("status", "archived"),
    supabase
      .from("cohorts")
      .select("id, program_id, name")
      .eq("organization_id", organization.id)
      .is("deleted_at", null)
      .in("status", ["planned", "enrollment_open", "active"])
      .order("starts_on", { ascending: false, nullsFirst: false }),
    supabase
      .from("startup_enrollments")
      .select("id, startup_id, cohort_id, status, entry_date")
      .eq("organization_id", organization.id)
      .order("entry_date", { ascending: false }),
    supabase
      .from("startup_applications")
      .select(
        "id, applicant_name, applicant_email, startup_name, sector, stage, created_at",
      )
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("startup_onboarding_invitations")
      .select("invitation_id, startup_name")
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  if (
    [
      startupsResult.error,
      membersResult.error,
      programsResult.error,
      cohortsResult.error,
      enrollmentsResult.error,
      applicationsResult.error,
      onboardingInvitationsResult.error,
    ].find(Boolean)
  )
    throw new Error("Falha ao consultar startups da incubadora.");
  const startupIds = new Set(
    (startupsResult.data ?? []).map((item) => item.id),
  );
  const programNames = new Map(
    (programsResult.data ?? []).map((item) => [item.id, item.name]),
  );
  const cohorts = (cohortsResult.data ?? []).filter((item) =>
    programNames.has(item.program_id),
  );
  const cohortIds = new Set(cohorts.map((item) => item.id));
  const invitationNameById = new Map(
    (onboardingInvitationsResult.data ?? []).map((item) => [
      item.invitation_id,
      item.startup_name,
    ]),
  );
  const { data: invitationRows, error: invitationRowsError } =
    invitationNameById.size
      ? await supabase
          .from("invitations")
          .select("id, email, invited_name, status, expires_at")
          .eq("organization_id", organization.id)
          .in("id", [...invitationNameById.keys()])
          .order("created_at", { ascending: false })
      : { data: [], error: null };
  if (invitationRowsError)
    throw new Error("Falha ao consultar convites de startups.");

  return (
    <StartupsWorkspace
      organizationSlug={organizationSlug}
      incubatorSlug={incubatorSlug}
      startups={startupsResult.data ?? []}
      members={(membersResult.data ?? []).filter((item) =>
        startupIds.has(item.startup_id),
      )}
      cohorts={cohorts.map((item) => ({
        id: item.id,
        name: item.name,
        programName: programNames.get(item.program_id) ?? "Programa",
      }))}
      enrollments={(enrollmentsResult.data ?? []).filter(
        (item) =>
          startupIds.has(item.startup_id) && cohortIds.has(item.cohort_id),
      )}
      applications={applicationsResult.data ?? []}
      invitations={(invitationRows ?? []).map((item) => ({
        ...item,
        startupName: invitationNameById.get(item.id) ?? "Startup",
      }))}
      success={firstSearchValue(feedback.success)}
      error={firstSearchValue(feedback.error)}
    />
  );
}
