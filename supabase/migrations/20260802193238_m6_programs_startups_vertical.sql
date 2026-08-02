-- Marco 6: primeiro corte vertical real do MVP.
-- Programas, turmas, startups, equipes, matriculas e historico com isolamento por tenant.

begin;

do $$ begin
  create type public.program_status as enum ('draft', 'planned', 'active', 'completed', 'cancelled', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.cohort_status as enum ('planned', 'enrollment_open', 'active', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.program_member_role as enum ('coordinator', 'staff', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.startup_stage as enum ('idea', 'validation', 'operation', 'traction', 'scale', 'graduated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.startup_status as enum ('active', 'inactive', 'graduated', 'withdrawn', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.startup_member_role as enum ('founder', 'cofounder', 'representative', 'employee', 'advisor', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.startup_member_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.enrollment_status as enum ('invited', 'active', 'suspended', 'completed', 'withdrawn', 'transferred');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.enrollment_source as enum ('manual', 'invitation', 'selection_process');
exception when duplicate_object then null; end $$;

create table public.program_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  incubator_id uuid,
  code text not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_types_org_id_unique unique (organization_id, id),
  constraint program_types_incubator_same_org foreign key (organization_id, incubator_id)
    references public.incubators (organization_id, id),
  constraint program_types_code_valid check (code ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$' and char_length(code) between 2 and 60),
  constraint program_types_name_valid check (name = btrim(name) and char_length(name) between 2 and 120),
  constraint program_types_description_valid check (description is null or char_length(description) <= 1000),
  constraint program_types_settings_object check (jsonb_typeof(settings) = 'object')
);

create unique index program_types_code_scope_uidx
  on public.program_types (organization_id, coalesce(incubator_id, '00000000-0000-0000-0000-000000000000'::uuid), code);
create index program_types_incubator_idx on public.program_types (organization_id, incubator_id) where incubator_id is not null;

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  incubator_id uuid not null,
  type_id uuid not null,
  code text not null,
  name text not null,
  description text,
  starts_on date,
  ends_on date,
  status public.program_status not null default 'draft',
  admission_criteria jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint programs_org_id_unique unique (organization_id, id),
  constraint programs_incubator_same_org foreign key (organization_id, incubator_id)
    references public.incubators (organization_id, id),
  constraint programs_type_same_org foreign key (organization_id, type_id)
    references public.program_types (organization_id, id),
  constraint programs_code_valid check (code ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)*$' and char_length(code) between 2 and 40),
  constraint programs_name_valid check (name = btrim(name) and char_length(name) between 2 and 160),
  constraint programs_description_valid check (description is null or char_length(description) <= 3000),
  constraint programs_dates_valid check (starts_on is null or ends_on is null or starts_on <= ends_on),
  constraint programs_admission_criteria_array check (jsonb_typeof(admission_criteria) = 'array'),
  constraint programs_settings_object check (jsonb_typeof(settings) = 'object'),
  constraint programs_deleted_status check (deleted_at is null or status = 'archived')
);

create unique index programs_code_active_uidx on public.programs (organization_id, incubator_id, code) where deleted_at is null;
create index programs_org_status_idx on public.programs (organization_id, status, starts_on desc) where deleted_at is null;
create index programs_incubator_idx on public.programs (organization_id, incubator_id, status) where deleted_at is null;
create index programs_type_idx on public.programs (organization_id, type_id);

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  program_id uuid not null,
  code text not null,
  name text not null,
  starts_on date,
  ends_on date,
  enrollment_starts_on date,
  enrollment_ends_on date,
  status public.cohort_status not null default 'planned',
  capacity integer,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint cohorts_org_id_unique unique (organization_id, id),
  constraint cohorts_program_same_org foreign key (organization_id, program_id)
    references public.programs (organization_id, id),
  constraint cohorts_code_valid check (code ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)*$' and char_length(code) between 2 and 40),
  constraint cohorts_name_valid check (name = btrim(name) and char_length(name) between 2 and 160),
  constraint cohorts_dates_valid check (starts_on is null or ends_on is null or starts_on <= ends_on),
  constraint cohorts_enrollment_dates_valid check (enrollment_starts_on is null or enrollment_ends_on is null or enrollment_starts_on <= enrollment_ends_on),
  constraint cohorts_capacity_valid check (capacity is null or capacity between 1 and 100000),
  constraint cohorts_settings_object check (jsonb_typeof(settings) = 'object'),
  constraint cohorts_deleted_status check (deleted_at is null or status = 'cancelled')
);

create unique index cohorts_code_active_uidx on public.cohorts (organization_id, program_id, code) where deleted_at is null;
create index cohorts_program_status_idx on public.cohorts (organization_id, program_id, status, starts_on desc) where deleted_at is null;

create table public.program_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  program_id uuid not null,
  user_id uuid not null references auth.users (id),
  role public.program_member_role not null default 'staff',
  active_from date not null default current_date,
  active_until date,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_members_org_id_unique unique (organization_id, id),
  constraint program_members_program_same_org foreign key (organization_id, program_id)
    references public.programs (organization_id, id) on delete cascade,
  constraint program_members_program_user_unique unique (organization_id, program_id, user_id),
  constraint program_members_dates_valid check (active_until is null or active_from <= active_until)
);

create index program_members_user_idx on public.program_members (user_id, organization_id, program_id);

create table public.startups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  incubator_id uuid not null,
  name text not null,
  legal_name text,
  tax_id text,
  sector text,
  business_model text,
  stage public.startup_stage not null default 'idea',
  status public.startup_status not null default 'active',
  city text,
  state text,
  country_code text not null default 'BR',
  website_url text,
  custom_fields jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint startups_org_id_unique unique (organization_id, id),
  constraint startups_incubator_same_org foreign key (organization_id, incubator_id)
    references public.incubators (organization_id, id),
  constraint startups_name_valid check (name = btrim(name) and char_length(name) between 2 and 160),
  constraint startups_legal_name_valid check (legal_name is null or (legal_name = btrim(legal_name) and char_length(legal_name) <= 200)),
  constraint startups_tax_id_valid check (tax_id is null or (tax_id = btrim(tax_id) and char_length(tax_id) between 8 and 32)),
  constraint startups_sector_valid check (sector is null or (sector = btrim(sector) and char_length(sector) <= 120)),
  constraint startups_business_model_valid check (business_model is null or char_length(business_model) <= 2000),
  constraint startups_location_valid check (
    (city is null or char_length(city) <= 120)
    and (state is null or char_length(state) <= 120)
    and country_code ~ '^[A-Z]{2}$'
  ),
  constraint startups_website_url_valid check (website_url is null or char_length(website_url) <= 2048),
  constraint startups_custom_fields_object check (jsonb_typeof(custom_fields) = 'object'),
  constraint startups_deleted_status check (deleted_at is null or status = 'archived')
);

