begin;

-- Produção recebeu a primeira versão da função antes de o teste transacional
-- detectar a referência residual a diagnostic_criteria.archived_at. Esta
-- correção é idempotente e também é segura em bancos criados do zero.
do $$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.install_diagnostic_demo_cases(uuid)'::regprocedure
  ) into function_definition;

  execute replace(
    function_definition,
    ' and c.archived_at is null',
    ''
  );
end;
$$;

commit;
