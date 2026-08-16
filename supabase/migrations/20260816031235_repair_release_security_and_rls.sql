-- Espelha o reparo aplicado em produção após detectar schema drift anterior.
-- Recompila a RPC legada com resolução explícita de conflitos entre variáveis
-- PL/pgSQL e colunas, e mantém tabelas internas inacessíveis diretamente.

do $repair$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.register_cerne_evidence(uuid,text,uuid,text,text,text,text,text,uuid,jsonb,text,uuid)'::regprocedure
  ) into function_definition;

  if position('#variable_conflict use_variable' in function_definition) = 0 then
    function_definition := replace(
      function_definition,
      'AS $function$',
      E'AS $function$\n#variable_conflict use_variable'
    );
    if position('#variable_conflict use_variable' in function_definition) = 0 then
      raise exception 'Não foi possível preparar register_cerne_evidence para recompilação segura';
    end if;
    execute function_definition;
  end if;
end;
$repair$;

do $$ begin
  create policy notification_outbox_no_direct_access
  on public.notification_outbox for all to authenticated
  using (false) with check (false);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy mentoring_cohort_mentors_no_direct_access
  on public.mentoring_cohort_mentors for all to authenticated
  using (false) with check (false);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy mentoring_rounds_no_direct_access
  on public.mentoring_rounds for all to authenticated
  using (false) with check (false);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy mentoring_round_mentors_no_direct_access
  on public.mentoring_round_mentors for all to authenticated
  using (false) with check (false);
exception when duplicate_object then null;
end $$;
