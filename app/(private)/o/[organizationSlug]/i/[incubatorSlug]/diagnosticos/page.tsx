import { DiagnosticsWorkspace } from "@/components/diagnostics/diagnostics-workspace";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { firstSearchValue } from "@/lib/m6/server-context";

export const dynamic = "force-dynamic";

export default async function DiagnosticsPage({
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
  const scope = {
    organization_id: organization.id,
    incubator_id: incubator.id,
  };
  const [
    templatesResult,
    dimensionsResult,
    criteriaResult,
    startupsResult,
    assessmentsResult,
    responsesResult,
  ] = await Promise.all([
    supabase
      .from("diagnostic_templates")
      .select("*")
      .match(scope)
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
    supabase
      .from("diagnostic_dimensions")
      .select("*")
      .match(scope)
      .order("position"),
    supabase
      .from("diagnostic_criteria")
      .select("*")
      .match(scope)
      .order("position"),
    supabase
      .from("startups")
      .select("id, name")
      .match(scope)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("diagnostic_assessments")
      .select("*")
      .match(scope)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false }),
    supabase
      .from("diagnostic_responses")
      .select("*")
      .match(scope)
      .order("created_at"),
  ]);
  if (
    [
      templatesResult,
      dimensionsResult,
      criteriaResult,
      startupsResult,
      assessmentsResult,
      responsesResult,
    ].some((result) => result.error)
  )
    throw new Error("Falha ao carregar diagnósticos da incubadora.");
  return (
    <DiagnosticsWorkspace
      organizationSlug={organizationSlug}
      incubatorSlug={incubatorSlug}
      incubatorName={incubator.name}
      templates={templatesResult.data ?? []}
      dimensions={dimensionsResult.data ?? []}
      criteria={criteriaResult.data ?? []}
      startups={startupsResult.data ?? []}
      assessments={assessmentsResult.data ?? []}
      responses={responsesResult.data ?? []}
      success={firstSearchValue(feedback.success)}
      error={firstSearchValue(feedback.error)}
    />
  );
}