create index startups_org_status_idx on public.startups (organization_id, status, name) where deleted_at is null;
create index startups_incubator_idx on public.startups (organization_id, incubator_id, stage, status) where deleted_at is null;
create unique index startups_tax_id_active_uidx on public.startups (organization_id, tax_id) where tax_id is not null and deleted_at is null;

create table public.startup_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  startup_id uuid not null,
  user_id uuid references auth.users (id),
  full_name text not null,
  email text,
  role public.startup_member_role not null default 'other',
  role_title text,
  dedication_hours_per_week numeric(5,2),
  competencies text[] not null default '{}',
  equity_percentage numeric(5,2),
  is_representative boolean not null default false,
  status public.startup_member_status not null default 'active',
  joined_on date,
  left_on date,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint startup_members_org_id_unique unique (organization_id, id),
  constraint startup_members_startup_same_org foreign key (organization_id, startup_id)
    references public.startups (organization_id, id) on delete cascade,
  constraint startup_members_name_valid check (full_name = btrim(full_name) and char_length(full_name) between 2 and 160),
  constraint startup_members_email_valid check (email is null or (email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and char_length(email) <= 320)),
  constraint startup_members_role_title_valid check (role_title is null or char_length(role_title) <= 120),
  constraint startup_members_dedication_valid check (dedication_hours_per_week is null or dedication_hours_per_week between 0 and 168),
  constraint startup_members_equity_valid check (equity_percentage is null or equity_percentage between 0 and 100),
  constraint startup_members_dates_valid check (left_on is null or joined_on is null or joined_on <= left_on),
  constraint startup_members_status_dates check (status <> 'active' or left_on is null)
);

create unique index startup_members_user_active_uidx on public.startup_members (organization_id, startup_id, user_id)
  where user_id is not null and status = 'active';
create unique index startup_members_email_active_uidx on public.startup_members (organization_id, startup_id, email)
  where email is not null and status = 'active';
create index startup_members_user_idx on public.startup_members (user_id, organization_id, startup_id) where user_id is not null;

