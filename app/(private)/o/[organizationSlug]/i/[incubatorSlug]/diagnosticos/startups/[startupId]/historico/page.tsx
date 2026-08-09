import { notFound } from "next/navigation";

import { DiagnosticHistory } from "@/components/diagnostics/diagnostic-startup-dashboard";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";

export const dynamic = "force-dynamic";

export default async function DiagnosticStartupHistoryPage({
  params,
}: {
  params: Promise<{
    organizationSlug: string;
    incubatorSlug: string;
    startupId: string;
  }>;
}) {
  const { organizationSlug, incubatorSlug, startupId } = await params;
  const { organization, incubator, supabase } = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const scope = {
    organization_id: organization.id,
    incubator_id: incubator.id,
  };
  const [startupResult, assessmentsResult] = await Promise.all([
    supabase
      .from("startups")
      .select("id,name")
      .match({ ...scope, id: startupId })
      .maybeSingle(),
    supabase
      .from("diagnostic_assessments")
      .select("*")
      .match({ ...scope, startup_id: startupId })
      .order("created_at", { ascending: false }),
  ]);
  if (!startupResult.data) notFound();
  if (assessmentsResult.error)
    throw new Error("Falha ao carregar o histórico do diagnóstico.");
  const assessments = assessmentsResult.data ?? [];
  const templateIds = [...new Set(assessments.map((item) => item.template_id))];
  const assessmentIds = assessments.map((item) => item.id);
  const [templatesResult, dimensionsResult, scoresResult] = await Promise.all([
    templateIds.length
      ? supabase
          .from("diagnostic_templates")
          .select("id,name,version,version_label")
          .in("id", templateIds)
          .match(scope)
      : Promise.resolve({ data: [], error: null }),
    templateIds.length
      ? supabase
          .from("diagnostic_dimensions")
          .select("id,template_id,code,name,position")
          .in("template_id", templateIds)
          .match(scope)
          .order("position")
      : Promise.resolve({ data: [], error: null }),
    assessmentIds.length
      ? supabase
          .from("diagnostic_dimension_scores")
          .select("assessment_id,dimension_id,validated_score,self_score")
          .in("assessment_id", assessmentIds)
          .match(scope)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (templatesResult.error || dimensionsResult.error || scoresResult.error)
    throw new Error("Falha ao comparar os ciclos do diagnóstico.");
  const templates = new Map(
    (templatesResult.data ?? []).map((item) => [item.id, item]),
  );
  const scores = scoresResult.data ?? [];
  const dimensionById = new Map(
    (dimensionsResult.data ?? []).map((item) => [
      item.id,
      { key: item.code ?? item.name, code: item.code, name: item.name },
    ]),
  );
  const dimensionNames = Array.from(
    new Map(
      (dimensionsResult.data ?? []).map((item) => [
        item.code ?? item.name,
        { id: item.code ?? item.name, code: item.code, name: item.name },
      ]),
    ).values(),
  );
  const base = `/o/${organizationSlug}/i/${incubatorSlug}/diagnosticos`;

  return (
    <DiagnosticHistory
      base={base}
      startup={startupResult.data}
      cycles={assessments.map((assessment) => {
        const template = templates.get(assessment.template_id);
        return {
          id: assessment.id,
          label: assessment.cycle_label,
          date:
            assessment.validated_at ??
            assessment.submitted_at ??
            assessment.created_at,
          version: template?.version_label ?? String(template?.version ?? "—"),
          status: assessment.status,
          selfScore:
            assessment.self_score == null
              ? null
              : Number(assessment.self_score),
          validatedScore:
            assessment.validated_score == null
              ? null
              : Number(assessment.validated_score),
          classification: assessment.classification_code,
          gap:
            assessment.average_gap == null
              ? null
              : Number(assessment.average_gap),
          coverage:
            assessment.evidence_coverage == null
              ? null
              : Number(assessment.evidence_coverage),
          dimensions: Object.fromEntries(
            scores
              .filter((item) => item.assessment_id === assessment.id)
              .flatMap((item) => {
                const dimension = dimensionById.get(item.dimension_id);
                return dimension
                  ? [
                      [
                        dimension.key,
                        item.validated_score == null
                          ? item.self_score == null
                            ? null
                            : Number(item.self_score)
                          : Number(item.validated_score),
                      ] as const,
                    ]
                  : [];
              }),
          ),
        };
      })}
      dimensionNames={dimensionNames}
    />
  );
}
