-- Marco 4: metadados de arquivos grandes e contratos para Google Drive.
-- Nenhuma URL de sessão, credencial ou byte de arquivo é persistido no PostgreSQL.

begin;

do $$ begin
  create type public.file_provider as enum ('google_drive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.file_classification as enum ('public', 'internal', 'confidential', 'restricted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.file_status as enum (
    'pending', 'uploading', 'validating', 'available', 'quarantined', 'failed',
    'trash_pending', 'trashed', 'restore_pending', 'missing', 'purge_pending', 'purged'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.file_link_purpose as enum (
    'organization_document', 'unit_document', 'incubator_document', 'program_document',
    'startup_document', 'delivery', 'diagnostic_evidence', 'mentoring',
    'content_asset', 'report', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.file_access_operation as enum (
    'metadata', 'preview', 'download', 'upload_session', 'complete', 'trash', 'restore', 'reconcile'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.file_access_result as enum ('allowed', 'denied', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.upload_session_status as enum (
    'pending', 'ready', 'uploading', 'validating', 'completed', 'expired', 'failed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

create table public.files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  unit_id uuid,
  incubator_id uuid,
  provider public.file_provider not null default 'google_drive',
  provider_file_id text,
  provider_drive_id text,
  provider_parent_id text,
  original_name text not null,
  display_name text not null,
  mime_type text not null,
  expected_size_bytes bigint not null,
  size_bytes bigint,
  checksum_algorithm text,
  checksum text,
  classification public.file_classification not null default 'internal',
  status public.file_status not null default 'pending',
  failure_code text,
  failure_detail text,
  current_version_number integer not null default 0,
  upload_expires_at timestamptz,
  last_reconciled_at timestamptz,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint files_org_id_unique unique (organization_id, id),
  constraint files_unit_same_org foreign key (organization_id, unit_id)
    references public.organization_units (organization_id, id),
  constraint files_incubator_same_org foreign key (organization_id, incubator_id)
    references public.incubators (organization_id, id),
  constraint files_scope_shape check (unit_id is null or incubator_id is null),
  constraint files_original_name_valid check (original_name = btrim(original_name) and char_length(original_name) between 1 and 255),
  constraint files_display_name_valid check (display_name = btrim(display_name) and char_length(display_name) between 1 and 255),
  constraint files_mime_type_valid check (mime_type = lower(btrim(mime_type)) and mime_type ~ '^[a-z0-9][a-z0-9!#$&^_.+-]*/[a-z0-9][a-z0-9!#$&^_.+-]*$' and char_length(mime_type) <= 255),
  constraint files_expected_size_valid check (expected_size_bytes > 0),
  constraint files_size_valid check (size_bytes is null or size_bytes >= 0),
  constraint files_checksum_pair check ((checksum_algorithm is null) = (checksum is null)),
  constraint files_checksum_algorithm_valid check (checksum_algorithm is null or checksum_algorithm in ('md5', 'sha256')),
  constraint files_checksum_valid check (checksum is null or checksum ~ '^[0-9a-f]{32,64}$'),
  constraint files_provider_ids_length check (
    (provider_file_id is null or char_length(provider_file_id) between 1 and 255)
    and (provider_drive_id is null or char_length(provider_drive_id) between 1 and 255)
    and (provider_parent_id is null or char_length(provider_parent_id) between 1 and 255)
  ),
  constraint files_failure_fields check (
    (status = 'failed' and failure_code is not null)
    or (status <> 'failed' and failure_code is null and failure_detail is null)
  ),
  constraint files_available_metadata check (
    status <> 'available'
    or (provider_file_id is not null and provider_drive_id is not null and size_bytes is not null and current_version_number > 0)
  ),
  constraint files_deleted_state check (
    (status in ('trash_pending', 'trashed', 'restore_pending', 'purge_pending', 'purged') and deleted_at is not null)
    or (status not in ('trash_pending', 'trashed', 'restore_pending', 'purge_pending', 'purged') and deleted_at is null)
  )
);

create unique index files_provider_identity_uidx
  on public.files (provider, provider_drive_id, provider_file_id)
  where provider_file_id is not null and provider_drive_id is not null;
create index files_org_status_created_idx on public.files (organization_id, status, created_at desc);
create index files_unit_idx on public.files (organization_id, unit_id) where unit_id is not null;
create index files_incubator_idx on public.files (organization_id, incubator_id) where incubator_id is not null;
create index files_created_by_idx on public.files (created_by, created_at desc);
create index files_reconciliation_idx on public.files (organization_id, last_reconciled_at)
  where status in ('uploading', 'validating', 'available', 'trash_pending', 'restore_pending', 'missing', 'purge_pending');

create table public.file_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  file_id uuid not null,
  version_number integer not null,
  provider_file_id text not null,
  provider_revision_id text,
  mime_type text not null,
  size_bytes bigint not null,
  checksum_algorithm text,
  checksum text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  superseded_at timestamptz,
  constraint file_versions_file_same_org foreign key (organization_id, file_id)
    references public.files (organization_id, id),
  constraint file_versions_file_number_unique unique (organization_id, file_id, version_number),
  constraint file_versions_number_valid check (version_number > 0),
  constraint file_versions_size_valid check (size_bytes >= 0),
  constraint file_versions_provider_id_valid check (char_length(provider_file_id) between 1 and 255),
  constraint file_versions_revision_id_valid check (provider_revision_id is null or char_length(provider_revision_id) between 1 and 255),
  constraint file_versions_mime_type_valid check (mime_type = lower(btrim(mime_type)) and char_length(mime_type) <= 255),
  constraint file_versions_checksum_pair check ((checksum_algorithm is null) = (checksum is null)),
  constraint file_versions_checksum_algorithm_valid check (checksum_algorithm is null or checksum_algorithm in ('md5', 'sha256')),
  constraint file_versions_checksum_valid check (checksum is null or checksum ~ '^[0-9a-f]{32,64}$')
);

create index file_versions_created_by_idx on public.file_versions (created_by);

create table public.file_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  file_id uuid not null,
  unit_id uuid,
  incubator_id uuid,
  purpose public.file_link_purpose not null,
  classification_override public.file_classification,
  label text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  constraint file_links_file_same_org foreign key (organization_id, file_id)
    references public.files (organization_id, id) on delete cascade,
  constraint file_links_unit_same_org foreign key (organization_id, unit_id)
    references public.organization_units (organization_id, id),
  constraint file_links_incubator_same_org foreign key (organization_id, incubator_id)
    references public.incubators (organization_id, id),
  constraint file_links_scope_shape check (unit_id is null or incubator_id is null),
  constraint file_links_label_valid check (label is null or (label = btrim(label) and char_length(label) between 1 and 160)),
  constraint file_links_unique_scope unique nulls not distinct
    (organization_id, file_id, unit_id, incubator_id, purpose)
);

create index file_links_unit_idx on public.file_links (organization_id, unit_id) where unit_id is not null;
create index file_links_incubator_idx on public.file_links (organization_id, incubator_id) where incubator_id is not null;
create index file_links_created_by_idx on public.file_links (created_by);

create table public.file_access_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id),
  file_id uuid,
  user_id uuid references auth.users (id),
  operation public.file_access_operation not null,
  result public.file_access_result not null,
  reason_code text,
  request_id text,
  ip_hash text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint file_access_logs_file_same_org foreign key (organization_id, file_id)
    references public.files (organization_id, id),
  constraint file_access_logs_reason_valid check (reason_code is null or (reason_code = btrim(reason_code) and char_length(reason_code) between 2 and 120)),
  constraint file_access_logs_request_id_valid check (request_id is null or char_length(request_id) between 8 and 160),
  constraint file_access_logs_ip_hash_valid check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'),
  constraint file_access_logs_user_agent_valid check (user_agent is null or char_length(user_agent) <= 500),
  constraint file_access_logs_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index file_access_logs_file_created_idx on public.file_access_logs (organization_id, file_id, created_at desc) where file_id is not null;
create index file_access_logs_user_created_idx on public.file_access_logs (user_id, created_at desc) where user_id is not null;

create table public.upload_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  file_id uuid not null,
  idempotency_key text not null,
  provider_session_reference_hash text,
  status public.upload_session_status not null default 'pending',
  expected_size_bytes bigint not null,
  acknowledged_offset_bytes bigint not null default 0,
  expires_at timestamptz not null,
  attempt_count integer not null default 0,
  error_code text,
  error_detail text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  constraint upload_sessions_file_same_org foreign key (organization_id, file_id)
    references public.files (organization_id, id) on delete cascade,
  constraint upload_sessions_idempotency_unique unique (organization_id, created_by, idempotency_key),
  constraint upload_sessions_idempotency_valid check (idempotency_key ~ '^[A-Za-z0-9._:-]{16,160}$'),
  constraint upload_sessions_reference_hash_valid check (provider_session_reference_hash is null or provider_session_reference_hash ~ '^[0-9a-f]{64}$'),
  constraint upload_sessions_size_valid check (expected_size_bytes > 0),
  constraint upload_sessions_offset_valid check (acknowledged_offset_bytes between 0 and expected_size_bytes),
  constraint upload_sessions_expiry_valid check (expires_at > created_at),
  constraint upload_sessions_attempt_valid check (attempt_count >= 0),
  constraint upload_sessions_error_fields check (
    (status = 'failed' and error_code is not null)
    or (status <> 'failed' and error_code is null and error_detail is null)
  )
);

create unique index upload_sessions_one_active_per_file_uidx
  on public.upload_sessions (organization_id, file_id)
  where status in ('pending', 'ready', 'uploading', 'validating');
create index upload_sessions_expiry_idx on public.upload_sessions (status, expires_at)
  where status in ('pending', 'ready', 'uploading', 'validating');
create index upload_sessions_created_by_idx on public.upload_sessions (created_by, created_at desc);

comment on table public.files is 'Registro lógico e metadados de arquivo; bytes permanecem no Google Drive.';
comment on column public.files.provider_file_id is 'Identificador externo sem valor de autorização para o cliente.';
comment on table public.file_links is 'Vínculos tipados disponíveis na fundação; módulos futuros acrescentam FKs próprias.';
comment on table public.file_access_logs is 'Auditoria append-only de tentativas de acesso; inserção reservada ao backend.';
comment on column public.upload_sessions.provider_session_reference_hash is 'Hash opcional para correlação; a URL resumível nunca é armazenada.';

insert into public.permissions (code, name, description, category) values
  ('file.read', 'Visualizar arquivos', 'Visualizar metadados e solicitar acesso a arquivos no escopo autorizado.', 'Arquivos'),
  ('file.manage', 'Gerenciar arquivos', 'Criar registros, vínculos e solicitar operações de ciclo de vida.', 'Arquivos'),
  ('file.audit', 'Auditar arquivos', 'Consultar eventos de acesso a arquivos.', 'Arquivos');

insert into public.role_permissions (organization_id, role_id, permission_code)
select r.organization_id, r.id, p.code
from public.roles r
join public.permissions p on p.code = any (
  case r.code
    when 'organization_admin' then array['file.read', 'file.manage', 'file.audit']
    when 'incubator_manager' then array['file.read', 'file.manage', 'file.audit']
    when 'auditor' then array['file.read', 'file.audit']
    else array['file.read']
  end
)
on conflict do nothing;

create or replace function private.can_access_file(target_file_id uuid, target_permission_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.files f
    where f.id = target_file_id
      and private.has_permission(
        f.organization_id,
        target_permission_code,
        f.unit_id,
        f.incubator_id
      )
  );
$$;

create or replace function private.can_view_file(target_file_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.files f
    where f.id = target_file_id
      and (
        (f.status = 'available' and private.has_permission(f.organization_id, 'file.read', f.unit_id, f.incubator_id))
        or private.has_permission(f.organization_id, 'file.manage', f.unit_id, f.incubator_id)
      )
  );
$$;

create or replace function private.validate_file_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.status <> 'pending' then
    raise exception 'Novo arquivo deve iniciar como pending';
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status and not (
    (old.status = 'pending' and new.status in ('uploading', 'failed'))
    or (old.status = 'uploading' and new.status in ('validating', 'failed'))
    or (old.status = 'validating' and new.status in ('available', 'quarantined', 'failed'))
    or (old.status = 'available' and new.status in ('trash_pending', 'missing', 'quarantined'))
    or (old.status = 'quarantined' and new.status in ('validating', 'trash_pending', 'failed'))
    or (old.status = 'failed' and new.status = 'pending')
    or (old.status = 'trash_pending' and new.status in ('trashed', 'available', 'failed'))
    or (old.status = 'trashed' and new.status in ('restore_pending', 'purge_pending'))
    or (old.status = 'restore_pending' and new.status in ('available', 'missing', 'failed'))
    or (old.status = 'missing' and new.status in ('restore_pending', 'purge_pending', 'failed'))
    or (old.status = 'purge_pending' and new.status in ('purged', 'trashed', 'failed'))
  ) then
    raise exception 'Transição de arquivo inválida: % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;

create or replace function private.validate_upload_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare file_size bigint;
begin
  select f.expected_size_bytes into file_size
  from public.files f
  where f.organization_id = new.organization_id and f.id = new.file_id;
  if file_size is null or file_size <> new.expected_size_bytes then
    raise exception 'Sessão e arquivo possuem tamanhos esperados divergentes';
  end if;
  return new;
end;
$$;

create trigger files_validate_state before insert or update of status on public.files
for each row execute function private.validate_file_state_transition();
create trigger upload_sessions_validate_file before insert or update of file_id, organization_id, expected_size_bytes on public.upload_sessions
for each row execute function private.validate_upload_session();

create trigger files_set_updated_at before update on public.files
for each row execute function private.set_updated_at();
create trigger upload_sessions_set_updated_at before update on public.upload_sessions
for each row execute function private.set_updated_at();

create trigger files_audit after insert or update or delete on public.files
for each row execute function private.write_audit_log();
create trigger file_versions_audit after insert or update or delete on public.file_versions
for each row execute function private.write_audit_log();
create trigger file_links_audit after insert or update or delete on public.file_links
for each row execute function private.write_audit_log();
create trigger upload_sessions_audit after insert or update or delete on public.upload_sessions
for each row execute function private.write_audit_log();

revoke all on table public.files, public.file_versions, public.file_links, public.file_access_logs, public.upload_sessions from anon, authenticated;
revoke all on sequence public.file_access_logs_id_seq from anon, authenticated;

grant select on public.files to authenticated;
grant insert (organization_id, unit_id, incubator_id, original_name, display_name, mime_type, expected_size_bytes, classification, upload_expires_at, created_by)
  on public.files to authenticated;
grant update (display_name, classification) on public.files to authenticated;
grant select on public.file_versions to authenticated;
grant select, delete on public.file_links to authenticated;
grant insert (organization_id, file_id, unit_id, incubator_id, purpose, classification_override, label, created_by)
  on public.file_links to authenticated;
grant select on public.file_access_logs to authenticated;
grant select on public.upload_sessions to authenticated;

alter table public.files enable row level security;
alter table public.file_versions enable row level security;
alter table public.file_links enable row level security;
alter table public.file_access_logs enable row level security;
alter table public.upload_sessions enable row level security;

create policy files_select_authorized on public.files for select to authenticated
using ((select private.can_view_file(id)));
create policy files_insert_manager on public.files for insert to authenticated
with check (
  created_by = (select auth.uid())
  and status = 'pending'
  and (select private.has_permission(organization_id, 'file.manage', unit_id, incubator_id))
);
create policy files_update_manager on public.files for update to authenticated
using ((select private.can_access_file(id, 'file.manage')))
with check ((select private.can_access_file(id, 'file.manage')));

create policy file_versions_select_authorized on public.file_versions for select to authenticated
using ((select private.can_view_file(file_id)));

create policy file_links_select_authorized on public.file_links for select to authenticated
using ((select private.can_view_file(file_id)));
create policy file_links_insert_manager on public.file_links for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.can_access_file(file_id, 'file.manage'))
  and (select private.has_permission(organization_id, 'file.manage', unit_id, incubator_id))
);
create policy file_links_delete_manager on public.file_links for delete to authenticated
using (
  (select private.can_access_file(file_id, 'file.manage'))
  and (select private.has_permission(organization_id, 'file.manage', unit_id, incubator_id))
);

