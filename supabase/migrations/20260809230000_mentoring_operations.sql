-- Operação completa de mentorias: reagendamento, feedback e ciclo de recomendações.

do $$ begin
  create type public.mentoring_feedback_kind as enum ('mentor_to_startup', 'startup_to_mentor');
exception when duplicate_object then null;
end $$;

create table if not exists public.mentoring_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  session_id uuid not null,
  author_user_id uuid not null references auth.users (id),
  kind public.mentoring_feedback_kind not null,
  rating smallint not null,
  strengths text not null,
  improvements text not null,
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mentoring_feedback_session_same_org foreign key (organization_id, session_id)
    references public.mentoring_sessions (organization_id, id) on delete cascade,
  constraint mentoring_feedback_rating_valid check (rating between 1 and 5),
  constraint mentoring_feedback_strengths_valid check (char_length(btrim(strengths)) between 3 and 2000),
  constraint mentoring_feedback_improvements_valid check (char_length(btrim(improvements)) between 3 and 2000),
  constraint mentoring_feedback_author_unique unique (organization_id, session_id, author_user_id)
);

create index if not exists mentoring_feedback_session_idx
  on public.mentoring_feedback (organization_id, session_id, created_at);

create or replace function public.reschedule_mentoring_session(
  target_session_id uuid,
  scheduled_start_local timestamp,
  scheduled_end_local timestamp,
  session_timezone text
)
returns void language plpgsql security invoker set search_path = '' as $$
declare target_session public.mentoring_sessions%rowtype;
declare assignment public.mentor_startup_assignments%rowtype;
declare start_at timestamptz;
declare end_at timestamptz;
begin
  select * into target_session from public.mentoring_sessions where id = target_session_id for update;
  if not found or not private.can_access_mentoring_session(target_session.organization_id, target_session.id) then
    raise exception 'Sessão indisponível' using errcode = '42501';
  end if;
  if not private.has_permission(target_session.organization_id, 'mentoring.manage', null, target_session.incubator_id)
     and not exists (
       select 1 from public.mentor_startup_assignments a
       join public.mentor_profiles p on p.organization_id = a.organization_id and p.id = a.mentor_profile_id
       where a.organization_id = target_session.organization_id and a.id = target_session.assignment_id and p.user_id = (select auth.uid())
     ) then raise exception 'Somente gestor ou mentor pode reagendar' using errcode = '42501'; end if;
  if target_session.status in ('completed', 'cancelled') then
    raise exception 'Sessão encerrada não pode ser reagendada' using errcode = '23514';
  end if;
  if scheduled_start_local >= scheduled_end_local then raise exception 'Período inválido' using errcode = '23514'; end if;
  start_at := scheduled_start_local at time zone session_timezone;
  end_at := scheduled_end_local at time zone session_timezone;
  select * into assignment from public.mentor_startup_assignments where organization_id = target_session.organization_id and id = target_session.assignment_id;
  if exists (
    select 1 from public.mentoring_sessions existing
    join public.mentor_startup_assignments a on a.organization_id = existing.organization_id and a.id = existing.assignment_id
    where existing.organization_id = target_session.organization_id and existing.id <> target_session.id
      and a.mentor_profile_id = assignment.mentor_profile_id and existing.status = 'scheduled'
      and tstzrange(existing.scheduled_start_at, existing.scheduled_end_at, '[)') && tstzrange(start_at, end_at, '[)')
  ) then raise exception 'O mentor já possui sessão nesse horário' using errcode = '23P01'; end if;
  update public.mentoring_sessions set
    timezone = session_timezone, scheduled_start_at = start_at, scheduled_end_at = end_at,
    status = 'scheduled', cancellation_reason = null, cancelled_at = null
  where id = target_session.id;
end;
$$;
revoke all on function public.reschedule_mentoring_session(uuid, timestamp, timestamp, text) from public, anon;
grant execute on function public.reschedule_mentoring_session(uuid, timestamp, timestamp, text) to authenticated;

do $$ declare table_name text; begin
  foreach table_name in array array['mentoring_feedback'] loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.write_audit_log()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

revoke all on public.mentoring_feedback from public, anon;
grant select, insert, update on public.mentoring_feedback to authenticated;

create policy mentoring_feedback_select on public.mentoring_feedback for select to authenticated
using ((select private.can_access_mentoring_session(organization_id, session_id)) and (is_shared or author_user_id = (select auth.uid()) or private.has_permission(organization_id, 'mentoring.manage', null, (select incubator_id from public.mentoring_sessions where organization_id = mentoring_feedback.organization_id and id = session_id))));
create policy mentoring_feedback_insert on public.mentoring_feedback for insert to authenticated
with check (author_user_id = (select auth.uid()) and (select private.can_access_mentoring_session(organization_id, session_id)) and exists (select 1 from public.mentoring_sessions s where s.organization_id = mentoring_feedback.organization_id and s.id = session_id and s.status = 'completed'));
create policy mentoring_feedback_update on public.mentoring_feedback for update to authenticated
using (author_user_id = (select auth.uid())) with check (author_user_id = (select auth.uid()));
