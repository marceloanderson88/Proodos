begin;

-- A CLI não cria migrations no diretório sincronizado pelo OneDrive
-- (LegacyMigrationNewWriteError); arquivo versionado manualmente.
create or replace function private.recompute_diagnostic_derived_indicators(
  target_assessment_id uuid,
  actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_assessment public.diagnostic_assessments%rowtype;
  definition record;
  cash_available numeric;
  monthly_burn numeric;
  last_month_revenue numeric;
  active_paying_customers numeric;
  calculated_value numeric;
begin
  select a.* into target_assessment
  from public.diagnostic_assessments a
  where a.id = target_assessment_id;
  if not found then return; end if;

  select
    max(iv.numeric_value) filter (where d.code = 'cash_available'),
    max(iv.numeric_value) filter (where d.code = 'monthly_burn'),
    max(iv.numeric_value) filter (where d.code = 'last_month_revenue'),
    max(iv.numeric_value) filter (where d.code = 'active_paying_customers')
  into cash_available, monthly_burn, last_month_revenue, active_paying_customers
  from public.diagnostic_indicator_values iv
  join public.diagnostic_indicator_definitions d
    on d.id = iv.indicator_definition_id
   and d.organization_id = iv.organization_id
  where iv.assessment_id = target_assessment.id
    and not iv.is_not_applicable;

  for definition in
    select d.id, d.formula_key
    from public.diagnostic_indicator_definitions d
    where d.organization_id = target_assessment.organization_id
      and d.incubator_id = target_assessment.incubator_id
      and d.template_id = target_assessment.template_id
      and d.is_derived
  loop
    calculated_value := case definition.formula_key
      when 'cash_divided_by_burn' then cash_available / nullif(monthly_burn, 0)
      when 'revenue_divided_by_customers' then last_month_revenue / nullif(active_paying_customers, 0)
      else null
    end;

    if calculated_value is null then
      delete from public.diagnostic_indicator_values iv
      where iv.assessment_id = target_assessment.id
        and iv.indicator_definition_id = definition.id;
    else
      insert into public.diagnostic_indicator_values (
        organization_id, incubator_id, assessment_id,
        indicator_definition_id, numeric_value, target_value,
        is_not_applicable, not_applicable_justification,
        evidence_notes, recorded_by
      ) values (
        target_assessment.organization_id, target_assessment.incubator_id,
        target_assessment.id, definition.id, calculated_value, null,
        false, null, 'Calculado automaticamente a partir dos indicadores de origem.',
        actor_id
      )
      on conflict (assessment_id, indicator_definition_id) do update set
        numeric_value = excluded.numeric_value,
        target_value = null,
        is_not_applicable = false,
        not_applicable_justification = null,
        evidence_notes = excluded.evidence_notes,
        recorded_by = excluded.recorded_by,
        updated_at = now()
      where public.diagnostic_indicator_values.numeric_value
        is distinct from excluded.numeric_value;
    end if;
  end loop;
end;
$$;

create or replace function private.refresh_diagnostic_derived_indicators()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_definition_id uuid := case when tg_op = 'DELETE'
    then old.indicator_definition_id else new.indicator_definition_id end;
  changed_assessment_id uuid := case when tg_op = 'DELETE'
    then old.assessment_id else new.assessment_id end;
  changed_by uuid := case when tg_op = 'DELETE'
    then old.recorded_by else new.recorded_by end;
  derived boolean;
begin
  select d.is_derived into derived
  from public.diagnostic_indicator_definitions d
  where d.id = changed_definition_id;
  if coalesce(derived, false) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  perform private.recompute_diagnostic_derived_indicators(
    changed_assessment_id,
    changed_by
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists diagnostic_indicator_values_derive
  on public.diagnostic_indicator_values;
create trigger diagnostic_indicator_values_derive
after insert or update or delete on public.diagnostic_indicator_values
for each row execute function private.refresh_diagnostic_derived_indicators();

do $$
declare
  assessment record;
begin
  for assessment in
    select id, started_by from public.diagnostic_assessments
  loop
    perform private.recompute_diagnostic_derived_indicators(
      assessment.id,
      assessment.started_by
    );
  end loop;
end $$;

revoke execute on function private.recompute_diagnostic_derived_indicators(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function private.refresh_diagnostic_derived_indicators()
  from public, anon, authenticated;

comment on function private.recompute_diagnostic_derived_indicators(uuid, uuid)
  is 'Calcula somente fórmulas de indicadores derivadas conhecidas, com divisão segura por zero.';

commit;
