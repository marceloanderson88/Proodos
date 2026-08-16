import type { Json } from "@/lib/supabase/database.types";

export type CerneView =
  "overview" | "matrix" | "plan" | "evidences" | "alerts" | "drive" | "review";

export type CernePractice = {
  code: string;
  level: 1 | 2;
  process_code: string;
  process_name: string;
  name: string;
  description: string;
  manual_order: number;
  applicable_modules: string[];
};

export type CerneRequirement = {
  id: string;
  practice_code: string;
  code: string;
  name: string;
  description: string;
  mandatory: boolean;
  periodicity: string;
  suggested_source_module: string | null;
  scope_hint: CerneScope;
  manual_gap: boolean;
};

export type CerneScope =
  "incubator" | "program" | "cohort" | "startup" | "selection_call";

export type CerneCycle = {
  id: string;
  name: string;
  reference_year: number;
  target_level: 1 | 2;
  starts_on: string;
  ends_on: string;
  status: string;
  drive_root_path: string;
};

export type CerneSlot = {
  id: string;
  cycle_id: string;
  practice_code: string;
  requirement_id: string;
  scope_type: CerneScope;
  title: string;
  due_at: string | null;
  responsible_user_id: string | null;
  required: boolean;
  adjustment_notes: string | null;
  adjusted_at: string | null;
  status: "pending" | "submitted" | "approved" | "rejected" | "waived";
};

export type CerneAction = {
  id: string;
  action_code: string;
  practice_code: string;
  action_name: string;
  target_audience: string | null;
  original_periodicity: string | null;
  periodicity_group: string | null;
  simplification_suggestion: string;
  minimum_evidence: string;
  manual_order: number;
};

export type CerneActionDecision = {
  id: string;
  cycle_id: string;
  action_id: string;
  status: "to_review" | "accepted" | "adjusted" | "not_applicable";
  decision: string | null;
  notes: string | null;
  minimum_evidence_override: string | null;
  periodicity_override: string | null;
  reviewed_at: string | null;
};

export type CerneEvidence = {
  id: string;
  cycle_id: string;
  slot_id: string;
  practice_code: string;
  title: string;
  description: string | null;
  observed_at: string;
  external_url: string | null;
  source_module: string | null;
  source_entity_type: string | null;
  source_entity_id: string | null;
  drive_path: string;
  sync_status: "not_required" | "pending" | "syncing" | "synced" | "failed";
  status: string;
  submitted_by: string;
  created_at: string;
};

export type CerneAlert = {
  id: string;
  cycle_id: string;
  severity: "info" | "warning" | "critical";
  alert_type: string;
  title: string;
  message: string;
  practice_code: string | null;
  due_at: string | null;
  status: "open" | "acknowledged";
};

export type CerneFolder = {
  id: string;
  cycle_id: string;
  practice_code: string | null;
  folder_kind: "root" | "level" | "process" | "practice" | "context";
  logical_path: string;
  provider_folder_id: string | null;
  sync_status: "pending" | "syncing" | "synced" | "failed";
};

export type CerneOwner = {
  cycle_id: string;
  practice_code: string;
  responsible_user_id: string | null;
  implementation_status: string;
};

export type CerneAssignment = {
  id: string;
  cycle_id: string;
  reviewer_user_id: string;
  practice_code: string | null;
  status: "invited" | "active" | "completed" | "revoked";
  confidentiality_accepted_at: string | null;
};

export type CernePerson = { id: string; name: string; email: string };
export type CerneEntity = { id: string; name: string; programId?: string };

export type CerneWorkspaceData = {
  canManage: boolean;
  canSubmit: boolean;
  canReview: boolean;
  practices: CernePractice[];
  actions: CerneAction[];
  actionDecisions: CerneActionDecision[];
  requirements: CerneRequirement[];
  cycles: CerneCycle[];
  owners: CerneOwner[];
  slots: CerneSlot[];
  evidences: CerneEvidence[];
  folders: CerneFolder[];
  alerts: CerneAlert[];
  assignments: CerneAssignment[];
  reviews: Array<Record<string, unknown>>;
  programs: CerneEntity[];
  cohorts: CerneEntity[];
  startups: CerneEntity[];
  calls: CerneEntity[];
  people: CernePerson[];
};

export function cerneWorkspaceFromJson(value: Json): CerneWorkspaceData {
  return value as unknown as CerneWorkspaceData;
}

export function cernePlanFromJson(value: Json) {
  return value as unknown as {
    actions: CerneAction[];
    decisions: CerneActionDecision[];
  };
}