create table public.startup_enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  startup_id uuid not null,
  cohort_id uuid not null,
  status public.enrollment_status not null default 'active',
  source public.enrollment_source not null default 'manual',
  entry_date date not null default current_date,
  exit_date date,
  exit_reason text,
  previous_enrollment_id uuid,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint startup_enrollments_org_id_unique unique (organization_id, id),
  constraint startup_enrollments_startup_same_org foreign key (organization_id, startup_id)
    references public.startups (organization_id, id),
  constraint startup_enrollments_cohort_same_org foreign key (organization_id, cohort_id)
    references public.cohorts (organization_id, id),
  constraint startup_enrollments_previous_same_org foreign key (organization_id, previous_enrollment_id)
    references public.startup_enrollments (organization_id, id),
  constraint startup_enrollments_dates_valid check (exit_date is null or entry_date <= exit_date),
  constraint startup_enrollments_exit_reason_valid check (exit_reason is null or char_length(exit_reason) <= 1000),
  constraint startup_enrollments_status_dates check (
    (status in ('completed', 'withdrawn', 'transferred') and exit_date is not null)
    or (status in ('invited', 'active', 'suspended') and exit_date is null)
  )
);

create unique index startup_enrollments_current_uidx on public.startup_enrollments (organization_id, startup_id, cohort_id)
  where status in ('invited', 'active', 'suspended');
create index startup_enrollments_startup_idx on public.startup_enrollments (organization_id, startup_id, entry_date desc);
create index startup_enrollments_cohort_idx on public.startup_enrollments (organization_id, cohort_id, status, entry_date desc);

create table public.startup_history (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id),
  startup_id uuid not null,
  actor_user_id uuid references auth.users (id),
  event_type text not null,
  title text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint startup_history_startup_same_org foreign key (organization_id, startup_id)
    references public.startups (organization_id, id),
  constraint startup_history_event_valid check (event_type ~ '^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$' and char_length(event_type) <= 120),
  constraint startup_history_title_valid check (title = btrim(title) and char_length(title) between 2 and 240),
  constraint startup_history_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index startup_history_timeline_idx on public.startup_history (organization_id, startup_id, occurred_at desc);

-- Agora que programas e startups existem, os vínculos de arquivo recebem FKs reais.
alter table public.file_links
  add column program_id uuid,
  add column startup_id uuid,
  add constraint file_links_program_same_org foreign key (organization_id, program_id)
    references public.programs (organization_id, id),
  add constraint file_links_startup_same_org foreign key (organization_id, startup_id)
    references public.startups (organization_id, id),
  drop constraint file_links_scope_shape,
  add constraint file_links_scope_shape check (num_nonnulls(unit_id, incubator_id, program_id, startup_id) <= 1),
  drop constraint file_links_unique_scope;

alter table public.file_links
  add constraint file_links_unique_scope unique nulls not distinct
    (organization_id, file_id, unit_id, incubator_id, program_id, startup_id, purpose);

create index file_links_program_idx on public.file_links (organization_id, program_id) where program_id is not null;
create index file_links_startup_idx on public.file_links (organization_id, startup_id) where startup_id is not null;

comment on table public.program_types is 'Tipos configuraveis por organizacao ou incubadora; nao dependem de CERNE.';
comment on table public.programs is 'Programa operacional de uma incubadora, independente de metodologia.';
comment on table public.cohorts is 'Turma ou ciclo de um programa.';
comment on table public.startups is 'Empreendimento multi-tenant; dados sensiveis permanecem protegidos por RLS.';
comment on table public.startup_enrollments is 'Historico de participacao da startup; mudancas de turma geram novos registros.';
comment on table public.startup_history is 'Linha do tempo append-only gerada por triggers de dominio.';

insert into public.permissions (code, name, description, category) values
  ('program.read', 'Visualizar programas', 'Visualizar tipos, programas, turmas e participantes autorizados.', 'Programas'),
  ('program.manage', 'Gerenciar programas', 'Criar e alterar tipos, programas, turmas, equipe e matriculas.', 'Programas'),
  ('startup.read', 'Visualizar startups', 'Visualizar startups, equipes, matriculas e historico autorizados.', 'Startups'),
  ('startup.manage', 'Gerenciar startups', 'Criar e alterar startups, equipes e participacao em programas.', 'Startups')
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category;

insert into public.role_permissions (organization_id, role_id, permission_code)
select r.organization_id, r.id, permission_code
from public.roles r
cross join lateral unnest(
  case r.code
    when 'organization_admin' then array['program.read', 'program.manage', 'startup.read', 'startup.manage']
    when 'incubator_manager' then array['program.read', 'program.manage', 'startup.read', 'startup.manage']
    when 'program_coordinator' then array['program.read', 'program.manage', 'startup.read', 'startup.manage']
    when 'agent' then array['program.read', 'startup.read', 'startup.manage']
    when 'evaluator' then array['program.read', 'startup.read']
    when 'auditor' then array['program.read', 'startup.read']
    else array[]::text[]
  end
) permission_code
where r.is_system
on conflict do nothing;

