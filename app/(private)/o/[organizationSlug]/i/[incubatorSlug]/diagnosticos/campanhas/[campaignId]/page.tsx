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
    supabase.from("profiles").select("id,display_name,email"),
  ]);
  if (!campaignResult.data) notFound();
  if (
    [
      participantsResult,
      assessmentsResult,
      startupsResult,
      templatesResult,
      profilesResult,
    ].some((result) => result.error)
  )
    throw new Error("Falha ao carregar a campanha.");

  return (
    <DiagnosticCampaignDetail
      organizationSlug={organizationSlug}
      incubatorSlug={incubatorSlug}
      campaign={campaignResult.data}
      participants={participantsResult.data ?? []}
      assessments={assessmentsResult.data ?? []}
      startups={startupsResult.data ?? []}
      templates={templatesResult.data ?? []}
      profiles={profilesResult.data ?? []}
      success={firstSearchValue(feedback.success)}
      error={firstSearchValue(feedback.error)}
    />
  );
}
