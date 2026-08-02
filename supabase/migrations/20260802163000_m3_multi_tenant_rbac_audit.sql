-- Marco 3: fundação multi-tenant, RBAC por escopo, convites e auditoria.
-- Hierarquia aprovada: organização -> unidade administrativa opcional -> incubadora.
-- O tenant ativo na UI é apenas uma preferência; toda autorização é decidida por RLS.

begin;

create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.organization_status as enum ('active', 'inactive', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.membership_status as enum ('invited', 'active', 'suspended', 'removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.role_scope_type as enum ('organization', 'unit', 'incubator');
exception when duplicate_object then null; end $$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  status public.organization_status not null default 'active',
  timezone text not null default 'America/Sao_Paulo',
  locale text not null default 'pt-BR',
  logo_url text,
  contact_email text,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint organizations_name_valid check (name = btrim(name) and char_length(name) between 2 and 160),
  constraint organizations_slug_valid check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 2 and 80),
  constraint organizations_timezone_valid check (timezone = btrim(timezone) and char_length(timezone) between 1 and 100),
  constraint organizations_locale_valid check (locale = btrim(locale) and char_length(locale) between 2 and 35),
  constraint organizations_logo_url_length check (logo_url is null or char_length(logo_url) <= 2048),
  constraint organizations_settings_object check (jsonb_typeof(settings) = 'object'),
  constraint organizations_deleted_status check (deleted_at is null or status <> 'active')
);

create unique index organizations_slug_active_uidx on public.organizations (slug) where deleted_at is null;

create table public.organization_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null,
  slug text not null,
  status public.organization_status not null default 'active',
  timezone text not null default 'America/Sao_Paulo',
  settings jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint organization_units_org_id_unique unique (organization_id, id),
  constraint organization_units_name_valid check (name = btrim(name) and char_length(name) between 2 and 160),
  constraint organization_units_slug_valid check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 2 and 80),
  constraint organization_units_timezone_valid check (timezone = btrim(timezone) and char_length(timezone) between 1 and 100),
  constraint organization_units_settings_object check (jsonb_typeof(settings) = 'object'),
  constraint organization_units_deleted_status check (deleted_at is null or status <> 'active')
);

create unique index organization_units_slug_active_uidx on public.organization_units (organization_id, slug) where deleted_at is null;

create table public.incubators (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  unit_id uuid,
  name text not null,
  slug text not null,
  status public.organization_status not null default 'active',
  timezone text not null default 'America/Sao_Paulo',
  locale text not null default 'pt-BR',
  settings jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint incubators_org_id_unique unique (organization_id, id),
  constraint incubators_unit_same_org foreign key (organization_id, unit_id)
    references public.organization_units (organization_id, id),
  constraint incubators_name_valid check (name = btrim(name) and char_length(name) between 2 and 160),
  constraint incubators_slug_valid check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 2 and 80),
  constraint incubators_timezone_valid check (timezone = btrim(timezone) and char_length(timezone) between 1 and 100),
  constraint incubators_locale_valid check (locale = btrim(locale) and char_length(locale) between 2 and 35),
  constraint incubators_settings_object check (jsonb_typeof(settings) = 'object'),
  constraint incubators_deleted_status check (deleted_at is null or status <> 'active')
);

create unique index incubators_slug_active_uidx on public.incubators (organization_id, slug) where deleted_at is null;
create index incubators_unit_idx on public.incubators (organization_id, unit_id) where unit_id is not null;

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  user_id uuid not null references auth.users (id),
  status public.membership_status not null default 'invited',
  joined_at timestamptz,
  suspended_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_memberships_org_id_unique unique (organization_id, id),
  constraint organization_memberships_org_user_unique unique (organization_id, user_id),
  constraint organization_memberships_active_joined check (status <> 'active' or joined_at is not null),
  constraint organization_memberships_suspended_at check (status <> 'suspended' or suspended_at is not null)
);

create index organization_memberships_user_status_idx on public.organization_memberships (user_id, status, organization_id);

