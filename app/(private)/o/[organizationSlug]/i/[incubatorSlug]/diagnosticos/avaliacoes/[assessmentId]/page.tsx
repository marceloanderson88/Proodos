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
    respondentsResult,
    membershipsResult,
    indicatorDefinitionsResult,
    indicatorValuesResult,
    respondentRolePermissionsResult,
    invitationMappingsResult,
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
    supabase
      .from("diagnostic_respondents")
      .select("*")
      .match({ ...scope, assessment_id: assessment.id })
      .is("revoked_at", null)
      .order("invited_at"),
    supabase
      .from("organization_memberships")
      .select("user_id")
      .eq("organization_id", organization.id)
      .eq("status", "active"),
    supabase
      .from("diagnostic_indicator_definitions")
      .select("*")
      .match({ ...scope, template_id: assessment.template_id })
      .order("position"),
    supabase
      .from("diagnostic_indicator_values")
      .select("*")
      .match({ ...scope, assessment_id: assessment.id }),
    supabase
      .from("role_permissions")
      .select("role_id")
      .eq("organization_id", organization.id)
      .eq("permission_code", "diagnostic.respond"),
    supabase
      .from("diagnostic_respondent_invitations")
      .select("invitation_id,respondent_role")
      .match({ ...scope, assessment_id: assessment.id })
      .is("accepted_at", null),
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
    respondentsResult,
    membershipsResult,
    indicatorDefinitionsResult,
    indicatorValuesResult,
    respondentRolePermissionsResult,
    invitationMappingsResult,
  ];
  if (results.some((result) => result.error))
    throw new Error("Falha ao carregar a aplicação do diagnóstico.");
  if (!templateResult.data || !startupResult.data) notFound();
  const memberIds = (membershipsResult.data ?? []).map((item) => item.user_id);
  const profilesResult = memberIds.length
    ? await supabase
        .from("profiles")
        .select("id,display_name,email")
        .in("id", memberIds)
        .order("display_name")
    : { data: [], error: null };
  if (profilesResult.error)
    throw new Error(
      "Falha ao carregar as pessoas elegíveis para o diagnóstico.",
    );
  const respondentRoleIds = [
    ...new Set(
      (respondentRolePermissionsResult.data ?? []).map((item) => item.role_id),
    ),
  ];
  const pendingInvitationIds = (invitationMappingsResult.data ?? []).map(
    (item) => item.invitation_id,
  );
  const [respondentRolesResult, pendingInvitationsResult] = await Promise.all([
    respondentRoleIds.length
      ? supabase
          .from("roles")
          .select("id,name")
          .eq("organization_id", organization.id)
          .in("id", respondentRoleIds)
          .order("name")
      : Promise.resolve({ data: [], error: null }),
    pendingInvitationIds.length
      ? supabase
          .from("invitations")
          .select("id,email,invited_name,status,expires_at")
          .eq("organization_id", organization.id)
          .in("id", pendingInvitationIds)
          .eq("status", "pending")
          .order("created_at")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (respondentRolesResult.error || pendingInvitationsResult.error)
    throw new Error("Falha ao carregar os convites do diagnóstico.");
  const responseIds = (responsesResult.data ?? []).map((item) => item.id);
  const evidenceResult = responseIds.length
    ? await supabase
        .from("diagnostic_response_evidence")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("incubator_id", incubator.id)
        .in("response_id", responseIds)
        .eq("status", "available")
        .order("created_at")
    : { data: [], error: null };
  if (evidenceResult.error)
    throw new Error("Falha ao carregar as evidências do diagnóstico.");

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
      respondents={respondentsResult.data ?? []}
      people={profilesResult.data ?? []}
      evidence={evidenceResult.data ?? []}
      indicatorDefinitions={indicatorDefinitionsResult.data ?? []}
      indicatorValues={indicatorValuesResult.data ?? []}
      respondentInvitationRoles={respondentRolesResult.data ?? []}
      pendingRespondentInvitations={(pendingInvitationsResult.data ?? []).map(
        (invitation) => ({
          ...invitation,
          respondentRole:
            invitationMappingsResult.data?.find(
              (item) => item.invitation_id === invitation.id,
            )?.respondent_role ?? "collaborator",
        }),
      )}
      success={firstSearchValue(feedback.success)}
      error={firstSearchValue(feedback.error)}
    />
  );
}
