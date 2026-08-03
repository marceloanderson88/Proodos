begin;

do $$ begin
  create type public.diagnostic_template_scope as enum ('incubator', 'organization');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.diagnostic_campaign_status as enum ('draft', 'scheduled', 'open', 'closed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.diagnostic_participant_status as enum ('invited', 'not_started', 'in_progress', 'submitted', 'overdue', 'validated', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.diagnostic_respondent_role as enum ('primary', 'collaborator', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.diagnostic_validation_status as enum ('draft', 'final');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.diagnostic_evidence_kind as enum ('file', 'external_link');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.diagnostic_evidence_status as enum ('pending', 'available', 'rejected', 'deleted', 'restore_pending');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.diagnostic_indicator_value_type as enum ('integer', 'numeric', 'currency', 'percentage');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.diagnostic_trigger_source as enum ('criterion', 'indicator', 'aggregate');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.diagnostic_trigger_operator as enum ('lt', 'lte', 'eq', 'gte', 'gt');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.diagnostic_trigger_severity as enum ('info', 'warning', 'high', 'critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.diagnostic_trigger_result_status as enum ('clear', 'triggered', 'no_data');
exception when duplicate_object then null; end $$;

create table public.diagnostic_template_families (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  incubator_id uuid,
  code text not null,
  name text not null,
  description text not null default '',
  scope public.diagnostic_template_scope not null default 'incubator',
  methodology_name text,
  is_standard boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, incubator_id)
    references public.incubators(organization_id, id) on delete restrict,
  check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(code) between 2 and 100),
  check (name = btrim(name) and char_length(name) between 2 and 160),
  check (char_length(description) <= 3000),
  check (methodology_name is null or char_length(btrim(methodology_name)) between 2 and 160),
  check (
    (scope = 'incubator' and incubator_id is not null)
    or (scope = 'organization' and incubator_id is null)
  )
);

create unique index diagnostic_template_families_code_active_uidx
  on public.diagnostic_template_families (
    organization_id,
    coalesce(incubator_id, '00000000-0000-0000-0000-000000000000'::uuid),
    code
  ) where archived_at is null;
create index diagnostic_template_families_scope_idx
  on public.diagnostic_template_families (organization_id, incubator_id, scope, updated_at desc);

insert into public.diagnostic_template_families (
  id, organization_id, incubator_id, code, name, description, scope, created_by, created_at, updated_at
)
select distinct on (t.family_id)
  t.family_id,
  t.organization_id,
  t.incubator_id,
  'legacy-' || left(replace(t.family_id::text, '-', ''), 16),
  t.name,
  t.description,
  'incubator'::public.diagnostic_template_scope,
  t.created_by,
  t.created_at,
  t.updated_at
from public.diagnostic_templates t
order by t.family_id, t.version
on conflict (id) do nothing;

alter table public.diagnostic_templates
  add column if not exists version_label text,
  add column if not exists changelog text not null default '',
  add column if not exists source_checksum text,
  add column if not exists based_on_version_id uuid;

update public.diagnostic_templates
set version_label = version::text
where version_label is null;

alter table public.diagnostic_templates
  alter column version_label set not null;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'diagnostic_templates_family_fkey'
      and conrelid = 'public.diagnostic_templates'::regclass
  ) then
    alter table public.diagnostic_templates
      add constraint diagnostic_templates_family_fkey
      foreign key (organization_id, family_id)
      references public.diagnostic_template_families(organization_id, id)
      on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'diagnostic_templates_based_on_fkey'
      and conrelid = 'public.diagnostic_templates'::regclass
  ) then
    alter table public.diagnostic_templates
      add constraint diagnostic_templates_based_on_fkey
      foreign key (based_on_version_id)
      references public.diagnostic_templates(id)
      on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'diagnostic_templates_version_label_valid'
      and conrelid = 'public.diagnostic_templates'::regclass
  ) then
    alter table public.diagnostic_templates
      add constraint diagnostic_templates_version_label_valid
      check (version_label = btrim(version_label) and char_length(version_label) between 1 and 40);
  end if;
end $$;

alter table public.diagnostic_dimensions
  add column if not exists code text,
  add column if not exists is_essential boolean not null default false;

create unique index if not exists diagnostic_dimensions_code_uidx
  on public.diagnostic_dimensions (template_id, code)
  where code is not null;

alter table public.diagnostic_criteria
  add column if not exists code text,
  add column if not exists requires_not_applicable_justification boolean not null default true,
  add column if not exists not_applicable_guidance text not null default '',
  add column if not exists internal_notes text not null default '';

create unique index if not exists diagnostic_criteria_code_uidx
  on public.diagnostic_criteria (template_id, code)
  where code is not null;

create table public.diagnostic_dimension_stages (
  organization_id uuid not null,
  template_id uuid not null,
  dimension_id uuid not null,
  stage public.startup_stage not null,
  created_at timestamptz not null default now(),
  primary key (dimension_id, stage),
  foreign key (organization_id, template_id)
    references public.diagnostic_templates(organization_id, id) on delete cascade,
  foreign key (organization_id, dimension_id)
    references public.diagnostic_dimensions(organization_id, id) on delete cascade
);

create index diagnostic_dimension_stages_template_idx
  on public.diagnostic_dimension_stages (template_id, stage);

