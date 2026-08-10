-- Operação de mentorias: disponibilidade, agenda, registros e recomendações.

do $$ begin
  create type public.mentoring_session_status as enum ('requested', 'scheduled', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.mentoring_session_mode as enum ('remote', 'in_person', 'hybrid');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.mentoring_note_visibility as enum ('shared', 'restricted');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.mentoring_recommendation_priority as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.mentoring_recommendation_status as enum ('proposed', 'accepted', 'dismissed', 'converted');
exception when duplicate_object then null;
end $$;

create table public.mentor_availability_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  incubator_id uuid not null,
  mentor_profile_id uuid not null,
  weekday smallint not null,
  starts_at time not null,
  ends_at time not null,
  timezone text not null default 'America/Sao_Paulo',
  effective_from date not null default current_date,
  effective_until date,
  is_active boolean not null default true,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mentor_availability_incubator_same_org foreign key (organization_id, incubator_id)
    references public.incubators (organization_id, id),
  constraint mentor_availability_profile_same_org foreign key (organization_id, mentor_profile_id)
    references public.mentor_profiles (organization_id, id) on delete cascade,
  constraint mentor_availability_weekday_valid check (weekday between 0 and 6),
  constraint mentor_availability_time_valid check (starts_at < ends_at),
  constraint mentor_availability_dates_valid check (effective_until is null or effective_from <= effective_until),
  constraint mentor_availability_timezone_valid check (timezone = btrim(timezone) and char_length(timezone) between 1 and 100)
);

create index mentor_availability_profile_idx on public.mentor_availability_slots
  (organization_id, mentor_profile_id, weekday, starts_at) where is_active;

create table public.mentoring_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  incubator_id uuid not null,
  assignment_id uuid not null,
  diagnostic_assessment_id uuid,
  requested_by uuid not null references auth.users (id),
  objective text not null,
  mode public.mentoring_session_mode not null default 'remote',
  timezone text not null default 'America/Sao_Paulo',
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  meeting_url text,
  location text,
  status public.mentoring_session_status not null default 'requested',
  cancellation_reason text,
  completed_at timestamptz,
  cancelled_at timestamptz,
  calendar_provider text,
  external_calendar_event_id text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mentoring_sessions_org_id_unique unique (organization_id, id),
  constraint mentoring_sessions_incubator_same_org foreign key (organization_id, incubator_id)
    references public.incubators (organization_id, id),
  constraint mentoring_sessions_assignment_same_org foreign key (organization_id, assignment_id)
    references public.mentor_startup_assignments (organization_id, id),
  constraint mentoring_sessions_diagnostic_same_org foreign key (organization_id, diagnostic_assessment_id)
    references public.diagnostic_assessments (organization_id, id),
  constraint mentoring_sessions_objective_valid check (objective = btrim(objective) and char_length(objective) between 5 and 1000),
  constraint mentoring_sessions_timezone_valid check (timezone = btrim(timezone) and char_length(timezone) between 1 and 100),
  constraint mentoring_sessions_schedule_valid check (
    (scheduled_start_at is null and scheduled_end_at is null)
    or (scheduled_start_at is not null and scheduled_end_at is not null and scheduled_start_at < scheduled_end_at)
  ),
  constraint mentoring_sessions_status_schedule_valid check (
    status in ('requested', 'cancelled') or scheduled_start_at is not null
  ),
  constraint mentoring_sessions_completion_valid check (
    (status = 'completed' and completed_at is not null) or (status <> 'completed' and completed_at is null)
  ),
  constraint mentoring_sessions_cancellation_valid check (
    (status = 'cancelled' and cancelled_at is not null and cancellation_reason is not null)
    or (status <> 'cancelled' and cancelled_at is null and cancellation_reason is null)
  ),
  constraint mentoring_sessions_meeting_url_valid check (meeting_url is null or char_length(meeting_url) <= 2048),
  constraint mentoring_sessions_location_valid check (location is null or char_length(location) <= 500),
  constraint mentoring_sessions_calendar_pair check (
    (calendar_provider is null and external_calendar_event_id is null)
    or (calendar_provider is not null and external_calendar_event_id is not null)
  )
);