create or replace function private.seed_m6_role_permissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare permission_code text;
begin
  if not new.is_system or new.code = 'organization_admin' then return new; end if;

  foreach permission_code in array
    case new.code
      when 'incubator_manager' then array['program.read', 'program.manage', 'startup.read', 'startup.manage']
      when 'program_coordinator' then array['program.read', 'program.manage', 'startup.read', 'startup.manage']
      when 'agent' then array['program.read', 'startup.read', 'startup.manage']
      when 'evaluator' then array['program.read', 'startup.read']
      when 'auditor' then array['program.read', 'startup.read']
      else array[]::text[]
    end
  loop
    insert into public.role_permissions (organization_id, role_id, permission_code)
    values (new.organization_id, new.id, permission_code)
    on conflict do nothing;
  end loop;
  return new;
end;
$$;

create trigger roles_seed_m6_permissions
after insert on public.roles
for each row execute function private.seed_m6_role_permissions();

create or replace function private.can_access_program(
  target_organization_id uuid,
  target_program_id uuid,
  target_incubator_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.has_permission(target_organization_id, 'program.read', null, target_incubator_id))
    or (
      (select private.is_active_org_member(target_organization_id))
      and exists (
        select 1 from public.program_members pm
        where pm.organization_id = target_organization_id
          and pm.program_id = target_program_id
          and pm.user_id = (select auth.uid())
          and pm.active_from <= current_date
          and (pm.active_until is null or pm.active_until >= current_date)
      )
    );
$$;

create or replace function private.can_access_startup(
  target_organization_id uuid,
  target_startup_id uuid,
  target_incubator_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.has_permission(target_organization_id, 'startup.read', null, target_incubator_id))
    or (
      (select private.is_active_org_member(target_organization_id))
      and exists (
        select 1 from public.startup_members sm
        where sm.organization_id = target_organization_id
          and sm.startup_id = target_startup_id
          and sm.user_id = (select auth.uid())
          and sm.status = 'active'
      )
    );
$$;

create or replace function private.can_manage_startup(
  target_organization_id uuid,
  target_startup_id uuid,
  target_incubator_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.has_permission(target_organization_id, 'startup.manage', null, target_incubator_id))
    or (
      (select private.is_active_org_member(target_organization_id))
      and exists (
        select 1 from public.startup_members sm
        where sm.organization_id = target_organization_id
          and sm.startup_id = target_startup_id
          and sm.user_id = (select auth.uid())
          and sm.status = 'active'
          and sm.is_representative
      )
    );
$$;

create or replace function private.can_manage_file_link_destination(
  target_organization_id uuid,
  target_unit_id uuid,
  target_incubator_id uuid,
  target_program_id uuid,
  target_startup_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when target_program_id is not null then exists (
      select 1 from public.programs p
      where p.organization_id = target_organization_id
        and p.id = target_program_id
        and p.deleted_at is null
        and (select private.has_permission(p.organization_id, 'file.manage', null, p.incubator_id))
    )
    when target_startup_id is not null then exists (
      select 1 from public.startups s
      where s.organization_id = target_organization_id
        and s.id = target_startup_id
        and s.deleted_at is null
        and (select private.has_permission(s.organization_id, 'file.manage', null, s.incubator_id))
    )
    else (select private.has_permission(target_organization_id, 'file.manage', target_unit_id, target_incubator_id))
  end;
$$;

create or replace function private.validate_program_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.organization_memberships m
    where m.organization_id = new.organization_id
      and m.user_id = new.user_id
      and m.status = 'active'
  ) then
    raise exception 'Membro de programa precisa ter vinculo ativo com a organizacao' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger program_members_validate_membership
before insert or update of organization_id, user_id on public.program_members
for each row execute function private.validate_program_member();

create or replace function private.validate_m6_tenant_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare type_incubator_id uuid;
declare startup_incubator_id uuid;
declare program_incubator_id uuid;
begin
  if tg_table_name = 'programs' then
    select pt.incubator_id into type_incubator_id
    from public.program_types pt
    where pt.organization_id = new.organization_id and pt.id = new.type_id and pt.is_active;

    if not found or (type_incubator_id is not null and type_incubator_id <> new.incubator_id) then
      raise exception 'Tipo de programa não pertence ao escopo da incubadora' using errcode = '23514';
    end if;
  elsif tg_table_name = 'startup_members' and new.user_id is not null then
    if not exists (
      select 1 from public.organization_memberships m
      where m.organization_id = new.organization_id
        and m.user_id = new.user_id
        and m.status = 'active'
    ) then
      raise exception 'Conta vinculada precisa ser membro ativo da organização' using errcode = '23514';
    end if;
  elsif tg_table_name = 'startup_enrollments' then
    select s.incubator_id into startup_incubator_id
    from public.startups s
    where s.organization_id = new.organization_id and s.id = new.startup_id and s.deleted_at is null;

    select p.incubator_id into program_incubator_id
    from public.cohorts c
    join public.programs p on p.organization_id = c.organization_id and p.id = c.program_id
    where c.organization_id = new.organization_id
      and c.id = new.cohort_id
      and c.deleted_at is null
      and p.deleted_at is null;

    if startup_incubator_id is null or program_incubator_id is null or startup_incubator_id <> program_incubator_id then
      raise exception 'Startup e turma precisam pertencer à mesma incubadora' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger programs_validate_scope
