import { PortfolioReportDashboard } from "@/components/reports/portfolio-report-dashboard";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { firstSearchValue } from "@/lib/m6/server-context";
import { buildPortfolioReport } from "@/lib/reports/portfolio-report";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relatórios e indicadores" };

const reportViews = new Set([
  "overview",
  "portfolio",
  "diagnosticos",
  "territorio",
]);

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationSlug: string; incubatorSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ organizationSlug, incubatorSlug }, filters] = await Promise.all([
    params,
    searchParams,
  ]);
  const { organization, incubator, supabase } = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const [
    programTypesResult,
    programsResult,
    cohortsResult,
    enrollmentsResult,
    startupsResult,
    assessmentsResult,
    dimensionScoresResult,
    dimensionsResult,
  ] = await Promise.all([
    supabase
      .from("program_types")
      .select("id,name")
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id)
      .order("name"),
    supabase
      .from("programs")
      .select("id,name,status,type_id")
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("cohorts")
      .select("id,program_id,name,code,status,starts_on,ends_on,capacity")
      .eq("organization_id", organization.id)
      .is("deleted_at", null)
      .order("starts_on", { ascending: false }),
    supabase
      .from("startup_enrollments")
      .select("startup_id,cohort_id,status")
      .eq("organization_id", organization.id),
    supabase
      .from("startups")
      .select("id,name,status,stage,city,state,sector")
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("diagnostic_assessments")
      .select(
        "id,startup_id,status,self_score,validated_score,evidence_coverage,classification_code,cycle_label,updated_at",
      )
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("diagnostic_dimension_scores")
      .select("assessment_id,dimension_id,self_score,validated_score")
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id),
    supabase
      .from("diagnostic_dimensions")
      .select("id,code,name")
      .eq("organization_id", organization.id)
      .eq("incubator_id", incubator.id),
  ]);

  const essentialErrors = [
    programTypesResult.error,
    programsResult.error,
    cohortsResult.error,
    enrollmentsResult.error,
    startupsResult.error,
  ].filter(Boolean);
  if (essentialErrors.length) {
    console.error("Falha ao gerar relatório da incubadora", {
      codes: essentialErrors.map((error) => error?.code),
    });
    throw new Error("Falha ao gerar os relatórios da incubadora.");
  }
  if (
    assessmentsResult.error ||
    dimensionScoresResult.error ||
    dimensionsResult.error
  ) {
    console.error("Dados diagnósticos indisponíveis no relatório", {
      assessments: assessmentsResult.error?.code,
      scores: dimensionScoresResult.error?.code,
      dimensions: dimensionsResult.error?.code,
    });
  }

  const programs = programsResult.data ?? [];
  const programTypes = programTypesResult.data ?? [];
  const requestedProgramTypeId = firstSearchValue(filters.programType);
  const selectedProgramTypeId = programTypes.some(
    (programType) => programType.id === requestedProgramTypeId,
  )
    ? requestedProgramTypeId
    : undefined;
  const programIds = new Set(programs.map((program) => program.id));
  const cohorts = (cohortsResult.data ?? []).filter((cohort) =>
    programIds.has(cohort.program_id),
  );
  const requestedProgramId = firstSearchValue(filters.program);
  const selectedProgram = programs.find(
    (program) =>
      program.id === requestedProgramId &&
      (!selectedProgramTypeId || program.type_id === selectedProgramTypeId),
  );
  const selectedProgramId = selectedProgram?.id;
  const years = [
    ...new Set(cohorts.map((cohort) => cohort.starts_on.slice(0, 4))),
  ].sort((a, b) => b.localeCompare(a));
  const requestedYear = firstSearchValue(filters.year);
  const selectedYear = years.includes(requestedYear ?? "")
    ? requestedYear
    : undefined;
  const requestedCohortId = firstSearchValue(filters.cohort);
  const selectedCohort = cohorts.find(
    (cohort) => cohort.id === requestedCohortId,
  );
  const selectedCohortId =
    selectedCohort &&
    (!selectedProgramId || selectedCohort.program_id === selectedProgramId) &&
    (!selectedProgramTypeId ||
      programs.find((program) => program.id === selectedCohort.program_id)
        ?.type_id === selectedProgramTypeId) &&
    (!selectedYear || selectedCohort.starts_on.startsWith(selectedYear))
      ? selectedCohort.id
      : undefined;
  const startups = startupsResult.data ?? [];
  const states = [
    ...new Set(
      startups
        .map((startup) => startup.state)
        .filter((state): state is string => Boolean(state)),
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const requestedState = firstSearchValue(filters.state);
  const selectedState = states.includes(requestedState ?? "")
    ? requestedState
    : undefined;
  const cities = [
    ...new Set(
      startups
        .filter((startup) => !selectedState || startup.state === selectedState)
        .map((startup) => startup.city)
        .filter((city): city is string => Boolean(city)),
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const statuses = [...new Set(startups.map((startup) => startup.status))];
  const requestedCity = firstSearchValue(filters.city);
  const selectedCity = cities.includes(requestedCity ?? "")
    ? requestedCity
    : undefined;
  const requestedStatus = firstSearchValue(filters.status);
  const selectedStatus = statuses.includes(
    requestedStatus as (typeof statuses)[number],
  )
    ? requestedStatus
    : undefined;
  const requestedView = firstSearchValue(filters.view) ?? "overview";
  const view = reportViews.has(requestedView) ? requestedView : "overview";

  const report = buildPortfolioReport({
    programs,
    programTypes,
    cohorts,
    enrollments: enrollmentsResult.data ?? [],
    startups,
    assessments: assessmentsResult.data ?? [],
    dimensionScores: dimensionScoresResult.data ?? [],
    dimensions: dimensionsResult.data ?? [],
    selectedProgramId,
    selectedCohortId,
    selectedProgramTypeId,
    selectedYear,
    selectedState,
    selectedCity,
    selectedStatus,
  });

  return (
    <PortfolioReportDashboard
      organizationSlug={organizationSlug}
      incubatorSlug={incubatorSlug}
      incubatorName={incubator.name}
      programs={programs}
      programTypes={programTypes}
      cohorts={cohorts}
      years={years}
      states={states}
      cities={cities}
      statuses={statuses}
      selectedProgramId={selectedProgramId}
      selectedCohortId={selectedCohortId}
      selectedProgramTypeId={selectedProgramTypeId}
      selectedYear={selectedYear}
      selectedState={selectedState}
      selectedCity={selectedCity}
      selectedStatus={selectedStatus}
      view={view as "overview" | "portfolio" | "diagnosticos" | "territorio"}
      report={report}
    />
  );
}
