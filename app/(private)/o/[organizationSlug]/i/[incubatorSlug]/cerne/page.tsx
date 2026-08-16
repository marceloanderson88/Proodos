import { CerneWorkspace } from "@/components/cerne/cerne-workspace";
import {
  cernePlanFromJson,
  cerneWorkspaceFromJson,
  type CerneView,
} from "@/lib/cerne/types";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { firstSearchValue } from "@/lib/m6/server-context";

import {
  acceptCerneConfidentialityAction,
  acknowledgeCerneAlertAction,
  assignCerneOwnerAction,
  assignCerneReviewerAction,
  adjustCerneEvidenceSlotAction,
  createCerneCycleAction,
  registerCerneEvidenceAction,
  refreshCerneAlertsAction,
  reviewCerneEvidenceAction,
  saveCerneActionDecisionAction,
} from "./actions";

export const dynamic = "force-dynamic";

const views = new Set<CerneView>([
  "overview",
  "matrix",
  "plan",
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
  const [workspaceResult, planResult] = await Promise.all([
    context.supabase.rpc("get_cerne_workspace", {
      target_organization_id: context.organization.id,
      target_incubator_id: context.incubator.id,
    }),
    context.supabase.rpc("get_cerne_plan", {
      target_organization_id: context.organization.id,
      target_incubator_id: context.incubator.id,
    }),
  ]);
  if (
    workspaceResult.error ||
    !workspaceResult.data ||
    planResult.error ||
    !planResult.data
  )
    throw new Error("Falha ao carregar a governança CERNE.");
  const plan = cernePlanFromJson(planResult.data);
  const workspace = {
    ...cerneWorkspaceFromJson(workspaceResult.data),
    actions: plan.actions,
    actionDecisions: plan.decisions,
  };

  return (
    <CerneWorkspace
      view={view}
      data={workspace}
      currentUserId={context.user.id}
      timezone={context.incubator.timezone}
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
        saveActionDecision: saveCerneActionDecisionAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        adjustEvidenceSlot: adjustCerneEvidenceSlotAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        refreshAlerts: refreshCerneAlertsAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
      }}
    />
  );
}