before insert or update of organization_id, incubator_id, type_id on public.programs
for each row execute function private.validate_m6_tenant_scope();
create trigger startup_members_validate_scope
before insert or update of organization_id, startup_id, user_id on public.startup_members
for each row execute function private.validate_m6_tenant_scope();
create trigger startup_enrollments_validate_scope
before insert or update of organization_id, startup_id, cohort_id on public.startup_enrollments
for each row execute function private.validate_m6_tenant_scope();

create or replace function private.record_startup_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare payload jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
declare tenant_id uuid := (payload ->> 'organization_id')::uuid;
declare target_startup_id uuid;
declare event_name text;
declare event_title text;
declare event_metadata jsonb := '{}'::jsonb;
begin
  if tg_table_name = 'startups' then
    target_startup_id := (payload ->> 'id')::uuid;
    event_name := case when tg_op = 'INSERT' then 'startup.created' else 'startup.updated' end;
    event_title := case when tg_op = 'INSERT' then 'Startup cadastrada' else 'Cadastro da startup atualizado' end;
    event_metadata := jsonb_build_object('stage', payload ->> 'stage', 'status', payload ->> 'status');
  elsif tg_table_name = 'startup_members' then
    target_startup_id := (payload ->> 'startup_id')::uuid;
    event_name := 'startup_member.' || lower(tg_op);
    event_title := case
      when tg_op = 'INSERT' then 'Membro adicionado a equipe'
      when tg_op = 'DELETE' then 'Membro removido da equipe'
      else 'Vinculo da equipe atualizado'
    end;
    event_metadata := jsonb_build_object('member_id', payload ->> 'id', 'role', payload ->> 'role');
  else
    target_startup_id := (payload ->> 'startup_id')::uuid;
    event_name := 'enrollment.' || lower(tg_op);
    event_title := case when tg_op = 'INSERT' then 'Startup vinculada a uma turma' else 'Matricula da startup atualizada' end;
    event_metadata := jsonb_build_object('enrollment_id', payload ->> 'id', 'cohort_id', payload ->> 'cohort_id', 'status', payload ->> 'status');
  end if;

  insert into public.startup_history (organization_id, startup_id, actor_user_id, event_type, title, metadata)
  values (tenant_id, target_startup_id, (select auth.uid()), event_name, event_title, event_metadata);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger startups_history after insert or update on public.startups
for each row execute function private.record_startup_history();
create trigger startup_members_history after insert or update or delete on public.startup_members
for each row execute function private.record_startup_history();
create trigger startup_enrollments_history after insert or update on public.startup_enrollments
for each row execute function private.record_startup_history();

create or replace function public.transfer_startup_enrollment(
  target_startup_id uuid,
  target_cohort_id uuid,
  transfer_on date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare caller_id uuid := (select auth.uid());
declare tenant_id uuid;
declare startup_incubator_id uuid;
declare program_incubator_id uuid;
declare previous_record public.startup_enrollments%rowtype;
declare new_enrollment_id uuid;
begin
  if caller_id is null then raise exception 'Autenticação necessária' using errcode = '42501'; end if;
  if transfer_on is null then raise exception 'Data de transferência obrigatória'; end if;

  select s.organization_id, s.incubator_id into tenant_id, startup_incubator_id
  from public.startups s
  where s.id = target_startup_id and s.deleted_at is null;

  select p.incubator_id into program_incubator_id
  from public.cohorts c
  join public.programs p on p.organization_id = c.organization_id and p.id = c.program_id
  where c.organization_id = tenant_id
    and c.id = target_cohort_id
    and c.deleted_at is null
    and p.deleted_at is null;

  if tenant_id is null or program_incubator_id is null or startup_incubator_id <> program_incubator_id then
    raise exception 'Startup e turma inválidas ou fora do mesmo escopo';
  end if;
  if not (select private.has_permission(tenant_id, 'startup.manage', null, startup_incubator_id))
    or not (select private.has_permission(tenant_id, 'program.manage', null, program_incubator_id)) then
    raise exception 'Permissão insuficiente para transferir matrícula' using errcode = '42501';
  end if;

  select e.* into previous_record
  from public.startup_enrollments e
  where e.organization_id = tenant_id
    and e.startup_id = target_startup_id
    and e.status in ('invited', 'active', 'suspended')
  order by e.entry_date desc, e.created_at desc
  limit 1
  for update;

  if previous_record.id is null then raise exception 'Matrícula ativa anterior não encontrada'; end if;
  if previous_record.cohort_id = target_cohort_id then raise exception 'Startup já está vinculada a esta turma'; end if;
  if transfer_on < previous_record.entry_date then raise exception 'Transferência anterior à entrada atual'; end if;

  update public.startup_enrollments
  set status = 'transferred', exit_date = transfer_on, exit_reason = 'Transferência entre turmas'
  where id = previous_record.id;

  insert into public.startup_enrollments (
    organization_id, startup_id, cohort_id, status, source, entry_date, previous_enrollment_id, created_by
  ) values (
    tenant_id, target_startup_id, target_cohort_id, 'active', 'manual', transfer_on, previous_record.id, caller_id
  ) returning id into new_enrollment_id;

  return new_enrollment_id;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'program_types', 'programs', 'cohorts', 'program_members', 'startups', 'startup_members', 'startup_enrollments'
  ] loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.write_audit_log()', table_name, table_name);
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'program_types', 'programs', 'cohorts', 'program_members', 'startups', 'startup_members', 'startup_enrollments', 'startup_history'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end $$;

