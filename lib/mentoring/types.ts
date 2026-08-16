import type { Json } from "@/lib/supabase/database.types";

export type MentoringRound = {
  id: string;
  organization_id: string;
  incubator_id: string;
  cohort_id: string;
  name: string;
  description: string | null;
  booking_opens_at: string;
  booking_closes_at: string;
  sessions_start_at: string;
  sessions_end_at: string;
  timezone: string;
  max_sessions_per_startup: number;
  status: "draft" | "open" | "closed" | "completed" | "cancelled";
  created_at: string;
};

export type MentoringCohortMentor = {
  id: string;
  cohort_id: string;
  mentor_profile_id: string;
  status: "invited" | "active" | "declined" | "revoked";
  invited_at: string;
  responded_at: string | null;
};

export type MentoringRoundMentor = {
  id: string;
  round_id: string;
  cohort_mentor_id: string;
};

export type MentoringCohort = {
  id: string;
  name: string;
  status: string;
  programId: string;
  programName: string;
};

export type MentoringOperations = {
  rounds: MentoringRound[];
  cohortMentors: MentoringCohortMentor[];
  roundMentors: MentoringRoundMentor[];
  cohorts: MentoringCohort[];
};

export function mentoringOperationsFromJson(value: Json): MentoringOperations {
  return value as unknown as MentoringOperations;
}
