begin;

-- A CLI não conseguiu criar o arquivo dentro do diretório sincronizado pelo
-- OneDrive (LegacyMigrationNewWriteError). A migration permanece versionada
-- manualmente e segue o formato temporal usado pelo projeto.
create or replace function public.autosave_diagnostic_response(
  target_assessment_id uuid,
  target_criterion_id uuid,
  expected_lock_version bigint,
  target_self_value jsonb,
  target_is_not_applicable boolean,
  target_not_applicable_justification text default null,
  target_self_comment text default '',
  target_evidence_notes text default ''
)
returns table(response_id uuid, lock_version bigint, saved_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  assessment public.diagnostic_assessments%rowtype;
  criterion public.diagnostic_criteria%rowtype;
  saved_response_id uuid;
  saved_timestamp timestamptz := clock_timestamp();
begin
  if actor_id is null then
    raise exception 'Autenticação obrigatória' using errcode = '42501';
  end if;

  select a.* into assessment
  from public.diagnostic_assessments a
  where a.id = target_assessment_id
  for update;

  if not found then
    raise exception 'Diagnóstico não encontrado' using errcode = 'P0002';
  end if;
  if not private.can_respond_diagnostic_assessment(target_assessment_id) then
    raise exception 'Você não pode responder este diagnóstico' using errcode = '42501';
  end if;
  if assessment.status not in ('draft', 'in_progress') then
    raise exception 'O diagnóstico não aceita novas respostas neste estado' using errcode = '23514';
  end if;
  if assessment.lock_version <> expected_lock_version then
    raise exception 'A versão do diagnóstico foi alterada por outra sessão'
      using errcode = '40001',
            detail = format('expected=%s,current=%s', expected_lock_version, assessment.lock_version);
  end if;

  select c.* into criterion
  from public.diagnostic_criteria c
  where c.organization_id = assessment.organization_id
    and c.incubator_id = assessment.incubator_id
    and c.template_id = assessment.template_id
    and c.id = target_criterion_id
    and c.archived_at is null;

  if not found then
    raise exception 'Critério não pertence ao diagnóstico' using errcode = '23503';
  end if;
  if char_length(coalesce(target_self_comment, '')) > 2000
    or char_length(coalesce(target_evidence_notes, '')) > 2000
    or char_length(coalesce(target_not_applicable_justification, '')) > 1200 then
    raise exception 'Conteúdo da resposta excede o limite permitido' using errcode = '22001';
  end if;
  if target_is_not_applicable and not criterion.allows_not_applicable then
    raise exception 'Este critério não permite resposta N/A' using errcode = '23514';
  end if;
  if target_is_not_applicable
    and criterion.requires_not_applicable_justification
    and nullif(btrim(coalesce(target_not_applicable_justification, '')), '') is null then
    raise exception 'Justifique por que o critério não se aplica' using errcode = '23514';
  end if;
  if not target_is_not_applicable and target_self_value is null then
    raise exception 'Informe uma resposta' using errcode = '23514';
  end if;

  insert into public.diagnostic_responses (
    organization_id, incubator_id, assessment_id, criterion_id,
    self_value, is_not_applicable, not_applicable_justification,
    self_comment, evidence_notes, updated_at
  ) values (
    assessment.organization_id, assessment.incubator_id,
    assessment.id, criterion.id,
    case when target_is_not_applicable then null else target_self_value end,
    target_is_not_applicable,
    case when target_is_not_applicable
      then nullif(btrim(coalesce(target_not_applicable_justification, '')), '')
      else null end,
    btrim(coalesce(target_self_comment, '')),
    btrim(coalesce(target_evidence_notes, '')),
    saved_timestamp
  )
  on conflict (assessment_id, criterion_id) do update set
    self_value = excluded.self_value,
    is_not_applicable = excluded.is_not_applicable,
    not_applicable_justification = excluded.not_applicable_justification,
    self_comment = excluded.self_comment,
    evidence_notes = excluded.evidence_notes,
    updated_at = excluded.updated_at
  returning id into saved_response_id;

  update public.diagnostic_assessments
  set status = case when status = 'draft' then 'in_progress' else status end,
      lock_version = diagnostic_assessments.lock_version + 1,
      updated_at = saved_timestamp
  where id = assessment.id
  returning diagnostic_assessments.lock_version into lock_version;

  response_id := saved_response_id;
  saved_at := saved_timestamp;
  return next;
end;
$$;

revoke execute on function public.autosave_diagnostic_response(
  uuid, uuid, bigint, jsonb, boolean, text, text, text
) from public, anon;
grant execute on function public.autosave_diagnostic_response(
  uuid, uuid, bigint, jsonb, boolean, text, text, text
) to authenticated;

comment on function public.autosave_diagnostic_response(
  uuid, uuid, bigint, jsonb, boolean, text, text, text
) is 'Salva resposta com bloqueio otimista por avaliação; conflitos nunca sobrescrevem silenciosamente.';

commit;