revoke execute on function private.seed_m6_role_permissions() from public, anon, authenticated;
revoke execute on function private.validate_program_member() from public, anon, authenticated;
revoke execute on function private.record_startup_history() from public, anon, authenticated;
revoke execute on function private.validate_m6_tenant_scope() from public, anon, authenticated;
revoke execute on function private.can_access_program(uuid, uuid, uuid) from public, anon;
revoke execute on function private.can_access_startup(uuid, uuid, uuid) from public, anon;
revoke execute on function private.can_manage_startup(uuid, uuid, uuid) from public, anon;
revoke execute on function private.can_manage_file_link_destination(uuid, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function private.can_access_program(uuid, uuid, uuid) to authenticated;
grant execute on function private.can_access_startup(uuid, uuid, uuid) to authenticated;
grant execute on function private.can_manage_startup(uuid, uuid, uuid) to authenticated;
grant execute on function private.can_manage_file_link_destination(uuid, uuid, uuid, uuid, uuid) to authenticated;
revoke execute on function public.transfer_startup_enrollment(uuid, uuid, date) from public, anon;
grant execute on function public.transfer_startup_enrollment(uuid, uuid, date) to authenticated;

grant select on public.program_types, public.programs, public.cohorts, public.program_members to authenticated;
grant insert (organization_id, incubator_id, code, name, description, is_active, settings, created_by) on public.program_types to authenticated;
grant update (code, name, description, is_active, settings) on public.program_types to authenticated;
grant insert (organization_id, incubator_id, type_id, code, name, description, starts_on, ends_on, status, admission_criteria, settings, created_by) on public.programs to authenticated;
grant update (type_id, code, name, description, starts_on, ends_on, status, admission_criteria, settings, deleted_at) on public.programs to authenticated;
grant insert (organization_id, program_id, code, name, starts_on, ends_on, enrollment_starts_on, enrollment_ends_on, status, capacity, settings, created_by) on public.cohorts to authenticated;
grant update (code, name, starts_on, ends_on, enrollment_starts_on, enrollment_ends_on, status, capacity, settings, deleted_at) on public.cohorts to authenticated;
grant insert (organization_id, program_id, user_id, role, active_from, active_until, created_by) on public.program_members to authenticated;
grant update (role, active_from, active_until) on public.program_members to authenticated;
grant delete on public.program_members to authenticated;

grant select on public.startups, public.startup_members, public.startup_enrollments, public.startup_history to authenticated;
grant insert (organization_id, incubator_id, name, legal_name, tax_id, sector, business_model, stage, status, city, state, country_code, website_url, custom_fields, created_by) on public.startups to authenticated;
grant update (name, legal_name, tax_id, sector, business_model, stage, status, city, state, country_code, website_url, custom_fields, deleted_at) on public.startups to authenticated;
grant insert (organization_id, startup_id, user_id, full_name, email, role, role_title, dedication_hours_per_week, competencies, equity_percentage, is_representative, status, joined_on, left_on, created_by) on public.startup_members to authenticated;
grant update (user_id, full_name, email, role, role_title, dedication_hours_per_week, competencies, equity_percentage, is_representative, status, joined_on, left_on) on public.startup_members to authenticated;
grant delete on public.startup_members to authenticated;
grant insert (organization_id, startup_id, cohort_id, status, source, entry_date, exit_date, exit_reason, previous_enrollment_id, created_by) on public.startup_enrollments to authenticated;
grant update (status, entry_date, exit_date, exit_reason, previous_enrollment_id) on public.startup_enrollments to authenticated;

grant insert (program_id, startup_id) on public.file_links to authenticated;

drop policy file_links_insert_manager on public.file_links;
create policy file_links_insert_manager on public.file_links for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.can_access_file(file_id, 'file.manage'))
  and (select private.can_manage_file_link_destination(organization_id, unit_id, incubator_id, program_id, startup_id))
);

