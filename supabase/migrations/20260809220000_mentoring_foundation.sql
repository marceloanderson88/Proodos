-- Fundação do módulo de mentorias: perfis profissionais, especialidades e
-- vínculos mentor–startup. Sessões, disponibilidade e feedback entram em
-- migrations posteriores para manter esta entrega pequena e auditável.

do $$ begin
  create type public.mentor_profile_status as enum ('active', 'inactive');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.mentor_skill_kind as enum ('specialty', 'segment');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.mentor_assignment_status as enum ('active', 'paused', 'ended');
exception when duplicate_object then null;
end $$;

create table public.mentor_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  incubator_id uuid not null,
  user_id uuid not null references auth.users (id),
  headline text not null,
  bio text not null,
  timezone text not null default 'America/Sao_Paulo',
  linkedin_url text,
  status public.mentor_profile_status not null default 'active',
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint mentor_profiles_org_id_unique unique (organization_id, id),
  constraint mentor_profiles_incubator_same_org foreign key (organization_id, incubator_id)
    references public.incubators (organization_id, id),
  constraint mentor_profiles_incubator_user_unique unique (organization_id, incubator_id, user_id),
  constraint mentor_profiles_headline_valid check (
    headline = btrim(headline) and char_length(headline) between 3 and 160
  ),
  constraint mentor_profiles_bio_valid check (
    bio = btrim(bio) and char_length(bio) between 20 and 2000
  ),
  constraint mentor_profiles_timezone_valid check (
    timezone = btrim(timezone) and char_length(timezone) between 1 and 100
  ),
  constraint mentor_profiles_linkedin_valid check (
    linkedin_url is null or (
      linkedin_url = btrim(linkedin_url)
      and char_length(linkedin_url) <= 2048
      and linkedin_url ~ '^https://([a-z]{2,3}\\.)?linkedin\\.com/'
    )
  ),
  constraint mentor_profiles_archive_status_valid check (
    (status = 'active' and archived_at is null)
    or (status = 'inactive' and archived_at is not null)
  )
);

create index mentor_profiles_incubator_status_idx
  on public.mentor_profiles (organization_id, incubator_id, status, created_at desc);
create index mentor_profiles_user_idx
  on public.mentor_profiles (user_id, organization_id, incubator_id);

create table public.mentor_skills (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  mentor_profile_id uuid not null,
  kind public.mentor_skill_kind not null,
  name text not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  constraint mentor_skills_profile_same_org foreign key (organization_id, mentor_profile_id)
    references public.mentor_profiles (organization_id, id) on delete cascade,
  constraint mentor_skills_name_valid check (
    name = btrim(name) and char_length(name) between 2 and 80
  )
);

create unique index mentor_skills_profile_kind_name_uidx
  on public.mentor_skills (organization_id, mentor_profile_id, kind, lower(name));
create index mentor_skills_profile_idx
  on public.mentor_skills (organization_id, mentor_profile_id, kind);

create table public.mentor_startup_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  incubator_id uuid not null,
  mentor_profile_id uuid not null,
  startup_id uuid not null,
  status public.mentor_assignment_status not null default 'active',
  starts_on date not null default current_date,
  ends_on date,
  focus text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint mentor_assignments_org_id_unique unique (organization_id, id),
  constraint mentor_assignments_incubator_same_org foreign key (organization_id, incubator_id)
    references public.incubators (organization_id, id),
  constraint mentor_assignments_profile_same_org foreign key (organization_id, mentor_profile_id)
    references public.mentor_profiles (organization_id, id),
  constraint mentor_assignments_startup_same_org foreign key (organization_id, startup_id)
    references public.startups (organization_id, id),
  constraint mentor_assignments_dates_valid check (ends_on is null or starts_on <= ends_on),
  constraint mentor_assignments_focus_valid check (
    focus is null or (focus = btrim(focus) and char_length(focus) between 3 and 1000)
  ),
  constraint mentor_assignments_end_status_valid check (
    (status = 'ended' and ended_at is not null)
    or (status <> 'ended' and ended_at is null)
  )
);