create table public.permissions (
  code text primary key,
  name text not null,
  description text not null,
  category text not null,
  created_at timestamptz not null default now(),
  constraint permissions_code_valid check (code ~ '^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$'),
  constraint permissions_text_valid check (
    name = btrim(name) and char_length(name) between 2 and 100
    and description = btrim(description) and char_length(description) between 2 and 500
    and category = btrim(category) and char_length(category) between 2 and 80
  )
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  code text not null,
  name text not null,
  description text not null,
  scope_type public.role_scope_type not null,
  is_system boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_org_id_unique unique (organization_id, id),
  constraint roles_org_code_unique unique (organization_id, code),
  constraint roles_code_valid check (code ~ '^[a-z][a-z0-9_]*$' and char_length(code) between 2 and 80),
  constraint roles_text_valid check (
    name = btrim(name) and char_length(name) between 2 and 100
    and description = btrim(description) and char_length(description) between 2 and 500
  )
);

create table public.role_permissions (
  organization_id uuid not null,
  role_id uuid not null,
  permission_code text not null references public.permissions (code),
  created_at timestamptz not null default now(),
  primary key (organization_id, role_id, permission_code),
  constraint role_permissions_role_same_org foreign key (organization_id, role_id)
    references public.roles (organization_id, id) on delete cascade
);

create index role_permissions_permission_idx on public.role_permissions (permission_code, organization_id);

create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  membership_id uuid not null,
  role_id uuid not null,
  unit_id uuid,
  incubator_id uuid,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  constraint role_assignments_membership_same_org foreign key (organization_id, membership_id)
    references public.organization_memberships (organization_id, id) on delete cascade,
  constraint role_assignments_role_same_org foreign key (organization_id, role_id)
    references public.roles (organization_id, id) on delete cascade,
  constraint role_assignments_unit_same_org foreign key (organization_id, unit_id)
    references public.organization_units (organization_id, id),
  constraint role_assignments_incubator_same_org foreign key (organization_id, incubator_id)
    references public.incubators (organization_id, id),
  constraint role_assignments_scope_shape check (
    (unit_id is null and incubator_id is null)
    or (unit_id is not null and incubator_id is null)
    or (unit_id is null and incubator_id is not null)
  ),
  constraint role_assignments_unique_scope unique nulls not distinct
    (organization_id, membership_id, role_id, unit_id, incubator_id)
);

create index role_assignments_membership_idx on public.role_assignments (organization_id, membership_id);
create index role_assignments_role_idx on public.role_assignments (organization_id, role_id);
create index role_assignments_unit_idx on public.role_assignments (organization_id, unit_id) where unit_id is not null;
create index role_assignments_incubator_idx on public.role_assignments (organization_id, incubator_id) where incubator_id is not null;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  email text not null,
  token_hash text not null unique,
  role_id uuid not null,
  unit_id uuid,
  incubator_id uuid,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  invited_by uuid not null references auth.users (id),
  accepted_by uuid references auth.users (id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_role_same_org foreign key (organization_id, role_id)
    references public.roles (organization_id, id),
  constraint invitations_unit_same_org foreign key (organization_id, unit_id)
    references public.organization_units (organization_id, id),
  constraint invitations_incubator_same_org foreign key (organization_id, incubator_id)
    references public.incubators (organization_id, id),
  constraint invitations_email_valid check (email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and char_length(email) <= 320),
  constraint invitations_token_hash_valid check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint invitations_scope_shape check (
    (unit_id is null and incubator_id is null)
    or (unit_id is not null and incubator_id is null)
    or (unit_id is null and incubator_id is not null)
  ),
  constraint invitations_expiry_valid check (expires_at > created_at),
  constraint invitations_acceptance_valid check (
    (status = 'accepted' and accepted_by is not null and accepted_at is not null)
    or (status <> 'accepted' and accepted_at is null)
  ),
  constraint invitations_revocation_valid check (status <> 'revoked' or revoked_at is not null)
);

