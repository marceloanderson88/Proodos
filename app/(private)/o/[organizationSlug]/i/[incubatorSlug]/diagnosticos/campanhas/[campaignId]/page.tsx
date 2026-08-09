import { notFound } from "next/navigation";

import { DiagnosticCampaignDetail } from "@/components/diagnostics/diagnostic-campaign-detail";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { firstSearchValue } from "@/lib/m6/server-context";

export const dynamic = "force-dynamic";

export default async function DiagnosticCampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{
    organizationSlug: string;
    incubatorSlug: string;
    campaignId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ organizationSlug, incubatorSlug, campaignId }, feedback] =
    await Promise.all([params, searchParams]);
  const { organization, incubator, supabase } = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const scope = {
    organization_id: organization.id,
    incubator_id: incubator.id,
  };
  const [
    campaignResult,
    participantsResult,
    assessmentsResult,
    startupsResult,
    templatesResult,
    assignmentsResult,
    rolesResult,
    membershipsResult,
    profilesResult,
  ] = await Promise.all([
    supabase
      .from("diagnostic_campaigns")
      .select("*")
      .match({ ...scope, id: campaignId })
      .maybeSingle(),
    supabase
      .from("diagnostic_campaign_startups")
      .select("*")
      .match({ ...scope, campaign_id: campaignId })
      .order("created_at"),
    supabase
      .from("diagnostic_assessments")
      .select("*")
      .match({ ...scope, campaign_id: campaignId })
      .order("created_at"),
    supabase.from("startups").select("id,name").match(scope),
    supabase
      .from("diagnostic_templates")
      .select("id,name,version,version_label")
      .match(scope),
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
  if (!campaignResult.data) notFound();
  if (
    [
      participantsResult,
      assessmentsResult,
      startupsResult,
      templatesResult,
      assignmentsResult,
      rolesResult,
      membershipsResult,
      profilesResult,
    ].some((result) => result.error)
  )
    throw new Error("Falha ao carregar a campanha.");

  const eligibleRoleCodes = new Set(
    campaignResult.data.execution_mode === "facilitated"
      ? [
          "incubator_manager",
          "program_coordinator",
          "agent",
          "evaluator",
          "mentor",
        ]
      : ["incubator_manager", "evaluator"],
  );
  const eligibleRoleIds = new Set(
    (rolesResult.data ?? [])
      .filter((role) => eligibleRoleCodes.has(role.code))
      .map((role) => role.id),
  );
  const eligibleMembershipIds = new Set(
    (assignmentsResult.data ?? [])
      .filter((assignment) => eligibleRoleIds.has(assignment.role_id))
      .map((assignment) => assignment.membership_id),
  );
  const eligibleUserIds = new Set(
    (membershipsResult.data ?? [])
      .filter((membership) => eligibleMembershipIds.has(membership.id))
      .map((membership) => membership.user_id),
  );

  return (
    <DiagnosticCampaignDetail
      organizationSlug={organizationSlug}
      incubatorSlug={incubatorSlug}
      campaign={campaignResult.data}
      participants={participantsResult.data ?? []}
      assessments={assessmentsResult.data ?? []}
      startups={startupsResult.data ?? []}
      templates={templatesResult.data ?? []}
      profiles={(profilesResult.data ?? []).filter((profile) =>
        eligibleUserIds.has(profile.id),
      )}
      success={firstSearchValue(feedback.success)}
      error={firstSearchValue(feedback.error)}
    />
  );
}