create table public.diagnostic_criterion_stages (
  organization_id uuid not null,
  template_id uuid not null,
  criterion_id uuid not null,
  stage public.startup_stage not null,
  created_at timestamptz not null default now(),
  primary key (criterion_id, stage),
  foreign key (organization_id, template_id)
    references public.diagnostic_templates(organization_id, id) on delete cascade,
  foreign key (organization_id, criterion_id)
    references public.diagnostic_criteria(organization_id, id) on delete cascade
);

create index diagnostic_criterion_stages_template_idx
  on public.diagnostic_criterion_stages (template_id, stage);

create table public.diagnostic_criterion_levels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  incubator_id uuid not null,
  template_id uuid not null,
  criterion_id uuid not null,
  score numeric(8,3) not null,
  label text not null,
  description text not null,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (criterion_id, score),
  unique (criterion_id, position),
  foreign key (organization_id, template_id)
    references public.diagnostic_templates(organization_id, id) on delete cascade,
  foreign key (organization_id, criterion_id)
    references public.diagnostic_criteria(organization_id, id) on delete cascade,
  foreign key (organization_id, incubator_id)
    references public.incubators(organization_id, id) on delete restrict,
  check (score >= 0),
  check (label = btrim(label) and char_length(label) between 1 and 80),
  check (description = btrim(description) and char_length(description) between 1 and 2000)
);

create index diagnostic_criterion_levels_template_idx
  on public.diagnostic_criterion_levels (template_id, criterion_id, position);

create table public.diagnostic_classification_ranges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  incubator_id uuid not null,
  template_id uuid not null,
  code text not null,
  label text not null,
  minimum_score numeric(8,3) not null,
  maximum_score numeric(8,3) not null,
  color_token text,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (template_id, code),
  unique (template_id, position),
  foreign key (organization_id, template_id)
    references public.diagnostic_templates(organization_id, id) on delete cascade,
  foreign key (organization_id, incubator_id)
    references public.incubators(organization_id, id) on delete restrict,
  check (code ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  check (label = btrim(label) and char_length(label) between 2 and 80),
  check (minimum_score >= 0 and maximum_score <= 100 and minimum_score <= maximum_score),
  check (color_token is null or color_token ~ '^[a-z][a-z0-9-]*$')
);

create index diagnostic_classification_ranges_template_idx
  on public.diagnostic_classification_ranges (template_id, minimum_score, maximum_score);

create table public.diagnostic_indicator_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  incubator_id uuid not null,
  template_id uuid not null,
  code text not null,
  category text not null,
  name text not null,
  unit text not null,
  value_type public.diagnostic_indicator_value_type not null,
  evidence_hint text not null default '',
  is_derived boolean not null default false,
  formula_key text,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (template_id, code),
  unique (template_id, position),
  foreign key (organization_id, template_id)
    references public.diagnostic_templates(organization_id, id) on delete cascade,
  foreign key (organization_id, incubator_id)
    references public.incubators(organization_id, id) on delete restrict,
  check (code ~ '^[a-z][a-z0-9_]*$'),
  check (category = btrim(category) and char_length(category) between 2 and 100),
  check (name = btrim(name) and char_length(name) between 2 and 200),
  check (unit = btrim(unit) and char_length(unit) between 1 and 40),
  check ((is_derived and formula_key is not null) or (not is_derived)),
  check (formula_key is null or formula_key ~ '^[a-z][a-z0-9_]*$')
);

create index diagnostic_indicator_definitions_template_idx
  on public.diagnostic_indicator_definitions (template_id, category, position);

create table public.diagnostic_trigger_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  incubator_id uuid not null,
  template_id uuid not null,
  code text not null,
  name text not null,
  source_type public.diagnostic_trigger_source not null,
  criterion_id uuid,
  indicator_definition_id uuid,
  aggregate_key text,
  operator public.diagnostic_trigger_operator not null,
  threshold numeric(14,4) not null,
  severity public.diagnostic_trigger_severity not null default 'warning',
  message text not null,
  recommended_action text not null default '',
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (template_id, code),
  foreign key (organization_id, template_id)
    references public.diagnostic_templates(organization_id, id) on delete cascade,
  foreign key (organization_id, criterion_id)
    references public.diagnostic_criteria(organization_id, id) on delete cascade,
  foreign key (organization_id, indicator_definition_id)
    references public.diagnostic_indicator_definitions(organization_id, id) on delete cascade,
  foreign key (organization_id, incubator_id)
    references public.incubators(organization_id, id) on delete restrict,
  check (code ~ '^[a-z][a-z0-9_]*$'),
  check (name = btrim(name) and char_length(name) between 2 and 160),
  check (message = btrim(message) and char_length(message) between 2 and 1000),
  check (char_length(recommended_action) <= 2000),
  check (
    (source_type = 'criterion' and criterion_id is not null and indicator_definition_id is null and aggregate_key is null)
    or (source_type = 'indicator' and criterion_id is null and indicator_definition_id is not null and aggregate_key is null)
    or (source_type = 'aggregate' and criterion_id is null and indicator_definition_id is null and aggregate_key is not null)
  ),
  check (aggregate_key is null or aggregate_key ~ '^[a-z][a-z0-9_]*$')
);

create index diagnostic_trigger_rules_template_idx
  on public.diagnostic_trigger_rules (template_id, position);

