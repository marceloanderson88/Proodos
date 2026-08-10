import { CerneWorkspace } from "@/components/cerne/cerne-workspace";
import { cerneWorkspaceFromJson, type CerneView } from "@/lib/cerne/types";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { firstSearchValue } from "@/lib/m6/server-context";

import {
  acceptCerneConfidentialityAction,
  acknowledgeCerneAlertAction,
  assignCerneOwnerAction,
  assignCerneReviewerAction,
  createCerneCycleAction,
  registerCerneEvidenceAction,
  reviewCerneEvidenceAction,
} from "./actions";

export const dynamic = "force-dynamic";

const views = new Set<CerneView>([
  "overview",
  "matrix",
  "evidences",
  "alerts",
  "drive",
  "review",
]);

export default async function CernePage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationSlug: string; incubatorSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ organizationSlug, incubatorSlug }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const requested = (firstSearchValue(query.view) ?? "overview") as CerneView;
  const view = views.has(requested) ? requested : "overview";
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  await context.supabase.rpc("refresh_cerne_alerts", {
    target_organization_id: context.organization.id,
    target_incubator_id: context.incubator.id,
  });
  const { data, error } = await context.supabase.rpc("get_cerne_workspace", {
    target_organization_id: context.organization.id,
    target_incubator_id: context.incubator.id,
  });
  if (error || !data) throw new Error("Falha ao carregar a governança CERNE.");

  return (
    <CerneWorkspace
      view={view}
      data={cerneWorkspaceFromJson(data)}
      currentUserId={context.user.id}
      success={firstSearchValue(query.success)}
      error={firstSearchValue(query.error)}
      prefill={{
        sourceType: firstSearchValue(query.sourceType),
        sourceId: firstSearchValue(query.sourceId),
        sourceName: firstSearchValue(query.sourceName),
        practice: firstSearchValue(query.practice),
      }}
      actions={{
        createCycle: createCerneCycleAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        registerEvidence: registerCerneEvidenceAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        assignOwner: assignCerneOwnerAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        acknowledgeAlert: acknowledgeCerneAlertAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        assignReviewer: assignCerneReviewerAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        acceptConfidentiality: acceptCerneConfidentialityAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        reviewEvidence: reviewCerneEvidenceAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
      }}
    />
  );
}