create unique index invitations_pending_email_uidx on public.invitations (organization_id, email) where status = 'pending';
create index invitations_org_status_expiry_idx on public.invitations (organization_id, status, expires_at);

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  active_organization_id uuid references public.organizations (id),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id),
  actor_user_id uuid references auth.users (id),
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_event_valid check (event_type = btrim(event_type) and char_length(event_type) between 3 and 120),
  constraint audit_logs_entity_valid check (entity_type = btrim(entity_type) and char_length(entity_type) between 2 and 100),
  constraint audit_logs_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_user_id, created_at desc) where actor_user_id is not null;

create table private.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_by uuid references auth.users (id),
  reason text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint platform_admins_reason_valid check (reason = btrim(reason) and char_length(reason) between 3 and 500)
);

comment on table private.platform_admins is 'Allowlist operacional de administradores da plataforma; nunca exposta pela Data API.';
comment on table public.user_preferences is 'Preferência de navegação. active_organization_id nunca participa de autorização.';
comment on column public.invitations.token_hash is 'SHA-256 hexadecimal do token; o token bruto nunca é persistido.';
comment on table public.audit_logs is 'Log append-only de mudanças administrativas sensíveis, sem segredos ou snapshots completos.';

insert into public.permissions (code, name, description, category) values
  ('organization.read', 'Visualizar organização', 'Visualizar dados básicos da organização.', 'Organização'),
  ('organization.manage', 'Gerenciar organização', 'Alterar dados administrativos da organização.', 'Organização'),
  ('unit.read', 'Visualizar unidades', 'Visualizar unidades administrativas.', 'Estrutura'),
  ('unit.manage', 'Gerenciar unidades', 'Criar e alterar unidades administrativas.', 'Estrutura'),
  ('incubator.read', 'Visualizar incubadoras', 'Visualizar incubadoras da organização.', 'Estrutura'),
  ('incubator.manage', 'Gerenciar incubadoras', 'Criar e alterar incubadoras.', 'Estrutura'),
  ('member.read', 'Visualizar membros', 'Visualizar membros e seus vínculos.', 'Acesso'),
  ('member.manage', 'Gerenciar membros', 'Criar, ativar, suspender e remover vínculos.', 'Acesso'),
  ('role.read', 'Visualizar papéis', 'Visualizar papéis, capacidades e atribuições.', 'Acesso'),
  ('role.manage', 'Gerenciar papéis', 'Criar papéis e gerenciar capacidades e atribuições.', 'Acesso'),
  ('invitation.read', 'Visualizar convites', 'Visualizar convites sem acesso ao hash do token.', 'Acesso'),
  ('invitation.manage', 'Gerenciar convites', 'Criar, revogar e expirar convites.', 'Acesso'),
  ('audit.read', 'Visualizar auditoria', 'Consultar eventos administrativos da organização.', 'Auditoria');

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.platform_admins pa
    where pa.user_id = (select auth.uid()) and pa.revoked_at is null
  );
$$;

create or replace function private.is_active_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.organization_memberships m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = target_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and o.status = 'active'
      and o.deleted_at is null
  );
$$;

create or replace function private.has_permission(
  target_organization_id uuid,
  target_permission_code text,
  target_unit_id uuid default null,
  target_incubator_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.organization_memberships m
    join public.role_assignments a
      on a.organization_id = m.organization_id and a.membership_id = m.id
    join public.role_permissions rp
      on rp.organization_id = a.organization_id and rp.role_id = a.role_id
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = target_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and o.status = 'active'
      and o.deleted_at is null
      and rp.permission_code = target_permission_code
      and (
        (a.unit_id is null and a.incubator_id is null)
        or (target_unit_id is not null and a.unit_id = target_unit_id and a.incubator_id is null)
        or (target_incubator_id is not null and a.incubator_id = target_incubator_id)
        or (
          target_incubator_id is not null
          and a.unit_id is not null
          and a.incubator_id is null
          and exists (
            select 1 from public.incubators i
            where i.organization_id = target_organization_id
              and i.id = target_incubator_id
              and i.unit_id = a.unit_id
          )
        )
      )
  );
$$;