create table public.diagnostic_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  incubator_id uuid not null,
  template_id uuid not null,
  program_id uuid,
  cohort_id uuid,
  name text not null,
  status public.diagnostic_campaign_status not null default 'draft',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'America/Sao_Paulo',
  default_evaluator_id uuid references public.profiles(id) on delete restrict,
  communication_subject text not null default '',
  communication_message text not null default '',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, incubator_id)
    references public.incubators(organization_id, id) on delete restrict,
  foreign key (organization_id, template_id)
    references public.diagnostic_templates(organization_id, id) on delete restrict,
  foreign key (organization_id, program_id)
    references public.programs(organization_id, id) on delete restrict,
  foreign key (organization_id, cohort_id)
    references public.cohorts(organization_id, id) on delete restrict,
  check (name = btrim(name) and char_length(name) between 2 and 180),
  check (starts_at < ends_at),
  check (timezone = btrim(timezone) and char_length(timezone) between 1 and 100),
  check (char_length(communication_subject) <= 200),
  check (char_length(communication_message) <= 5000),
  check ((status = 'cancelled' and cancelled_at is not null) or status <> 'cancelled')
);

create index diagnostic_campaigns_scope_status_idx
  on public.diagnostic_campaigns (organization_id, incubator_id, status, starts_at desc, id);
create index diagnostic_campaigns_program_idx
  on public.diagnostic_campaigns (organization_id, program_id, starts_at desc)
  where program_id is not null;
create index diagnostic_campaigns_open_idx
  on public.diagnostic_campaigns (organization_id, incubator_id, ends_at, id)
  where status in ('scheduled', 'open');

create table public.diagnostic_campaign_startups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  incubator_id uuid not null,
  campaign_id uuid not null,
  startup_id uuid not null,
  status public.diagnostic_participant_status not null default 'invited',
  evaluator_id uuid references public.profiles(id) on delete restrict,
  invited_at timestamptz,
  last_reminded_at timestamptz,
  submitted_at timestamptz,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (campaign_id, startup_id),
  foreign key (organization_id, campaign_id)
    references public.diagnostic_campaigns(organization_id, id) on delete cascade,
  foreign key (organization_id, startup_id)
    references public.startups(organization_id, id) on delete restrict,
  foreign key (organization_id, incubator_id)
    references public.incubators(organization_id, id) on delete restrict
);

create index diagnostic_campaign_startups_campaign_status_idx
  on public.diagnostic_campaign_startups (campaign_id, status, updated_at desc, id);
create index diagnostic_campaign_startups_startup_idx
  on public.diagnostic_campaign_startups (organization_id, startup_id, created_at desc);
create index diagnostic_campaign_startups_evaluator_idx
  on public.diagnostic_campaign_startups (evaluator_id, status, updated_at desc)
  where evaluator_id is not null;

alter table public.diagnostic_assessments
  add column if not exists campaign_id uuid,
  add column if not exists campaign_startup_id uuid,
  add column if not exists due_at timestamptz,
  add column if not exists lock_version bigint not null default 0,
  add column if not exists classification_code text,
  add column if not exists average_gap numeric(8,3),
  add column if not exists evidence_coverage numeric(8,3);

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'diagnostic_assessments_campaign_fkey'
      and conrelid = 'public.diagnostic_assessments'::regclass
  ) then
    alter table public.diagnostic_assessments
      add constraint diagnostic_assessments_campaign_fkey
      foreign key (organization_id, campaign_id)
      references public.diagnostic_campaigns(organization_id, id) on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'diagnostic_assessments_campaign_startup_fkey'
      and conrelid = 'public.diagnostic_assessments'::regclass
  ) then
    alter table public.diagnostic_assessments
      add constraint diagnostic_assessments_campaign_startup_fkey
      foreign key (organization_id, campaign_startup_id)
      references public.diagnostic_campaign_startups(organization_id, id) on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'diagnostic_assessments_lock_version_valid'
      and conrelid = 'public.diagnostic_assessments'::regclass
  ) then
    alter table public.diagnostic_assessments
      add constraint diagnostic_assessments_lock_version_valid check (lock_version >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'diagnostic_assessments_metrics_valid'
      and conrelid = 'public.diagnostic_assessments'::regclass
  ) then
    alter table public.diagnostic_assessments
      add constraint diagnostic_assessments_metrics_valid check (
        (evidence_coverage is null or evidence_coverage between 0 and 100)
        and (average_gap is null or average_gap between -100 and 100)
      );
  end if;
end $$;

create unique index diagnostic_assessments_campaign_startup_uidx
  on public.diagnostic_assessments (campaign_startup_id)
  where campaign_startup_id is not null;
create index diagnostic_assessments_campaign_status_idx
  on public.diagnostic_assessments (campaign_id, status, updated_at desc, id)
  where campaign_id is not null;

create table public.diagnostic_respondents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  incubator_id uuid not null,
  assessment_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete restrict,
  role public.diagnostic_respondent_role not null default 'collaborator',
  can_submit boolean not null default false,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (assessment_id, user_id),
  foreign key (organization_id, assessment_id)
    references public.diagnostic_assessments(organization_id, id) on delete cascade,
  foreign key (organization_id, incubator_id)
    references public.incubators(organization_id, id) on delete restrict,
  check ((role = 'primary' and can_submit) or role <> 'primary'),
  check (accepted_at is null or accepted_at >= invited_at),
  check (revoked_at is null or revoked_at >= invited_at)
);

create index diagnostic_respondents_user_active_idx
  on public.diagnostic_respondents (user_id, organization_id, assessment_id)
  where revoked_at is null;

