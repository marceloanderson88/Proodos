-- Permite que políticas RLS de mentorias avaliem seus helpers security definer.

begin;

revoke all on function private.can_access_mentor_profile(uuid, uuid, uuid)
  from public, anon;
revoke all on function private.can_access_mentoring_assignment(uuid, uuid)
  from public, anon;
revoke all on function private.can_access_mentoring_session(uuid, uuid)
  from public, anon;

grant execute on function private.can_access_mentor_profile(uuid, uuid, uuid)
  to authenticated;
grant execute on function private.can_access_mentoring_assignment(uuid, uuid)
  to authenticated;
grant execute on function private.can_access_mentoring_session(uuid, uuid)
  to authenticated;

comment on function private.can_access_mentor_profile(uuid, uuid, uuid) is
  'Helper security definer usado por políticas RLS; executável somente por usuários autenticados.';
comment on function private.can_access_mentoring_assignment(uuid, uuid) is
  'Helper security definer usado por políticas RLS; executável somente por usuários autenticados.';
comment on function private.can_access_mentoring_session(uuid, uuid) is
  'Helper security definer usado por políticas RLS; executável somente por usuários autenticados.';

commit;
