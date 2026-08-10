import { SelectionWorkspace } from "@/components/selection/selection-workspace";
import { getIncubatorServerContext } from "@/lib/incubators/server-context";
import { firstSearchValue } from "@/lib/m6/server-context";
import {
  selectionWorkspaceFromJson,
  type SelectionView,
} from "@/lib/selection/types";

import {
  addSelectionReviewerAction,
  acceptSelectionConfidentialityAction,
  assignSelectionReviewerAction,
  autoAssignSelectionReviewersAction,
  convertSelectionApplicationAction,
  createSelectionCallAction,
  createSelectionConvocationsAction,
  decideSelectionAppealAction,
  declareSelectionConflictAction,
  generateSelectionRankingAction,
  publishSelectionCallAction,
  publishSelectionResultAction,
  reviewEligibilityAction,
  submitSelectionReviewAction,
} from "./actions";

export const dynamic = "force-dynamic";

const views = new Set<SelectionView>([
  "overview",
  "calls",
  "applications",
  "reviewers",
  "reviews",
  "ranking",
  "appeals",
  "results",
]);

export default async function SelectionCallsPage({
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
  const requested = (firstSearchValue(query.view) ??
    "overview") as SelectionView;
  const view = views.has(requested) ? requested : "overview";
  const context = await getIncubatorServerContext(
    organizationSlug,
    incubatorSlug,
  );
  const { data, error } = await context.supabase.rpc(
    "get_selection_workspace",
    {
      target_organization_id: context.organization.id,
      target_incubator_id: context.incubator.id,
    },
  );
  if (error || !data)
    throw new Error("Falha ao carregar o módulo de chamadas e seleção.");

  return (
    <SelectionWorkspace
      view={view}
      data={selectionWorkspaceFromJson(data)}
      currentUserId={context.user.id}
      success={firstSearchValue(query.success)}
      error={firstSearchValue(query.error)}
      actions={{
        createCall: createSelectionCallAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        publishCall: publishSelectionCallAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        eligibility: reviewEligibilityAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        addReviewer: addSelectionReviewerAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        acceptConfidentiality: acceptSelectionConfidentialityAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        assignReviewer: assignSelectionReviewerAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        autoAssignReviewers: autoAssignSelectionReviewersAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        submitReview: submitSelectionReviewAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        declareConflict: declareSelectionConflictAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        generateRanking: generateSelectionRankingAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        decideAppeal: decideSelectionAppealAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        publishResult: publishSelectionResultAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        createConvocations: createSelectionConvocationsAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
        convertApplication: convertSelectionApplicationAction.bind(
          null,
          organizationSlug,
          incubatorSlug,
        ),
      }}
    />
  );
}