create table public.diagnostic_response_validations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  incubator_id uuid not null,
  response_id uuid not null references public.diagnostic_responses(id) on delete cascade,
  revision integer not null default 1 check (revision > 0),
  validated_value jsonb,
  evaluator_comment text not null default '',
  status public.diagnostic_validation_status not null default 'draft',
  validator_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  unique (response_id, revision),
  check (char_length(evaluator_comment) <= 4000),
  check ((status = 'final' and finalized_at is not null) or status <> 'final')
);

create index diagnostic_response_validations_scope_idx
  on public.diagnostic_response_validations (organization_id, incubator_id, response_id, revision desc);
create index diagnostic_response_validations_validator_idx
  on public.diagnostic_response_validations (validator_id, created_at desc);

create table public.diagnostic_response_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  incubator_id uuid not null,
  response_id uuid not null references public.diagnostic_responses(id) on delete cascade,
  kind public.diagnostic_evidence_kind not null,
  file_id uuid,
  external_url text,
  label text not null,
  status public.diagnostic_evidence_status not null default 'pending',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, file_id)
    references public.files(organization_id, id) on delete restrict,
  foreign key (organization_id, incubator_id)
    references public.incubators(organization_id, id) on delete restrict,
  check (
    (kind = 'file' and file_id is not null and external_url is null)
    or (kind = 'external_link' and file_id is null and external_url is not null)
  ),
  check (external_url is null or (external_url ~ '^https://' and char_length(external_url) <= 2048)),
  check (label = btrim(label) and char_length(label) between 1 and 200),
  check ((status in ('deleted', 'restore_pending') and deleted_at is not null) or (status not in ('deleted', 'restore_pending') and deleted_at is null))
);

create index diagnostic_response_evidence_response_idx
  on public.diagnostic_response_evidence (response_id, status, created_at desc);
create index diagnostic_response_evidence_file_idx
  on public.diagnostic_response_evidence (organization_id, file_id)
  where file_id is not null;

create table public.diagnostic_indicator_values (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  incubator_id uuid not null,
  assessment_id uuid not null,
  indicator_definition_id uuid not null,
  numeric_value numeric(18,4),
  target_value numeric(18,4),
  is_not_applicable boolean not null default false,
  not_applicable_justification text,
  evidence_notes text not null default '',
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (assessment_id, indicator_definition_id),
  foreign key (organization_id, assessment_id)
    references public.diagnostic_assessments(organization_id, id) on delete cascade,
  foreign key (organization_id, indicator_definition_id)
    references public.diagnostic_indicator_definitions(organization_id, id) on delete restrict,
  foreign key (organization_id, incubator_id)
    references public.incubators(organization_id, id) on delete restrict,
  check (
    (is_not_applicable and numeric_value is null and nullif(btrim(not_applicable_justification), '') is not null)
    or (not is_not_applicable and numeric_value is not null)
  ),
  check (char_length(evidence_notes) <= 2000)
);

create index diagnostic_indicator_values_assessment_idx
  on public.diagnostic_indicator_values (assessment_id, indicator_definition_id);

create table public.diagnostic_dimension_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  incubator_id uuid not null,
  assessment_id uuid not null,
  dimension_id uuid not null,
  self_score numeric(8,3),
  validated_score numeric(8,3),
  effective_weight numeric(8,3) not null,
  applicable_criteria integer not null default 0,
  answered_criteria integer not null default 0,
  validated_criteria integer not null default 0,
  calculated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (assessment_id, dimension_id),
  foreign key (organization_id, assessment_id)
    references public.diagnostic_assessments(organization_id, id) on delete cascade,
  foreign key (organization_id, dimension_id)
    references public.diagnostic_dimensions(organization_id, id) on delete restrict,
  foreign key (organization_id, incubator_id)
    references public.incubators(organization_id, id) on delete restrict,
  check ((self_score is null or self_score between 0 and 100) and (validated_score is null or validated_score between 0 and 100)),
  check (effective_weight > 0 and effective_weight <= 100),
  check (applicable_criteria >= 0 and answered_criteria >= 0 and validated_criteria >= 0)
);

create index diagnostic_dimension_scores_assessment_idx
  on public.diagnostic_dimension_scores (assessment_id, dimension_id);

create table public.diagnostic_trigger_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  incubator_id uuid not null,
  assessment_id uuid not null,
  trigger_rule_id uuid not null,
  status public.diagnostic_trigger_result_status not null,
  observed_value numeric(18,4),
  message text not null,
  evaluated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (assessment_id, trigger_rule_id),
  foreign key (organization_id, assessment_id)
    references public.diagnostic_assessments(organization_id, id) on delete cascade,
  foreign key (organization_id, trigger_rule_id)
    references public.diagnostic_trigger_rules(organization_id, id) on delete restrict,
  foreign key (organization_id, incubator_id)
    references public.incubators(organization_id, id) on delete restrict,
  check (message = btrim(message) and char_length(message) between 2 and 1000)
);

create index diagnostic_trigger_results_assessment_idx
  on public.diagnostic_trigger_results (assessment_id, status, evaluated_at desc);

create table public.diagnostic_history_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  incubator_id uuid not null,
  assessment_id uuid not null,
  event_type text not null,
  actor_id uuid references public.profiles(id) on delete restrict,
  from_status text,
  to_status text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (organization_id, assessment_id)
    references public.diagnostic_assessments(organization_id, id) on delete cascade,
  foreign key (organization_id, incubator_id)
    references public.incubators(organization_id, id) on delete restrict,
  check (event_type ~ '^[a-z][a-z0-9_]*$'),
  check (jsonb_typeof(details) = 'object')
);

