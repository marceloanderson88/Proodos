import { StartupsWorkspace } from "@/components/m6/startups-workspace";
import { firstSearchValue, getM6ServerContext } from "@/lib/m6/server-context";

export const dynamic = "force-dynamic";

export default async function StartupsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ organizationSlug }, feedback] = await Promise.all([
    params,
    searchParams,
  ]);
  const { organization, supabase } = await getM6ServerContext(organizationSlug);

  const [
    incubatorsResult,
    startupsResult,
    membersResult,
    programsResult,
    cohortsResult,
    enrollmentsResult,
  ] = await Promise.all([
    supabase
      .from("incubators")
      .select("id, name")
      .eq("organization_id", organization.id)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("startups")
      .select(
        "id, incubator_id, name, legal_name, sector, stage, status, city, state",
      )
      .eq("organization_id", organization.id)
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
      .is("deleted_at", null),
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
  ]);

  const firstError = [
    incubatorsResult.error,
    startupsResult.error,
    membersResult.error,
    programsResult.error,
    cohortsResult.error,
    enrollmentsResult.error,
  ].find(Boolean);
  if (firstError) throw new Error("Falha ao consultar startups autorizadas.");

  const programNames = new Map(
    (programsResult.data ?? []).map((program) => [program.id, program.name]),
  );
  const cohortOptions = (cohortsResult.data ?? []).map((cohort) => ({
    id: cohort.id,
    name: cohort.name,
    programName: programNames.get(cohort.program_id) ?? "Programa",
  }));

  return (
    <StartupsWorkspace
      organizationSlug={organizationSlug}
      incubators={incubatorsResult.data ?? []}
      startups={startupsResult.data ?? []}
      members={membersResult.data ?? []}
      cohorts={cohortOptions}
      enrollments={enrollmentsResult.data ?? []}
      success={firstSearchValue(feedback.success)}
      error={firstSearchValue(feedback.error)}
    />
  );
}
