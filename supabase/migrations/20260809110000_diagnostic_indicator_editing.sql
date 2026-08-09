begin;

-- A CLI não cria migrations no diretório sincronizado pelo OneDrive
-- (LegacyMigrationNewWriteError); arquivo versionado manualmente.
create or replace function public.save_diagnostic_indicator_value(
  target_assessment_id uuid,
  target_indicator_definition_id uuid,
  expected_lock_version bigint,
  target_numeric_value numeric,
  target_target_value numeric default null,
  target_is_not_applicable boolean default false,
  target_not_applicable_justification text default null,
  target_evidence_notes text default ''
)
returns table(indicator_value_id uuid, lock_version bigint, saved_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  assessment public.diagnostic_assessments%rowtype;
  definition public.diagnostic_indicator_definitions%rowtype;
  saved_id uuid;
  saved_timestamp timestamptz := clock_timestamp();
begin
  if actor_id is null then
    raise exception 'Autenticação obrigatória' using errcode = '42501';
  end if;
  select a.* into assessment from public.diagnostic_assessments a
  where a.id = target_assessment_id for update;
  if not found then raise exception 'Diagnóstico não encontrado' using errcode = 'P0002'; end if;
  if not private.can_respond_diagnostic_assessment(target_assessment_id) then
    raise exception 'Você não pode editar indicadores deste diagnóstico' using errcode = '42501';
  end if;
  if assessment.status not in ('draft', 'in_progress') then
    raise exception 'O diagnóstico não aceita indicadores neste estado' using errcode = '23514';
  end if;
  if assessment.lock_version <> expected_lock_version then
    raise exception 'A versão do diagnóstico foi alterada por outra sessão'
      using errcode = '40001', detail = format('expected=%s,current=%s', expected_lock_version, assessment.lock_version);
  end if;

  select d.* into definition from public.diagnostic_indicator_definitions d
  where d.organization_id = assessment.organization_id
    and d.incubator_id = assessment.incubator_id
    and d.template_id = assessment.template_id
    and d.id = target_indicator_definition_id;
  if not found then raise exception 'Indicador não pertence ao diagnóstico' using errcode = '23503'; end if;
  if definition.is_derived then
    raise exception 'Indicadores derivados são calculados pelo sistema' using errcode = '42501';
  end if;
  if target_is_not_applicable and nullif(btrim(coalesce(target_not_applicable_justification, '')), '') is null then
    raise exception 'Justifique por que o indicador não se aplica' using errcode = '23514';
  end if;
  if not target_is_not_applicable and target_numeric_value is null then
    raise exception 'Informe o valor do indicador' using errcode = '23514';
  end if;
  if char_length(coalesce(target_evidence_notes, '')) > 2000 then
    raise exception 'Referência da evidência excede o limite permitido' using errcode = '22001';
  end if;

  insert into public.diagnostic_indicator_values (
    organization_id, incubator_id, assessment_id, indicator_definition_id,
    numeric_value, target_value, is_not_applicable,
    not_applicable_justification, evidence_notes, recorded_by, updated_at
  ) values (
    assessment.organization_id, assessment.incubator_id, assessment.id, definition.id,
    case when target_is_not_applicable then null else target_numeric_value end,
    target_target_value, target_is_not_applicable,
    case when target_is_not_applicable then btrim(target_not_applicable_justification) else null end,
    btrim(coalesce(target_evidence_notes, '')), actor_id, saved_timestamp
  )
  on conflict (assessment_id, indicator_definition_id) do update set
    numeric_value = excluded.numeric_value,
    target_value = excluded.target_value,
    is_not_applicable = excluded.is_not_applicable,
    not_applicable_justification = excluded.not_applicable_justification,
    evidence_notes = excluded.evidence_notes,
    recorded_by = excluded.recorded_by,
    updated_at = excluded.updated_at
  returning id into saved_id;

  update public.diagnostic_assessments
  set status = case when status = 'draft' then 'in_progress' else status end,
      lock_version = diagnostic_assessments.lock_version + 1,
      updated_at = saved_timestamp
  where id = assessment.id
  returning diagnostic_assessments.lock_version into lock_version;

  indicator_value_id := saved_id;
  saved_at := saved_timestamp;
  return next;
end;
$$;

revoke execute on function public.save_diagnostic_indicator_value(
  uuid, uuid, bigint, numeric, numeric, boolean, text, text
) from public, anon;
grant execute on function public.save_diagnostic_indicator_value(
  uuid, uuid, bigint, numeric, numeric, boolean, text, text
) to authenticated;

comment on function public.save_diagnostic_indicator_value(
  uuid, uuid, bigint, numeric, numeric, boolean, text, text
) is 'Registra indicador manual com autorização, escopo e concorrência otimista; indicadores derivados permanecem protegidos.';

commit;