create index diagnostic_history_events_assessment_idx
  on public.diagnostic_history_events (assessment_id, created_at desc, id desc);

create or replace function private.validate_diagnostic_phase2_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_incubator uuid;
  expected_template uuid;
  expected_startup uuid;
begin
  if tg_table_name = 'diagnostic_campaigns' then
    select t.incubator_id into expected_incubator
    from public.diagnostic_templates t
    where t.organization_id = new.organization_id
      and t.id = new.template_id
      and t.status = 'published';
    if expected_incubator is distinct from new.incubator_id then
      raise exception 'Campanha exige versão publicada da mesma incubadora' using errcode = '23514';
    end if;
    if new.program_id is not null and not exists (
      select 1 from public.programs p
      where p.organization_id = new.organization_id and p.id = new.program_id
        and p.incubator_id = new.incubator_id and p.deleted_at is null
    ) then
      raise exception 'Programa fora do escopo da incubadora' using errcode = '23514';
    end if;
    if new.cohort_id is not null and not exists (
      select 1 from public.cohorts c
      join public.programs p on p.organization_id = c.organization_id and p.id = c.program_id
      where c.organization_id = new.organization_id and c.id = new.cohort_id
        and p.incubator_id = new.incubator_id and p.deleted_at is null and c.deleted_at is null
        and (new.program_id is null or p.id = new.program_id)
    ) then
      raise exception 'Turma fora do escopo da campanha' using errcode = '23514';
    end if;
  elsif tg_table_name = 'diagnostic_campaign_startups' then
    select c.incubator_id, c.template_id into expected_incubator, expected_template
    from public.diagnostic_campaigns c
    where c.organization_id = new.organization_id and c.id = new.campaign_id;
    if expected_incubator is distinct from new.incubator_id or not exists (
      select 1 from public.startups s
      where s.organization_id = new.organization_id and s.id = new.startup_id
        and s.incubator_id = new.incubator_id and s.deleted_at is null
    ) then
      raise exception 'Startup fora do escopo da campanha' using errcode = '23514';
    end if;
  elsif tg_table_name = 'diagnostic_respondents' then
    select a.incubator_id into expected_incubator
    from public.diagnostic_assessments a
    where a.organization_id = new.organization_id and a.id = new.assessment_id;
    if expected_incubator is distinct from new.incubator_id or not exists (
      select 1 from public.organization_memberships m
      where m.organization_id = new.organization_id and m.user_id = new.user_id and m.status = 'active'
    ) then
      raise exception 'Respondente fora do escopo da aplicação' using errcode = '23514';
    end if;
  elsif tg_table_name in ('diagnostic_response_validations', 'diagnostic_response_evidence') then
    select a.incubator_id into expected_incubator
    from public.diagnostic_responses r
    join public.diagnostic_assessments a
      on a.organization_id = r.organization_id and a.id = r.assessment_id
    where r.organization_id = new.organization_id and r.id = new.response_id;
    if expected_incubator is distinct from new.incubator_id then
      raise exception 'Registro fora do escopo da resposta' using errcode = '23514';
    end if;
    if tg_table_name = 'diagnostic_response_validations'
      and new.validator_id is distinct from (select auth.uid()) then
      raise exception 'O avaliador registrado deve ser o usuário autenticado' using errcode = '42501';
    end if;
  elsif tg_table_name in ('diagnostic_indicator_values', 'diagnostic_dimension_scores', 'diagnostic_trigger_results', 'diagnostic_history_events') then
    select a.incubator_id, a.template_id, a.startup_id
      into expected_incubator, expected_template, expected_startup
    from public.diagnostic_assessments a
    where a.organization_id = new.organization_id and a.id = new.assessment_id;
    if expected_incubator is distinct from new.incubator_id then
      raise exception 'Registro derivado fora do escopo da aplicação' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger diagnostic_campaigns_validate_scope
before insert or update on public.diagnostic_campaigns
for each row execute function private.validate_diagnostic_phase2_scope();
create trigger diagnostic_campaign_startups_validate_scope
before insert or update on public.diagnostic_campaign_startups
for each row execute function private.validate_diagnostic_phase2_scope();
create trigger diagnostic_respondents_validate_scope
before insert or update on public.diagnostic_respondents
for each row execute function private.validate_diagnostic_phase2_scope();
create trigger diagnostic_response_validations_validate_scope
before insert or update on public.diagnostic_response_validations
for each row execute function private.validate_diagnostic_phase2_scope();
create trigger diagnostic_response_evidence_validate_scope
before insert or update on public.diagnostic_response_evidence
for each row execute function private.validate_diagnostic_phase2_scope();
create trigger diagnostic_indicator_values_validate_scope
before insert or update on public.diagnostic_indicator_values
for each row execute function private.validate_diagnostic_phase2_scope();
create trigger diagnostic_dimension_scores_validate_scope
before insert or update on public.diagnostic_dimension_scores
for each row execute function private.validate_diagnostic_phase2_scope();
create trigger diagnostic_trigger_results_validate_scope
before insert or update on public.diagnostic_trigger_results
for each row execute function private.validate_diagnostic_phase2_scope();
create trigger diagnostic_history_events_validate_scope
before insert or update on public.diagnostic_history_events
for each row execute function private.validate_diagnostic_phase2_scope();