create policy file_access_logs_select_auditor on public.file_access_logs for select to authenticated
using (
  (file_id is not null and (select private.can_access_file(file_id, 'file.audit')))
  or (file_id is null and (select private.has_permission(organization_id, 'file.audit')))
);

create policy upload_sessions_select_manager on public.upload_sessions for select to authenticated
using ((select private.can_access_file(file_id, 'file.manage')));

comment on policy files_select_authorized on public.files is 'Arquivos disponíveis exigem file.read; estados internos exigem file.manage no escopo tipado.';
comment on policy files_insert_manager on public.files is 'Criação lógica exige file.manage, autor autenticado e estado pending.';
comment on policy file_versions_select_authorized on public.file_versions is 'Versões herdam o escopo e a autorização do arquivo lógico.';
comment on policy file_links_insert_manager on public.file_links is 'Exige file.manage tanto no arquivo quanto no destino tipado.';
comment on policy file_access_logs_select_auditor on public.file_access_logs is 'Logs são append-only e consultáveis somente com file.audit.';
comment on policy upload_sessions_select_manager on public.upload_sessions is 'Sessões não expõem URL e exigem file.manage no arquivo.';

revoke execute on function private.can_access_file(uuid, text) from public, anon, authenticated;
grant execute on function private.can_access_file(uuid, text) to authenticated;
revoke execute on function private.can_view_file(uuid) from public, anon, authenticated;
grant execute on function private.can_view_file(uuid) to authenticated;
revoke execute on function private.validate_file_state_transition() from public, anon, authenticated;
revoke execute on function private.validate_upload_session() from public, anon, authenticated;

-- Atualiza o bootstrap para que organizações futuras recebam as permissões de arquivos.
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
      when 'incubator_manager' then array[
        'organization.read','unit.read','incubator.read','incubator.manage','member.read',
        'role.read','invitation.read','invitation.manage','audit.read','file.read','file.manage','file.audit'
      ]
      when 'auditor' then array[
        'organization.read','unit.read','incubator.read','member.read','role.read',
        'invitation.read','audit.read','file.read','file.audit'
      ]
      else array['organization.read','unit.read','incubator.read','role.read','file.read']
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

revoke execute on function public.create_organization(text, text, text, text) from public, anon;
grant execute on function public.create_organization(text, text, text, text) to authenticated;

commit;