drop policy file_links_delete_manager on public.file_links;
create policy file_links_delete_manager on public.file_links for delete to authenticated
using (
  (select private.can_access_file(file_id, 'file.manage'))
  and (select private.can_manage_file_link_destination(organization_id, unit_id, incubator_id, program_id, startup_id))
);

create policy program_types_select_authorized on public.program_types for select to authenticated
using ((select private.has_permission(organization_id, 'program.read', null, incubator_id)));
create policy program_types_insert_manager on public.program_types for insert to authenticated
with check ((select private.has_permission(organization_id, 'program.manage', null, incubator_id)) and created_by = (select auth.uid()));
create policy program_types_update_manager on public.program_types for update to authenticated
using ((select private.has_permission(organization_id, 'program.manage', null, incubator_id)))
with check ((select private.has_permission(organization_id, 'program.manage', null, incubator_id)));

create policy programs_select_authorized on public.programs for select to authenticated
using ((select private.can_access_program(organization_id, id, incubator_id)));
create policy programs_insert_manager on public.programs for insert to authenticated
with check ((select private.has_permission(organization_id, 'program.manage', null, incubator_id)) and created_by = (select auth.uid()));
create policy programs_update_manager on public.programs for update to authenticated
using ((select private.has_permission(organization_id, 'program.manage', null, incubator_id)))
with check ((select private.has_permission(organization_id, 'program.manage', null, incubator_id)));

create policy cohorts_select_authorized on public.cohorts for select to authenticated
using (exists (
  select 1 from public.programs p
  where p.organization_id = cohorts.organization_id
    and p.id = cohorts.program_id
    and (select private.can_access_program(p.organization_id, p.id, p.incubator_id))
));
create policy cohorts_insert_manager on public.cohorts for insert to authenticated
with check (exists (
  select 1 from public.programs p
  where p.organization_id = cohorts.organization_id
    and p.id = cohorts.program_id
    and (select private.has_permission(p.organization_id, 'program.manage', null, p.incubator_id))
) and created_by = (select auth.uid()));
create policy cohorts_update_manager on public.cohorts for update to authenticated
using (exists (
  select 1 from public.programs p
  where p.organization_id = cohorts.organization_id
    and p.id = cohorts.program_id
    and (select private.has_permission(p.organization_id, 'program.manage', null, p.incubator_id))
))
with check (exists (
  select 1 from public.programs p
  where p.organization_id = cohorts.organization_id
    and p.id = cohorts.program_id
    and (select private.has_permission(p.organization_id, 'program.manage', null, p.incubator_id))
));

create policy program_members_select_authorized on public.program_members for select to authenticated
using (user_id = (select auth.uid()) or exists (
  select 1 from public.programs p
  where p.organization_id = program_members.organization_id
    and p.id = program_members.program_id
    and (select private.can_access_program(p.organization_id, p.id, p.incubator_id))
));
create policy program_members_insert_manager on public.program_members for insert to authenticated
with check (exists (
  select 1 from public.programs p
  where p.organization_id = program_members.organization_id
    and p.id = program_members.program_id
    and (select private.has_permission(p.organization_id, 'program.manage', null, p.incubator_id))
) and created_by = (select auth.uid()));
create policy program_members_update_manager on public.program_members for update to authenticated
using (exists (
  select 1 from public.programs p
  where p.organization_id = program_members.organization_id
    and p.id = program_members.program_id
    and (select private.has_permission(p.organization_id, 'program.manage', null, p.incubator_id))
))
with check (exists (
  select 1 from public.programs p
  where p.organization_id = program_members.organization_id
    and p.id = program_members.program_id
    and (select private.has_permission(p.organization_id, 'program.manage', null, p.incubator_id))
));
create policy program_members_delete_manager on public.program_members for delete to authenticated
using (exists (
  select 1 from public.programs p
  where p.organization_id = program_members.organization_id
    and p.id = program_members.program_id
    and (select private.has_permission(p.organization_id, 'program.manage', null, p.incubator_id))
));

create policy startups_select_authorized on public.startups for select to authenticated
using ((select private.can_access_startup(organization_id, id, incubator_id)));
create policy startups_insert_manager on public.startups for insert to authenticated
with check ((select private.has_permission(organization_id, 'startup.manage', null, incubator_id)) and created_by = (select auth.uid()));
create policy startups_update_manager on public.startups for update to authenticated
using ((select private.can_manage_startup(organization_id, id, incubator_id)))
with check ((select private.can_manage_startup(organization_id, id, incubator_id)));

