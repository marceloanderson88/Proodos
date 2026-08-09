import { DiagnosticsOverview } from "@/components/diagnostics/diagnostics-overview";
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
    campaignsResult,
    participantsResult,
    assessmentsResult,
    startupsResult,
  ] = await Promise.all([
    supabase
      .from("diagnostic_templates")
      .select("id,name,description,status,version,version_label,updated_at")
      .match(scope)
      .neq("status", "archived")
      .order("updated_at", { ascending: false }),
    supabase
      .from("diagnostic_dimensions")
      .select("id,template_id")
      .match(scope),
    supabase.from("diagnostic_criteria").select("id,template_id").match(scope),
    supabase
      .from("diagnostic_campaigns")
      .select("id,name,status,starts_at,ends_at,template_id,program_id")
      .match(scope)
      .order("created_at", { ascending: false }),
    supabase
      .from("diagnostic_campaign_startups")
      .select("campaign_id,status")
      .match(scope),
    supabase
      .from("diagnostic_assessments")
      .select(
        "id,startup_id,template_id,cycle_label,status,self_score,validated_score,classification_code,updated_at",
      )
      .match(scope)
      .neq("status", "cancelled")
      .order("updated_at", { ascending: false }),
    supabase
      .from("startups")
      .select("id,name")
      .match(scope)
      .is("deleted_at", null)
      .order("name"),
  ]);

  const results = [
    templatesResult,
    dimensionsResult,
    criteriaResult,
    campaignsResult,
    participantsResult,
    assessmentsResult,
    startupsResult,
  ];
  if (results.some((result) => result.error))
    throw new Error("Falha ao carregar o espaço de diagnósticos.");

  return (
    <DiagnosticsOverview
      organizationSlug={organizationSlug}
      incubatorSlug={incubatorSlug}
      incubatorName={incubator.name}
      templates={templatesResult.data ?? []}
      dimensions={dimensionsResult.data ?? []}
      criteria={criteriaResult.data ?? []}
      campaigns={campaignsResult.data ?? []}
      participants={participantsResult.data ?? []}
      assessments={assessmentsResult.data ?? []}
      startups={startupsResult.data ?? []}
      success={firstSearchValue(feedback.success)}
      error={firstSearchValue(feedback.error)}
    />
  );
}