create unique index mentor_assignments_active_uidx
  on public.mentor_startup_assignments (organization_id, mentor_profile_id, startup_id)
  where status in ('active', 'paused');
create index mentor_assignments_incubator_status_idx
  on public.mentor_startup_assignments (organization_id, incubator_id, status, starts_on desc);
create index mentor_assignments_startup_idx
  on public.mentor_startup_assignments (organization_id, startup_id, status);
create index mentor_assignments_profile_idx
  on public.mentor_startup_assignments (organization_id, mentor_profile_id, status);

comment on table public.mentor_profiles is
  'Perfil profissional de um membro com papel Mentor na incubadora; não duplica identidade ou autenticação.';
comment on table public.mentor_skills is
  'Especialidades e segmentos de atuação usados na descoberta de mentores.';
comment on table public.mentor_startup_assignments is
  'Vínculo temporal entre mentor e startup; sessões e feedbacks referenciam este vínculo em etapas posteriores.';
comment on column public.mentor_startup_assignments.focus is
  'Escopo compartilhado do acompanhamento, visível ao mentor e à startup vinculada.';

insert into public.permissions (code, name, description, category) values
  ('mentoring.read', 'Visualizar mentorias', 'Visualizar diretório, vínculos e acompanhamento autorizado.', 'Mentorias'),
  ('mentoring.manage', 'Gerenciar mentorias', 'Cadastrar perfis e gerenciar vínculos entre mentores e startups.', 'Mentorias'),
  ('mentoring.conduct', 'Conduzir mentorias', 'Acessar os próprios vínculos e conduzir acompanhamentos autorizados.', 'Mentorias')
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category;

insert into public.role_permissions (organization_id, role_id, permission_code)
select r.organization_id, r.id, permission_code
from public.roles r
cross join lateral unnest(
  case r.code
    when 'organization_admin' then array['mentoring.read', 'mentoring.manage', 'mentoring.conduct']
    when 'incubator_manager' then array['mentoring.read', 'mentoring.manage', 'mentoring.conduct']
    when 'program_coordinator' then array['mentoring.read', 'mentoring.manage', 'mentoring.conduct']
    when 'agent' then array['mentoring.read', 'mentoring.conduct']
    when 'mentor' then array['mentoring.conduct']
    else array[]::text[]
  end
) permission_code
where r.is_system
on conflict do nothing;

create or replace function private.seed_mentoring_role_permissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare permission_code text;
begin
  if not new.is_system then return new; end if;

  foreach permission_code in array
    case new.code
      when 'organization_admin' then array['mentoring.read', 'mentoring.manage', 'mentoring.conduct']
      when 'incubator_manager' then array['mentoring.read', 'mentoring.manage', 'mentoring.conduct']
      when 'program_coordinator' then array['mentoring.read', 'mentoring.manage', 'mentoring.conduct']
      when 'agent' then array['mentoring.read', 'mentoring.conduct']
      when 'mentor' then array['mentoring.conduct']
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

revoke all on function private.seed_mentoring_role_permissions() from public, anon, authenticated;

create trigger roles_seed_mentoring_permissions
after insert on public.roles
for each row execute function private.seed_mentoring_role_permissions();

create or replace function private.validate_mentor_profile_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.organization_memberships membership
    join public.role_assignments assignment
      on assignment.organization_id = membership.organization_id
     and assignment.membership_id = membership.id
    join public.roles role
      on role.organization_id = assignment.organization_id
     and role.id = assignment.role_id
    where membership.organization_id = new.organization_id
      and membership.user_id = new.user_id
      and membership.status = 'active'
      and assignment.incubator_id = new.incubator_id
      and assignment.unit_id is null
      and role.code = 'mentor'
      and role.archived_at is null
  ) then
    raise exception 'A pessoa precisa ter o papel Mentor nesta incubadora' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_mentor_profile_member() from public, anon, authenticated;