create or replace function private.validate_scoped_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare expected_scope public.role_scope_type;
begin
  select r.scope_type into expected_scope
  from public.roles r
  where r.organization_id = new.organization_id and r.id = new.role_id and r.archived_at is null;

  if expected_scope is null then raise exception 'Papel inválido ou arquivado'; end if;
  if expected_scope = 'organization' and (new.unit_id is not null or new.incubator_id is not null) then
    raise exception 'Papel organizacional exige escopo da organização';
  elsif expected_scope = 'unit' and (new.unit_id is null or new.incubator_id is not null) then
    raise exception 'Papel de unidade exige unit_id';
  elsif expected_scope = 'incubator' and (new.incubator_id is null or new.unit_id is not null) then
    raise exception 'Papel de incubadora exige incubator_id';
  end if;
  return new;
end;
$$;

create trigger role_assignments_validate_scope before insert or update on public.role_assignments
for each row execute function private.validate_scoped_role();
create trigger invitations_validate_scope before insert or update of role_id, unit_id, incubator_id on public.invitations
for each row execute function private.validate_scoped_role();

create or replace function private.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare payload jsonb;
declare tenant_id uuid;
declare object_id uuid;
begin
  payload := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  tenant_id := coalesce((payload ->> 'organization_id')::uuid, (payload ->> 'id')::uuid);
  object_id := case when payload ? 'id' then (payload ->> 'id')::uuid else null end;
  insert into public.audit_logs (organization_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (
    tenant_id,
    (select auth.uid()),
    lower(tg_op) || '.' || tg_table_name,
    tg_table_name,
    object_id,
    jsonb_build_object('operation', lower(tg_op), 'permission_code', payload ->> 'permission_code')
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'organizations', 'organization_units', 'incubators', 'organization_memberships',
    'roles', 'role_permissions', 'role_assignments', 'invitations'
  ] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.write_audit_log()', table_name, table_name);
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'organizations', 'organization_units', 'incubators', 'organization_memberships', 'roles', 'invitations'
  ] loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
  end loop;
end $$;

create trigger user_preferences_set_updated_at before update on public.user_preferences
for each row execute function private.set_updated_at();

