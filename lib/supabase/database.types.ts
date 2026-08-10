export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          actor_user_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          event_type: string;
          id: number;
          metadata: Json;
          organization_id: string;
        };
        Insert: {
          actor_user_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          event_type: string;
          id?: never;
          metadata?: Json;
          organization_id: string;
        };
        Update: {
          actor_user_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          event_type?: string;
          id?: never;
          metadata?: Json;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      cohorts: {
        Row: {
          capacity: number | null;
          code: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          ends_on: string | null;
          enrollment_ends_on: string | null;
          enrollment_starts_on: string | null;
          id: string;
          launches_on: string;
          name: string;
          organization_id: string;
          program_id: string;
          settings: Json;
          starts_on: string;
          status: Database["public"]["Enums"]["cohort_status"];
          updated_at: string;
        };
        Insert: {
          capacity?: number | null;
          code: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          ends_on?: string | null;
          enrollment_ends_on?: string | null;
          enrollment_starts_on?: string | null;
          id?: string;
          launches_on: string;
          name: string;
          organization_id: string;
          program_id: string;
          settings?: Json;
          starts_on: string;
          status?: Database["public"]["Enums"]["cohort_status"];
          updated_at?: string;
        };
        Update: {
          capacity?: number | null;
          code?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          ends_on?: string | null;
          enrollment_ends_on?: string | null;
          enrollment_starts_on?: string | null;
          id?: string;
          launches_on?: string;
          name?: string;
          organization_id?: string;
          program_id?: string;
          settings?: Json;
          starts_on?: string;
          status?: Database["public"]["Enums"]["cohort_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cohorts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cohorts_program_same_org";
            columns: ["organization_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      diagnostic_assessments: {
        Row: {
          average_gap: number | null;
          campaign_id: string | null;
          campaign_startup_id: string | null;
          classification_code: string | null;
          created_at: string;
          cycle_label: string;
          due_at: string | null;
          evaluator_id: string | null;
          evidence_coverage: number | null;
          execution_mode: Database["public"]["Enums"]["diagnostic_execution_mode"];
          id: string;
          incubator_id: string;
          lock_version: number;
          organization_id: string;
          self_score: number | null;
          started_by: string;
          startup_id: string;
          status: Database["public"]["Enums"]["diagnostic_assessment_status"];
          submitted_at: string | null;
          template_id: string;
          updated_at: string;
          validated_at: string | null;
          validated_score: number | null;
        };
        Insert: {
          average_gap?: number | null;
          campaign_id?: string | null;
          campaign_startup_id?: string | null;
          classification_code?: string | null;
          created_at?: string;
          cycle_label: string;
          due_at?: string | null;
          evaluator_id?: string | null;
          evidence_coverage?: number | null;
          execution_mode?: Database["public"]["Enums"]["diagnostic_execution_mode"];
          id?: string;
          incubator_id: string;
          lock_version?: number;
          organization_id: string;
          self_score?: number | null;
          started_by: string;
          startup_id: string;
          status?: Database["public"]["Enums"]["diagnostic_assessment_status"];
          submitted_at?: string | null;
          template_id: string;
          updated_at?: string;
          validated_at?: string | null;
          validated_score?: number | null;
        };
        Update: {
          average_gap?: number | null;
          campaign_id?: string | null;
          campaign_startup_id?: string | null;
          classification_code?: string | null;
          created_at?: string;
          cycle_label?: string;
          due_at?: string | null;
          evaluator_id?: string | null;
          evidence_coverage?: number | null;
          execution_mode?: Database["public"]["Enums"]["diagnostic_execution_mode"];
          id?: string;
          incubator_id?: string;
          lock_version?: number;
          organization_id?: string;
          self_score?: number | null;
          started_by?: string;
          startup_id?: string;
          status?: Database["public"]["Enums"]["diagnostic_assessment_status"];
          submitted_at?: string | null;
          template_id?: string;
          updated_at?: string;
          validated_at?: string | null;
          validated_score?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_assessments_campaign_fkey";
            columns: ["organization_id", "campaign_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_campaigns";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_assessments_campaign_startup_fkey";
            columns: ["organization_id", "campaign_startup_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_campaign_startups";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_assessments_evaluator_id_fkey";
            columns: ["evaluator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diagnostic_assessments_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_assessments_organization_id_startup_id_fkey";
            columns: ["organization_id", "startup_id"];
            isOneToOne: false;
            referencedRelation: "startups";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_assessments_organization_id_template_id_fkey";
            columns: ["organization_id", "template_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_templates";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_assessments_started_by_fkey";
            columns: ["started_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      diagnostic_assessment_notes: {
        Row: {
          assessment_id: string;
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          incubator_id: string;
          organization_id: string;
        };
        Insert: {
          assessment_id: string;
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          incubator_id: string;
          organization_id: string;
        };
        Update: {
          assessment_id?: string;
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          incubator_id?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_assessment_notes_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diagnostic_assessment_notes_organization_id_assessment_id_fkey";
            columns: ["organization_id", "assessment_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_assessments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_assessment_notes_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      diagnostic_campaign_startups: {
        Row: {
          campaign_id: string;
          created_at: string;
          evaluator_id: string | null;
          id: string;
          incubator_id: string;
          invited_at: string | null;
          last_reminded_at: string | null;
          organization_id: string;
          startup_id: string;
          status: Database["public"]["Enums"]["diagnostic_participant_status"];
          submitted_at: string | null;
          updated_at: string;
          validated_at: string | null;
        };
        Insert: {
          campaign_id: string;
          created_at?: string;
          evaluator_id?: string | null;
          id?: string;
          incubator_id: string;
          invited_at?: string | null;
          last_reminded_at?: string | null;
          organization_id: string;
          startup_id: string;
          status?: Database["public"]["Enums"]["diagnostic_participant_status"];
          submitted_at?: string | null;
          updated_at?: string;
          validated_at?: string | null;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          evaluator_id?: string | null;
          id?: string;
          incubator_id?: string;
          invited_at?: string | null;
          last_reminded_at?: string | null;
          organization_id?: string;
          startup_id?: string;
          status?: Database["public"]["Enums"]["diagnostic_participant_status"];
          submitted_at?: string | null;
          updated_at?: string;
          validated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_campaign_startups_evaluator_id_fkey";
            columns: ["evaluator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diagnostic_campaign_startups_organization_id_campaign_id_fkey";
            columns: ["organization_id", "campaign_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_campaigns";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_campaign_startups_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_campaign_startups_organization_id_startup_id_fkey";
            columns: ["organization_id", "startup_id"];
            isOneToOne: false;
            referencedRelation: "startups";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      diagnostic_campaigns: {
        Row: {
          cancelled_at: string | null;
          cohort_id: string | null;
          communication_message: string;
          communication_subject: string;
          created_at: string;
          created_by: string;
          default_evaluator_id: string | null;
          ends_at: string;
          execution_mode: Database["public"]["Enums"]["diagnostic_execution_mode"];
          id: string;
          incubator_id: string;
          name: string;
          organization_id: string;
          program_id: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["diagnostic_campaign_status"];
          template_id: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          cancelled_at?: string | null;
          cohort_id?: string | null;
          communication_message?: string;
          communication_subject?: string;
          created_at?: string;
          created_by: string;
          default_evaluator_id?: string | null;
          ends_at: string;
          execution_mode?: Database["public"]["Enums"]["diagnostic_execution_mode"];
          id?: string;
          incubator_id: string;
          name: string;
          organization_id: string;
          program_id?: string | null;
          starts_at: string;
          status?: Database["public"]["Enums"]["diagnostic_campaign_status"];
          template_id: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          cancelled_at?: string | null;
          cohort_id?: string | null;
          communication_message?: string;
          communication_subject?: string;
          created_at?: string;
          created_by?: string;
          default_evaluator_id?: string | null;
          ends_at?: string;
          execution_mode?: Database["public"]["Enums"]["diagnostic_execution_mode"];
          id?: string;
          incubator_id?: string;
          name?: string;
          organization_id?: string;
          program_id?: string | null;
          starts_at?: string;
          status?: Database["public"]["Enums"]["diagnostic_campaign_status"];
          template_id?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_campaigns_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diagnostic_campaigns_default_evaluator_id_fkey";
            columns: ["default_evaluator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diagnostic_campaigns_organization_id_cohort_id_fkey";
            columns: ["organization_id", "cohort_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_campaigns_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_campaigns_organization_id_program_id_fkey";
            columns: ["organization_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_campaigns_organization_id_template_id_fkey";
            columns: ["organization_id", "template_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_templates";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      diagnostic_classification_ranges: {
        Row: {
          code: string;
          color_token: string | null;
          created_at: string;
          id: string;
          incubator_id: string;
          label: string;
          maximum_score: number;
          minimum_score: number;
          organization_id: string;
          position: number;
          template_id: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          color_token?: string | null;
          created_at?: string;
          id?: string;
          incubator_id: string;
          label: string;
          maximum_score: number;
          minimum_score: number;
          organization_id: string;
          position: number;
          template_id: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          color_token?: string | null;
          created_at?: string;
          id?: string;
          incubator_id?: string;
          label?: string;
          maximum_score?: number;
          minimum_score?: number;
          organization_id?: string;
          position?: number;
          template_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_classification_ran_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_classification_rang_organization_id_template_id_fkey";
            columns: ["organization_id", "template_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_templates";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      diagnostic_criteria: {
        Row: {
          allows_not_applicable: boolean;
          code: string | null;
          created_at: string;
          dimension_id: string;
          evidence_required_from: number | null;
          help_text: string;
          id: string;
          incubator_id: string;
          internal_notes: string;
          is_required: boolean;
          maximum_score: number;
          not_applicable_guidance: string;
          options: Json;
          organization_id: string;
          position: number;
          prompt: string;
          requires_not_applicable_justification: boolean;
          response_type: Database["public"]["Enums"]["diagnostic_response_type"];
          rubric: Json;
          template_id: string;
          updated_at: string;
          weight: number;
        };
        Insert: {
          allows_not_applicable?: boolean;
          code?: string | null;
          created_at?: string;
          dimension_id: string;
          evidence_required_from?: number | null;
          help_text?: string;
          id?: string;
          incubator_id: string;
          internal_notes?: string;
          is_required?: boolean;
          maximum_score?: number;
          not_applicable_guidance?: string;
          options?: Json;
          organization_id: string;
          position?: number;
          prompt: string;
          requires_not_applicable_justification?: boolean;
          response_type?: Database["public"]["Enums"]["diagnostic_response_type"];
          rubric?: Json;
          template_id: string;
          updated_at?: string;
          weight?: number;
        };
        Update: {
          allows_not_applicable?: boolean;
          code?: string | null;
          created_at?: string;
          dimension_id?: string;
          evidence_required_from?: number | null;
          help_text?: string;
          id?: string;
          incubator_id?: string;
          internal_notes?: string;
          is_required?: boolean;
          maximum_score?: number;
          not_applicable_guidance?: string;
          options?: Json;
          organization_id?: string;
          position?: number;
          prompt?: string;
          requires_not_applicable_justification?: boolean;
          response_type?: Database["public"]["Enums"]["diagnostic_response_type"];
          rubric?: Json;
          template_id?: string;
          updated_at?: string;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_criteria_organization_id_dimension_id_fkey";
            columns: ["organization_id", "dimension_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_dimensions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_criteria_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_criteria_organization_id_template_id_fkey";
            columns: ["organization_id", "template_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_templates";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      diagnostic_criterion_levels: {
        Row: {
          created_at: string;
          criterion_id: string;
          description: string;
          id: string;
          incubator_id: string;
          label: string;
          organization_id: string;
          position: number;
          score: number;
          template_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          criterion_id: string;
          description: string;
          id?: string;
          incubator_id: string;
          label: string;
          organization_id: string;
          position: number;
          score: number;
          template_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          criterion_id?: string;
          description?: string;
          id?: string;
          incubator_id?: string;
          label?: string;
          organization_id?: string;
          position?: number;
          score?: number;
          template_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_criterion_levels_organization_id_criterion_id_fkey";
            columns: ["organization_id", "criterion_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_criteria";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_criterion_levels_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_criterion_levels_organization_id_template_id_fkey";
            columns: ["organization_id", "template_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_templates";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      diagnostic_criterion_stages: {
        Row: {
          created_at: string;
          criterion_id: string;
          organization_id: string;
          stage: Database["public"]["Enums"]["startup_stage"];
          template_id: string;
        };
        Insert: {
          created_at?: string;
          criterion_id: string;
          organization_id: string;
          stage: Database["public"]["Enums"]["startup_stage"];
          template_id: string;
        };
        Update: {
          created_at?: string;
          criterion_id?: string;
          organization_id?: string;
          stage?: Database["public"]["Enums"]["startup_stage"];
          template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_criterion_stages_organization_id_criterion_id_fkey";
            columns: ["organization_id", "criterion_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_criteria";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_criterion_stages_organization_id_template_id_fkey";
            columns: ["organization_id", "template_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_templates";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      diagnostic_dimension_scores: {
        Row: {
          answered_criteria: number;
          applicable_criteria: number;
          assessment_id: string;
          calculated_at: string;
          dimension_id: string;
          effective_weight: number;
          id: string;
          incubator_id: string;
          organization_id: string;
          self_score: number | null;
          validated_criteria: number;
          validated_score: number | null;
        };
        Insert: {
          answered_criteria?: number;
          applicable_criteria?: number;
          assessment_id: string;
          calculated_at?: string;
          dimension_id: string;
          effective_weight: number;
          id?: string;
          incubator_id: string;
          organization_id: string;
          self_score?: number | null;
          validated_criteria?: number;
          validated_score?: number | null;
        };
        Update: {
          answered_criteria?: number;
          applicable_criteria?: number;
          assessment_id?: string;
          calculated_at?: string;
          dimension_id?: string;
          effective_weight?: number;
          id?: string;
          incubator_id?: string;
          organization_id?: string;
          self_score?: number | null;
          validated_criteria?: number;
          validated_score?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_dimension_scores_organization_id_assessment_id_fkey";
            columns: ["organization_id", "assessment_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_assessments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_dimension_scores_organization_id_dimension_id_fkey";
            columns: ["organization_id", "dimension_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_dimensions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_dimension_scores_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      diagnostic_dimension_stages: {
        Row: {
          created_at: string;
          dimension_id: string;
          organization_id: string;
          stage: Database["public"]["Enums"]["startup_stage"];
          template_id: string;
        };
        Insert: {
          created_at?: string;
          dimension_id: string;
          organization_id: string;
          stage: Database["public"]["Enums"]["startup_stage"];
          template_id: string;
        };
        Update: {
          created_at?: string;
          dimension_id?: string;
          organization_id?: string;
          stage?: Database["public"]["Enums"]["startup_stage"];
          template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_dimension_stages_organization_id_dimension_id_fkey";
            columns: ["organization_id", "dimension_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_dimensions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_dimension_stages_organization_id_template_id_fkey";
            columns: ["organization_id", "template_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_templates";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      diagnostic_dimensions: {
        Row: {
          code: string | null;
          created_at: string;
          description: string;
          id: string;
          incubator_id: string;
          is_essential: boolean;
          name: string;
          organization_id: string;
          position: number;
          template_id: string;
          updated_at: string;
          weight: number;
        };
        Insert: {
          code?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          incubator_id: string;
          is_essential?: boolean;
          name: string;
          organization_id: string;
          position?: number;
          template_id: string;
          updated_at?: string;
          weight?: number;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          incubator_id?: string;
          is_essential?: boolean;
          name?: string;
          organization_id?: string;
          position?: number;
          template_id?: string;
          updated_at?: string;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_dimensions_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_dimensions_organization_id_template_id_fkey";
            columns: ["organization_id", "template_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_templates";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      diagnostic_history_events: {
        Row: {
          actor_id: string | null;
          assessment_id: string;
          created_at: string;
          details: Json;
          event_type: string;
          from_status: string | null;
          id: number;
          incubator_id: string;
          organization_id: string;
          to_status: string | null;
        };
        Insert: {
          actor_id?: string | null;
          assessment_id: string;
          created_at?: string;
          details?: Json;
          event_type: string;
          from_status?: string | null;
          id?: never;
          incubator_id: string;
          organization_id: string;
          to_status?: string | null;
        };
        Update: {
          actor_id?: string | null;
          assessment_id?: string;
          created_at?: string;
          details?: Json;
          event_type?: string;
          from_status?: string | null;
          id?: never;
          incubator_id?: string;
          organization_id?: string;
          to_status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_history_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diagnostic_history_events_organization_id_assessment_id_fkey";
            columns: ["organization_id", "assessment_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_assessments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_history_events_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      diagnostic_indicator_definitions: {
        Row: {
          category: string;
          code: string;
          created_at: string;
          evidence_hint: string;
          formula_key: string | null;
          id: string;
          incubator_id: string;
          is_derived: boolean;
          name: string;
          organization_id: string;
          position: number;
          template_id: string;
          unit: string;
          updated_at: string;
          value_type: Database["public"]["Enums"]["diagnostic_indicator_value_type"];
        };
        Insert: {
          category: string;
          code: string;
          created_at?: string;
          evidence_hint?: string;
          formula_key?: string | null;
          id?: string;
          incubator_id: string;
          is_derived?: boolean;
          name: string;
          organization_id: string;
          position: number;
          template_id: string;
          unit: string;
          updated_at?: string;
          value_type: Database["public"]["Enums"]["diagnostic_indicator_value_type"];
        };
        Update: {
          category?: string;
          code?: string;
          created_at?: string;
          evidence_hint?: string;
          formula_key?: string | null;
          id?: string;
          incubator_id?: string;
          is_derived?: boolean;
          name?: string;
          organization_id?: string;
          position?: number;
          template_id?: string;
          unit?: string;
          updated_at?: string;
          value_type?: Database["public"]["Enums"]["diagnostic_indicator_value_type"];
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_indicator_definiti_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_indicator_definitio_organization_id_template_id_fkey";
            columns: ["organization_id", "template_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_templates";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      diagnostic_indicator_values: {
        Row: {
          assessment_id: string;
          created_at: string;
          evidence_notes: string;
          id: string;
          incubator_id: string;
          indicator_definition_id: string;
          is_not_applicable: boolean;
          not_applicable_justification: string | null;
          numeric_value: number | null;
          organization_id: string;
          recorded_by: string;
          target_value: number | null;
          updated_at: string;
        };
        Insert: {
          assessment_id: string;
          created_at?: string;
          evidence_notes?: string;
          id?: string;
          incubator_id: string;
          indicator_definition_id: string;
          is_not_applicable?: boolean;
          not_applicable_justification?: string | null;
          numeric_value?: number | null;
          organization_id: string;
          recorded_by: string;
          target_value?: number | null;
          updated_at?: string;
        };
        Update: {
          assessment_id?: string;
          created_at?: string;
          evidence_notes?: string;
          id?: string;
          incubator_id?: string;
          indicator_definition_id?: string;
          is_not_applicable?: boolean;
          not_applicable_justification?: string | null;
          numeric_value?: number | null;
          organization_id?: string;
          recorded_by?: string;
          target_value?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_indicator_values_organization_id_assessment_id_fkey";
            columns: ["organization_id", "assessment_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_assessments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_indicator_values_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_indicator_values_organization_id_indicator_defi_fkey";
            columns: ["organization_id", "indicator_definition_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_indicator_definitions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_indicator_values_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      diagnostic_respondents: {
        Row: {
          accepted_at: string | null;
          assessment_id: string;
          can_submit: boolean;
          created_at: string;
          id: string;
          incubator_id: string;
          invited_at: string;
          invited_by: string;
          organization_id: string;
          revoked_at: string | null;
          role: Database["public"]["Enums"]["diagnostic_respondent_role"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          assessment_id: string;
          can_submit?: boolean;
          created_at?: string;
          id?: string;
          incubator_id: string;
          invited_at?: string;
          invited_by: string;
          organization_id: string;
          revoked_at?: string | null;
          role?: Database["public"]["Enums"]["diagnostic_respondent_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accepted_at?: string | null;
          assessment_id?: string;
          can_submit?: boolean;
          created_at?: string;
          id?: string;
          incubator_id?: string;
          invited_at?: string;
          invited_by?: string;
          organization_id?: string;
          revoked_at?: string | null;
          role?: Database["public"]["Enums"]["diagnostic_respondent_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_respondents_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diagnostic_respondents_organization_id_assessment_id_fkey";
            columns: ["organization_id", "assessment_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_assessments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_respondents_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_respondents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      diagnostic_respondent_invitations: {
        Row: {
          accepted_at: string | null;
          assessment_id: string;
          can_submit: boolean;
          created_at: string;
          created_by: string;
          id: string;
          incubator_id: string;
          invitation_id: string;
          organization_id: string;
          respondent_role: Database["public"]["Enums"]["diagnostic_respondent_role"];
          respondent_user_id: string | null;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          assessment_id: string;
          can_submit?: boolean;
          created_at?: string;
          created_by: string;
          id?: string;
          incubator_id: string;
          invitation_id: string;
          organization_id: string;
          respondent_role?: Database["public"]["Enums"]["diagnostic_respondent_role"];
          respondent_user_id?: string | null;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          assessment_id?: string;
          can_submit?: boolean;
          created_at?: string;
          created_by?: string;
          id?: string;
          incubator_id?: string;
          invitation_id?: string;
          organization_id?: string;
          respondent_role?: Database["public"]["Enums"]["diagnostic_respondent_role"];
          respondent_user_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_respondent_invitations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diagnostic_respondent_invitations_invitation_id_fkey";
            columns: ["invitation_id"];
            isOneToOne: true;
            referencedRelation: "invitations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diagnostic_respondent_invitations_organization_id_assessment_id_fkey";
            columns: ["organization_id", "assessment_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_assessments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_respondent_invitations_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_respondent_invitations_respondent_user_id_fkey";
            columns: ["respondent_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      diagnostic_response_evidence: {
        Row: {
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          external_url: string | null;
          file_id: string | null;
          id: string;
          incubator_id: string;
          kind: Database["public"]["Enums"]["diagnostic_evidence_kind"];
          label: string;
          organization_id: string;
          response_id: string;
          status: Database["public"]["Enums"]["diagnostic_evidence_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          external_url?: string | null;
          file_id?: string | null;
          id?: string;
          incubator_id: string;
          kind: Database["public"]["Enums"]["diagnostic_evidence_kind"];
          label: string;
          organization_id: string;
          response_id: string;
          status?: Database["public"]["Enums"]["diagnostic_evidence_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          external_url?: string | null;
          file_id?: string | null;
          id?: string;
          incubator_id?: string;
          kind?: Database["public"]["Enums"]["diagnostic_evidence_kind"];
          label?: string;
          organization_id?: string;
          response_id?: string;
          status?: Database["public"]["Enums"]["diagnostic_evidence_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_response_evidence_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diagnostic_response_evidence_organization_id_file_id_fkey";
            columns: ["organization_id", "file_id"];
            isOneToOne: false;
            referencedRelation: "files";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_response_evidence_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_response_evidence_response_id_fkey";
            columns: ["response_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_responses";
            referencedColumns: ["id"];
          },
        ];
      };
      diagnostic_response_validations: {
        Row: {
          created_at: string;
          evaluator_comment: string;
          finalized_at: string | null;
          id: string;
          incubator_id: string;
          organization_id: string;
          response_id: string;
          revision: number;
          status: Database["public"]["Enums"]["diagnostic_validation_status"];
          validated_value: Json | null;
          validator_id: string;
        };
        Insert: {
          created_at?: string;
          evaluator_comment?: string;
          finalized_at?: string | null;
          id?: string;
          incubator_id: string;
          organization_id: string;
          response_id: string;
          revision?: number;
          status?: Database["public"]["Enums"]["diagnostic_validation_status"];
          validated_value?: Json | null;
          validator_id: string;
        };
        Update: {
          created_at?: string;
          evaluator_comment?: string;
          finalized_at?: string | null;
          id?: string;
          incubator_id?: string;
          organization_id?: string;
          response_id?: string;
          revision?: number;
          status?: Database["public"]["Enums"]["diagnostic_validation_status"];
          validated_value?: Json | null;
          validator_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_response_validations_response_id_fkey";
            columns: ["response_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_responses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diagnostic_response_validations_validator_id_fkey";
            columns: ["validator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      diagnostic_responses: {
        Row: {
          assessment_id: string;
          created_at: string;
          criterion_id: string;
          evaluator_comment: string;
          evidence_notes: string;
          id: string;
          incubator_id: string;
          is_not_applicable: boolean;
          not_applicable_justification: string | null;
          organization_id: string;
          self_comment: string;
          self_value: Json | null;
          updated_at: string;
          validated_at: string | null;
          validated_by: string | null;
          validated_value: Json | null;
        };
        Insert: {
          assessment_id: string;
          created_at?: string;
          criterion_id: string;
          evaluator_comment?: string;
          evidence_notes?: string;
          id?: string;
          incubator_id: string;
          is_not_applicable?: boolean;
          not_applicable_justification?: string | null;
          organization_id: string;
          self_comment?: string;
          self_value?: Json | null;
          updated_at?: string;
          validated_at?: string | null;
          validated_by?: string | null;
          validated_value?: Json | null;
        };
        Update: {
          assessment_id?: string;
          created_at?: string;
          criterion_id?: string;
          evaluator_comment?: string;
          evidence_notes?: string;
          id?: string;
          incubator_id?: string;
          is_not_applicable?: boolean;
          not_applicable_justification?: string | null;
          organization_id?: string;
          self_comment?: string;
          self_value?: Json | null;
          updated_at?: string;
          validated_at?: string | null;
          validated_by?: string | null;
          validated_value?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_responses_organization_id_assessment_id_fkey";
            columns: ["organization_id", "assessment_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_assessments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_responses_organization_id_criterion_id_fkey";
            columns: ["organization_id", "criterion_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_criteria";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_responses_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_responses_validated_by_fkey";
            columns: ["validated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      diagnostic_template_families: {
        Row: {
          archived_at: string | null;
          code: string;
          created_at: string;
          created_by: string;
          description: string;
          id: string;
          incubator_id: string | null;
          is_standard: boolean;
          methodology_name: string | null;
          name: string;
          organization_id: string;
          scope: Database["public"]["Enums"]["diagnostic_template_scope"];
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          code: string;
          created_at?: string;
          created_by: string;
          description?: string;
          id?: string;
          incubator_id?: string | null;
          is_standard?: boolean;
          methodology_name?: string | null;
          name: string;
          organization_id: string;
          scope?: Database["public"]["Enums"]["diagnostic_template_scope"];
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          code?: string;
          created_at?: string;
          created_by?: string;
          description?: string;
          id?: string;
          incubator_id?: string | null;
          is_standard?: boolean;
          methodology_name?: string | null;
          name?: string;
          organization_id?: string;
          scope?: Database["public"]["Enums"]["diagnostic_template_scope"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_template_families_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diagnostic_template_families_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diagnostic_template_families_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      diagnostic_templates: {
        Row: {
          archived_at: string | null;
          based_on_version_id: string | null;
          changelog: string;
          created_at: string;
          created_by: string;
          description: string;
          family_id: string;
          id: string;
          incubator_id: string;
          instructions: string;
          name: string;
          organization_id: string;
          published_at: string | null;
          source_checksum: string | null;
          status: Database["public"]["Enums"]["diagnostic_template_status"];
          updated_at: string;
          version: number;
          version_label: string;
        };
        Insert: {
          archived_at?: string | null;
          based_on_version_id?: string | null;
          changelog?: string;
          created_at?: string;
          created_by: string;
          description?: string;
          family_id?: string;
          id?: string;
          incubator_id: string;
          instructions?: string;
          name: string;
          organization_id: string;
          published_at?: string | null;
          source_checksum?: string | null;
          status?: Database["public"]["Enums"]["diagnostic_template_status"];
          updated_at?: string;
          version?: number;
          version_label: string;
        };
        Update: {
          archived_at?: string | null;
          based_on_version_id?: string | null;
          changelog?: string;
          created_at?: string;
          created_by?: string;
          description?: string;
          family_id?: string;
          id?: string;
          incubator_id?: string;
          instructions?: string;
          name?: string;
          organization_id?: string;
          published_at?: string | null;
          source_checksum?: string | null;
          status?: Database["public"]["Enums"]["diagnostic_template_status"];
          updated_at?: string;
          version?: number;
          version_label?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_templates_based_on_fkey";
            columns: ["based_on_version_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diagnostic_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diagnostic_templates_family_fkey";
            columns: ["organization_id", "family_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_template_families";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_templates_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diagnostic_templates_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      diagnostic_trigger_results: {
        Row: {
          assessment_id: string;
          evaluated_at: string;
          id: string;
          incubator_id: string;
          message: string;
          observed_value: number | null;
          organization_id: string;
          status: Database["public"]["Enums"]["diagnostic_trigger_result_status"];
          trigger_rule_id: string;
        };
        Insert: {
          assessment_id: string;
          evaluated_at?: string;
          id?: string;
          incubator_id: string;
          message: string;
          observed_value?: number | null;
          organization_id: string;
          status: Database["public"]["Enums"]["diagnostic_trigger_result_status"];
          trigger_rule_id: string;
        };
        Update: {
          assessment_id?: string;
          evaluated_at?: string;
          id?: string;
          incubator_id?: string;
          message?: string;
          observed_value?: number | null;
          organization_id?: string;
          status?: Database["public"]["Enums"]["diagnostic_trigger_result_status"];
          trigger_rule_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_trigger_results_organization_id_assessment_id_fkey";
            columns: ["organization_id", "assessment_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_assessments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_trigger_results_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_trigger_results_organization_id_trigger_rule_id_fkey";
            columns: ["organization_id", "trigger_rule_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_trigger_rules";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      diagnostic_trigger_rules: {
        Row: {
          aggregate_key: string | null;
          code: string;
          created_at: string;
          criterion_id: string | null;
          id: string;
          incubator_id: string;
          indicator_definition_id: string | null;
          message: string;
          name: string;
          operator: Database["public"]["Enums"]["diagnostic_trigger_operator"];
          organization_id: string;
          position: number;
          recommended_action: string;
          severity: Database["public"]["Enums"]["diagnostic_trigger_severity"];
          source_type: Database["public"]["Enums"]["diagnostic_trigger_source"];
          template_id: string;
          threshold: number;
          updated_at: string;
        };
        Insert: {
          aggregate_key?: string | null;
          code: string;
          created_at?: string;
          criterion_id?: string | null;
          id?: string;
          incubator_id: string;
          indicator_definition_id?: string | null;
          message: string;
          name: string;
          operator: Database["public"]["Enums"]["diagnostic_trigger_operator"];
          organization_id: string;
          position: number;
          recommended_action?: string;
          severity?: Database["public"]["Enums"]["diagnostic_trigger_severity"];
          source_type: Database["public"]["Enums"]["diagnostic_trigger_source"];
          template_id: string;
          threshold: number;
          updated_at?: string;
        };
        Update: {
          aggregate_key?: string | null;
          code?: string;
          created_at?: string;
          criterion_id?: string | null;
          id?: string;
          incubator_id?: string;
          indicator_definition_id?: string | null;
          message?: string;
          name?: string;
          operator?: Database["public"]["Enums"]["diagnostic_trigger_operator"];
          organization_id?: string;
          position?: number;
          recommended_action?: string;
          severity?: Database["public"]["Enums"]["diagnostic_trigger_severity"];
          source_type?: Database["public"]["Enums"]["diagnostic_trigger_source"];
          template_id?: string;
          threshold?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_trigger_rules_organization_id_criterion_id_fkey";
            columns: ["organization_id", "criterion_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_criteria";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_trigger_rules_organization_id_incubator_id_fkey";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_trigger_rules_organization_id_indicator_definit_fkey";
            columns: ["organization_id", "indicator_definition_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_indicator_definitions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "diagnostic_trigger_rules_organization_id_template_id_fkey";
            columns: ["organization_id", "template_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_templates";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      file_access_logs: {
        Row: {
          created_at: string;
          file_id: string | null;
          id: number;
          ip_hash: string | null;
          metadata: Json;
          operation: Database["public"]["Enums"]["file_access_operation"];
          organization_id: string;
          reason_code: string | null;
          request_id: string | null;
          result: Database["public"]["Enums"]["file_access_result"];
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          file_id?: string | null;
          id?: never;
          ip_hash?: string | null;
          metadata?: Json;
          operation: Database["public"]["Enums"]["file_access_operation"];
          organization_id: string;
          reason_code?: string | null;
          request_id?: string | null;
          result: Database["public"]["Enums"]["file_access_result"];
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          file_id?: string | null;
          id?: never;
          ip_hash?: string | null;
          metadata?: Json;
          operation?: Database["public"]["Enums"]["file_access_operation"];
          organization_id?: string;
          reason_code?: string | null;
          request_id?: string | null;
          result?: Database["public"]["Enums"]["file_access_result"];
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "file_access_logs_file_same_org";
            columns: ["organization_id", "file_id"];
            isOneToOne: false;
            referencedRelation: "files";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "file_access_logs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      file_links: {
        Row: {
          classification_override:
            Database["public"]["Enums"]["file_classification"] | null;
          created_at: string;
          created_by: string;
          file_id: string;
          id: string;
          incubator_id: string | null;
          label: string | null;
          organization_id: string;
          program_id: string | null;
          purpose: Database["public"]["Enums"]["file_link_purpose"];
          startup_id: string | null;
          unit_id: string | null;
        };
        Insert: {
          classification_override?:
            Database["public"]["Enums"]["file_classification"] | null;
          created_at?: string;
          created_by: string;
          file_id: string;
          id?: string;
          incubator_id?: string | null;
          label?: string | null;
          organization_id: string;
          program_id?: string | null;
          purpose: Database["public"]["Enums"]["file_link_purpose"];
          startup_id?: string | null;
          unit_id?: string | null;
        };
        Update: {
          classification_override?:
            Database["public"]["Enums"]["file_classification"] | null;
          created_at?: string;
          created_by?: string;
          file_id?: string;
          id?: string;
          incubator_id?: string | null;
          label?: string | null;
          organization_id?: string;
          program_id?: string | null;
          purpose?: Database["public"]["Enums"]["file_link_purpose"];
          startup_id?: string | null;
          unit_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "file_links_file_same_org";
            columns: ["organization_id", "file_id"];
            isOneToOne: false;
            referencedRelation: "files";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "file_links_incubator_same_org";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "file_links_program_same_org";
            columns: ["organization_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "file_links_startup_same_org";
            columns: ["organization_id", "startup_id"];
            isOneToOne: false;
            referencedRelation: "startups";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "file_links_unit_same_org";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "organization_units";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      file_versions: {
        Row: {
          checksum: string | null;
          checksum_algorithm: string | null;
          created_at: string;
          created_by: string;
          file_id: string;
          id: string;
          mime_type: string;
          organization_id: string;
          provider_file_id: string;
          provider_revision_id: string | null;
          size_bytes: number;
          superseded_at: string | null;
          version_number: number;
        };
        Insert: {
          checksum?: string | null;
          checksum_algorithm?: string | null;
          created_at?: string;
          created_by: string;
          file_id: string;
          id?: string;
          mime_type: string;
          organization_id: string;
          provider_file_id: string;
          provider_revision_id?: string | null;
          size_bytes: number;
          superseded_at?: string | null;
          version_number: number;
        };
        Update: {
          checksum?: string | null;
          checksum_algorithm?: string | null;
          created_at?: string;
          created_by?: string;
          file_id?: string;
          id?: string;
          mime_type?: string;
          organization_id?: string;
          provider_file_id?: string;
          provider_revision_id?: string | null;
          size_bytes?: number;
          superseded_at?: string | null;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "file_versions_file_same_org";
            columns: ["organization_id", "file_id"];
            isOneToOne: false;
            referencedRelation: "files";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      files: {
        Row: {
          checksum: string | null;
          checksum_algorithm: string | null;
          classification: Database["public"]["Enums"]["file_classification"];
          created_at: string;
          created_by: string;
          current_version_number: number;
          deleted_at: string | null;
          display_name: string;
          expected_size_bytes: number;
          failure_code: string | null;
          failure_detail: string | null;
          id: string;
          incubator_id: string | null;
          last_reconciled_at: string | null;
          mime_type: string;
          organization_id: string;
          original_name: string;
          provider: Database["public"]["Enums"]["file_provider"];
          provider_drive_id: string | null;
          provider_file_id: string | null;
          provider_parent_id: string | null;
          size_bytes: number | null;
          status: Database["public"]["Enums"]["file_status"];
          unit_id: string | null;
          updated_at: string;
          upload_expires_at: string | null;
        };
        Insert: {
          checksum?: string | null;
          checksum_algorithm?: string | null;
          classification?: Database["public"]["Enums"]["file_classification"];
          created_at?: string;
          created_by: string;
          current_version_number?: number;
          deleted_at?: string | null;
          display_name: string;
          expected_size_bytes: number;
          failure_code?: string | null;
          failure_detail?: string | null;
          id?: string;
          incubator_id?: string | null;
          last_reconciled_at?: string | null;
          mime_type: string;
          organization_id: string;
          original_name: string;
          provider?: Database["public"]["Enums"]["file_provider"];
          provider_drive_id?: string | null;
          provider_file_id?: string | null;
          provider_parent_id?: string | null;
          size_bytes?: number | null;
          status?: Database["public"]["Enums"]["file_status"];
          unit_id?: string | null;
          updated_at?: string;
          upload_expires_at?: string | null;
        };
        Update: {
          checksum?: string | null;
          checksum_algorithm?: string | null;
          classification?: Database["public"]["Enums"]["file_classification"];
          created_at?: string;
          created_by?: string;
          current_version_number?: number;
          deleted_at?: string | null;
          display_name?: string;
          expected_size_bytes?: number;
          failure_code?: string | null;
          failure_detail?: string | null;
          id?: string;
          incubator_id?: string | null;
          last_reconciled_at?: string | null;
          mime_type?: string;
          organization_id?: string;
          original_name?: string;
          provider?: Database["public"]["Enums"]["file_provider"];
          provider_drive_id?: string | null;
          provider_file_id?: string | null;
          provider_parent_id?: string | null;
          size_bytes?: number | null;
          status?: Database["public"]["Enums"]["file_status"];
          unit_id?: string | null;
          updated_at?: string;
          upload_expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "files_incubator_same_org";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "files_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "files_unit_same_org";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "organization_units";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      incubators: {
        Row: {
          city: string | null;
          contact_email: string | null;
          country_code: string;
          created_at: string;
          created_by: string;
          custom_kind: string | null;
          deleted_at: string | null;
          id: string;
          kind: Database["public"]["Enums"]["incubator_kind"];
          legal_name: string | null;
          locale: string;
          logo_path: string | null;
          name: string;
          onboarding_completed_at: string | null;
          organization_id: string;
          phone: string | null;
          responsible_name: string | null;
          settings: Json;
          short_description: string | null;
          slug: string;
          state: string | null;
          status: Database["public"]["Enums"]["organization_status"];
          timezone: string;
          unit_id: string | null;
          updated_at: string;
          website_url: string | null;
        };
        Insert: {
          city?: string | null;
          contact_email?: string | null;
          country_code?: string;
          created_at?: string;
          created_by: string;
          custom_kind?: string | null;
          deleted_at?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["incubator_kind"];
          legal_name?: string | null;
          locale?: string;
          logo_path?: string | null;
          name: string;
          onboarding_completed_at?: string | null;
          organization_id: string;
          phone?: string | null;
          responsible_name?: string | null;
          settings?: Json;
          short_description?: string | null;
          slug: string;
          state?: string | null;
          status?: Database["public"]["Enums"]["organization_status"];
          timezone?: string;
          unit_id?: string | null;
          updated_at?: string;
          website_url?: string | null;
        };
        Update: {
          city?: string | null;
          contact_email?: string | null;
          country_code?: string;
          created_at?: string;
          created_by?: string;
          custom_kind?: string | null;
          deleted_at?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["incubator_kind"];
          legal_name?: string | null;
          locale?: string;
          logo_path?: string | null;
          name?: string;
          onboarding_completed_at?: string | null;
          organization_id?: string;
          phone?: string | null;
          responsible_name?: string | null;
          settings?: Json;
          short_description?: string | null;
          slug?: string;
          state?: string | null;
          status?: Database["public"]["Enums"]["organization_status"];
          timezone?: string;
          unit_id?: string | null;
          updated_at?: string;
          website_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "incubators_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incubators_unit_same_org";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "organization_units";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          incubator_id: string | null;
          invited_by: string;
          invited_name: string | null;
          last_sent_at: string;
          organization_id: string;
          revoked_at: string | null;
          role_id: string;
          send_count: number;
          status: Database["public"]["Enums"]["invitation_status"];
          token_hash: string;
          unit_id: string | null;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at: string;
          id?: string;
          incubator_id?: string | null;
          invited_by: string;
          invited_name?: string | null;
          last_sent_at?: string;
          organization_id: string;
          revoked_at?: string | null;
          role_id: string;
          send_count?: number;
          status?: Database["public"]["Enums"]["invitation_status"];
          token_hash: string;
          unit_id?: string | null;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          incubator_id?: string | null;
          invited_by?: string;
          invited_name?: string | null;
          last_sent_at?: string;
          organization_id?: string;
          revoked_at?: string | null;
          role_id?: string;
          send_count?: number;
          status?: Database["public"]["Enums"]["invitation_status"];
          token_hash?: string;
          unit_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_incubator_same_org";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "invitations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_role_same_org";
            columns: ["organization_id", "role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "invitations_unit_same_org";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "organization_units";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      mentor_availability_slots: {
        Row: {
          created_at: string;
          created_by: string;
          effective_from: string;
          effective_until: string | null;
          ends_at: string;
          id: string;
          incubator_id: string;
          is_active: boolean;
          mentor_profile_id: string;
          organization_id: string;
          starts_at: string;
          timezone: string;
          updated_at: string;
          weekday: number;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          effective_from?: string;
          effective_until?: string | null;
          ends_at: string;
          id?: string;
          incubator_id: string;
          is_active?: boolean;
          mentor_profile_id: string;
          organization_id: string;
          starts_at: string;
          timezone?: string;
          updated_at?: string;
          weekday: number;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          effective_from?: string;
          effective_until?: string | null;
          ends_at?: string;
          id?: string;
          incubator_id?: string;
          is_active?: boolean;
          mentor_profile_id?: string;
          organization_id?: string;
          starts_at?: string;
          timezone?: string;
          updated_at?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "mentor_availability_incubator_same_org";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "mentor_availability_profile_same_org";
            columns: ["organization_id", "mentor_profile_id"];
            isOneToOne: false;
            referencedRelation: "mentor_profiles";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      mentoring_recommendations: {
        Row: {
          converted_action_id: string | null;
          created_at: string;
          created_by: string;
          description: string;
          due_on: string | null;
          id: string;
          organization_id: string;
          owner_user_id: string | null;
          priority: Database["public"]["Enums"]["mentoring_recommendation_priority"];
          session_id: string;
          status: Database["public"]["Enums"]["mentoring_recommendation_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          converted_action_id?: string | null;
          created_at?: string;
          created_by: string;
          description: string;
          due_on?: string | null;
          id?: string;
          organization_id: string;
          owner_user_id?: string | null;
          priority?: Database["public"]["Enums"]["mentoring_recommendation_priority"];
          session_id: string;
          status?: Database["public"]["Enums"]["mentoring_recommendation_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          converted_action_id?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string;
          due_on?: string | null;
          id?: string;
          organization_id?: string;
          owner_user_id?: string | null;
          priority?: Database["public"]["Enums"]["mentoring_recommendation_priority"];
          session_id?: string;
          status?: Database["public"]["Enums"]["mentoring_recommendation_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mentoring_recommendations_session_same_org";
            columns: ["organization_id", "session_id"];
            isOneToOne: false;
            referencedRelation: "mentoring_sessions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      mentoring_feedback: {
        Row: {
          author_user_id: string;
          created_at: string;
          id: string;
          improvements: string;
          is_shared: boolean;
          kind: Database["public"]["Enums"]["mentoring_feedback_kind"];
          organization_id: string;
          rating: number;
          session_id: string;
          strengths: string;
          updated_at: string;
        };
        Insert: {
          author_user_id: string;
          created_at?: string;
          id?: string;
          improvements: string;
          is_shared?: boolean;
          kind: Database["public"]["Enums"]["mentoring_feedback_kind"];
          organization_id: string;
          rating: number;
          session_id: string;
          strengths: string;
          updated_at?: string;
        };
        Update: {
          author_user_id?: string;
          created_at?: string;
          id?: string;
          improvements?: string;
          is_shared?: boolean;
          kind?: Database["public"]["Enums"]["mentoring_feedback_kind"];
          organization_id?: string;
          rating?: number;
          session_id?: string;
          strengths?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mentoring_feedback_session_same_org";
            columns: ["organization_id", "session_id"];
            isOneToOne: false;
            referencedRelation: "mentoring_sessions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      mentoring_session_notes: {
        Row: {
          author_user_id: string;
          content: string;
          created_at: string;
          id: string;
          organization_id: string;
          session_id: string;
          updated_at: string;
          visibility: Database["public"]["Enums"]["mentoring_note_visibility"];
        };
        Insert: {
          author_user_id: string;
          content: string;
          created_at?: string;
          id?: string;
          organization_id: string;
          session_id: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["mentoring_note_visibility"];
        };
        Update: {
          author_user_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          organization_id?: string;
          session_id?: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["mentoring_note_visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "mentoring_notes_session_same_org";
            columns: ["organization_id", "session_id"];
            isOneToOne: false;
            referencedRelation: "mentoring_sessions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      mentoring_sessions: {
        Row: {
          assignment_id: string;
          calendar_provider: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string;
          diagnostic_assessment_id: string | null;
          external_calendar_event_id: string | null;
          id: string;
          incubator_id: string;
          location: string | null;
          meeting_url: string | null;
          mode: Database["public"]["Enums"]["mentoring_session_mode"];
          objective: string;
          organization_id: string;
          requested_by: string;
          scheduled_end_at: string | null;
          scheduled_start_at: string | null;
          status: Database["public"]["Enums"]["mentoring_session_status"];
          timezone: string;
          updated_at: string;
        };
        Insert: {
          assignment_id: string;
          calendar_provider?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by: string;
          diagnostic_assessment_id?: string | null;
          external_calendar_event_id?: string | null;
          id?: string;
          incubator_id: string;
          location?: string | null;
          meeting_url?: string | null;
          mode?: Database["public"]["Enums"]["mentoring_session_mode"];
          objective: string;
          organization_id: string;
          requested_by: string;
          scheduled_end_at?: string | null;
          scheduled_start_at?: string | null;
          status?: Database["public"]["Enums"]["mentoring_session_status"];
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          assignment_id?: string;
          calendar_provider?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string;
          diagnostic_assessment_id?: string | null;
          external_calendar_event_id?: string | null;
          id?: string;
          incubator_id?: string;
          location?: string | null;
          meeting_url?: string | null;
          mode?: Database["public"]["Enums"]["mentoring_session_mode"];
          objective?: string;
          organization_id?: string;
          requested_by?: string;
          scheduled_end_at?: string | null;
          scheduled_start_at?: string | null;
          status?: Database["public"]["Enums"]["mentoring_session_status"];
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mentoring_sessions_assignment_same_org";
            columns: ["organization_id", "assignment_id"];
            isOneToOne: false;
            referencedRelation: "mentor_startup_assignments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "mentoring_sessions_diagnostic_same_org";
            columns: ["organization_id", "diagnostic_assessment_id"];
            isOneToOne: false;
            referencedRelation: "diagnostic_assessments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "mentoring_sessions_incubator_same_org";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      mentor_profiles: {
        Row: {
          archived_at: string | null;
          bio: string;
          created_at: string;
          created_by: string;
          headline: string;
          id: string;
          incubator_id: string;
          linkedin_url: string | null;
          organization_id: string;
          status: Database["public"]["Enums"]["mentor_profile_status"];
          timezone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          bio: string;
          created_at?: string;
          created_by: string;
          headline: string;
          id?: string;
          incubator_id: string;
          linkedin_url?: string | null;
          organization_id: string;
          status?: Database["public"]["Enums"]["mentor_profile_status"];
          timezone?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          bio?: string;
          created_at?: string;
          created_by?: string;
          headline?: string;
          id?: string;
          incubator_id?: string;
          linkedin_url?: string | null;
          organization_id?: string;
          status?: Database["public"]["Enums"]["mentor_profile_status"];
          timezone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mentor_profiles_incubator_same_org";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "mentor_profiles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      mentor_skills: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          kind: Database["public"]["Enums"]["mentor_skill_kind"];
          mentor_profile_id: string;
          name: string;
          organization_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          kind: Database["public"]["Enums"]["mentor_skill_kind"];
          mentor_profile_id: string;
          name: string;
          organization_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["mentor_skill_kind"];
          mentor_profile_id?: string;
          name?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mentor_skills_profile_same_org";
            columns: ["organization_id", "mentor_profile_id"];
            isOneToOne: false;
            referencedRelation: "mentor_profiles";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      mentor_startup_assignments: {
        Row: {
          created_at: string;
          created_by: string;
          ended_at: string | null;
          ends_on: string | null;
          focus: string | null;
          id: string;
          incubator_id: string;
          mentor_profile_id: string;
          organization_id: string;
          starts_on: string;
          startup_id: string;
          status: Database["public"]["Enums"]["mentor_assignment_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          ended_at?: string | null;
          ends_on?: string | null;
          focus?: string | null;
          id?: string;
          incubator_id: string;
          mentor_profile_id: string;
          organization_id: string;
          starts_on?: string;
          startup_id: string;
          status?: Database["public"]["Enums"]["mentor_assignment_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          ended_at?: string | null;
          ends_on?: string | null;
          focus?: string | null;
          id?: string;
          incubator_id?: string;
          mentor_profile_id?: string;
          organization_id?: string;
          starts_on?: string;
          startup_id?: string;
          status?: Database["public"]["Enums"]["mentor_assignment_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mentor_assignments_incubator_same_org";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "mentor_assignments_profile_same_org";
            columns: ["organization_id", "mentor_profile_id"];
            isOneToOne: false;
            referencedRelation: "mentor_profiles";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "mentor_assignments_startup_same_org";
            columns: ["organization_id", "startup_id"];
            isOneToOne: false;
            referencedRelation: "startups";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      organization_memberships: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          joined_at: string | null;
          organization_id: string;
          status: Database["public"]["Enums"]["membership_status"];
          suspended_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          joined_at?: string | null;
          organization_id: string;
          status?: Database["public"]["Enums"]["membership_status"];
          suspended_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          joined_at?: string | null;
          organization_id?: string;
          status?: Database["public"]["Enums"]["membership_status"];
          suspended_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_units: {
        Row: {
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          id: string;
          name: string;
          organization_id: string;
          settings: Json;
          slug: string;
          status: Database["public"]["Enums"]["organization_status"];
          timezone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          settings?: Json;
          slug: string;
          status?: Database["public"]["Enums"]["organization_status"];
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          settings?: Json;
          slug?: string;
          status?: Database["public"]["Enums"]["organization_status"];
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_units_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          contact_email: string | null;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          id: string;
          locale: string;
          logo_url: string | null;
          name: string;
          settings: Json;
          slug: string;
          status: Database["public"]["Enums"]["organization_status"];
          timezone: string;
          updated_at: string;
        };
        Insert: {
          contact_email?: string | null;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          id?: string;
          locale?: string;
          logo_url?: string | null;
          name: string;
          settings?: Json;
          slug: string;
          status?: Database["public"]["Enums"]["organization_status"];
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          contact_email?: string | null;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          id?: string;
          locale?: string;
          logo_url?: string | null;
          name?: string;
          settings?: Json;
          slug?: string;
          status?: Database["public"]["Enums"]["organization_status"];
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          category: string;
          code: string;
          created_at: string;
          description: string;
          name: string;
        };
        Insert: {
          category: string;
          code: string;
          created_at?: string;
          description: string;
          name: string;
        };
        Update: {
          category?: string;
          code?: string;
          created_at?: string;
          description?: string;
          name?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          email: string | null;
          id: string;
          locale: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id: string;
          locale?: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          locale?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      program_members: {
        Row: {
          active_from: string;
          active_until: string | null;
          created_at: string;
          created_by: string;
          id: string;
          organization_id: string;
          program_id: string;
          role: Database["public"]["Enums"]["program_member_role"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active_from?: string;
          active_until?: string | null;
          created_at?: string;
          created_by: string;
          id?: string;
          organization_id: string;
          program_id: string;
          role?: Database["public"]["Enums"]["program_member_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active_from?: string;
          active_until?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          organization_id?: string;
          program_id?: string;
          role?: Database["public"]["Enums"]["program_member_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "program_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "program_members_program_same_org";
            columns: ["organization_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      program_types: {
        Row: {
          code: string;
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          incubator_id: string;
          is_active: boolean;
          name: string;
          organization_id: string;
          settings: Json;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          incubator_id: string;
          is_active?: boolean;
          name: string;
          organization_id: string;
          settings?: Json;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          incubator_id?: string;
          is_active?: boolean;
          name?: string;
          organization_id?: string;
          settings?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "program_types_incubator_same_org";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "program_types_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      programs: {
        Row: {
          admission_criteria: Json;
          code: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          delivery_mode: Database["public"]["Enums"]["delivery_mode"] | null;
          description: string | null;
          duration_weeks: number | null;
          ends_on: string | null;
          id: string;
          incubator_id: string;
          logo_path: string | null;
          name: string;
          objectives: string | null;
          organization_id: string;
          settings: Json;
          starts_on: string | null;
          status: Database["public"]["Enums"]["program_status"];
          suggested_capacity: number | null;
          target_audience: string | null;
          type_id: string;
          updated_at: string;
        };
        Insert: {
          admission_criteria?: Json;
          code: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"] | null;
          description?: string | null;
          duration_weeks?: number | null;
          ends_on?: string | null;
          id?: string;
          incubator_id: string;
          logo_path?: string | null;
          name: string;
          objectives?: string | null;
          organization_id: string;
          settings?: Json;
          starts_on?: string | null;
          status?: Database["public"]["Enums"]["program_status"];
          suggested_capacity?: number | null;
          target_audience?: string | null;
          type_id: string;
          updated_at?: string;
        };
        Update: {
          admission_criteria?: Json;
          code?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"] | null;
          description?: string | null;
          duration_weeks?: number | null;
          ends_on?: string | null;
          id?: string;
          incubator_id?: string;
          logo_path?: string | null;
          name?: string;
          objectives?: string | null;
          organization_id?: string;
          settings?: Json;
          starts_on?: string | null;
          status?: Database["public"]["Enums"]["program_status"];
          suggested_capacity?: number | null;
          target_audience?: string | null;
          type_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "programs_incubator_same_org";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "programs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "programs_type_same_org";
            columns: ["organization_id", "type_id"];
            isOneToOne: false;
            referencedRelation: "program_types";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      role_assignments: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          incubator_id: string | null;
          membership_id: string;
          organization_id: string;
          role_id: string;
          unit_id: string | null;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          incubator_id?: string | null;
          membership_id: string;
          organization_id: string;
          role_id: string;
          unit_id?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          incubator_id?: string | null;
          membership_id?: string;
          organization_id?: string;
          role_id?: string;
          unit_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "role_assignments_incubator_same_org";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "role_assignments_membership_same_org";
            columns: ["organization_id", "membership_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "role_assignments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_assignments_role_same_org";
            columns: ["organization_id", "role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "role_assignments_unit_same_org";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "organization_units";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      role_permissions: {
        Row: {
          created_at: string;
          organization_id: string;
          permission_code: string;
          role_id: string;
        };
        Insert: {
          created_at?: string;
          organization_id: string;
          permission_code: string;
          role_id: string;
        };
        Update: {
          created_at?: string;
          organization_id?: string;
          permission_code?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_code_fkey";
            columns: ["permission_code"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "role_permissions_role_same_org";
            columns: ["organization_id", "role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      roles: {
        Row: {
          archived_at: string | null;
          code: string;
          created_at: string;
          description: string;
          id: string;
          is_system: boolean;
          name: string;
          organization_id: string;
          scope_type: Database["public"]["Enums"]["role_scope_type"];
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          code: string;
          created_at?: string;
          description: string;
          id?: string;
          is_system?: boolean;
          name: string;
          organization_id: string;
          scope_type: Database["public"]["Enums"]["role_scope_type"];
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          code?: string;
          created_at?: string;
          description?: string;
          id?: string;
          is_system?: boolean;
          name?: string;
          organization_id?: string;
          scope_type?: Database["public"]["Enums"]["role_scope_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      startup_applications: {
        Row: {
          applicant_email: string;
          applicant_name: string;
          applicant_user_id: string;
          business_model: string | null;
          city: string | null;
          cohort_id: string | null;
          created_at: string;
          decision_notes: string | null;
          id: string;
          incubator_id: string;
          legal_name: string | null;
          organization_id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          sector: string | null;
          stage: Database["public"]["Enums"]["startup_stage"];
          startup_id: string | null;
          startup_name: string;
          state: string | null;
          status: Database["public"]["Enums"]["startup_application_status"];
          tax_id: string | null;
          updated_at: string;
          website_url: string | null;
        };
        Insert: {
          applicant_email: string;
          applicant_name: string;
          applicant_user_id: string;
          business_model?: string | null;
          city?: string | null;
          cohort_id?: string | null;
          created_at?: string;
          decision_notes?: string | null;
          id?: string;
          incubator_id: string;
          legal_name?: string | null;
          organization_id: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sector?: string | null;
          stage?: Database["public"]["Enums"]["startup_stage"];
          startup_id?: string | null;
          startup_name: string;
          state?: string | null;
          status?: Database["public"]["Enums"]["startup_application_status"];
          tax_id?: string | null;
          updated_at?: string;
          website_url?: string | null;
        };
        Update: {
          applicant_email?: string;
          applicant_name?: string;
          applicant_user_id?: string;
          business_model?: string | null;
          city?: string | null;
          cohort_id?: string | null;
          created_at?: string;
          decision_notes?: string | null;
          id?: string;
          incubator_id?: string;
          legal_name?: string | null;
          organization_id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sector?: string | null;
          stage?: Database["public"]["Enums"]["startup_stage"];
          startup_id?: string | null;
          startup_name?: string;
          state?: string | null;
          status?: Database["public"]["Enums"]["startup_application_status"];
          tax_id?: string | null;
          updated_at?: string;
          website_url?: string | null;
        };
        Relationships: [];
      };
      startup_enrollments: {
        Row: {
          cohort_id: string;
          created_at: string;
          created_by: string;
          entry_date: string;
          exit_date: string | null;
          exit_reason: string | null;
          id: string;
          organization_id: string;
          previous_enrollment_id: string | null;
          source: Database["public"]["Enums"]["enrollment_source"];
          startup_id: string;
          status: Database["public"]["Enums"]["enrollment_status"];
          updated_at: string;
        };
        Insert: {
          cohort_id: string;
          created_at?: string;
          created_by: string;
          entry_date?: string;
          exit_date?: string | null;
          exit_reason?: string | null;
          id?: string;
          organization_id: string;
          previous_enrollment_id?: string | null;
          source?: Database["public"]["Enums"]["enrollment_source"];
          startup_id: string;
          status?: Database["public"]["Enums"]["enrollment_status"];
          updated_at?: string;
        };
        Update: {
          cohort_id?: string;
          created_at?: string;
          created_by?: string;
          entry_date?: string;
          exit_date?: string | null;
          exit_reason?: string | null;
          id?: string;
          organization_id?: string;
          previous_enrollment_id?: string | null;
          source?: Database["public"]["Enums"]["enrollment_source"];
          startup_id?: string;
          status?: Database["public"]["Enums"]["enrollment_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "startup_enrollments_cohort_same_org";
            columns: ["organization_id", "cohort_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "startup_enrollments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "startup_enrollments_previous_same_org";
            columns: ["organization_id", "previous_enrollment_id"];
            isOneToOne: false;
            referencedRelation: "startup_enrollments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "startup_enrollments_startup_same_org";
            columns: ["organization_id", "startup_id"];
            isOneToOne: false;
            referencedRelation: "startups";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      startup_history: {
        Row: {
          actor_user_id: string | null;
          event_type: string;
          id: number;
          metadata: Json;
          occurred_at: string;
          organization_id: string;
          startup_id: string;
          title: string;
        };
        Insert: {
          actor_user_id?: string | null;
          event_type: string;
          id?: never;
          metadata?: Json;
          occurred_at?: string;
          organization_id: string;
          startup_id: string;
          title: string;
        };
        Update: {
          actor_user_id?: string | null;
          event_type?: string;
          id?: never;
          metadata?: Json;
          occurred_at?: string;
          organization_id?: string;
          startup_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "startup_history_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "startup_history_startup_same_org";
            columns: ["organization_id", "startup_id"];
            isOneToOne: false;
            referencedRelation: "startups";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      startup_members: {
        Row: {
          competencies: string[];
          created_at: string;
          created_by: string;
          dedication_hours_per_week: number | null;
          email: string | null;
          equity_percentage: number | null;
          full_name: string;
          id: string;
          is_representative: boolean;
          joined_on: string | null;
          left_on: string | null;
          organization_id: string;
          role: Database["public"]["Enums"]["startup_member_role"];
          role_title: string | null;
          startup_id: string;
          status: Database["public"]["Enums"]["startup_member_status"];
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          competencies?: string[];
          created_at?: string;
          created_by: string;
          dedication_hours_per_week?: number | null;
          email?: string | null;
          equity_percentage?: number | null;
          full_name: string;
          id?: string;
          is_representative?: boolean;
          joined_on?: string | null;
          left_on?: string | null;
          organization_id: string;
          role?: Database["public"]["Enums"]["startup_member_role"];
          role_title?: string | null;
          startup_id: string;
          status?: Database["public"]["Enums"]["startup_member_status"];
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          competencies?: string[];
          created_at?: string;
          created_by?: string;
          dedication_hours_per_week?: number | null;
          email?: string | null;
          equity_percentage?: number | null;
          full_name?: string;
          id?: string;
          is_representative?: boolean;
          joined_on?: string | null;
          left_on?: string | null;
          organization_id?: string;
          role?: Database["public"]["Enums"]["startup_member_role"];
          role_title?: string | null;
          startup_id?: string;
          status?: Database["public"]["Enums"]["startup_member_status"];
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "startup_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "startup_members_startup_same_org";
            columns: ["organization_id", "startup_id"];
            isOneToOne: false;
            referencedRelation: "startups";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      startup_onboarding_invitations: {
        Row: {
          accepted_startup_id: string | null;
          cohort_id: string | null;
          created_at: string;
          created_by: string;
          incubator_id: string;
          invitation_id: string;
          organization_id: string;
          startup_id: string | null;
          startup_name: string;
          updated_at: string;
        };
        Insert: {
          accepted_startup_id?: string | null;
          cohort_id?: string | null;
          created_at?: string;
          created_by: string;
          incubator_id: string;
          invitation_id: string;
          organization_id: string;
          startup_id?: string | null;
          startup_name: string;
          updated_at?: string;
        };
        Update: {
          accepted_startup_id?: string | null;
          cohort_id?: string | null;
          created_at?: string;
          created_by?: string;
          incubator_id?: string;
          invitation_id?: string;
          organization_id?: string;
          startup_id?: string | null;
          startup_name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      startups: {
        Row: {
          business_model: string | null;
          city: string | null;
          code: string;
          country_code: string;
          created_at: string;
          created_by: string;
          custom_fields: Json;
          deleted_at: string | null;
          id: string;
          incubator_id: string;
          legal_name: string | null;
          name: string;
          organization_id: string;
          sector: string | null;
          stage: Database["public"]["Enums"]["startup_stage"];
          state: string | null;
          status: Database["public"]["Enums"]["startup_status"];
          tax_id: string | null;
          updated_at: string;
          website_url: string | null;
        };
        Insert: {
          business_model?: string | null;
          city?: string | null;
          code: string;
          country_code?: string;
          created_at?: string;
          created_by: string;
          custom_fields?: Json;
          deleted_at?: string | null;
          id?: string;
          incubator_id: string;
          legal_name?: string | null;
          name: string;
          organization_id: string;
          sector?: string | null;
          stage?: Database["public"]["Enums"]["startup_stage"];
          state?: string | null;
          status?: Database["public"]["Enums"]["startup_status"];
          tax_id?: string | null;
          updated_at?: string;
          website_url?: string | null;
        };
        Update: {
          business_model?: string | null;
          city?: string | null;
          code?: string;
          country_code?: string;
          created_at?: string;
          created_by?: string;
          custom_fields?: Json;
          deleted_at?: string | null;
          id?: string;
          incubator_id?: string;
          legal_name?: string | null;
          name?: string;
          organization_id?: string;
          sector?: string | null;
          stage?: Database["public"]["Enums"]["startup_stage"];
          state?: string | null;
          status?: Database["public"]["Enums"]["startup_status"];
          tax_id?: string | null;
          updated_at?: string;
          website_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "startups_incubator_same_org";
            columns: ["organization_id", "incubator_id"];
            isOneToOne: false;
            referencedRelation: "incubators";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "startups_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      upload_sessions: {
        Row: {
          acknowledged_offset_bytes: number;
          attempt_count: number;
          created_at: string;
          created_by: string;
          error_code: string | null;
          error_detail: string | null;
          expected_size_bytes: number;
          expires_at: string;
          file_id: string;
          id: string;
          idempotency_key: string;
          last_attempt_at: string | null;
          organization_id: string;
          provider_session_reference_hash: string | null;
          status: Database["public"]["Enums"]["upload_session_status"];
          updated_at: string;
        };
        Insert: {
          acknowledged_offset_bytes?: number;
          attempt_count?: number;
          created_at?: string;
          created_by: string;
          error_code?: string | null;
          error_detail?: string | null;
          expected_size_bytes: number;
          expires_at: string;
          file_id: string;
          id?: string;
          idempotency_key: string;
          last_attempt_at?: string | null;
          organization_id: string;
          provider_session_reference_hash?: string | null;
          status?: Database["public"]["Enums"]["upload_session_status"];
          updated_at?: string;
        };
        Update: {
          acknowledged_offset_bytes?: number;
          attempt_count?: number;
          created_at?: string;
          created_by?: string;
          error_code?: string | null;
          error_detail?: string | null;
          expected_size_bytes?: number;
          expires_at?: string;
          file_id?: string;
          id?: string;
          idempotency_key?: string;
          last_attempt_at?: string | null;
          organization_id?: string;
          provider_session_reference_hash?: string | null;
          status?: Database["public"]["Enums"]["upload_session_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "upload_sessions_file_same_org";
            columns: ["organization_id", "file_id"];
            isOneToOne: false;
            referencedRelation: "files";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          active_organization_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active_organization_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active_organization_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_active_organization_id_fkey";
            columns: ["active_organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_selection_reviewer: {
        Args: { reviewer_user_id: string; target_call_id: string };
        Returns: string;
      };
      accept_selection_confidentiality: {
        Args: { target_call_id: string };
        Returns: undefined;
      };
      assign_selection_reviewer: {
        Args: { target_application_id: string; target_reviewer_id: string };
        Returns: string;
      };
      auto_assign_selection_reviewers: {
        Args: { target_call_id: string };
        Returns: number;
      };
      convert_selection_application: {
        Args: { target_application_id: string };
        Returns: string;
      };
      create_selection_call: {
        Args: {
          appeals_close_at: string | null;
          appeals_open_at: string | null;
          applications_close_at: string;
          applications_open_at: string;
          call_code: string;
          call_slug: string;
          call_summary: string;
          call_title: string;
          criteria: Json;
          divergence_threshold: number | null;
          evaluations_close_at: string | null;
          evaluations_open_at: string | null;
          questions: Json;
          quota_rules: Json;
          reviewers_per_application: number;
          target_cohort_id: string;
          target_incubator_id: string;
          target_organization_id: string;
          total_vacancies: number;
          waitlist_size: number;
        };
        Returns: string;
      };
      create_selection_convocations: {
        Args: { deadline_at: string; target_call_id: string };
        Returns: number;
      };
      decide_selection_appeal: {
        Args: {
          decision_status:
            | "submitted"
            | "under_review"
            | "granted"
            | "partially_granted"
            | "denied";
          decision_text: string;
          score_adjustment: number | null;
          target_appeal_id: string;
        };
        Returns: undefined;
      };
      declare_selection_conflict: {
        Args: {
          justification: string;
          reason_type: string;
          target_assignment_id: string;
        };
        Returns: undefined;
      };
      generate_selection_ranking: {
        Args: { target_call_id: string };
        Returns: number;
      };
      get_public_selection_call: {
        Args: { call_slug: string };
        Returns: Json;
      };
      list_public_selection_calls: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      list_open_selection_call_slugs: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      accept_cerne_confidentiality: {
        Args: { target_assignment_id: string };
        Returns: undefined;
      };
      acknowledge_cerne_alert: {
        Args: { target_alert_id: string };
        Returns: undefined;
      };
      assign_cerne_practice_owner: {
        Args: {
          implementation_status?: string;
          target_cycle_id: string;
          target_practice_code: string;
          target_user_id: string | null;
        };
        Returns: undefined;
      };
      assign_cerne_reviewer: {
        Args: {
          target_cycle_id: string;
          target_practice_code?: string | null;
          target_reviewer_user_id: string;
        };
        Returns: string;
      };
      create_cerne_cycle: {
        Args: {
          cycle_name: string;
          ends_on: string;
          reference_year: number;
          starts_on: string;
          target_incubator_id: string;
          target_level: number;
          target_organization_id: string;
        };
        Returns: string;
      };
      get_cerne_workspace: {
        Args: {
          target_incubator_id: string;
          target_organization_id: string;
        };
        Returns: Json;
      };
      refresh_cerne_alerts: {
        Args: {
          target_incubator_id: string;
          target_organization_id: string;
        };
        Returns: number;
      };
      register_cerne_evidence: {
        Args: {
          evidence_description: string | null;
          evidence_title: string;
          external_url: string | null;
          scope_entity_id: string | null;
          scope_type: string;
          source_entity_id: string | null;
          source_entity_type: string | null;
          source_module: string | null;
          source_snapshot: Json;
          target_cycle_id: string;
          target_practice_code: string;
          target_requirement_id: string;
        };
        Returns: string;
      };
      review_cerne_evidence: {
        Args: {
          review_notes: string;
          review_result: "valid" | "partial" | "invalid";
          target_evidence_id: string;
        };
        Returns: undefined;
      };
      get_selection_workspace: {
        Args: {
          target_incubator_id: string;
          target_organization_id: string;
        };
        Returns: Json;
      };
      publish_selection_call: {
        Args: { target_call_id: string };
        Returns: undefined;
      };
      publish_selection_result: {
        Args: {
          publication_content: string;
          publication_phase: string;
          publication_title: string;
          target_call_id: string;
        };
        Returns: undefined;
      };
      register_selection_appeal: {
        Args: { grounds: string; target_application_id: string };
        Returns: string;
      };
      review_selection_eligibility: {
        Args: {
          eligible: boolean;
          notes: string;
          target_application_id: string;
        };
        Returns: undefined;
      };
      submit_selection_application: {
        Args: {
          answers: Json;
          applicant_email: string;
          applicant_name: string;
          applicant_phone: string;
          call_slug: string;
          city: string;
          legal_name: string;
          sector: string;
          stage: Database["public"]["Enums"]["startup_stage"];
          startup_name: string;
          state: string;
          summary: string;
          tax_id: string;
        };
        Returns: string;
      };
      submit_public_selection_appeal: {
        Args: {
          applicant_email: string;
          application_protocol: string;
          call_slug: string;
          grounds: string;
        };
        Returns: string;
      };
      respond_selection_convocation: {
        Args: {
          accept: boolean;
          applicant_email: string;
          application_protocol: string;
        };
        Returns: string;
      };
      submit_selection_review: {
        Args: {
          general_justification: string;
          private_notes: string;
          scores: Json;
          target_assignment_id: string;
        };
        Returns: string;
      };
      accept_invitation: {
        Args: { raw_token: string };
        Returns: {
          membership_id: string;
          organization_id: string;
          organization_slug: string;
        }[];
      };
      get_startup_registration_context: {
        Args: { incubator_slug: string; organization_slug: string };
        Returns: Json;
      };
      has_incubator_permission: {
        Args: {
          target_incubator_id: string;
          target_organization_id: string;
          target_permission_code: string;
        };
        Returns: boolean;
      };
      review_startup_application: {
        Args: {
          requested_decision: string;
          review_notes?: string | null;
          target_application_id: string;
        };
        Returns: string;
      };
      add_diagnostic_criterion_with_rubric: {
        Args: {
          criterion_allows_na: boolean;
          criterion_code: string;
          criterion_evidence_required_from: number | null;
          criterion_help_text: string;
          criterion_prompt: string;
          criterion_requires_na_justification: boolean;
          criterion_weight: number;
          rubric_descriptions: string[];
          target_dimension_id: string;
        };
        Returns: string;
      };
      add_diagnostic_dimension: {
        Args: {
          dimension_code: string;
          dimension_description: string;
          dimension_is_essential?: boolean;
          dimension_name: string;
          dimension_weight: number;
          target_template_id: string;
        };
        Returns: string;
      };
      assign_diagnostic_evaluator: {
        Args: { target_assessment_id: string; target_user_id: string };
        Returns: undefined;
      };
      assign_diagnostic_respondent: {
        Args: {
          target_assessment_id: string;
          target_role: Database["public"]["Enums"]["diagnostic_respondent_role"];
          target_user_id: string;
        };
        Returns: string;
      };
      autosave_diagnostic_response: {
        Args: {
          expected_lock_version: number;
          target_assessment_id: string;
          target_criterion_id: string;
          target_evidence_notes?: string;
          target_is_not_applicable: boolean;
          target_not_applicable_justification?: string | null;
          target_self_comment?: string;
          target_self_value: Json | null;
        };
        Returns: {
          lock_version: number;
          response_id: string;
          saved_at: string;
        }[];
      };
      create_diagnostic_campaign: {
        Args: {
          campaign_ends_at: string;
          campaign_name: string;
          campaign_starts_at: string;
          campaign_timezone?: string;
          communication_message?: string;
          communication_subject?: string;
          target_cohort_id?: string;
          target_evaluator_id?: string;
          target_incubator_id: string;
          target_program_id?: string;
          target_startup_ids: string[];
          target_template_id: string;
        };
        Returns: string;
      };
      create_diagnostic_campaign_with_mode: {
        Args: {
          campaign_ends_at: string;
          campaign_execution_mode?: Database["public"]["Enums"]["diagnostic_execution_mode"];
          campaign_name: string;
          campaign_starts_at: string;
          campaign_timezone?: string;
          communication_message?: string;
          communication_subject?: string;
          target_cohort_id?: string;
          target_evaluator_id?: string;
          target_incubator_id: string;
          target_program_id?: string;
          target_startup_ids: string[];
          target_template_id: string;
        };
        Returns: string;
      };
      create_diagnostic_template_draft: {
        Args: {
          target_incubator_id: string;
          template_description?: string;
          template_instructions?: string;
          template_name: string;
        };
        Returns: string;
      };
      create_mentor_profile: {
        Args: {
          mentor_user_id: string;
          profile_bio: string;
          profile_headline: string;
          profile_linkedin_url?: string | null;
          profile_timezone?: string;
          segment_names?: string[];
          specialty_names?: string[];
          target_incubator_id: string;
          target_organization_id: string;
        };
        Returns: string;
      };
      create_mentoring_session: {
        Args: {
          scheduled_end_local?: string | null;
          scheduled_start_local?: string | null;
          session_location?: string | null;
          session_meeting_url?: string | null;
          session_mode: Database["public"]["Enums"]["mentoring_session_mode"];
          session_objective: string;
          session_timezone: string;
          target_assignment_id: string;
          target_diagnostic_assessment_id?: string | null;
        };
        Returns: string;
      };
      create_mentoring_feedback: {
        Args: {
          feedback_improvements: string;
          feedback_rating: number;
          feedback_strengths: string;
          share_feedback?: boolean;
          target_session_id: string;
        };
        Returns: string;
      };
      create_organization: {
        Args: {
          organization_locale?: string;
          organization_name: string;
          organization_slug: string;
          organization_timezone?: string;
        };
        Returns: {
          id: string;
          slug: string;
        }[];
      };
      set_mentor_profile_status: {
        Args: {
          requested_status: Database["public"]["Enums"]["mentor_profile_status"];
          target_profile_id: string;
        };
        Returns: undefined;
      };
      update_mentor_assignment_status: {
        Args: {
          requested_status: Database["public"]["Enums"]["mentor_assignment_status"];
          target_assignment_id: string;
        };
        Returns: undefined;
      };
      update_mentor_profile: {
        Args: {
          profile_bio: string;
          profile_headline: string;
          profile_linkedin_url?: string | null;
          profile_timezone: string;
          segment_names?: string[];
          specialty_names?: string[];
          target_profile_id: string;
        };
        Returns: undefined;
      };
      update_mentoring_session_status: {
        Args: {
          reason?: string | null;
          requested_status: Database["public"]["Enums"]["mentoring_session_status"];
          target_session_id: string;
        };
        Returns: undefined;
      };
      reschedule_mentoring_session: {
        Args: {
          scheduled_end_local: string;
          scheduled_start_local: string;
          session_timezone: string;
          target_session_id: string;
        };
        Returns: undefined;
      };
      delete_diagnostic_criterion: {
        Args: { target_criterion_id: string };
        Returns: undefined;
      };
      delete_diagnostic_dimension: {
        Args: { target_dimension_id: string };
        Returns: undefined;
      };
      delete_pending_diagnostic_assessment: {
        Args: { target_assessment_id: string };
        Returns: undefined;
      };
      delete_unused_diagnostic_template: {
        Args: { target_template_id: string };
        Returns: undefined;
      };
      duplicate_diagnostic_template_version: {
        Args: {
          new_version_label?: string;
          source_template_id: string;
          version_changelog?: string;
        };
        Returns: string;
      };
      finalize_diagnostic_assessment: {
        Args: { target_assessment_id: string };
        Returns: undefined;
      };
      complete_facilitated_diagnostic_assessment: {
        Args: { target_assessment_id: string };
        Returns: undefined;
      };
      install_diagnostic_demo_cases: {
        Args: { target_incubator_id: string };
        Returns: number;
      };
      manage_incubator_lifecycle: {
        Args: { requested_action: string; target_incubator_id: string };
        Returns: string;
      };
      mark_diagnostic_assessment_in_progress: {
        Args: { target_assessment_id: string };
        Returns: undefined;
      };
      manage_program_lifecycle: {
        Args: { requested_action: string; target_program_id: string };
        Returns: string;
      };
      publish_diagnostic_template_version: {
        Args: { target_template_id: string };
        Returns: undefined;
      };
      reopen_diagnostic_assessment: {
        Args: { target_assessment_id: string };
        Returns: undefined;
      };
      reorder_diagnostic_criteria: {
        Args: {
          ordered_criterion_ids: string[];
          target_dimension_id: string;
        };
        Returns: undefined;
      };
      reorder_diagnostic_dimensions: {
        Args: {
          ordered_dimension_ids: string[];
          target_template_id: string;
        };
        Returns: undefined;
      };
      revoke_diagnostic_respondent: {
        Args: { target_assessment_id: string; target_user_id: string };
        Returns: undefined;
      };
      save_diagnostic_indicator_value: {
        Args: {
          expected_lock_version: number;
          target_assessment_id: string;
          target_evidence_notes?: string;
          target_indicator_definition_id: string;
          target_is_not_applicable?: boolean;
          target_not_applicable_justification?: string | null;
          target_numeric_value: number | null;
          target_target_value?: number | null;
        };
        Returns: {
          indicator_value_id: string;
          lock_version: number;
          saved_at: string;
        }[];
      };
      submit_diagnostic_assessment: {
        Args: { target_assessment_id: string };
        Returns: undefined;
      };
      update_diagnostic_criterion_with_rubric: {
        Args: {
          criterion_allows_na: boolean;
          criterion_code: string;
          criterion_evidence_required_from: number | null;
          criterion_help_text: string;
          criterion_prompt: string;
          criterion_requires_na_justification: boolean;
          criterion_weight: number;
          rubric_descriptions: string[];
          target_criterion_id: string;
        };
        Returns: undefined;
      };
      update_diagnostic_dimension: {
        Args: {
          dimension_code: string;
          dimension_description: string;
          dimension_is_essential: boolean;
          dimension_name: string;
          dimension_weight: number;
          target_dimension_id: string;
        };
        Returns: undefined;
      };
      update_pending_diagnostic_assessment: {
        Args: {
          assessment_cycle_label: string;
          assessment_due_at: string;
          target_assessment_id: string;
          target_evaluator_id?: string;
        };
        Returns: undefined;
      };
      system_readiness: { Args: never; Returns: boolean };
      transfer_startup_enrollment: {
        Args: {
          target_cohort_id: string;
          target_startup_id: string;
          transfer_on?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      cohort_status:
        "planned" | "enrollment_open" | "active" | "completed" | "cancelled";
      delivery_mode: "in_person" | "remote" | "hybrid";
      diagnostic_assessment_status:
        | "draft"
        | "in_progress"
        | "submitted"
        | "under_review"
        | "validated"
        | "cancelled";
      diagnostic_campaign_status:
        "draft" | "scheduled" | "open" | "closed" | "cancelled";
      diagnostic_evidence_kind: "file" | "external_link";
      diagnostic_evidence_status:
        "pending" | "available" | "rejected" | "deleted" | "restore_pending";
      diagnostic_execution_mode: "self_assessment" | "facilitated";
      diagnostic_indicator_value_type:
        "integer" | "numeric" | "currency" | "percentage";
      diagnostic_participant_status:
        | "invited"
        | "not_started"
        | "in_progress"
        | "submitted"
        | "overdue"
        | "validated"
        | "cancelled";
      diagnostic_respondent_role: "primary" | "collaborator" | "viewer";
      diagnostic_response_type:
        | "numeric"
        | "text"
        | "single_choice"
        | "currency"
        | "percentage"
        | "date"
        | "link"
        | "file";
      diagnostic_template_scope: "incubator" | "organization";
      diagnostic_template_status: "draft" | "published" | "archived";
      diagnostic_trigger_operator: "lt" | "lte" | "eq" | "gte" | "gt";
      diagnostic_trigger_result_status: "clear" | "triggered" | "no_data";
      diagnostic_trigger_severity: "info" | "warning" | "high" | "critical";
      diagnostic_trigger_source: "criterion" | "indicator" | "aggregate";
      diagnostic_validation_status: "draft" | "final";
      enrollment_source: "manual" | "invitation" | "selection_process";
      enrollment_status:
        | "invited"
        | "active"
        | "suspended"
        | "completed"
        | "withdrawn"
        | "transferred";
      file_access_operation:
        | "metadata"
        | "preview"
        | "download"
        | "upload_session"
        | "complete"
        | "trash"
        | "restore"
        | "reconcile";
      file_access_result: "allowed" | "denied" | "failed";
      file_classification:
        "public" | "internal" | "confidential" | "restricted";
      file_link_purpose:
        | "organization_document"
        | "unit_document"
        | "incubator_document"
        | "program_document"
        | "startup_document"
        | "delivery"
        | "diagnostic_evidence"
        | "mentoring"
        | "content_asset"
        | "report"
        | "other";
      file_provider: "google_drive";
      file_status:
        | "pending"
        | "uploading"
        | "validating"
        | "available"
        | "quarantined"
        | "failed"
        | "trash_pending"
        | "trashed"
        | "restore_pending"
        | "missing"
        | "purge_pending"
        | "purged";
      incubator_kind:
        | "incubator"
        | "accelerator"
        | "innovation_hub"
        | "innovation_center"
        | "other";
      invitation_status: "pending" | "accepted" | "revoked" | "expired";
      membership_status: "invited" | "active" | "suspended" | "removed";
      mentor_assignment_status: "active" | "paused" | "ended";
      mentor_profile_status: "active" | "inactive";
      mentor_skill_kind: "specialty" | "segment";
      mentoring_note_visibility: "shared" | "restricted";
      mentoring_feedback_kind: "mentor_to_startup" | "startup_to_mentor";
      mentoring_recommendation_priority: "low" | "medium" | "high" | "critical";
      mentoring_recommendation_status:
        "proposed" | "accepted" | "dismissed" | "converted";
      mentoring_session_mode: "remote" | "in_person" | "hybrid";
      mentoring_session_status:
        "requested" | "scheduled" | "completed" | "cancelled";
      organization_status: "active" | "inactive" | "suspended";
      program_member_role: "coordinator" | "staff" | "viewer";
      program_status:
        "draft" | "planned" | "active" | "completed" | "cancelled" | "archived";
      role_scope_type: "organization" | "unit" | "incubator";
      startup_application_status:
        "pending" | "approved" | "rejected" | "withdrawn";
      startup_member_role:
        | "founder"
        | "cofounder"
        | "representative"
        | "employee"
        | "advisor"
        | "other";
      startup_member_status: "active" | "inactive";
      startup_stage:
        | "idea"
        | "validation"
        | "operation"
        | "traction"
        | "scale"
        | "graduated";
      startup_status:
        "active" | "inactive" | "graduated" | "withdrawn" | "archived";
      upload_session_status:
        | "pending"
        | "ready"
        | "uploading"
        | "validating"
        | "completed"
        | "expired"
        | "failed"
        | "cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      cohort_status: [
        "planned",
        "enrollment_open",
        "active",
        "completed",
        "cancelled",
      ],
      delivery_mode: ["in_person", "remote", "hybrid"],
      diagnostic_assessment_status: [
        "draft",
        "in_progress",
        "submitted",
        "under_review",
        "validated",
        "cancelled",
      ],
      diagnostic_campaign_status: [
        "draft",
        "scheduled",
        "open",
        "closed",
        "cancelled",
      ],
      diagnostic_evidence_kind: ["file", "external_link"],
      diagnostic_evidence_status: [
        "pending",
        "available",
        "rejected",
        "deleted",
        "restore_pending",
      ],
      diagnostic_execution_mode: ["self_assessment", "facilitated"],
      diagnostic_indicator_value_type: [
        "integer",
        "numeric",
        "currency",
        "percentage",
      ],
      diagnostic_participant_status: [
        "invited",
        "not_started",
        "in_progress",
        "submitted",
        "overdue",
        "validated",
        "cancelled",
      ],
      diagnostic_respondent_role: ["primary", "collaborator", "viewer"],
      diagnostic_response_type: [
        "numeric",
        "text",
        "single_choice",
        "currency",
        "percentage",
        "date",
        "link",
        "file",
      ],
      diagnostic_template_scope: ["incubator", "organization"],
      diagnostic_template_status: ["draft", "published", "archived"],
      diagnostic_trigger_operator: ["lt", "lte", "eq", "gte", "gt"],
      diagnostic_trigger_result_status: ["clear", "triggered", "no_data"],
      diagnostic_trigger_severity: ["info", "warning", "high", "critical"],
      diagnostic_trigger_source: ["criterion", "indicator", "aggregate"],
      diagnostic_validation_status: ["draft", "final"],
      enrollment_source: ["manual", "invitation", "selection_process"],
      enrollment_status: [
        "invited",
        "active",
        "suspended",
        "completed",
        "withdrawn",
        "transferred",
      ],
      file_access_operation: [
        "metadata",
        "preview",
        "download",
        "upload_session",
        "complete",
        "trash",
        "restore",
        "reconcile",
      ],
      file_access_result: ["allowed", "denied", "failed"],
      file_classification: ["public", "internal", "confidential", "restricted"],
      file_link_purpose: [
        "organization_document",
        "unit_document",
        "incubator_document",
        "program_document",
        "startup_document",
        "delivery",
        "diagnostic_evidence",
        "mentoring",
        "content_asset",
        "report",
        "other",
      ],
      file_provider: ["google_drive"],
      file_status: [
        "pending",
        "uploading",
        "validating",
        "available",
        "quarantined",
        "failed",
        "trash_pending",
        "trashed",
        "restore_pending",
        "missing",
        "purge_pending",
        "purged",
      ],
      incubator_kind: [
        "incubator",
        "accelerator",
        "innovation_hub",
        "innovation_center",
        "other",
      ],
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      membership_status: ["invited", "active", "suspended", "removed"],
      mentor_assignment_status: ["active", "paused", "ended"],
      mentor_profile_status: ["active", "inactive"],
      mentor_skill_kind: ["specialty", "segment"],
      mentoring_note_visibility: ["shared", "restricted"],
      mentoring_feedback_kind: ["mentor_to_startup", "startup_to_mentor"],
      mentoring_recommendation_priority: ["low", "medium", "high", "critical"],
      mentoring_recommendation_status: [
        "proposed",
        "accepted",
        "dismissed",
        "converted",
      ],
      mentoring_session_mode: ["remote", "in_person", "hybrid"],
      mentoring_session_status: [
        "requested",
        "scheduled",
        "completed",
        "cancelled",
      ],
      organization_status: ["active", "inactive", "suspended"],
      program_member_role: ["coordinator", "staff", "viewer"],
      program_status: [
        "draft",
        "planned",
        "active",
        "completed",
        "cancelled",
        "archived",
      ],
      role_scope_type: ["organization", "unit", "incubator"],
      startup_member_role: [
        "founder",
        "cofounder",
        "representative",
        "employee",
        "advisor",
        "other",
      ],
      startup_member_status: ["active", "inactive"],
      startup_stage: [
        "idea",
        "validation",
        "operation",
        "traction",
        "scale",
        "graduated",
      ],
      startup_status: [
        "active",
        "inactive",
        "graduated",
        "withdrawn",
        "archived",
      ],
      startup_application_status: [
        "pending",
        "approved",
        "rejected",
        "withdrawn",
      ],
      upload_session_status: [
        "pending",
        "ready",
        "uploading",
        "validating",
        "completed",
        "expired",
        "failed",
        "cancelled",
      ],
    },
  },
} as const;