create trigger mentor_profiles_validate_member
before insert or update of organization_id, incubator_id, user_id on public.mentor_profiles
for each row execute function private.validate_mentor_profile_member();

create or replace function private.validate_mentor_assignment_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.mentor_profiles profile
    where profile.organization_id = new.organization_id
      and profile.incubator_id = new.incubator_id
      and profile.id = new.mentor_profile_id
      and profile.status = 'active'
  ) then
    raise exception 'Mentor não está ativo nesta incubadora' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.startups startup
    where startup.organization_id = new.organization_id
      and startup.incubator_id = new.incubator_id
      and startup.id = new.startup_id
      and startup.status = 'active'
      and startup.deleted_at is null
  ) then
    raise exception 'Startup não está ativa nesta incubadora' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_mentor_assignment_scope() from public, anon, authenticated;

create trigger mentor_assignments_validate_scope
before insert or update of organization_id, incubator_id, mentor_profile_id, startup_id
on public.mentor_startup_assignments
for each row execute function private.validate_mentor_assignment_scope();

create or replace function public.create_mentor_profile(
  target_organization_id uuid,
  target_incubator_id uuid,
  mentor_user_id uuid,
  profile_headline text,
  profile_bio text,
  profile_timezone text default 'America/Sao_Paulo',
  profile_linkedin_url text default null,
  specialty_names text[] default '{}',
  segment_names text[] default '{}'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare new_profile_id uuid;
declare skill_name text;
begin
  if (select auth.uid()) is null or not private.has_permission(
    target_organization_id,
    'mentoring.manage',
    null,
    target_incubator_id
  ) then
    raise exception 'Sem permissão para gerenciar mentorias' using errcode = '42501';
  end if;

  insert into public.mentor_profiles (
    organization_id,
    incubator_id,
    user_id,
    headline,
    bio,
    timezone,
    linkedin_url,
    created_by
  ) values (
    target_organization_id,
    target_incubator_id,
    mentor_user_id,
    profile_headline,
    profile_bio,
    profile_timezone,
    nullif(profile_linkedin_url, ''),
    (select auth.uid())
  ) returning id into new_profile_id;

  foreach skill_name in array specialty_names loop
    insert into public.mentor_skills (
      organization_id, mentor_profile_id, kind, name, created_by
    ) values (
      target_organization_id, new_profile_id, 'specialty', skill_name, (select auth.uid())
    );
  end loop;

  foreach skill_name in array segment_names loop
    insert into public.mentor_skills (
      organization_id, mentor_profile_id, kind, name, created_by
    ) values (
      target_organization_id, new_profile_id, 'segment', skill_name, (select auth.uid())
    );
  end loop;

  return new_profile_id;
end;
$$;

revoke all on function public.create_mentor_profile(
  uuid, uuid, uuid, text, text, text, text, text[], text[]
) from public, anon;
grant execute on function public.create_mentor_profile(
  uuid, uuid, uuid, text, text, text, text, text[], text[]
) to authenticated;

create or replace function public.update_mentor_profile(
  target_profile_id uuid,
  profile_headline text,
  profile_bio text,
  profile_timezone text,
  profile_linkedin_url text default null,
  specialty_names text[] default '{}',
  segment_names text[] default '{}'
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare target_profile public.mentor_profiles%rowtype;
declare skill_name text;
begin
  select * into target_profile
  from public.mentor_profiles
  where id = target_profile_id
  for update;

  if not found or not private.has_permission(
    target_profile.organization_id,
    'mentoring.manage',
    null,
    target_profile.incubator_id
  ) then
    raise exception 'Sem permissão para alterar o mentor' using errcode = '42501';
  end if;

  update public.mentor_profiles set
    headline = profile_headline,
    bio = profile_bio,
    timezone = profile_timezone,
    linkedin_url = nullif(profile_linkedin_url, '')
  where id = target_profile_id;

  delete from public.mentor_skills where mentor_profile_id = target_profile_id;
  foreach skill_name in array specialty_names loop
    insert into public.mentor_skills (
      organization_id, mentor_profile_id, kind, name, created_by
    ) values (
      target_profile.organization_id, target_profile_id, 'specialty', skill_name, (select auth.uid())
    );
  end loop;
  foreach skill_name in array segment_names loop
    insert into public.mentor_skills (
      organization_id, mentor_profile_id, kind, name, created_by
    ) values (
      target_profile.organization_id, target_profile_id, 'segment', skill_name, (select auth.uid())
    );
  end loop;
end;
$$;

revoke all on function public.update_mentor_profile(
  uuid, text, text, text, text, text[], text[]
) from public, anon;
grant execute on function public.update_mentor_profile(
  uuid, text, text, text, text, text[], text[]
) to authenticated;

create or replace function public.set_mentor_profile_status(
  target_profile_id uuid,
  requested_status public.mentor_profile_status
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare target_profile public.mentor_profiles%rowtype;
begin
  select * into target_profile
  from public.mentor_profiles
  where id = target_profile_id
  for update;

  if not found or not private.has_permission(
    target_profile.organization_id,
    'mentoring.manage',
    null,
    target_profile.incubator_id
  ) then
    raise exception 'Sem permissão para alterar o mentor' using errcode = '42501';
  end if;

  if requested_status = 'inactive' and exists (
    select 1 from public.mentor_startup_assignments assignment
    where assignment.organization_id = target_profile.organization_id
      and assignment.mentor_profile_id = target_profile_id
      and assignment.status in ('active', 'paused')
  ) then
    raise exception 'Encerre os vínculos ativos antes de inativar o mentor' using errcode = '23514';
  end if;

  update public.mentor_profiles set
    status = requested_status,
    archived_at = case when requested_status = 'inactive' then now() else null end
  where id = target_profile_id;
end;
$$;

revoke all on function public.set_mentor_profile_status(uuid, public.mentor_profile_status)
  from public, anon;
grant execute on function public.set_mentor_profile_status(uuid, public.mentor_profile_status)
  to authenticated;

create or replace function public.update_mentor_assignment_status(
  target_assignment_id uuid,
  requested_status public.mentor_assignment_status
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare target_assignment public.mentor_startup_assignments%rowtype;
begin
  select * into target_assignment
  from public.mentor_startup_assignments
  where id = target_assignment_id
  for update;

  if not found or not private.has_permission(
    target_assignment.organization_id,
    'mentoring.manage',
    null,
    target_assignment.incubator_id
  ) then
    raise exception 'Sem permissão para alterar o vínculo' using errcode = '42501';
  end if;

  if target_assignment.status = 'ended'
    or requested_status = target_assignment.status
    or requested_status not in ('active', 'paused', 'ended') then
    raise exception 'Transição de vínculo inválida' using errcode = '23514';
  end if;

  update public.mentor_startup_assignments set
    status = requested_status,
    ended_at = case when requested_status = 'ended' then now() else null end
  where id = target_assignment_id;
end;
$$;

revoke all on function public.update_mentor_assignment_status(
  uuid, public.mentor_assignment_status
) from public, anon;
grant execute on function public.update_mentor_assignment_status(
  uuid, public.mentor_assignment_status
) to authenticated;

create or replace function public.has_incubator_permission(
  target_organization_id uuid,
  target_incubator_id uuid,
  target_permission_code text
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and private.has_permission(
      target_organization_id,
      target_permission_code,
      null,
      target_incubator_id
    );
$$;

revoke all on function public.has_incubator_permission(uuid, uuid, text)
  from public, anon;
grant execute on function public.has_incubator_permission(uuid, uuid, text)
  to authenticated;

create or replace function private.can_access_mentor_profile(
  target_organization_id uuid,
  target_profile_id uuid,
  target_incubator_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    private.has_permission(target_organization_id, 'mentoring.read', null, target_incubator_id)
    or exists (
      select 1 from public.mentor_profiles profile
      where profile.organization_id = target_organization_id
        and profile.id = target_profile_id
        and profile.incubator_id = target_incubator_id
        and profile.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.mentor_startup_assignments assignment
      join public.startup_members member
        on member.organization_id = assignment.organization_id
       and member.startup_id = assignment.startup_id
      where assignment.organization_id = target_organization_id
        and assignment.incubator_id = target_incubator_id
        and assignment.mentor_profile_id = target_profile_id
        and assignment.status in ('active', 'paused')
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
  );
$$;

revoke all on function private.can_access_mentor_profile(uuid, uuid, uuid)
  from public, anon, authenticated;

create trigger mentor_profiles_set_updated_at
before update on public.mentor_profiles
for each row execute function private.set_updated_at();
create trigger mentor_assignments_set_updated_at
before update on public.mentor_startup_assignments
for each row execute function private.set_updated_at();

create trigger mentor_profiles_audit
after insert or update or delete on public.mentor_profiles
for each row execute function private.write_audit_log();
create trigger mentor_skills_audit
after insert or update or delete on public.mentor_skills
for each row execute function private.write_audit_log();
create trigger mentor_assignments_audit
after insert or update or delete on public.mentor_startup_assignments
for each row execute function private.write_audit_log();

alter table public.mentor_profiles enable row level security;
alter table public.mentor_skills enable row level security;
alter table public.mentor_startup_assignments enable row level security;

revoke all on public.mentor_profiles, public.mentor_skills, public.mentor_startup_assignments
  from public, anon;
grant select, insert, update on public.mentor_profiles to authenticated;
grant select, insert, update, delete on public.mentor_skills to authenticated;
grant select, insert, update on public.mentor_startup_assignments to authenticated;

create policy mentor_profiles_select_authorized
on public.mentor_profiles for select to authenticated
using ((select private.can_access_mentor_profile(organization_id, id, incubator_id)));

create policy mentor_profiles_insert_manager
on public.mentor_profiles for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.has_permission(organization_id, 'mentoring.manage', null, incubator_id))
);

create policy mentor_profiles_update_manager
on public.mentor_profiles for update to authenticated
using ((select private.has_permission(organization_id, 'mentoring.manage', null, incubator_id)))
with check ((select private.has_permission(organization_id, 'mentoring.manage', null, incubator_id)));

create policy mentor_skills_select_authorized
on public.mentor_skills for select to authenticated
using (exists (
  select 1 from public.mentor_profiles profile
  where profile.organization_id = mentor_skills.organization_id
    and profile.id = mentor_skills.mentor_profile_id
    and (select private.can_access_mentor_profile(profile.organization_id, profile.id, profile.incubator_id))
));

create policy mentor_skills_insert_manager
on public.mentor_skills for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.mentor_profiles profile
    where profile.organization_id = mentor_skills.organization_id
      and profile.id = mentor_skills.mentor_profile_id
      and (select private.has_permission(profile.organization_id, 'mentoring.manage', null, profile.incubator_id))
  )
);

create policy mentor_skills_update_manager
on public.mentor_skills for update to authenticated
using (exists (
  select 1 from public.mentor_profiles profile
  where profile.organization_id = mentor_skills.organization_id
    and profile.id = mentor_skills.mentor_profile_id
    and (select private.has_permission(profile.organization_id, 'mentoring.manage', null, profile.incubator_id))
))
with check (exists (
  select 1 from public.mentor_profiles profile
  where profile.organization_id = mentor_skills.organization_id
    and profile.id = mentor_skills.mentor_profile_id
    and (select private.has_permission(profile.organization_id, 'mentoring.manage', null, profile.incubator_id))
));

create policy mentor_skills_delete_manager
on public.mentor_skills for delete to authenticated
using (exists (
  select 1 from public.mentor_profiles profile
  where profile.organization_id = mentor_skills.organization_id
    and profile.id = mentor_skills.mentor_profile_id
    and (select private.has_permission(profile.organization_id, 'mentoring.manage', null, profile.incubator_id))
));

create policy mentor_assignments_select_authorized
on public.mentor_startup_assignments for select to authenticated
using (
  (select private.has_permission(organization_id, 'mentoring.read', null, incubator_id))
  or exists (
    select 1 from public.mentor_profiles profile
    where profile.organization_id = mentor_startup_assignments.organization_id
      and profile.id = mentor_startup_assignments.mentor_profile_id
      and profile.user_id = (select auth.uid())
  )
  or (select private.can_access_startup(organization_id, startup_id, incubator_id))
);

create policy mentor_assignments_insert_manager
on public.mentor_startup_assignments for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.has_permission(organization_id, 'mentoring.manage', null, incubator_id))
);