create index mentoring_sessions_assignment_status_idx on public.mentoring_sessions
  (organization_id, assignment_id, status, scheduled_start_at desc);
create index mentoring_sessions_incubator_schedule_idx on public.mentoring_sessions
  (organization_id, incubator_id, scheduled_start_at) where status = 'scheduled';
create index mentoring_sessions_diagnostic_idx on public.mentoring_sessions
  (organization_id, diagnostic_assessment_id) where diagnostic_assessment_id is not null;

create table public.mentoring_session_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  session_id uuid not null,
  visibility public.mentoring_note_visibility not null default 'shared',
  content text not null,
  author_user_id uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mentoring_notes_session_same_org foreign key (organization_id, session_id)
    references public.mentoring_sessions (organization_id, id) on delete cascade,
  constraint mentoring_notes_content_valid check (content = btrim(content) and char_length(content) between 3 and 5000)
);

create index mentoring_notes_session_idx on public.mentoring_session_notes
  (organization_id, session_id, created_at);

create table public.mentoring_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  session_id uuid not null,
  title text not null,
  description text not null,
  priority public.mentoring_recommendation_priority not null default 'medium',
  status public.mentoring_recommendation_status not null default 'proposed',
  due_on date,
  owner_user_id uuid references auth.users (id),
  converted_action_id uuid,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mentoring_recommendations_session_same_org foreign key (organization_id, session_id)
    references public.mentoring_sessions (organization_id, id) on delete cascade,
  constraint mentoring_recommendations_title_valid check (title = btrim(title) and char_length(title) between 3 and 180),
  constraint mentoring_recommendations_description_valid check (description = btrim(description) and char_length(description) between 5 and 3000),
  constraint mentoring_recommendations_conversion_valid check (
    (status = 'converted' and converted_action_id is not null)
    or (status <> 'converted' and converted_action_id is null)
  )
);

create index mentoring_recommendations_session_status_idx on public.mentoring_recommendations
  (organization_id, session_id, status, priority);

create or replace function private.validate_mentoring_session_scope()
returns trigger language plpgsql security definer set search_path = '' as $$
declare assignment public.mentor_startup_assignments%rowtype;
declare mentor_user_id uuid;
begin
  select * into assignment from public.mentor_startup_assignments
  where organization_id = new.organization_id and id = new.assignment_id;
  if not found or assignment.incubator_id <> new.incubator_id or assignment.status = 'ended' then
    raise exception 'Vínculo de mentoria inválido' using errcode = '23514';
  end if;
  if new.diagnostic_assessment_id is not null then
    select profile.user_id into mentor_user_id from public.mentor_profiles profile
    where profile.organization_id = assignment.organization_id and profile.id = assignment.mentor_profile_id;
    if not exists (
      select 1 from public.diagnostic_assessments assessment
      where assessment.organization_id = new.organization_id
        and assessment.id = new.diagnostic_assessment_id
        and assessment.startup_id = assignment.startup_id
        and assessment.execution_mode = 'facilitated'
        and assessment.evaluator_id = mentor_user_id
    ) then
      raise exception 'Diagnóstico facilitado não pertence ao mentor e à startup do vínculo' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_mentoring_session_scope() from public, anon, authenticated;
create trigger mentoring_sessions_validate_scope before insert or update of organization_id, incubator_id, assignment_id, diagnostic_assessment_id
on public.mentoring_sessions for each row execute function private.validate_mentoring_session_scope();

