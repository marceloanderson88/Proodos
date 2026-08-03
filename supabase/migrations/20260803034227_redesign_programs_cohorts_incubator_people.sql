-- Redesenho do cadastro de programas/turmas e diretório de pessoas da incubadora.
-- A migration preserva o tenant, RBAC e histórico estrutural existentes.

begin;

-- Perfis continuam sem dados de autorização, mas passam a oferecer o e-mail
-- verificado pelo Auth para o diretório administrativo da incubadora.
alter table public.profiles add column email text;

update public.profiles p
set email = lower(u.email)
from auth.users u
where u.id = p.id and u.email is not null;

alter table public.profiles
  add constraint profiles_email_valid check (
    email is null
    or (email = lower(btrim(email)) and char_length(email) between 3 and 320)
  );

create unique index profiles_email_uidx on public.profiles (email) where email is not null;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text;
  normalized_avatar text;
begin
  normalized_name := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  )), '');
  normalized_avatar := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'picture',
    ''
  )), '');

  insert into public.profiles (id, display_name, avatar_url, email)
  values (
    new.id,
    case when normalized_name is null then null else left(normalized_name, 120) end,
    case when normalized_avatar is null then null else left(normalized_avatar, 2048) end,
    lower(new.email)
  )
  on conflict (id) do update set email = excluded.email;

  return new;
end;
$$;

create or replace function private.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end;
$$;

revoke execute on function private.sync_profile_email() from public, anon, authenticated;

create trigger on_auth_user_email_updated
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function private.sync_profile_email();

drop policy profiles_select_own on public.profiles;

create policy profiles_select_own_or_shared_manager
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.organization_memberships membership
    where membership.user_id = profiles.id
      and membership.status = 'active'
      and (select private.has_permission(membership.organization_id, 'member.read'))
  )
);

comment on policy profiles_select_own_or_shared_manager on public.profiles is
  'O usuário lê o próprio perfil; gestores com member.read leem membros ativos da mesma organização.';

-- Tipos de programa deixam de possuir escopo organizacional. Os registros globais
-- legados são materializados por incubadora antes de tornar a FK obrigatória.
insert into public.program_types (
  organization_id, incubator_id, code, name, description, is_active, settings, created_by
)
select
  global_type.organization_id,
  incubator.id,
  global_type.code,
  global_type.name,
  global_type.description,
  global_type.is_active,
  global_type.settings,
  global_type.created_by
from public.program_types global_type
join public.incubators incubator
  on incubator.organization_id = global_type.organization_id
 and incubator.deleted_at is null
where global_type.incubator_id is null
on conflict do nothing;

update public.programs program
set type_id = local_type.id
from public.program_types global_type
join public.program_types local_type
  on local_type.organization_id = global_type.organization_id
 and local_type.code = global_type.code
 and local_type.incubator_id is not null
where program.type_id = global_type.id
  and global_type.incubator_id is null
  and local_type.incubator_id = program.incubator_id;

delete from public.program_types global_type
where global_type.incubator_id is null
  and not exists (select 1 from public.programs program where program.type_id = global_type.id);

alter table public.program_types alter column incubator_id set not null;
drop index public.program_types_code_scope_uidx;
create unique index program_types_code_incubator_uidx
  on public.program_types (organization_id, incubator_id, code);

comment on table public.program_types is
  'Catálogo interno de tipos pertencente obrigatoriamente a uma incubadora; não depende de CERNE.';

-- Logo pequeno é um ativo de interface e fica no Supabase Storage privado.
-- Vídeos, apresentações e demais arquivos grandes continuam no Google Drive.
alter table public.programs add column logo_path text;
update public.programs set starts_on = created_at::date where starts_on is null;
alter table public.programs alter column starts_on set not null;
alter table public.programs
  add constraint programs_logo_path_valid check (
    logo_path is null
    or (logo_path = btrim(logo_path) and char_length(logo_path) between 20 and 500)
  );

grant update (logo_path) on public.programs to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'program-logos',
  'program-logos',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.can_access_program_logo(object_name text, permission_code text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  object_program_id uuid;
  object_organization_id uuid;
  object_incubator_id uuid;
begin
  if (select auth.uid()) is null then return false; end if;

  begin
    object_organization_id := split_part(object_name, '/', 1)::uuid;
    object_incubator_id := split_part(object_name, '/', 2)::uuid;
    object_program_id := split_part(object_name, '/', 3)::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  return exists (
    select 1
    from public.programs program
    where program.id = object_program_id
      and program.organization_id = object_organization_id
      and program.incubator_id = object_incubator_id
      and program.deleted_at is null
      and (select private.has_permission(
        program.organization_id,
        permission_code,
        null,
        program.incubator_id
      ))
  );
end;
$$;

revoke execute on function private.can_access_program_logo(text, text)
from public, anon, authenticated;

create policy program_logos_select_authorized
on storage.objects for select to authenticated
using (
  bucket_id = 'program-logos'
  and (select private.can_access_program_logo(name, 'program.read'))
);

create policy program_logos_insert_manager
on storage.objects for insert to authenticated
with check (
  bucket_id = 'program-logos'
  and owner_id = (select auth.uid()::text)
  and (select private.can_access_program_logo(name, 'program.manage'))
);

create policy program_logos_update_manager
on storage.objects for update to authenticated
using (
  bucket_id = 'program-logos'
  and (select private.can_access_program_logo(name, 'program.manage'))
)
with check (
  bucket_id = 'program-logos'
  and (select private.can_access_program_logo(name, 'program.manage'))
);

create policy program_logos_delete_manager
on storage.objects for delete to authenticated
using (
  bucket_id = 'program-logos'
  and (select private.can_access_program_logo(name, 'program.manage'))
);

-- Turmas possuem lançamento, inscrição opcional e ciclo com início obrigatório.
alter table public.cohorts add column launches_on date;
update public.cohorts
set launches_on = coalesce(starts_on, created_at::date),
    starts_on = coalesce(starts_on, created_at::date);
alter table public.cohorts alter column launches_on set not null;
alter table public.cohorts alter column starts_on set not null;
alter table public.cohorts
  drop constraint cohorts_enrollment_dates_valid,
  drop constraint cohorts_dates_valid,
  add constraint cohorts_enrollment_period_complete check (
    (enrollment_starts_on is null and enrollment_ends_on is null)
    or (enrollment_starts_on is not null and enrollment_ends_on is not null)
  ),
  add constraint cohorts_enrollment_dates_valid check (
    enrollment_starts_on is null or enrollment_starts_on <= enrollment_ends_on
  ),
  add constraint cohorts_cycle_dates_valid check (
    ends_on is null or starts_on <= ends_on
  );

grant update (launches_on, enrollment_starts_on, enrollment_ends_on)
on public.cohorts to authenticated;
grant insert (launches_on, enrollment_starts_on, enrollment_ends_on)
on public.cohorts to authenticated;

comment on column public.cohorts.launches_on is 'Data pública de lançamento da turma.';
comment on column public.cohorts.enrollment_starts_on is 'Início opcional do período de inscrições.';
comment on column public.cohorts.enrollment_ends_on is 'Fim opcional do período de inscrições.';

commit;