create or replace function private.can_read_diagnostic_assessment(target_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.diagnostic_assessments a
    where a.id = target_assessment_id
      and (
        private.has_permission(a.organization_id, 'diagnostic.read', null, a.incubator_id)
        or private.can_access_startup(a.organization_id, a.startup_id, a.incubator_id)
        or exists (
          select 1 from public.diagnostic_respondents dr
          where dr.organization_id = a.organization_id
            and dr.assessment_id = a.id
            and dr.user_id = (select auth.uid())
            and dr.revoked_at is null
        )
        or a.evaluator_id = (select auth.uid())
      )
  );
$$;

create or replace function private.can_respond_diagnostic_assessment(target_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.diagnostic_assessments a
    where a.id = target_assessment_id
      and a.status not in ('validated', 'cancelled')
      and (
        private.can_manage_startup(a.organization_id, a.startup_id, a.incubator_id)
        or (
          private.has_permission(a.organization_id, 'diagnostic.respond', null, a.incubator_id)
          and exists (
            select 1 from public.diagnostic_respondents dr
            where dr.organization_id = a.organization_id
              and dr.assessment_id = a.id
              and dr.user_id = (select auth.uid())
              and dr.role in ('primary', 'collaborator')
              and dr.revoked_at is null
          )
        )
      )
  );
$$;

create or replace function private.can_validate_diagnostic_assessment(target_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.diagnostic_assessments a
    left join public.diagnostic_campaign_startups cs
      on cs.organization_id = a.organization_id and cs.id = a.campaign_startup_id
    where a.id = target_assessment_id
      and private.has_permission(a.organization_id, 'diagnostic.validate', null, a.incubator_id)
      and (
        private.has_permission(a.organization_id, 'diagnostic.manage', null, a.incubator_id)
        or a.evaluator_id = (select auth.uid())
        or cs.evaluator_id = (select auth.uid())
      )
  );
$$;

create or replace function public.publish_diagnostic_template_version(target_template_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  template public.diagnostic_templates%rowtype;
  total_weight numeric;
begin
  select * into template
  from public.diagnostic_templates t
  where t.id = target_template_id
  for update;

  if not found or not private.has_permission(
    template.organization_id, 'diagnostic.manage', null, template.incubator_id
  ) then
    raise exception 'Versão inexistente ou sem permissão' using errcode = '42501';
  end if;
  if template.status <> 'draft' then
    raise exception 'Somente versões em rascunho podem ser publicadas' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.diagnostic_dimensions d
    where d.template_id = target_template_id and d.code is null
  ) or not exists (
    select 1 from public.diagnostic_dimensions d where d.template_id = target_template_id
  ) then
    raise exception 'Todas as dimensões precisam de código' using errcode = '23514';
  end if;
  select sum(d.weight) into total_weight
  from public.diagnostic_dimensions d
  where d.template_id = target_template_id;
  if total_weight is distinct from 100 then
    raise exception 'Os pesos das dimensões devem somar 100%%' using errcode = '23514';
  end if;
  if exists (
    select 1
    from public.diagnostic_criteria c
    where c.template_id = target_template_id
      and (c.code is null or not exists (
        select 1 from public.diagnostic_criterion_levels l
        where l.criterion_id = c.id
        having count(*) = 5 and min(l.score) = 0 and max(l.score) = 4
      ))
  ) or not exists (
    select 1 from public.diagnostic_criteria c where c.template_id = target_template_id
  ) then
    raise exception 'Critérios precisam de código e rubricas completas de 0 a 4' using errcode = '23514';
  end if;
  if (select count(*) from public.diagnostic_classification_ranges r where r.template_id = target_template_id) <> 5 then
    raise exception 'Configure as cinco faixas de classificação' using errcode = '23514';
  end if;
  if exists (
    select 1
    from public.diagnostic_classification_ranges a
    join public.diagnostic_classification_ranges b
      on b.template_id = a.template_id and b.position = a.position + 1
    where a.template_id = target_template_id and b.minimum_score <> a.maximum_score + 1
  ) or not exists (
    select 1 from public.diagnostic_classification_ranges r
    where r.template_id = target_template_id and r.minimum_score = 0
  ) or not exists (
    select 1 from public.diagnostic_classification_ranges r
    where r.template_id = target_template_id and r.maximum_score = 100
  ) then
    raise exception 'Faixas de classificação precisam cobrir 0 a 100 sem lacunas' using errcode = '23514';
  end if;

  update public.diagnostic_templates
  set status = 'published', published_at = now()
  where id = target_template_id;
end;
$$;

-- Protege também as novas estruturas filhas de versões publicadas.
create or replace function private.protect_published_diagnostic_phase2()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_template_id uuid;
  current_status public.diagnostic_template_status;
begin
  current_template_id := case when tg_op = 'DELETE' then old.template_id else new.template_id end;
  select t.status into current_status from public.diagnostic_templates t where t.id = current_template_id;
  if current_status = 'published' then
    raise exception 'Estrutura de versão publicada é imutável; crie uma nova versão' using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.protect_final_diagnostic_validation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'final' then
    raise exception 'Validação final é imutável; crie uma nova revisão' using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger diagnostic_response_validations_protect_final
