import { notFound } from "next/navigation";

import { DiagnosticAssessmentWorkspace } from "@/components/diagnostics/diagnostic-assessment-workspace";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { firstSearchValue } from "@/lib/m6/server-context";

export const dynamic = "force-dynamic";

export default async function DiagnosticAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{
    organizationSlug: string;
    incubatorSlug: string;
    assessmentId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ organizationSlug, incubatorSlug, assessmentId }, feedback] =
    await Promise.all([params, searchParams]);
  const { organization, incubator, supabase } = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const scope = {
    organization_id: organization.id,
    incubator_id: incubator.id,
  };
  const assessmentResult = await supabase
    .from("diagnostic_assessments")
    .select("*")
    .match({ ...scope, id: assessmentId })
    .maybeSingle();
  if (!assessmentResult.data) notFound();
  const assessment = assessmentResult.data;
  const [
    templateResult,
    startupResult,
    dimensionsResult,
    criteriaResult,
    levelsResult,
    responsesResult,
    scoresResult,
    triggersResult,
    rulesResult,
  ] = await Promise.all([
    supabase
      .from("diagnostic_templates")
      .select("*")
      .match({ ...scope, id: assessment.template_id })
      .single(),
    supabase
      .from("startups")
      .select("id,name,stage")
      .match({ ...scope, id: assessment.startup_id })
      .single(),
    supabase
      .from("diagnostic_dimensions")
      .select("*")
      .match({ ...scope, template_id: assessment.template_id })
      .order("position"),
    supabase
      .from("diagnostic_criteria")
      .select("*")
      .match({ ...scope, template_id: assessment.template_id })
      .order("position"),
    supabase
      .from("diagnostic_criterion_levels")
      .select("*")
      .match({ ...scope, template_id: assessment.template_id })
      .order("position"),
    supabase
      .from("diagnostic_responses")
      .select("*")
      .match({ ...scope, assessment_id: assessment.id }),
    supabase
      .from("diagnostic_dimension_scores")
      .select("*")
      .match({ ...scope, assessment_id: assessment.id }),
    supabase
      .from("diagnostic_trigger_results")
      .select("*")
      .match({ ...scope, assessment_id: assessment.id }),
    supabase
      .from("diagnostic_trigger_rules")
      .select("*")
      .match({ ...scope, template_id: assessment.template_id }),
  ]);
  const results = [
    templateResult,
    startupResult,
    dimensionsResult,
    criteriaResult,
    levelsResult,
    responsesResult,
    scoresResult,
    triggersResult,
    rulesResult,
  ];
  if (results.some((result) => result.error))
    throw new Error("Falha ao carregar a aplicação do diagnóstico.");
  if (!templateResult.data || !startupResult.data) notFound();

  return (
    <DiagnosticAssessmentWorkspace
      organizationSlug={organizationSlug}
      incubatorSlug={incubatorSlug}
      assessment={assessment}
      template={templateResult.data}
      startup={startupResult.data}
      dimensions={dimensionsResult.data ?? []}
      criteria={criteriaResult.data ?? []}
      levels={levelsResult.data ?? []}
      responses={responsesResult.data ?? []}
      scores={scoresResult.data ?? []}
      triggerResults={triggersResult.data ?? []}
      triggerRules={rulesResult.data ?? []}
      success={firstSearchValue(feedback.success)}
      error={firstSearchValue(feedback.error)}
    />
  );
}