create policy mentor_assignments_update_manager
on public.mentor_startup_assignments for update to authenticated
using ((select private.has_permission(organization_id, 'mentoring.manage', null, incubator_id)))
with check ((select private.has_permission(organization_id, 'mentoring.manage', null, incubator_id)));

create policy startups_select_assigned_mentor
on public.startups for select to authenticated
using (exists (
  select 1
  from public.mentor_startup_assignments assignment
  join public.mentor_profiles profile
    on profile.organization_id = assignment.organization_id
   and profile.id = assignment.mentor_profile_id
  where assignment.organization_id = startups.organization_id
    and assignment.incubator_id = startups.incubator_id
    and assignment.startup_id = startups.id
    and assignment.status in ('active', 'paused')
    and profile.user_id = (select auth.uid())
));

create policy profiles_select_assigned_mentor
on public.profiles for select to authenticated
using (exists (
  select 1
  from public.mentor_profiles mentor
  join public.mentor_startup_assignments assignment
    on assignment.organization_id = mentor.organization_id
   and assignment.mentor_profile_id = mentor.id
  join public.startup_members member
    on member.organization_id = assignment.organization_id
   and member.startup_id = assignment.startup_id
  where mentor.user_id = profiles.id
    and assignment.status in ('active', 'paused')
    and member.user_id = (select auth.uid())
    and member.status = 'active'
));

