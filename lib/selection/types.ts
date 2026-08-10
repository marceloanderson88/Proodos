import type { Json } from "@/lib/supabase/database.types";

export type SelectionView =
  | "overview"
  | "calls"
  | "applications"
  | "reviewers"
  | "reviews"
  | "ranking"
  | "appeals"
  | "results";

export type SelectionCall = {
  id: string;
  code: string;
  slug: string;
  title: string;
  summary: string | null;
  cohort_id: string;
  program_id: string;
  status: string;
  applications_open_at: string;
  applications_close_at: string;
  evaluations_open_at: string | null;
  evaluations_close_at: string | null;
  appeals_open_at: string | null;
  appeals_close_at: string | null;
  total_vacancies: number;
  waitlist_size: number;
  reviewers_per_application: number;
  divergence_threshold: number | null;
};

export type SelectionApplication = {
  id: string;
  call_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  startup_name: string;
  legal_name: string | null;
  tax_id: string | null;
  city: string | null;
  state: string | null;
  sector: string | null;
  stage: string;
  summary: string | null;
  status: string;
  protocol: string;
  submitted_at: string;
  eligibility_notes: string | null;
  converted_startup_id: string | null;
  answers: Record<string, Json>;
};

export type SelectionCriterion = {
  id: string;
  call_id: string;
  code: string;
  name: string;
  description: string | null;
  weight: number;
  min_score: number;
  max_score: number;
  position: number;
};

export type SelectionReviewer = {
  id: string;
  call_id: string;
  user_id: string;
  display_name: string;
  email: string;
  active: boolean;
  confidentiality_accepted_at: string | null;
};

export type SelectionAssignment = {
  id: string;
  call_id: string;
  application_id: string;
  reviewer_id: string;
  reviewer_user_id: string;
  sequence: number;
  status: string;
  submitted_at: string | null;
};

export type SelectionReview = {
  id: string;
  assignment_id: string;
  total_score: number;
  general_justification: string;
  private_notes: string | null;
  scores: Record<string, number>;
};

export type SelectionRanking = {
  id: string;
  call_id: string;
  application_id: string;
  version: number;
  average_score: number;
  review_count: number;
  divergence: number | null;
  general_position: number;
  outcome: string;
};

export type SelectionAppeal = {
  id: string;
  call_id: string;
  application_id: string;
  grounds: string;
  status: string;
  decision: string | null;
  score_adjustment: number | null;
  submitted_at: string;
};

export type SelectionConvocation = {
  id: string;
  call_id: string;
  application_id: string;
  status: string;
  deadline_at: string;
  converted_startup_id: string | null;
};

export type SelectionProgram = {
  id: string;
  name: string;
  cohorts: Array<{ id: string; name: string; code: string }>;
};

export type SelectionWorkspaceData = {
  canManage: boolean;
  canPublish: boolean;
  calls: SelectionCall[];
  programs: SelectionProgram[];
  applications: SelectionApplication[];
  criteria: SelectionCriterion[];
  reviewers: SelectionReviewer[];
  eligiblePeople: Array<{ id: string; display_name: string; email: string }>;
  assignments: SelectionAssignment[];
  reviews: SelectionReview[];
  rankings: SelectionRanking[];
  appeals: SelectionAppeal[];
  convocations: SelectionConvocation[];
};

export type PublicSelectionCall = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  code: string;
  status: string;
  openAt: string;
  closeAt: string;
  incubatorName: string;
  programName: string;
  cohortName: string;
  questions: Array<{
    id: string;
    code: string;
    label: string;
    helpText: string | null;
    kind: string;
    required: boolean;
    options: Json[];
  }>;
  result: Array<{
    startupName?: string;
    city?: string | null;
    state?: string | null;
    position?: number;
    outcome: string;
    score?: number;
  }>;
};

export function selectionWorkspaceFromJson(
  value: Json,
): SelectionWorkspaceData {
  return value as unknown as SelectionWorkspaceData;
}

export function publicSelectionCallFromJson(value: Json): PublicSelectionCall {
  return value as unknown as PublicSelectionCall;
}
