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
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          id: string;
          locale: string;
          name: string;
          organization_id: string;
          settings: Json;
          slug: string;
          status: Database["public"]["Enums"]["organization_status"];
          timezone: string;
          unit_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          id?: string;
          locale?: string;
          name: string;
          organization_id: string;
          settings?: Json;
          slug: string;
          status?: Database["public"]["Enums"]["organization_status"];
          timezone?: string;
          unit_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          id?: string;
          locale?: string;
          name?: string;
          organization_id?: string;
          settings?: Json;
          slug?: string;
          status?: Database["public"]["Enums"]["organization_status"];
          timezone?: string;
          unit_id?: string | null;
          updated_at?: string;
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
          organization_id: string;
          revoked_at: string | null;
          role_id: string;
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
          organization_id: string;
          revoked_at?: string | null;
          role_id: string;
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
          organization_id?: string;
          revoked_at?: string | null;
          role_id?: string;
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
      program_types: {
        Row: {
          code: string;
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          incubator_id: string | null;
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
          incubator_id?: string | null;
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
          incubator_id?: string | null;
          is_active?: boolean;
          name?: string;
          organization_id?: string;
          settings?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      programs: {
        Row: {
          admission_criteria: Json;
          code: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          description: string | null;
          ends_on: string | null;
          id: string;
          incubator_id: string;
          name: string;
          organization_id: string;
          settings: Json;
          starts_on: string | null;
          status: Database["public"]["Enums"]["program_status"];
          type_id: string;
          updated_at: string;
        };
        Insert: {
          admission_criteria?: Json;
          code?: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          description?: string | null;
          ends_on?: string | null;
          id?: string;
          incubator_id: string;
          name: string;
          organization_id: string;
          settings?: Json;
          starts_on?: string | null;
          status?: Database["public"]["Enums"]["program_status"];
          type_id: string;
          updated_at?: string;
        };
        Update: {
          admission_criteria?: Json;
          code?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          description?: string | null;
          ends_on?: string | null;
          id?: string;
          incubator_id?: string;
          name?: string;
          organization_id?: string;
          settings?: Json;
          starts_on?: string | null;
          status?: Database["public"]["Enums"]["program_status"];
          type_id?: string;
          updated_at?: string;
        };
        Relationships: [];
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
          name: string;
          organization_id: string;
          program_id: string;
          settings: Json;
          starts_on: string | null;
          status: Database["public"]["Enums"]["cohort_status"];
          updated_at: string;
        };
        Insert: {
          capacity?: number | null;
          code?: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          ends_on?: string | null;
          enrollment_ends_on?: string | null;
          enrollment_starts_on?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          program_id: string;
          settings?: Json;
          starts_on?: string | null;
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
          name?: string;
          organization_id?: string;
          program_id?: string;
          settings?: Json;
          starts_on?: string | null;
          status?: Database["public"]["Enums"]["cohort_status"];
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
          code?: string;
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
        Relationships: [];
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
        Relationships: [];
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
          id: string;
          locale: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          locale?: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          locale?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
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
      accept_invitation: {
        Args: { raw_token: string };
        Returns: {
          membership_id: string;
          organization_id: string;
          organization_slug: string;
        }[];
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
      manage_incubator_lifecycle: {
        Args: {
          requested_action: string;
          target_incubator_id: string;
        };
        Returns: string;
      };
      manage_program_lifecycle: {
        Args: {
          requested_action: string;
          target_program_id: string;
        };
        Returns: string;
      };
      transfer_startup_enrollment: {
        Args: {
          target_cohort_id: string;
          target_startup_id: string;
          transfer_on?: string;
        };
        Returns: string;
      };
      system_readiness: {
        Args: never;
        Returns: boolean;
      };
    };
    Enums: {
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
      invitation_status: "pending" | "accepted" | "revoked" | "expired";
      membership_status: "invited" | "active" | "suspended" | "removed";
      organization_status: "active" | "inactive" | "suspended";
      program_status:
        "draft" | "planned" | "active" | "completed" | "cancelled" | "archived";
      cohort_status:
        "planned" | "enrollment_open" | "active" | "completed" | "cancelled";
      program_member_role: "coordinator" | "staff" | "viewer";
      startup_stage:
        | "idea"
        | "validation"
        | "operation"
        | "traction"
        | "scale"
        | "graduated";
      startup_status:
        "active" | "inactive" | "graduated" | "withdrawn" | "archived";
      startup_member_role:
        | "founder"
        | "cofounder"
        | "representative"
        | "employee"
        | "advisor"
        | "other";
      startup_member_status: "active" | "inactive";
      enrollment_status:
        | "invited"
        | "active"
        | "suspended"
        | "completed"
        | "withdrawn"
        | "transferred";
      enrollment_source: "manual" | "invitation" | "selection_process";
      role_scope_type: "organization" | "unit" | "incubator";
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
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      membership_status: ["invited", "active", "suspended", "removed"],
      organization_status: ["active", "inactive", "suspended"],
      program_status: [
        "draft",
        "planned",
        "active",
        "completed",
        "cancelled",
        "archived",
      ],
      cohort_status: [
        "planned",
        "enrollment_open",
        "active",
        "completed",
        "cancelled",
      ],
      program_member_role: ["coordinator", "staff", "viewer"],
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
      startup_member_role: [
        "founder",
        "cofounder",
        "representative",
        "employee",
        "advisor",
        "other",
      ],
      startup_member_status: ["active", "inactive"],
      enrollment_status: [
        "invited",
        "active",
        "suspended",
        "completed",
        "withdrawn",
        "transferred",
      ],
      enrollment_source: ["manual", "invitation", "selection_process"],
      role_scope_type: ["organization", "unit", "incubator"],
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
