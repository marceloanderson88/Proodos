begin;

-- Pontuações e riscos são sempre derivados no banco. O cliente não recebe
-- permissão para gravar os agregados oficiais.
create or replace function private.diagnostic_rule_matches(
  rule_operator public.diagnostic_trigger_operator,
  observed numeric,
  threshold numeric
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case rule_operator
    when 'lt' then observed < threshold
    when 'lte' then observed <= threshold
    when 'eq' then observed = threshold
    when 'gte' then observed >= threshold
    when 'gt' then observed > threshold
  end;
$$;

create or replace function private.recompute_diagnostic_assessment_scores(
  target_assessment_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_assessment public.diagnostic_assessments%rowtype;
  calculated_self_score numeric(8,3);
  calculated_validated_score numeric(8,3);
  calculated_average_gap numeric(8,3);
  calculated_evidence_coverage numeric(8,3);
  calculated_classification text;
  rule_record record;
  observed numeric(18,4);
  result_status public.diagnostic_trigger_result_status;
begin
  select * into target_assessment
  from public.diagnostic_assessments
  where id = target_assessment_id;

  if not found then
    return;
  end if;

  insert into public.diagnostic_dimension_scores (
    organization_id,
    incubator_id,
    assessment_id,
    dimension_id,
    self_score,
    validated_score,
    effective_weight,
    applicable_criteria,
    answered_criteria,
    validated_criteria,
    calculated_at
  )
  select
    target_assessment.organization_id,
    target_assessment.incubator_id,
    target_assessment.id,
    d.id,
    case when count(r.id) filter (
      where not coalesce(r.is_not_applicable, false)
        and jsonb_typeof(r.self_value) = 'number'
    ) = 0 then null else round(
      100 * sum(
        case
          when not coalesce(r.is_not_applicable, false)
            and jsonb_typeof(r.self_value) = 'number'
          then least(greatest((r.self_value #>> '{}')::numeric, 0), c.maximum_score)
            / c.maximum_score * c.weight
          else 0
        end
      ) / nullif(sum(c.weight) filter (where not coalesce(r.is_not_applicable, false)), 0),
      3
    ) end,
    case when count(r.id) filter (
      where not coalesce(r.is_not_applicable, false)
        and jsonb_typeof(r.validated_value) = 'number'
    ) = 0 then null else round(
      100 * sum(
        case
          when not coalesce(r.is_not_applicable, false)
            and jsonb_typeof(r.validated_value) = 'number'
          then least(greatest((r.validated_value #>> '{}')::numeric, 0), c.maximum_score)
            / c.maximum_score * c.weight
          else 0
        end
      ) / nullif(sum(c.weight) filter (where not coalesce(r.is_not_applicable, false)), 0),
      3
    ) end,
    d.weight,
    count(c.id) filter (where not coalesce(r.is_not_applicable, false)),
    count(r.id) filter (
      where not coalesce(r.is_not_applicable, false)
        and jsonb_typeof(r.self_value) = 'number'
    ),
    count(r.id) filter (
      where not coalesce(r.is_not_applicable, false)
        and jsonb_typeof(r.validated_value) = 'number'
    ),
    now()
  from public.diagnostic_dimensions d
  join public.diagnostic_criteria c
    on c.organization_id = d.organization_id
    and c.dimension_id = d.id
  left join public.diagnostic_responses r
    on r.organization_id = target_assessment.organization_id
    and r.assessment_id = target_assessment.id
    and r.criterion_id = c.id
  where d.organization_id = target_assessment.organization_id
    and d.template_id = target_assessment.template_id
  group by d.id, d.weight
  on conflict (assessment_id, dimension_id) do update
  set self_score = excluded.self_score,
      validated_score = excluded.validated_score,
      effective_weight = excluded.effective_weight,
      applicable_criteria = excluded.applicable_criteria,
      answered_criteria = excluded.answered_criteria,
      validated_criteria = excluded.validated_criteria,
      calculated_at = excluded.calculated_at;

  select
    case when count(*) filter (where self_score is not null) = 0 then null
      else round(sum(coalesce(self_score, 0) * effective_weight) / nullif(sum(effective_weight), 0), 3)
    end,
    case when count(*) filter (where validated_score is not null) = 0 then null
      else round(sum(coalesce(validated_score, 0) * effective_weight) / nullif(sum(effective_weight), 0), 3)
    end
  into calculated_self_score, calculated_validated_score
  from public.diagnostic_dimension_scores
  where assessment_id = target_assessment.id;

  select round(avg(abs(
    (r.self_value #>> '{}')::numeric - (r.validated_value #>> '{}')::numeric
  )), 3)
  into calculated_average_gap
  from public.diagnostic_responses r
  where r.assessment_id = target_assessment.id
    and not r.is_not_applicable
    and jsonb_typeof(r.self_value) = 'number'
    and jsonb_typeof(r.validated_value) = 'number';

  select case when count(*) = 0 then null else round(
    100 * count(*) filter (
      where nullif(btrim(r.evidence_notes), '') is not null
        or exists (
          select 1
          from public.diagnostic_response_evidence e
          where e.organization_id = r.organization_id
            and e.response_id = r.id
            and e.status = 'active'
        )
    ) / count(*)::numeric,
    3
  ) end
  into calculated_evidence_coverage
  from public.diagnostic_responses r
  join public.diagnostic_criteria c
    on c.organization_id = r.organization_id
    and c.id = r.criterion_id
  where r.assessment_id = target_assessment.id
    and not r.is_not_applicable
    and c.evidence_required_from is not null
    and greatest(
      case when jsonb_typeof(r.self_value) = 'number' then (r.self_value #>> '{}')::numeric else -1 end,
      case when jsonb_typeof(r.validated_value) = 'number' then (r.validated_value #>> '{}')::numeric else -1 end
    ) >= c.evidence_required_from;

  select cr.code into calculated_classification
  from public.diagnostic_classification_ranges cr
  where cr.organization_id = target_assessment.organization_id
    and cr.template_id = target_assessment.template_id
    and round(coalesce(calculated_validated_score, calculated_self_score), 0)
      between cr.minimum_score and cr.maximum_score
  order by cr.position
  limit 1;

  update public.diagnostic_assessments
  set self_score = calculated_self_score,
      validated_score = calculated_validated_score,
      average_gap = calculated_average_gap,
      evidence_coverage = calculated_evidence_coverage,
      classification_code = calculated_classification
  where id = target_assessment.id;

  for rule_record in
    select tr.*
    from public.diagnostic_trigger_rules tr
    where tr.organization_id = target_assessment.organization_id
      and tr.template_id = target_assessment.template_id
  loop
    observed := null;

    if rule_record.source_type = 'criterion' then
      select case
        when jsonb_typeof(r.validated_value) = 'number' then (r.validated_value #>> '{}')::numeric
        when jsonb_typeof(r.self_value) = 'number' then (r.self_value #>> '{}')::numeric
        else null
      end
      into observed
      from public.diagnostic_responses r
      where r.assessment_id = target_assessment.id
        and r.criterion_id = rule_record.criterion_id
        and not r.is_not_applicable;
    elsif rule_record.source_type = 'indicator' then
      select iv.numeric_value into observed
      from public.diagnostic_indicator_values iv
      where iv.assessment_id = target_assessment.id
        and iv.indicator_definition_id = rule_record.indicator_definition_id
        and not iv.is_not_applicable;
    elsif rule_record.aggregate_key = 'average_gap' then
      observed := calculated_average_gap;
    elsif rule_record.aggregate_key = 'evidence_coverage' then
      observed := calculated_evidence_coverage;
    elsif rule_record.aggregate_key = 'validated_score' then
      observed := calculated_validated_score;
    elsif rule_record.aggregate_key = 'self_score' then
      observed := calculated_self_score;
    end if;

    result_status := case
      when observed is null then 'no_data'::public.diagnostic_trigger_result_status
      when private.diagnostic_rule_matches(rule_record.operator, observed, rule_record.threshold)
        then 'triggered'::public.diagnostic_trigger_result_status
      else 'clear'::public.diagnostic_trigger_result_status
    end;

    insert into public.diagnostic_trigger_results (
      organization_id, incubator_id, assessment_id, trigger_rule_id,
      status, observed_value, message, evaluated_at
    ) values (
      target_assessment.organization_id, target_assessment.incubator_id,
      target_assessment.id, rule_record.id, result_status, observed,
      rule_record.message, now()
    )
    on conflict (assessment_id, trigger_rule_id) do update
    set status = excluded.status,
        observed_value = excluded.observed_value,
        message = excluded.message,
        evaluated_at = excluded.evaluated_at;
  end loop;
end;
$$;

create or replace function private.refresh_diagnostic_assessment_from_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_assessment_id uuid;
begin
  select r.assessment_id into target_assessment_id
  from public.diagnostic_responses r
  where r.id = coalesce(new.response_id, old.response_id);

  perform private.recompute_diagnostic_assessment_scores(target_assessment_id);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.refresh_diagnostic_assessment_from_indicator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.recompute_diagnostic_assessment_scores(
    case when tg_op = 'DELETE' then old.assessment_id else new.assessment_id end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists diagnostic_response_evidence_refresh_scores
  on public.diagnostic_response_evidence;
create trigger diagnostic_response_evidence_refresh_scores
after insert or update or delete on public.diagnostic_response_evidence
for each row execute function private.refresh_diagnostic_assessment_from_evidence();

drop trigger if exists diagnostic_indicator_values_refresh_scores
  on public.diagnostic_indicator_values;
create trigger diagnostic_indicator_values_refresh_scores
after insert or update or delete on public.diagnostic_indicator_values
for each row execute function private.refresh_diagnostic_assessment_from_indicator();

-- Recalcula aplicações existentes para migrar a escala legada 0–5 para 0–100.
do $$
declare
  assessment_record record;
begin
  for assessment_record in select id from public.diagnostic_assessments loop
    perform private.recompute_diagnostic_assessment_scores(assessment_record.id);
  end loop;
end $$;

revoke execute on function private.diagnostic_rule_matches(
  public.diagnostic_trigger_operator, numeric, numeric
) from public, anon, authenticated;
revoke execute on function private.recompute_diagnostic_assessment_scores(uuid)
  from public, anon, authenticated;
revoke execute on function private.refresh_diagnostic_assessment_from_evidence()
  from public, anon, authenticated;
revoke execute on function private.refresh_diagnostic_assessment_from_indicator()
  from public, anon, authenticated;

comment on function private.recompute_diagnostic_assessment_scores(uuid) is
  'Calcula notas 0–100 por dimensão e geral, classificação, gap, cobertura de evidências e gatilhos no banco.';

commit;