comment on policy mentor_profiles_select_authorized on public.mentor_profiles is
  'Gestores veem o diretório; mentor vê o próprio perfil; startup vê somente mentores vinculados.';
comment on policy mentor_profiles_insert_manager on public.mentor_profiles is
  'Somente mentoring.manage cria perfis, sempre para pessoa com papel Mentor no mesmo tenant/incubadora.';
comment on policy mentor_profiles_update_manager on public.mentor_profiles is
  'Somente mentoring.manage altera ou inativa perfis.';
comment on policy mentor_skills_select_authorized on public.mentor_skills is
  'Especialidades seguem exatamente a visibilidade do perfil do mentor.';
comment on policy mentor_skills_insert_manager on public.mentor_skills is
  'Somente mentoring.manage adiciona especialidades.';
comment on policy mentor_skills_update_manager on public.mentor_skills is
  'Somente mentoring.manage altera especialidades.';
comment on policy mentor_skills_delete_manager on public.mentor_skills is
  'Somente mentoring.manage remove especialidades.';
comment on policy mentor_assignments_select_authorized on public.mentor_startup_assignments is
  'Gestores veem o contexto autorizado; mentor e membros da startup veem apenas seus vínculos.';
comment on policy mentor_assignments_insert_manager on public.mentor_startup_assignments is
  'Somente mentoring.manage cria vínculos, com created_by igual ao usuário autenticado.';
comment on policy mentor_assignments_update_manager on public.mentor_startup_assignments is
  'Somente mentoring.manage pausa ou encerra vínculos.';
comment on policy startups_select_assigned_mentor on public.startups is
  'Mentor acessa somente startups com vínculo ativo ou pausado atribuído ao seu perfil.';
comment on policy profiles_select_assigned_mentor on public.profiles is
  'Membro ativo da startup acessa a identidade básica do mentor atualmente vinculado.';
