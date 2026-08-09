begin;

-- Funções citadas por políticas RLS precisam ser executáveis pelo papel que
-- avalia a política. Elas retornam somente booleano, são SECURITY DEFINER e o
-- schema private não é exposto pela API.
grant execute on function private.can_read_diagnostic_assessment(uuid)
  to authenticated;
grant execute on function private.can_respond_diagnostic_assessment(uuid)
  to authenticated;
grant execute on function private.can_validate_diagnostic_assessment(uuid)
  to authenticated;

revoke execute on function private.can_read_diagnostic_assessment(uuid)
  from public, anon;
revoke execute on function private.can_respond_diagnostic_assessment(uuid)
  from public, anon;
revoke execute on function private.can_validate_diagnostic_assessment(uuid)
  from public, anon;

comment on function private.can_read_diagnostic_assessment(uuid) is
  'Helper booleano de RLS; execução restrita a authenticated e sem exposição do conteúdo da aplicação.';

commit;