create or replace function private.can_access_mentoring_assignment(target_organization_id uuid, target_assignment_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.mentor_startup_assignments assignment
    join public.mentor_profiles profile on profile.organization_id = assignment.organization_id and profile.id = assignment.mentor_profile_id
    where assignment.organization_id = target_organization_id and assignment.id = target_assignment_id
      and (
        private.has_permission(assignment.organization_id, 'mentoring.read', null, assignment.incubator_id)
        or profile.user_id = (select auth.uid())
        or private.can_access_startup(assignment.organization_id, assignment.startup_id, assignment.incubator_id)
      )
  );
$$;
revoke all on function private.can_access_mentoring_assignment(uuid, uuid) from public, anon, authenticated;

create or replace function private.can_access_mentoring_session(target_organization_id uuid, target_session_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.mentoring_sessions session
    where session.organization_id = target_organization_id and session.id = target_session_id
      and private.can_access_mentoring_assignment(session.organization_id, session.assignment_id)
  );
$$;
revoke all on function private.can_access_mentoring_session(uuid, uuid) from public, anon, authenticated;

create or replace function public.create_mentoring_session(
  target_assignment_id uuid,
  session_objective text,
  session_mode public.mentoring_session_mode,
  session_timezone text,
  scheduled_start_local timestamp default null,
  scheduled_end_local timestamp default null,
  session_meeting_url text default null,
  session_location text default null,
  target_diagnostic_assessment_id uuid default null
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare assignment public.mentor_startup_assignments%rowtype;
declare mentor_user_id uuid;
declare may_schedule boolean;
declare start_at timestamptz;
declare end_at timestamptz;
declare new_session_id uuid;
begin
  select * into assignment from public.mentor_startup_assignments
  where id = target_assignment_id and status in ('active', 'paused');
  if not found or not private.can_access_mentoring_assignment(assignment.organization_id, assignment.id) then
    raise exception 'Vínculo de mentoria indisponível' using errcode = '42501';
  end if;
  select user_id into mentor_user_id from public.mentor_profiles
  where organization_id = assignment.organization_id and id = assignment.mentor_profile_id;
  may_schedule := private.has_permission(assignment.organization_id, 'mentoring.manage', null, assignment.incubator_id)
    or mentor_user_id = (select auth.uid());

  if (scheduled_start_local is null) <> (scheduled_end_local is null) then
    raise exception 'Informe início e fim da sessão' using errcode = '23514';
  end if;
  if scheduled_start_local is not null then
    start_at := scheduled_start_local at time zone session_timezone;
    end_at := scheduled_end_local at time zone session_timezone;
    if start_at >= end_at then raise exception 'Período da sessão inválido' using errcode = '23514'; end if;
    if may_schedule and exists (
      select 1 from public.mentoring_sessions existing
      join public.mentor_startup_assignments existing_assignment
        on existing_assignment.organization_id = existing.organization_id and existing_assignment.id = existing.assignment_id
      where existing.organization_id = assignment.organization_id
        and existing_assignment.mentor_profile_id = assignment.mentor_profile_id
        and existing.status = 'scheduled'
        and tstzrange(existing.scheduled_start_at, existing.scheduled_end_at, '[)') && tstzrange(start_at, end_at, '[)')
    ) then raise exception 'O mentor já possui sessão nesse horário' using errcode = '23P01'; end if;
  end if;

  insert into public.mentoring_sessions (
    organization_id, incubator_id, assignment_id, diagnostic_assessment_id,
    requested_by, objective, mode, timezone, scheduled_start_at,
    scheduled_end_at, meeting_url, location, status, created_by
  ) values (
    assignment.organization_id, assignment.incubator_id, assignment.id,
    target_diagnostic_assessment_id, (select auth.uid()), session_objective,
    session_mode, session_timezone, start_at, end_at,
    nullif(session_meeting_url, ''), nullif(session_location, ''),
    case when may_schedule and start_at is not null then 'scheduled'::public.mentoring_session_status else 'requested' end,
    (select auth.uid())
  ) returning id into new_session_id;
  return new_session_id;
end;
$$;
revoke all on function public.create_mentoring_session(uuid, text, public.mentoring_session_mode, text, timestamp, timestamp, text, text, uuid) from public, anon;
grant execute on function public.create_mentoring_session(uuid, text, public.mentoring_session_mode, text, timestamp, timestamp, text, text, uuid) to authenticated;

create or replace function public.update_mentoring_session_status(
  target_session_id uuid,
  requested_status public.mentoring_session_status,
  reason text default null
)
returns void language plpgsql security invoker set search_path = '' as $$
declare target_session public.mentoring_sessions%rowtype;
begin
  select * into target_session from public.mentoring_sessions where id = target_session_id for update;
  if not found or not private.can_access_mentoring_session(target_session.organization_id, target_session.id) then
    raise exception 'Sessão indisponível' using errcode = '42501';
  end if;
  if not private.has_permission(target_session.organization_id, 'mentoring.manage', null, target_session.incubator_id)
    and not exists (
      select 1 from public.mentor_startup_assignments assignment
      join public.mentor_profiles profile on profile.organization_id = assignment.organization_id and profile.id = assignment.mentor_profile_id
      where assignment.organization_id = target_session.organization_id and assignment.id = target_session.assignment_id
        and profile.user_id = (select auth.uid())
    ) then raise exception 'Somente gestor ou mentor pode alterar a sessão' using errcode = '42501';
  end if;
  if target_session.status in ('completed', 'cancelled')
    or requested_status not in ('scheduled', 'completed', 'cancelled') then
    raise exception 'Transição de sessão inválida' using errcode = '23514';
  end if;
  if requested_status = 'scheduled' and target_session.scheduled_start_at is null then
    raise exception 'Defina o horário antes de confirmar' using errcode = '23514';
  end if;
  update public.mentoring_sessions set
    status = requested_status,
    completed_at = case when requested_status = 'completed' then now() else null end,
    cancelled_at = case when requested_status = 'cancelled' then now() else null end,
    cancellation_reason = case when requested_status = 'cancelled' then nullif(btrim(reason), '') else null end
  where id = target_session_id;
end;
$$;
revoke all on function public.update_mentoring_session_status(uuid, public.mentoring_session_status, text) from public, anon;
grant execute on function public.update_mentoring_session_status(uuid, public.mentoring_session_status, text) to authenticated;

do $$ declare table_name text; begin
  foreach table_name in array array['mentor_availability_slots', 'mentoring_sessions', 'mentoring_session_notes', 'mentoring_recommendations'] loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.write_audit_log()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

revoke all on public.mentor_availability_slots, public.mentoring_sessions, public.mentoring_session_notes, public.mentoring_recommendations from public, anon;
grant select, insert, update, delete on public.mentor_availability_slots to authenticated;
grant select, insert, update on public.mentoring_sessions to authenticated;
grant select, insert, update on public.mentoring_session_notes, public.mentoring_recommendations to authenticated;

create policy mentor_availability_select on public.mentor_availability_slots for select to authenticated
using ((select private.can_access_mentor_profile(organization_id, mentor_profile_id, incubator_id)));
create policy mentor_availability_manage on public.mentor_availability_slots for all to authenticated
using (
  (select private.has_permission(organization_id, 'mentoring.manage', null, incubator_id))
  or exists (select 1 from public.mentor_profiles p where p.organization_id = mentor_availability_slots.organization_id and p.id = mentor_profile_id and p.user_id = (select auth.uid()))
)
with check (
  created_by = (select auth.uid()) and (
    (select private.has_permission(organization_id, 'mentoring.manage', null, incubator_id))
    or exists (select 1 from public.mentor_profiles p where p.organization_id = mentor_availability_slots.organization_id and p.id = mentor_profile_id and p.user_id = (select auth.uid()))
  )
);

create policy mentoring_sessions_select on public.mentoring_sessions for select to authenticated
using ((select private.can_access_mentoring_assignment(organization_id, assignment_id)));
create policy mentoring_sessions_insert on public.mentoring_sessions for insert to authenticated
with check (created_by = (select auth.uid()) and requested_by = (select auth.uid()) and (select private.can_access_mentoring_assignment(organization_id, assignment_id)));
create policy mentoring_sessions_update on public.mentoring_sessions for update to authenticated
using (
  (select private.has_permission(organization_id, 'mentoring.manage', null, incubator_id))
  or exists (
    select 1 from public.mentor_startup_assignments a join public.mentor_profiles p on p.organization_id = a.organization_id and p.id = a.mentor_profile_id
    where a.organization_id = mentoring_sessions.organization_id and a.id = assignment_id and p.user_id = (select auth.uid())
  )
)
with check (
  (select private.has_permission(organization_id, 'mentoring.manage', null, incubator_id))
  or exists (
    select 1 from public.mentor_startup_assignments a join public.mentor_profiles p on p.organization_id = a.organization_id and p.id = a.mentor_profile_id
    where a.organization_id = mentoring_sessions.organization_id and a.id = assignment_id and p.user_id = (select auth.uid())
  )
);

create policy mentoring_notes_select on public.mentoring_session_notes for select to authenticated
using (
  (select private.can_access_mentoring_session(organization_id, session_id)) and (
    visibility = 'shared' or author_user_id = (select auth.uid())
    or exists (select 1 from public.mentoring_sessions s where s.organization_id = mentoring_session_notes.organization_id and s.id = session_id and private.has_permission(s.organization_id, 'mentoring.manage', null, s.incubator_id))
  )
);
create policy mentoring_notes_insert on public.mentoring_session_notes for insert to authenticated
with check (
  author_user_id = (select auth.uid())
  and (select private.can_access_mentoring_session(organization_id, session_id))
  and exists (
    select 1 from public.mentoring_sessions session
    where session.organization_id = mentoring_session_notes.organization_id
      and session.id = session_id
      and private.has_permission(session.organization_id, 'mentoring.conduct', null, session.incubator_id)
  )
);
create policy mentoring_notes_update on public.mentoring_session_notes for update to authenticated
using (author_user_id = (select auth.uid())) with check (author_user_id = (select auth.uid()));

create policy mentoring_recommendations_select on public.mentoring_recommendations for select to authenticated
using ((select private.can_access_mentoring_session(organization_id, session_id)));
create policy mentoring_recommendations_insert on public.mentoring_recommendations for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.can_access_mentoring_session(organization_id, session_id))
  and exists (
    select 1 from public.mentoring_sessions session
    where session.organization_id = mentoring_recommendations.organization_id
      and session.id = session_id
      and private.has_permission(session.organization_id, 'mentoring.conduct', null, session.incubator_id)
  )
);
create policy mentoring_recommendations_update on public.mentoring_recommendations for update to authenticated
using (created_by = (select auth.uid()) or exists (select 1 from public.mentoring_sessions s where s.organization_id = mentoring_recommendations.organization_id and s.id = session_id and private.has_permission(s.organization_id, 'mentoring.manage', null, s.incubator_id)))
with check (created_by = (select auth.uid()) or exists (select 1 from public.mentoring_sessions s where s.organization_id = mentoring_recommendations.organization_id and s.id = session_id and private.has_permission(s.organization_id, 'mentoring.manage', null, s.incubator_id)));

comment on table public.mentor_availability_slots is 'Disponibilidade semanal declarada pelo mentor, sem criar eventos externos.';
comment on table public.mentoring_sessions is 'Solicitações e sessões vinculadas a um relacionamento mentor–startup.';
comment on table public.mentoring_session_notes is 'Registros compartilhados ou restritos; RN-012 é aplicada por RLS.';
comment on table public.mentoring_recommendations is 'Recomendações geradas em sessão, preparadas para futura conversão em ação.';