before update or delete on public.diagnostic_response_validations
for each row execute function private.protect_final_diagnostic_validation();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'diagnostic_dimension_stages', 'diagnostic_criterion_stages',
    'diagnostic_criterion_levels', 'diagnostic_classification_ranges',
    'diagnostic_indicator_definitions', 'diagnostic_trigger_rules'
  ] loop
    execute format(
      'create trigger %I_protect_published before insert or update or delete on public.%I for each row execute function private.protect_published_diagnostic_phase2()',
      table_name, table_name
    );
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'diagnostic_template_families', 'diagnostic_criterion_levels',
    'diagnostic_classification_ranges', 'diagnostic_indicator_definitions',
    'diagnostic_trigger_rules', 'diagnostic_campaigns',
    'diagnostic_campaign_startups', 'diagnostic_respondents',
    'diagnostic_response_evidence', 'diagnostic_indicator_values'
  ] loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()',
      table_name, table_name
    );
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'diagnostic_template_families', 'diagnostic_dimension_stages',
    'diagnostic_criterion_stages', 'diagnostic_criterion_levels',
    'diagnostic_classification_ranges', 'diagnostic_indicator_definitions',
    'diagnostic_trigger_rules', 'diagnostic_campaigns',
    'diagnostic_campaign_startups', 'diagnostic_respondents',
    'diagnostic_response_validations', 'diagnostic_response_evidence',
    'diagnostic_indicator_values', 'diagnostic_dimension_scores',
    'diagnostic_trigger_results', 'diagnostic_history_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end $$;

create policy diagnostic_template_families_select on public.diagnostic_template_families
for select to authenticated using (
  case when incubator_id is null
    then private.has_permission(organization_id, 'diagnostic.read', null, null)
      or private.is_active_org_member(organization_id)
    else private.has_permission(organization_id, 'diagnostic.read', null, incubator_id)
  end
);
create policy diagnostic_template_families_manage on public.diagnostic_template_families
for all to authenticated
using (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id))
with check (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'diagnostic_dimension_stages', 'diagnostic_criterion_stages',
    'diagnostic_criterion_levels', 'diagnostic_classification_ranges',
    'diagnostic_indicator_definitions', 'diagnostic_trigger_rules'
  ] loop
    execute format(
      'create policy %I_select on public.%I for select to authenticated using (exists (select 1 from public.diagnostic_templates t where t.organization_id = %I.organization_id and t.id = %I.template_id))',
      table_name, table_name, table_name, table_name
    );
    execute format(
      'create policy %I_manage on public.%I for all to authenticated using (exists (select 1 from public.diagnostic_templates t where t.organization_id = %I.organization_id and t.id = %I.template_id and private.has_permission(t.organization_id, ''diagnostic.manage'', null, t.incubator_id))) with check (exists (select 1 from public.diagnostic_templates t where t.organization_id = %I.organization_id and t.id = %I.template_id and private.has_permission(t.organization_id, ''diagnostic.manage'', null, t.incubator_id)))',
      table_name, table_name, table_name, table_name, table_name, table_name
    );
  end loop;
end $$;

create policy diagnostic_campaigns_select on public.diagnostic_campaigns
for select to authenticated using (
  private.has_permission(organization_id, 'diagnostic.read', null, incubator_id)
  or exists (
    select 1 from public.diagnostic_campaign_startups cs
    join public.diagnostic_assessments a
      on a.organization_id = cs.organization_id and a.campaign_startup_id = cs.id
    where cs.organization_id = diagnostic_campaigns.organization_id
      and cs.campaign_id = diagnostic_campaigns.id
      and private.can_read_diagnostic_assessment(a.id)
  )
);
create policy diagnostic_campaigns_manage on public.diagnostic_campaigns
for all to authenticated
using (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id))
with check (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id));

drop policy if exists diagnostic_assessments_select on public.diagnostic_assessments;
create policy diagnostic_assessments_select on public.diagnostic_assessments
for select to authenticated using (private.can_read_diagnostic_assessment(id));

drop policy if exists diagnostic_responses_select on public.diagnostic_responses;
create policy diagnostic_responses_select on public.diagnostic_responses
for select to authenticated using (private.can_read_diagnostic_assessment(assessment_id));

drop policy if exists diagnostic_responses_insert on public.diagnostic_responses;
create policy diagnostic_responses_insert on public.diagnostic_responses
for insert to authenticated with check (private.can_respond_diagnostic_assessment(assessment_id));

drop policy if exists diagnostic_responses_update on public.diagnostic_responses;
create policy diagnostic_responses_update on public.diagnostic_responses
for update to authenticated
using (
  private.can_respond_diagnostic_assessment(assessment_id)
  or private.can_validate_diagnostic_assessment(assessment_id)
)
with check (
  private.can_respond_diagnostic_assessment(assessment_id)
  or private.can_validate_diagnostic_assessment(assessment_id)
);

create policy diagnostic_campaign_startups_select on public.diagnostic_campaign_startups
for select to authenticated using (
  private.has_permission(organization_id, 'diagnostic.read', null, incubator_id)
  or private.can_access_startup(organization_id, startup_id, incubator_id)
);
create policy diagnostic_campaign_startups_manage on public.diagnostic_campaign_startups
for all to authenticated
using (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id))
with check (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id));

create policy diagnostic_respondents_select on public.diagnostic_respondents
for select to authenticated using (private.can_read_diagnostic_assessment(assessment_id));
create policy diagnostic_respondents_manage on public.diagnostic_respondents
for all to authenticated
using (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id))
with check (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id));

