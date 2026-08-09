import { NewDiagnosticCampaign } from "@/components/diagnostics/new-diagnostic-campaign";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";

export const dynamic = "force-dynamic";

export default async function NewDiagnosticCampaignPage({
  params,
}: {
  params: Promise<{ organizationSlug: string; incubatorSlug: string }>;
}) {
  const { organizationSlug, incubatorSlug } = await params;
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
    programsResult,
    cohortsResult,
    startupsResult,
    assignmentsResult,
    rolesResult,
    membershipsResult,
    profilesResult,
  ] = await Promise.all([
    supabase
      .from("diagnostic_templates")
      .select("id,name,version,version_label")
      .match(scope)
      .eq("status", "published")
      .order("name"),
    supabase
      .from("programs")
      .select("id,name")
      .match(scope)
      .is("deleted_at", null)
      .in("status", ["planned", "active"])
      .order("name"),
    supabase
      .from("cohorts")
      .select("id,name,program_id")
      .eq("organization_id", organization.id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("startups")
      .select("id,name,stage")
      .match(scope)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("role_assignments")
      .select("membership_id,role_id")
      .match(scope),
    supabase
      .from("roles")
      .select("id,code")
      .eq("organization_id", organization.id),
    supabase
      .from("organization_memberships")
      .select("id,user_id")
      .eq("organization_id", organization.id)
      .eq("status", "active"),
    supabase.from("profiles").select("id,display_name,email"),
  ]);
  const results = [
    templatesResult,
    programsResult,
    cohortsResult,
    startupsResult,
    assignmentsResult,
    rolesResult,
    membershipsResult,
    profilesResult,
  ];
  if (results.some((result) => result.error))
    throw new Error("Falha ao preparar a campanha de diagnóstico.");

  const evaluatorRoleIds = new Set(
    (rolesResult.data ?? [])
      .filter((role) =>
        [
          "evaluator",
          "incubator_manager",
          "program_coordinator",
          "agent",
          "mentor",
        ].includes(role.code),
      )
      .map((role) => role.id),
  );
  const evaluatorMembershipIds = new Set(
    (assignmentsResult.data ?? [])
      .filter((assignment) => evaluatorRoleIds.has(assignment.role_id))
      .map((assignment) => assignment.membership_id),
  );
  const evaluatorUserIds = new Set(
    (membershipsResult.data ?? [])
      .filter((membership) => evaluatorMembershipIds.has(membership.id))
      .map((membership) => membership.user_id),
  );
  const programIds = new Set(
    (programsResult.data ?? []).map((program) => program.id),
  );

  return (
    <NewDiagnosticCampaign
      organizationSlug={organizationSlug}
      incubatorSlug={incubatorSlug}
      templates={templatesResult.data ?? []}
      programs={programsResult.data ?? []}
      cohorts={(cohortsResult.data ?? []).filter((cohort) =>
        programIds.has(cohort.program_id),
      )}
      startups={startupsResult.data ?? []}
      evaluators={(profilesResult.data ?? [])
        .filter((profile) => evaluatorUserIds.has(profile.id))
        .map((profile) => ({
          id: profile.id,
          full_name: profile.display_name || profile.email || "Pessoa sem nome",
          email: profile.email || "sem e-mail",
        }))}
    />
  );
}
