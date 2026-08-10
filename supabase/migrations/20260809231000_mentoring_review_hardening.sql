-- Revisão de segurança do módulo de mentorias.
-- O tipo do feedback passa a ser determinado pelo vínculo do usuário com a sessão.

create or replace function public.create_mentoring_feedback(
  target_session_id uuid,
  feedback_rating smallint,
  feedback_strengths text,
  feedback_improvements text,
  share_feedback boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_session public.mentoring_sessions%rowtype;
  target_assignment public.mentor_startup_assignments%rowtype;
  target_kind public.mentoring_feedback_kind;
  new_feedback_id uuid;
begin
  select * into target_session
  from public.mentoring_sessions
  where id = target_session_id;

  if not found
    or target_session.status <> 'completed'
    or not private.can_access_mentoring_session(target_session.organization_id, target_session.id) then
    raise exception 'Sessão indisponível para feedback' using errcode = '42501';
  end if;

  select * into target_assignment
  from public.mentor_startup_assignments
  where organization_id = target_session.organization_id
    and id = target_session.assignment_id;

  if exists (
    select 1 from public.mentor_profiles profile
    where profile.organization_id = target_assignment.organization_id
      and profile.id = target_assignment.mentor_profile_id
      and profile.user_id = (select auth.uid())
  ) then
    target_kind := 'mentor_to_startup';
  elsif exists (
    select 1 from public.startup_members member
    where member.organization_id = target_assignment.organization_id
      and member.startup_id = target_assignment.startup_id
      and member.user_id = (select auth.uid())
      and member.status = 'active'
  ) then
    target_kind := 'startup_to_mentor';
  else
    raise exception 'Somente mentor ou membro ativo da startup pode avaliar a sessão' using errcode = '42501';
  end if;

  if feedback_rating not between 1 and 5
    or char_length(btrim(feedback_strengths)) not between 3 and 2000
    or char_length(btrim(feedback_improvements)) not between 3 and 2000 then
    raise exception 'Feedback inválido' using errcode = '23514';
  end if;

  insert into public.mentoring_feedback (
    organization_id, session_id, author_user_id, kind, rating,
    strengths, improvements, is_shared
  ) values (
    target_session.organization_id, target_session.id, (select auth.uid()),
    target_kind, feedback_rating, btrim(feedback_strengths),
    btrim(feedback_improvements), share_feedback
  )
  returning id into new_feedback_id;

  return new_feedback_id;
end;
$$;

revoke all on function public.create_mentoring_feedback(uuid, smallint, text, text, boolean)
from public, anon;
grant execute on function public.create_mentoring_feedback(uuid, smallint, text, text, boolean)
to authenticated;

revoke insert, update on public.mentoring_feedback from authenticated;

comment on function public.create_mentoring_feedback(uuid, smallint, text, text, boolean) is
  'Registra feedback após sessão concluída e deriva sua direção a partir do mentor ou membro ativo da startup.';
