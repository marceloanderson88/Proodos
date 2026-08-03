import { ProgramsWorkspace } from "@/components/m6/programs-workspace";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { firstSearchValue } from "@/lib/m6/server-context";

export const dynamic = "force-dynamic";

export default async function IncubatorProgramsPage({
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
  const [typesResult, programsResult, cohortsResult, enrollmentsResult] =
    await Promise.all([
      supabase
        .from("program_types")
        .select("id, name")
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .eq("incubator_id", incubator.id)
        .order("name"),
      supabase
        .from("programs")
        .select(
          "id, type_id, name, code, description, objectives, target_audience, delivery_mode, duration_weeks, suggested_capacity, status, starts_on, ends_on, logo_path",
        )
        .eq("organization_id", organization.id)
        .eq("incubator_id", incubator.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("cohorts")
        .select(
          "id, program_id, name, code, status, launches_on, enrollment_starts_on, enrollment_ends_on, starts_on, ends_on, capacity",
        )
        .eq("organization_id", organization.id)
        .is("deleted_at", null)
        .order("starts_on", { ascending: false, nullsFirst: false }),
      supabase
        .from("startup_enrollments")
        .select("cohort_id, startup_id")
        .eq("organization_id", organization.id),
    ]);
  if (
    [
      typesResult.error,
      programsResult.error,
      cohortsResult.error,
      enrollmentsResult.error,
    ].find(Boolean)
  )
    throw new Error("Falha ao consultar programas da incubadora.");
  const programIds = new Set(
    (programsResult.data ?? []).map((item) => item.id),
  );
  const cohorts = (cohortsResult.data ?? []).filter((item) =>
    programIds.has(item.program_id),
  );
  const cohortIds = new Set(cohorts.map((item) => item.id));
  const enrollments = (enrollmentsResult.data ?? []).filter((item) =>
    cohortIds.has(item.cohort_id),
  );
  const programs = await Promise.all(
    (programsResult.data ?? []).map(async (program) => {
      if (!program.logo_path) return { ...program, logo_url: null };
      const { data } = await supabase.storage
        .from("program-logos")
        .createSignedUrl(program.logo_path, 60 * 60);
      return { ...program, logo_url: data?.signedUrl ?? null };
    }),
  );

  return (
    <ProgramsWorkspace
      organizationSlug={organizationSlug}
      incubatorSlug={incubatorSlug}
      programTypes={typesResult.data ?? []}
      programs={programs}
      cohorts={cohorts}
      enrollments={enrollments}
      success={firstSearchValue(feedback.success)}
      error={firstSearchValue(feedback.error)}
    />
  );
}