create or replace function public.create_organization(
  organization_name text,
  organization_slug text,
  organization_timezone text default 'America/Sao_Paulo',
  organization_locale text default 'pt-BR'
)
returns table (id uuid, slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare caller_id uuid := (select auth.uid());
declare new_org_id uuid;
declare admin_membership_id uuid;
declare admin_role_id uuid;
begin
  if caller_id is null or not private.is_platform_admin() then
    raise exception 'Operação restrita à administração da plataforma' using errcode = '42501';
  end if;

  insert into public.organizations (name, slug, timezone, locale, created_by)
  values (btrim(organization_name), lower(btrim(organization_slug)), btrim(organization_timezone), btrim(organization_locale), caller_id)
  returning organizations.id into new_org_id;

  insert into public.organization_memberships (organization_id, user_id, status, joined_at, created_by)
  values (new_org_id, caller_id, 'active', now(), caller_id)
  returning organization_memberships.id into admin_membership_id;

  insert into public.roles (organization_id, code, name, description, scope_type, is_system) values
    (new_org_id, 'organization_admin', 'Administrador da organização', 'Administração completa do tenant.', 'organization', true),
    (new_org_id, 'incubator_manager', 'Gestor de incubadora', 'Gestão operacional de uma incubadora.', 'incubator', true),
    (new_org_id, 'program_coordinator', 'Coordenador de programa', 'Coordenação de programas no escopo da incubadora.', 'incubator', true),
    (new_org_id, 'agent', 'Agente', 'Acompanhamento operacional de startups.', 'incubator', true),
    (new_org_id, 'evaluator', 'Avaliador', 'Avaliação no escopo de uma incubadora.', 'incubator', true),
    (new_org_id, 'mentor', 'Mentor', 'Mentoria no escopo de uma incubadora.', 'incubator', true),
    (new_org_id, 'startup_representative', 'Representante de startup', 'Representação de startup em programas.', 'incubator', true),
    (new_org_id, 'startup_member', 'Membro de startup', 'Participação de membro de startup.', 'incubator', true),
    (new_org_id, 'partner', 'Parceiro', 'Acesso de parceiro conforme atribuição.', 'incubator', true),
    (new_org_id, 'auditor', 'Auditor', 'Consulta de estrutura e auditoria.', 'organization', true);

  select r.id into admin_role_id from public.roles r
  where r.organization_id = new_org_id and r.code = 'organization_admin';

  insert into public.role_permissions (organization_id, role_id, permission_code)
  select new_org_id, admin_role_id, p.code from public.permissions p;

  insert into public.role_permissions (organization_id, role_id, permission_code)
  select new_org_id, r.id, p.code
  from public.roles r
  join public.permissions p on p.code = any (
    case r.code
      when 'incubator_manager' then array['organization.read','unit.read','incubator.read','incubator.manage','member.read','role.read','invitation.read','invitation.manage','audit.read']
      when 'auditor' then array['organization.read','unit.read','incubator.read','member.read','role.read','invitation.read','audit.read']
      else array['organization.read','unit.read','incubator.read','role.read']
    end
  )
  where r.organization_id = new_org_id and r.code <> 'organization_admin';

  insert into public.role_assignments (organization_id, membership_id, role_id, created_by)
  values (new_org_id, admin_membership_id, admin_role_id, caller_id);

  insert into public.user_preferences (user_id, active_organization_id)
  values (caller_id, new_org_id)
  on conflict (user_id) do update set active_organization_id = excluded.active_organization_id;

  return query select new_org_id, lower(btrim(organization_slug));
end;
$$;

create or replace function public.accept_invitation(raw_token text)
returns table (organization_id uuid, organization_slug text, membership_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare caller_id uuid := (select auth.uid());
declare caller_email text;
declare invite public.invitations%rowtype;
declare member_id uuid;
begin
  if caller_id is null then raise exception 'Autenticação necessária' using errcode = '42501'; end if;
  if raw_token is null or char_length(raw_token) < 32 then raise exception 'Convite inválido'; end if;

  select lower(u.email) into caller_email from auth.users u where u.id = caller_id and u.email_confirmed_at is not null;
  if caller_email is null then raise exception 'E-mail confirmado é necessário'; end if;

  select i.* into invite
  from public.invitations i
  where i.token_hash = encode(extensions.digest(raw_token, 'sha256'), 'hex')
  for update;

  if invite.id is null then raise exception 'Convite inválido'; end if;
  if invite.email <> caller_email then raise exception 'Convite destinado a outro e-mail' using errcode = '42501'; end if;

  if invite.status = 'accepted' and invite.accepted_by = caller_id then
    select m.id into member_id from public.organization_memberships m
    where m.organization_id = invite.organization_id and m.user_id = caller_id;
    return query select invite.organization_id, o.slug, member_id from public.organizations o where o.id = invite.organization_id;
    return;
  end if;

  if invite.status <> 'pending' then raise exception 'Convite não está pendente'; end if;
  if invite.expires_at <= now() then
    update public.invitations set status = 'expired' where id = invite.id;
    raise exception 'Convite expirado';
  end if;

  insert into public.organization_memberships (organization_id, user_id, status, joined_at, created_by)
  values (invite.organization_id, caller_id, 'active', now(), invite.invited_by)
  on conflict on constraint organization_memberships_org_user_unique do update
    set status = 'active', joined_at = coalesce(public.organization_memberships.joined_at, now()), suspended_at = null
    where public.organization_memberships.status in ('invited', 'active')
  returning id into member_id;

  if member_id is null then raise exception 'Vínculo suspenso ou removido exige reativação administrativa' using errcode = '42501'; end if;

  insert into public.role_assignments (organization_id, membership_id, role_id, unit_id, incubator_id, created_by)
  values (invite.organization_id, member_id, invite.role_id, invite.unit_id, invite.incubator_id, invite.invited_by)
  on conflict on constraint role_assignments_unique_scope do nothing;

  update public.invitations
  set status = 'accepted', accepted_by = caller_id, accepted_at = now()
  where id = invite.id;

  insert into public.user_preferences (user_id, active_organization_id)
  values (caller_id, invite.organization_id)
  on conflict (user_id) do update set active_organization_id = excluded.active_organization_id;

  return query select invite.organization_id, o.slug, member_id from public.organizations o where o.id = invite.organization_id;
end;
$$;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_active_org_member(uuid) to authenticated;
grant execute on function private.has_permission(uuid, text, uuid, uuid) to authenticated;

revoke execute on function public.create_organization(text, text, text, text) from public, anon;
grant execute on function public.create_organization(text, text, text, text) to authenticated;
revoke execute on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'organizations', 'organization_units', 'incubators', 'organization_memberships', 'permissions',
    'roles', 'role_permissions', 'role_assignments', 'invitations', 'user_preferences', 'audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end $$;

grant select on public.organizations to authenticated;
grant update (name, status, timezone, locale, logo_url, contact_email, settings, deleted_at) on public.organizations to authenticated;
grant select on public.organization_units to authenticated;
grant insert (organization_id, name, slug, status, timezone, settings, created_by) on public.organization_units to authenticated;
grant update (name, slug, status, timezone, settings, deleted_at) on public.organization_units to authenticated;
grant select on public.incubators to authenticated;
grant insert (organization_id, unit_id, name, slug, status, timezone, locale, settings, created_by) on public.incubators to authenticated;
grant update (name, slug, status, timezone, locale, settings, deleted_at) on public.incubators to authenticated;
grant select on public.organization_memberships to authenticated;
grant insert (organization_id, user_id, status, joined_at, suspended_at, created_by) on public.organization_memberships to authenticated;
grant update (status, joined_at, suspended_at) on public.organization_memberships to authenticated;
grant select on public.permissions to authenticated;
grant select on public.roles to authenticated;
grant insert (organization_id, code, name, description, scope_type) on public.roles to authenticated;
grant update (name, description, archived_at) on public.roles to authenticated;
grant select, insert, delete on public.role_permissions to authenticated;
grant select, delete on public.role_assignments to authenticated;
grant insert (organization_id, membership_id, role_id, unit_id, incubator_id, created_by) on public.role_assignments to authenticated;
grant select (id, organization_id, email, role_id, unit_id, incubator_id, status, expires_at, invited_by, accepted_by, accepted_at, revoked_at, created_at, updated_at) on public.invitations to authenticated;
grant insert (organization_id, email, token_hash, role_id, unit_id, incubator_id, expires_at, invited_by) on public.invitations to authenticated;
grant update (status, expires_at, revoked_at) on public.invitations to authenticated;
grant select, insert on public.user_preferences to authenticated;
grant update (active_organization_id) on public.user_preferences to authenticated;
grant select on public.audit_logs to authenticated;
grant usage, select on sequence public.audit_logs_id_seq to authenticated;

create policy organizations_select_member on public.organizations for select to authenticated
using ((select private.is_active_org_member(id)));
create policy organizations_update_manager on public.organizations for update to authenticated
using ((select private.has_permission(id, 'organization.manage')))
with check ((select private.has_permission(id, 'organization.manage')));

create policy organization_units_select_authorized on public.organization_units for select to authenticated
using ((select private.has_permission(organization_id, 'unit.read', id, null)));
create policy organization_units_insert_manager on public.organization_units for insert to authenticated
with check ((select private.has_permission(organization_id, 'unit.manage')) and created_by = (select auth.uid()));
create policy organization_units_update_manager on public.organization_units for update to authenticated
using ((select private.has_permission(organization_id, 'unit.manage', id, null)))
with check ((select private.has_permission(organization_id, 'unit.manage', id, null)));

create policy incubators_select_authorized on public.incubators for select to authenticated
using ((select private.has_permission(organization_id, 'incubator.read', unit_id, id)));
create policy incubators_insert_manager on public.incubators for insert to authenticated
with check ((select private.has_permission(organization_id, 'incubator.manage', unit_id, null)) and created_by = (select auth.uid()));
create policy incubators_update_manager on public.incubators for update to authenticated
using ((select private.has_permission(organization_id, 'incubator.manage', unit_id, id)))
with check ((select private.has_permission(organization_id, 'incubator.manage', unit_id, id)));

create policy memberships_select_own_or_manager on public.organization_memberships for select to authenticated
using (user_id = (select auth.uid()) or (select private.has_permission(organization_id, 'member.read')));
create policy memberships_insert_manager on public.organization_memberships for insert to authenticated
with check ((select private.has_permission(organization_id, 'member.manage')) and created_by = (select auth.uid()));
create policy memberships_update_manager on public.organization_memberships for update to authenticated
using ((select private.has_permission(organization_id, 'member.manage')))
with check ((select private.has_permission(organization_id, 'member.manage')));

create policy permissions_select_authenticated on public.permissions for select to authenticated using (true);

create policy roles_select_authorized on public.roles for select to authenticated
using ((select private.has_permission(organization_id, 'role.read')));
create policy roles_insert_manager on public.roles for insert to authenticated
with check ((select private.has_permission(organization_id, 'role.manage')));
create policy roles_update_manager on public.roles for update to authenticated
using ((select private.has_permission(organization_id, 'role.manage')))
with check ((select private.has_permission(organization_id, 'role.manage')));

create policy role_permissions_select_authorized on public.role_permissions for select to authenticated
using ((select private.has_permission(organization_id, 'role.read')));
create policy role_permissions_insert_manager on public.role_permissions for insert to authenticated
with check ((select private.has_permission(organization_id, 'role.manage')));
create policy role_permissions_delete_manager on public.role_permissions for delete to authenticated
using ((select private.has_permission(organization_id, 'role.manage')));

create policy role_assignments_select_authorized on public.role_assignments for select to authenticated
using ((select private.has_permission(organization_id, 'role.read', unit_id, incubator_id)));
create policy role_assignments_insert_manager on public.role_assignments for insert to authenticated
with check ((select private.has_permission(organization_id, 'role.manage', unit_id, incubator_id)) and created_by = (select auth.uid()));
create policy role_assignments_delete_manager on public.role_assignments for delete to authenticated
using ((select private.has_permission(organization_id, 'role.manage', unit_id, incubator_id)));

create policy invitations_select_manager on public.invitations for select to authenticated
using ((select private.has_permission(organization_id, 'invitation.read', unit_id, incubator_id)));
create policy invitations_insert_manager on public.invitations for insert to authenticated
with check ((select private.has_permission(organization_id, 'invitation.manage', unit_id, incubator_id)) and invited_by = (select auth.uid()));
create policy invitations_update_manager on public.invitations for update to authenticated
using ((select private.has_permission(organization_id, 'invitation.manage', unit_id, incubator_id)))
with check ((select private.has_permission(organization_id, 'invitation.manage', unit_id, incubator_id)));

create policy user_preferences_select_own on public.user_preferences for select to authenticated
using (user_id = (select auth.uid()));
create policy user_preferences_insert_own on public.user_preferences for insert to authenticated
with check (user_id = (select auth.uid()) and (active_organization_id is null or (select private.is_active_org_member(active_organization_id))));
create policy user_preferences_update_own on public.user_preferences for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and (active_organization_id is null or (select private.is_active_org_member(active_organization_id))));

create policy audit_logs_select_authorized on public.audit_logs for select to authenticated
using ((select private.has_permission(organization_id, 'audit.read')));

comment on policy organizations_select_member on public.organizations is 'Somente membros ativos leem sua organização ativa.';
comment on policy organizations_update_manager on public.organizations is 'Exige organization.manage no escopo da organização.';
comment on policy memberships_select_own_or_manager on public.organization_memberships is 'O próprio usuário lê seu vínculo; gestores com member.read leem os demais.';
comment on policy invitations_select_manager on public.invitations is 'Exige invitation.read; o grant de coluna mantém token_hash invisível.';
comment on policy user_preferences_update_own on public.user_preferences is 'Preferência própria e somente para tenant do qual o usuário é membro ativo.';
comment on policy audit_logs_select_authorized on public.audit_logs is 'Auditoria é somente leitura para quem possui audit.read.';

revoke all on table private.platform_admins from public, anon, authenticated;
revoke all on sequence public.audit_logs_id_seq from anon;

commit;