create policy diagnostic_response_validations_select on public.diagnostic_response_validations
for select to authenticated using (exists (
  select 1 from public.diagnostic_responses r
  where r.id = diagnostic_response_validations.response_id
    and private.can_read_diagnostic_assessment(r.assessment_id)
));
create policy diagnostic_response_validations_manage on public.diagnostic_response_validations
for all to authenticated
using (exists (
  select 1 from public.diagnostic_responses r
  where r.id = diagnostic_response_validations.response_id
    and private.can_validate_diagnostic_assessment(r.assessment_id)
))
with check (exists (
  select 1 from public.diagnostic_responses r
  where r.id = diagnostic_response_validations.response_id
    and private.can_validate_diagnostic_assessment(r.assessment_id)
));

create policy diagnostic_response_evidence_select on public.diagnostic_response_evidence
for select to authenticated using (exists (
  select 1 from public.diagnostic_responses r
  where r.id = diagnostic_response_evidence.response_id
    and private.can_read_diagnostic_assessment(r.assessment_id)
));
create policy diagnostic_response_evidence_insert on public.diagnostic_response_evidence
for insert to authenticated with check (exists (
  select 1 from public.diagnostic_responses r
  where r.id = diagnostic_response_evidence.response_id
    and private.can_respond_diagnostic_assessment(r.assessment_id)
) and created_by = (select auth.uid()));
create policy diagnostic_response_evidence_update on public.diagnostic_response_evidence
for update to authenticated
using (created_by = (select auth.uid()) and exists (
  select 1 from public.diagnostic_responses r
  where r.id = diagnostic_response_evidence.response_id
    and private.can_respond_diagnostic_assessment(r.assessment_id)
))
with check (created_by = (select auth.uid()));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'diagnostic_indicator_values', 'diagnostic_dimension_scores',
    'diagnostic_trigger_results', 'diagnostic_history_events'
  ] loop
    execute format(
      'create policy %I_select on public.%I for select to authenticated using (private.can_read_diagnostic_assessment(assessment_id))',
      table_name, table_name
    );
  end loop;
end $$;

create policy diagnostic_indicator_values_manage on public.diagnostic_indicator_values
for all to authenticated
using (private.can_respond_diagnostic_assessment(assessment_id))
with check (private.can_respond_diagnostic_assessment(assessment_id) and recorded_by = (select auth.uid()));

-- Scores, gatilhos e histórico são derivados e não recebem escrita direta do cliente.

grant select on
  public.diagnostic_template_families,
  public.diagnostic_dimension_stages,
  public.diagnostic_criterion_stages,
  public.diagnostic_criterion_levels,
  public.diagnostic_classification_ranges,
  public.diagnostic_indicator_definitions,
  public.diagnostic_trigger_rules,
  public.diagnostic_campaigns,
  public.diagnostic_campaign_startups,
  public.diagnostic_respondents,
  public.diagnostic_response_validations,
  public.diagnostic_response_evidence,
  public.diagnostic_indicator_values,
  public.diagnostic_dimension_scores,
  public.diagnostic_trigger_results,
  public.diagnostic_history_events
to authenticated;

grant insert, update, delete on
  public.diagnostic_template_families,
  public.diagnostic_dimension_stages,
  public.diagnostic_criterion_stages,
  public.diagnostic_criterion_levels,
  public.diagnostic_classification_ranges,
  public.diagnostic_indicator_definitions,
  public.diagnostic_trigger_rules,
  public.diagnostic_campaigns,
  public.diagnostic_campaign_startups,
  public.diagnostic_respondents,
  public.diagnostic_response_validations,
  public.diagnostic_response_evidence,
  public.diagnostic_indicator_values
to authenticated;

grant update (
  version_label, changelog, source_checksum, based_on_version_id
) on public.diagnostic_templates to authenticated;
grant update (code, is_essential) on public.diagnostic_dimensions to authenticated;
grant update (
  code, requires_not_applicable_justification,
  not_applicable_guidance, internal_notes
) on public.diagnostic_criteria to authenticated;

revoke execute on function private.validate_diagnostic_phase2_scope()
  from public, anon, authenticated;
revoke execute on function private.can_read_diagnostic_assessment(uuid)
  from public, anon, authenticated;
revoke execute on function private.can_respond_diagnostic_assessment(uuid)
  from public, anon, authenticated;
revoke execute on function private.can_validate_diagnostic_assessment(uuid)
  from public, anon, authenticated;
revoke execute on function private.protect_published_diagnostic_phase2()
  from public, anon, authenticated;
revoke execute on function private.protect_final_diagnostic_validation()
  from public, anon, authenticated;
revoke execute on function public.publish_diagnostic_template_version(uuid)
  from public, anon;
grant execute on function public.publish_diagnostic_template_version(uuid)
  to authenticated;

comment on table public.diagnostic_template_families is
  'Identidade estável da metodologia; versões publicadas permanecem em diagnostic_templates por compatibilidade.';
comment on table public.diagnostic_campaigns is
  'Campanha da incubadora ligada a uma versão publicada e a um período obrigatório.';
comment on table public.diagnostic_response_validations is
  'Histórico de validações oficiais separado da autoavaliação.';
comment on table public.diagnostic_response_evidence is
  'Metadados e autorização da evidência; arquivos grandes permanecem no Google Drive via public.files.';
comment on table public.diagnostic_dimension_scores is
  'Snapshot reproduzível dos scores por dimensão; escrita reservada a funções internas.';

commit;