create policy startup_members_select_authorized on public.startup_members for select to authenticated
using (exists (
  select 1 from public.startups s
  where s.organization_id = startup_members.organization_id
    and s.id = startup_members.startup_id
    and (select private.can_access_startup(s.organization_id, s.id, s.incubator_id))
));
create policy startup_members_insert_authorized on public.startup_members for insert to authenticated
with check (exists (
  select 1 from public.startups s
  where s.organization_id = startup_members.organization_id
    and s.id = startup_members.startup_id
    and (select private.can_manage_startup(s.organization_id, s.id, s.incubator_id))
) and created_by = (select auth.uid()));
create policy startup_members_update_authorized on public.startup_members for update to authenticated
using (exists (
  select 1 from public.startups s
  where s.organization_id = startup_members.organization_id
    and s.id = startup_members.startup_id
    and (select private.can_manage_startup(s.organization_id, s.id, s.incubator_id))
))
with check (exists (
  select 1 from public.startups s
  where s.organization_id = startup_members.organization_id
    and s.id = startup_members.startup_id
    and (select private.can_manage_startup(s.organization_id, s.id, s.incubator_id))
));
create policy startup_members_delete_authorized on public.startup_members for delete to authenticated
using (exists (
  select 1 from public.startups s
  where s.organization_id = startup_members.organization_id
    and s.id = startup_members.startup_id
    and (select private.can_manage_startup(s.organization_id, s.id, s.incubator_id))
));

create policy startup_enrollments_select_authorized on public.startup_enrollments for select to authenticated
using (
  exists (
    select 1 from public.startups s
    where s.organization_id = startup_enrollments.organization_id
      and s.id = startup_enrollments.startup_id
      and (select private.can_access_startup(s.organization_id, s.id, s.incubator_id))
  )
  or exists (
    select 1 from public.cohorts c
    join public.programs p on p.organization_id = c.organization_id and p.id = c.program_id
    where c.organization_id = startup_enrollments.organization_id
      and c.id = startup_enrollments.cohort_id
      and (select private.can_access_program(p.organization_id, p.id, p.incubator_id))
  )
);
create policy startup_enrollments_insert_manager on public.startup_enrollments for insert to authenticated
with check (
  exists (
    select 1 from public.startups s
    where s.organization_id = startup_enrollments.organization_id
      and s.id = startup_enrollments.startup_id
      and (select private.has_permission(s.organization_id, 'startup.manage', null, s.incubator_id))
  )
  and exists (
    select 1 from public.cohorts c
    join public.programs p on p.organization_id = c.organization_id and p.id = c.program_id
    where c.organization_id = startup_enrollments.organization_id
      and c.id = startup_enrollments.cohort_id
      and (select private.has_permission(p.organization_id, 'program.manage', null, p.incubator_id))
  )
  and created_by = (select auth.uid())
);
create policy startup_enrollments_update_manager on public.startup_enrollments for update to authenticated
using (exists (
  select 1 from public.startups s
  where s.organization_id = startup_enrollments.organization_id
    and s.id = startup_enrollments.startup_id
    and (select private.has_permission(s.organization_id, 'startup.manage', null, s.incubator_id))
))
with check (exists (
  select 1 from public.startups s
  where s.organization_id = startup_enrollments.organization_id
    and s.id = startup_enrollments.startup_id
    and (select private.has_permission(s.organization_id, 'startup.manage', null, s.incubator_id))
));

create policy startup_history_select_authorized on public.startup_history for select to authenticated
using (exists (
  select 1 from public.startups s
  where s.organization_id = startup_history.organization_id
    and s.id = startup_history.startup_id
    and (select private.can_access_startup(s.organization_id, s.id, s.incubator_id))
));

comment on policy programs_select_authorized on public.programs is 'Acesso por program.read no escopo ou participacao explicita na equipe do programa.';
comment on policy startups_select_authorized on public.startups is 'Acesso por startup.read no escopo ou vinculo ativo na equipe da propria startup.';
comment on policy startup_members_insert_authorized on public.startup_members is 'Gestor autorizado ou representante ativo gerencia a equipe; created_by deve ser o chamador.';
comment on policy startup_enrollments_insert_manager on public.startup_enrollments is 'Matricula exige simultaneamente gestao da startup e do programa, preservando tenant e escopo.';
comment on policy startup_history_select_authorized on public.startup_history is 'Linha do tempo e append-only; somente leitores autorizados da startup podem consulta-la.';
comment on policy file_links_insert_manager on public.file_links is 'Vínculos com programas e startups usam FKs tenant-aware e exigem file.manage na incubadora do destino.';

commit;
