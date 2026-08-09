import { notFound } from "next/navigation";

import { DiagnosticStartupDashboard } from "@/components/diagnostics/diagnostic-startup-dashboard";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";

export const dynamic = "force-dynamic";

export default async function DiagnosticStartupResultPage({
  params,
}: {
  params: Promise<{
    organizationSlug: string;
    incubatorSlug: string;
    startupId: string;
    assessmentId: string;
  }>;
}) {
  const { organizationSlug, incubatorSlug, startupId, assessmentId } =
    await params;
  const { organization, incubator, supabase } = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const scope = {
    organization_id: organization.id,
    incubator_id: incubator.id,
  };
  const [assessmentResult, startupResult] = await Promise.all([
    supabase
      .from("diagnostic_assessments")
      .select("*")
      .match({ ...scope, id: assessmentId, startup_id: startupId })
      .maybeSingle(),
    supabase
      .from("startups")
      .select("id,name,stage")
      .match({ ...scope, id: startupId })
      .maybeSingle(),
  ]);
  if (!assessmentResult.data || !startupResult.data) notFound();
  const assessment = assessmentResult.data;
  const [
    templateResult,
    campaignResult,
    dimensionsResult,
    scoresResult,
    triggerResults,
    triggerRulesResult,
    notesResult,
  ] = await Promise.all([
    supabase
      .from("diagnostic_templates")
      .select("id,name,version,version_label")
      .match({ ...scope, id: assessment.template_id })
      .single(),
    assessment.campaign_id
      ? supabase
          .from("diagnostic_campaigns")
          .select("id,name")
          .match({ ...scope, id: assessment.campaign_id })
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("diagnostic_dimensions")
      .select("id,code,name,weight,position")
      .match({ ...scope, template_id: assessment.template_id })
      .order("position"),
    supabase
      .from("diagnostic_dimension_scores")
      .select("dimension_id,self_score,validated_score")
      .match({ ...scope, assessment_id: assessment.id }),
    supabase
      .from("diagnostic_trigger_results")
      .select("id,trigger_rule_id,message,status")
      .match({ ...scope, assessment_id: assessment.id }),
    supabase
      .from("diagnostic_trigger_rules")
      .select("id,name,recommended_action,severity")
      .match({ ...scope, template_id: assessment.template_id }),
    supabase
      .from("diagnostic_assessment_notes")
      .select("id,author_id,body,created_at")
      .match({ ...scope, assessment_id: assessment.id })
      .order("created_at", { ascending: false }),
  ]);
  if (
    !templateResult.data ||
    dimensionsResult.error ||
    scoresResult.error ||
    triggerResults.error ||
    triggerRulesResult.error ||
    notesResult.error
  ) {
    throw new Error("Falha ao carregar o resultado do diagnóstico.");
  }
  const scoreByDimension = new Map(
    (scoresResult.data ?? []).map((item) => [item.dimension_id, item]),
  );
  const ruleById = new Map(
    (triggerRulesResult.data ?? []).map((item) => [item.id, item]),
  );
  const base = `/o/${organizationSlug}/i/${incubatorSlug}/diagnosticos`;

  return (
    <DiagnosticStartupDashboard
      base={base}
      startup={startupResult.data}
      assessment={{
        id: assessment.id,
        cycleLabel: assessment.cycle_label,
        status: assessment.status,
        selfScore:
          assessment.self_score == null ? null : Number(assessment.self_score),
        validatedScore:
          assessment.validated_score == null
            ? null
            : Number(assessment.validated_score),
        classificationCode: assessment.classification_code,
        averageGap:
          assessment.average_gap == null
            ? null
            : Number(assessment.average_gap),
        evidenceCoverage:
          assessment.evidence_coverage == null
            ? null
            : Number(assessment.evidence_coverage),
        submittedAt: assessment.submitted_at,
        validatedAt: assessment.validated_at,
        executionMode: assessment.execution_mode,
      }}
      template={{
        name: templateResult.data.name,
        versionLabel:
          templateResult.data.version_label ??
          String(templateResult.data.version),
      }}
      campaignName={campaignResult.data?.name ?? null}
      dimensions={(dimensionsResult.data ?? []).map((dimension) => {
        const dimensionScore = scoreByDimension.get(dimension.id);
        return {
          id: dimension.id,
          code: dimension.code,
          name: dimension.name,
          weight: Number(dimension.weight),
          selfScore:
            dimensionScore?.self_score == null
              ? null
              : Number(dimensionScore.self_score),
          validatedScore:
            dimensionScore?.validated_score == null
              ? null
              : Number(dimensionScore.validated_score),
        };
      })}
      triggers={(triggerResults.data ?? []).map((result) => {
        const rule = ruleById.get(result.trigger_rule_id);
        return {
          id: result.id,
          name: rule?.name ?? "Gatilho do diagnóstico",
          message: result.message,
          recommendedAction: rule?.recommended_action ?? "",
          severity: rule?.severity ?? "warning",
          status: result.status,
        };
      })}
      notes={notesResult.data ?? []}
    />
  );
}
