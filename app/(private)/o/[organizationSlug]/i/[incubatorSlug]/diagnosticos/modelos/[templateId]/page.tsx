import { notFound } from "next/navigation";

import { DiagnosticModelDetail } from "@/components/diagnostics/diagnostic-model-detail";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { firstSearchValue } from "@/lib/m6/server-context";

export const dynamic = "force-dynamic";

export default async function DiagnosticModelPage({
  params,
  searchParams,
}: {
  params: Promise<{
    organizationSlug: string;
    incubatorSlug: string;
    templateId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ organizationSlug, incubatorSlug, templateId }, feedback] =
    await Promise.all([params, searchParams]);
  const { organization, incubator, supabase } = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const scope = {
    organization_id: organization.id,
    incubator_id: incubator.id,
    template_id: templateId,
  };
  const [
    templateResult,
    dimensionsResult,
    criteriaResult,
    levelsResult,
    classificationsResult,
    indicatorsResult,
    rulesResult,
  ] = await Promise.all([
    supabase
      .from("diagnostic_templates")
      .select("*")
      .match({
        organization_id: organization.id,
        incubator_id: incubator.id,
        id: templateId,
      })
      .maybeSingle(),
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
      .from("diagnostic_criterion_levels")
      .select("*")
      .match(scope)
      .order("position"),
    supabase
      .from("diagnostic_classification_ranges")
      .select("*")
      .match(scope)
      .order("position"),
    supabase
      .from("diagnostic_indicator_definitions")
      .select("*")
      .match(scope)
      .order("position"),
    supabase
      .from("diagnostic_trigger_rules")
      .select("*")
      .match(scope)
      .order("position"),
  ]);
  if (!templateResult.data) notFound();
  if (
    [
      dimensionsResult,
      criteriaResult,
      levelsResult,
      classificationsResult,
      indicatorsResult,
      rulesResult,
    ].some((result) => result.error)
  )
    throw new Error("Falha ao carregar a versão do diagnóstico.");

  return (
    <DiagnosticModelDetail
      organizationSlug={organizationSlug}
      incubatorSlug={incubatorSlug}
      template={templateResult.data}
      dimensions={dimensionsResult.data ?? []}
      criteria={criteriaResult.data ?? []}
      levels={levelsResult.data ?? []}
      classifications={classificationsResult.data ?? []}
      indicators={indicatorsResult.data ?? []}
      rules={rulesResult.data ?? []}
      success={firstSearchValue(feedback.success)}
      error={firstSearchValue(feedback.error)}
    />
  );
}
