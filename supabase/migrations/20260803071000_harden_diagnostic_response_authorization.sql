begin;

-- Respostas e validações compartilham a mesma linha, mas não a mesma autoridade.
-- RLS decide quais linhas são alcançáveis; este trigger impede que um respondente
-- altere a avaliação oficial e que um avaliador reescreva a autoavaliação.
create or replace function private.enforce_diagnostic_response_field_permissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assessment public.diagnostic_assessments%rowtype;
  may_respond boolean;
  may_validate boolean;
  self_fields_changed boolean;
  validation_fields_changed boolean;
begin
  select a.* into assessment
  from public.diagnostic_assessments a
  where a.organization_id = new.organization_id
    and a.id = new.assessment_id;

  if not found then
    raise exception 'Aplicação de diagnóstico inexistente' using errcode = '23503';
  end if;

  may_respond :=
    private.has_permission(
      assessment.organization_id,
      'diagnostic.respond',
      null,
      assessment.incubator_id
    )
    or private.can_manage_startup(
      assessment.organization_id,
      assessment.startup_id,
      assessment.incubator_id
    );
  may_validate := private.has_permission(
    assessment.organization_id,
    'diagnostic.validate',
    null,
    assessment.incubator_id
  );

  if tg_op = 'INSERT' then
    self_fields_changed :=
      new.self_value is not null
      or new.is_not_applicable
      or new.not_applicable_justification is not null
      or new.evidence_notes <> ''
      or new.self_comment <> '';
    validation_fields_changed :=
      new.validated_value is not null
      or new.evaluator_comment <> ''
      or new.validated_by is not null
      or new.validated_at is not null;
  else
    self_fields_changed :=
      (new.self_value, new.is_not_applicable, new.not_applicable_justification,
       new.evidence_notes, new.self_comment)
      is distinct from
      (old.self_value, old.is_not_applicable, old.not_applicable_justification,
       old.evidence_notes, old.self_comment);
    validation_fields_changed :=
      (new.validated_value, new.evaluator_comment, new.validated_by, new.validated_at)
      is distinct from
      (old.validated_value, old.evaluator_comment, old.validated_by, old.validated_at);
  end if;

  if self_fields_changed and not may_respond then
    raise exception 'A autoavaliação exige a permissão diagnostic.respond'
      using errcode = '42501';
  end if;

  if validation_fields_changed and not may_validate then
    raise exception 'A validação exige a permissão diagnostic.validate'
      using errcode = '42501';
  end if;

  if validation_fields_changed and new.validated_by is distinct from (select auth.uid()) then
    raise exception 'O avaliador registrado deve ser o usuário autenticado'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists diagnostic_responses_enforce_field_permissions
  on public.diagnostic_responses;
create trigger diagnostic_responses_enforce_field_permissions
before insert or update on public.diagnostic_responses
for each row execute function private.enforce_diagnostic_response_field_permissions();

-- Totais são dados derivados. Eles passam a ser calculados exclusivamente no
-- banco após mudanças nas respostas e deixam de ser graváveis pelo cliente.
create or replace function private.recompute_diagnostic_assessment_scores(
  target_assessment_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  calculated_self_score numeric(8,3);
  calculated_validated_score numeric(8,3);
begin
  select round(
    5 * sum(((r.self_value #>> '{}')::numeric / c.maximum_score) * c.weight)
      / nullif(sum(c.weight), 0),
    3
  )
  into calculated_self_score
  from public.diagnostic_responses r
  join public.diagnostic_criteria c
    on c.organization_id = r.organization_id and c.id = r.criterion_id
  where r.assessment_id = target_assessment_id
    and not r.is_not_applicable
    and jsonb_typeof(r.self_value) = 'number';

  select round(
    5 * sum(((r.validated_value #>> '{}')::numeric / c.maximum_score) * c.weight)
      / nullif(sum(c.weight), 0),
    3
  )
  into calculated_validated_score
  from public.diagnostic_responses r
  join public.diagnostic_criteria c
    on c.organization_id = r.organization_id and c.id = r.criterion_id
  where r.assessment_id = target_assessment_id
    and not r.is_not_applicable
    and jsonb_typeof(r.validated_value) = 'number';

  update public.diagnostic_assessments
  set self_score = calculated_self_score,
      validated_score = calculated_validated_score
  where id = target_assessment_id;
end;
$$;

create or replace function private.refresh_diagnostic_assessment_scores()
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

drop trigger if exists diagnostic_responses_refresh_scores
  on public.diagnostic_responses;
create trigger diagnostic_responses_refresh_scores
after insert or update or delete on public.diagnostic_responses
for each row execute function private.refresh_diagnostic_assessment_scores();

revoke update (self_score, validated_score)
  on public.diagnostic_assessments from authenticated;

revoke execute on function private.enforce_diagnostic_response_field_permissions()
  from public, anon, authenticated;
revoke execute on function private.recompute_diagnostic_assessment_scores(uuid)
  from public, anon, authenticated;
revoke execute on function private.refresh_diagnostic_assessment_scores()
  from public, anon, authenticated;

comment on function private.enforce_diagnostic_response_field_permissions() is
  'Impõe autorização por grupo de colunas: respondentes não validam e avaliadores não reescrevem a autoavaliação.';
comment on function private.recompute_diagnostic_assessment_scores(uuid) is
  'Recalcula os totais derivados no banco; não é executável por clientes.';

commit;
