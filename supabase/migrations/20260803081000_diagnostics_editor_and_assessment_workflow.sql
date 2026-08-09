begin;

-- O comando `supabase migration new` 2.111.0 falhou neste workspace do
-- OneDrive com LegacyMigrationNewWriteError; o arquivo mantém a mesma
-- convenção cronológica usada pelo projeto.

create or replace function private.can_respond_diagnostic_assessment(target_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.diagnostic_assessments a
    where a.id = target_assessment_id
      and a.status in ('draft', 'in_progress')
      and (
        private.can_manage_startup(a.organization_id, a.startup_id, a.incubator_id)
        or (
          private.has_permission(a.organization_id, 'diagnostic.respond', null, a.incubator_id)
          and exists (
            select 1 from public.diagnostic_respondents dr
            where dr.organization_id = a.organization_id
              and dr.assessment_id = a.id
              and dr.user_id = (select auth.uid())
              and dr.role in ('primary', 'collaborator')
              and dr.revoked_at is null
          )
        )
      )
  );
$$;

create or replace function private.can_validate_diagnostic_assessment(target_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.diagnostic_assessments a
    left join public.diagnostic_campaign_startups cs
      on cs.organization_id = a.organization_id and cs.id = a.campaign_startup_id
    where a.id = target_assessment_id
      and a.status in ('submitted', 'under_review')
      and private.has_permission(a.organization_id, 'diagnostic.validate', null, a.incubator_id)
      and (
        private.has_permission(a.organization_id, 'diagnostic.manage', null, a.incubator_id)
        or a.evaluator_id = (select auth.uid())
        or cs.evaluator_id = (select auth.uid())
      )
  );
$$;

create or replace function public.create_diagnostic_template_draft(
  target_incubator_id uuid,
  template_name text,
  template_description text default '',
  template_instructions text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_organization_id uuid;
  created_family_id uuid := gen_random_uuid();
  created_template_id uuid;
begin
  if actor_id is null then
    raise exception 'Autenticação obrigatória' using errcode = '42501';
  end if;

  select i.organization_id into target_organization_id
  from public.incubators i
  where i.id = target_incubator_id and i.deleted_at is null;

  if target_organization_id is null or not private.has_permission(
    target_organization_id, 'diagnostic.manage', null, target_incubator_id
  ) then
    raise exception 'Incubadora inexistente ou sem permissão' using errcode = '42501';
  end if;

  if nullif(btrim(template_name), '') is null or char_length(btrim(template_name)) > 160 then
    raise exception 'Nome do modelo inválido' using errcode = '23514';
  end if;

  insert into public.diagnostic_template_families (
    id, organization_id, incubator_id, code, name, description,
    scope, is_standard, created_by
  ) values (
    created_family_id, target_organization_id, target_incubator_id,
    'modelo-' || substr(replace(created_family_id::text, '-', ''), 1, 12),
    btrim(template_name), coalesce(btrim(template_description), ''),
    'incubator', false, actor_id
  );

  insert into public.diagnostic_templates (
    organization_id, incubator_id, family_id, version, version_label,
    name, description, instructions, status, created_by
  ) values (
    target_organization_id, target_incubator_id, created_family_id,
    1, '1.0', btrim(template_name), coalesce(btrim(template_description), ''),
    coalesce(btrim(template_instructions), ''), 'draft', actor_id
  ) returning id into created_template_id;

  insert into public.diagnostic_classification_ranges (
    organization_id, incubator_id, template_id, code, label,
    minimum_score, maximum_score, color_token, position
  ) values
    (target_organization_id, target_incubator_id, created_template_id, 'incipiente', 'Incipiente', 0, 19, 'critical', 0),
    (target_organization_id, target_incubator_id, created_template_id, 'em_formacao', 'Em formação', 20, 39, 'warning', 1),
    (target_organization_id, target_incubator_id, created_template_id, 'estruturado', 'Estruturado', 40, 59, 'attention', 2),
    (target_organization_id, target_incubator_id, created_template_id, 'consolidado', 'Consolidado', 60, 79, 'positive', 3),
    (target_organization_id, target_incubator_id, created_template_id, 'referencia', 'Referência', 80, 100, 'success', 4);

  return created_template_id;
end;
$$;

create or replace function public.add_diagnostic_dimension(
  target_template_id uuid,
  dimension_code text,
  dimension_name text,
  dimension_description text,
  dimension_weight numeric,
  dimension_is_essential boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  template public.diagnostic_templates%rowtype;
  created_id uuid;
  next_position integer;
begin
  select * into template from public.diagnostic_templates t
  where t.id = target_template_id for update;
  if not found or not private.has_permission(
    template.organization_id, 'diagnostic.manage', null, template.incubator_id
  ) then
    raise exception 'Modelo inexistente ou sem permissão' using errcode = '42501';
  end if;
  if template.status <> 'draft' then
    raise exception 'Somente rascunhos podem ser editados' using errcode = '23514';
  end if;
  if dimension_code !~ '^[A-Z][A-Z0-9]{0,9}$' then
    raise exception 'Código da dimensão inválido' using errcode = '23514';
  end if;
  if nullif(btrim(dimension_name), '') is null or dimension_weight <= 0 or dimension_weight > 100 then
    raise exception 'Dados da dimensão inválidos' using errcode = '23514';
  end if;

  select coalesce(max(d.position), -1) + 1 into next_position
  from public.diagnostic_dimensions d where d.template_id = target_template_id;

  insert into public.diagnostic_dimensions (
    organization_id, incubator_id, template_id, code, name, description,
    weight, is_essential, position
  ) values (
    template.organization_id, template.incubator_id, template.id,
    upper(btrim(dimension_code)), btrim(dimension_name),
    coalesce(btrim(dimension_description), ''), dimension_weight,
    dimension_is_essential, next_position
  ) returning id into created_id;
  return created_id;
end;
$$;

create or replace function public.add_diagnostic_criterion_with_rubric(
  target_dimension_id uuid,
  criterion_code text,
  criterion_prompt text,
  criterion_help_text text,
  criterion_weight numeric,
  criterion_allows_na boolean,
  criterion_requires_na_justification boolean,
  criterion_evidence_required_from numeric,
  rubric_descriptions text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  dimension public.diagnostic_dimensions%rowtype;
  template_status public.diagnostic_template_status;
  created_id uuid;
  next_position integer;
  rubric_labels constant text[] := array['Inexistente', 'Iniciado', 'Estruturado', 'Validado', 'Sistematizado'];
  rubric_index integer;
begin
  select d.* into dimension from public.diagnostic_dimensions d
  where d.id = target_dimension_id for update;
  if not found or not private.has_permission(
    dimension.organization_id, 'diagnostic.manage', null, dimension.incubator_id
  ) then
    raise exception 'Dimensão inexistente ou sem permissão' using errcode = '42501';
  end if;
  select t.status into template_status from public.diagnostic_templates t where t.id = dimension.template_id;
  if template_status <> 'draft' then
    raise exception 'Somente rascunhos podem ser editados' using errcode = '23514';
  end if;
  if criterion_code !~ '^[A-Z][A-Z0-9]{0,11}$' or nullif(btrim(criterion_prompt), '') is null then
    raise exception 'Código ou pergunta inválidos' using errcode = '23514';
  end if;
  if cardinality(rubric_descriptions) <> 5 or exists (
    select 1 from unnest(rubric_descriptions) value where nullif(btrim(value), '') is null
  ) then
    raise exception 'A rubrica precisa descrever os cinco níveis de 0 a 4' using errcode = '23514';
  end if;

  select coalesce(max(c.position), -1) + 1 into next_position
  from public.diagnostic_criteria c where c.dimension_id = target_dimension_id;

  insert into public.diagnostic_criteria (
    organization_id, incubator_id, template_id, dimension_id, code, prompt,
    help_text, response_type, weight, maximum_score, is_required,
    allows_not_applicable, requires_not_applicable_justification,
    evidence_required_from, position
  ) values (
    dimension.organization_id, dimension.incubator_id, dimension.template_id,
    dimension.id, upper(btrim(criterion_code)), btrim(criterion_prompt),
    coalesce(btrim(criterion_help_text), ''), 'numeric', criterion_weight, 4,
    true, criterion_allows_na,
    criterion_allows_na and criterion_requires_na_justification,
    criterion_evidence_required_from, next_position
  ) returning id into created_id;

  for rubric_index in 1..5 loop
    insert into public.diagnostic_criterion_levels (
      organization_id, incubator_id, template_id, criterion_id,
      score, label, description, position
    ) values (
      dimension.organization_id, dimension.incubator_id, dimension.template_id,
      created_id, rubric_index - 1, rubric_labels[rubric_index],
      btrim(rubric_descriptions[rubric_index]), rubric_index - 1
    );
  end loop;
  return created_id;
end;
$$;

create or replace function public.duplicate_diagnostic_template_version(
  source_template_id uuid,
  new_version_label text default null,
  version_changelog text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_template public.diagnostic_templates%rowtype;
  created_template_id uuid;
  next_version integer;
  source_dimension record;
  source_criterion record;
  source_indicator record;
  created_dimension_id uuid;
  created_criterion_id uuid;
  created_indicator_id uuid;
  criterion_map jsonb := '{}'::jsonb;
  indicator_map jsonb := '{}'::jsonb;
begin
  select * into source_template from public.diagnostic_templates t
  where t.id = source_template_id;
  if not found or not private.has_permission(
    source_template.organization_id, 'diagnostic.manage', null, source_template.incubator_id
  ) then
    raise exception 'Versão inexistente ou sem permissão' using errcode = '42501';
  end if;
  if source_template.status <> 'published' then
    raise exception 'A nova versão deve partir de uma versão publicada' using errcode = '23514';
  end if;

  select coalesce(max(t.version), 0) + 1 into next_version
  from public.diagnostic_templates t where t.family_id = source_template.family_id;

  insert into public.diagnostic_templates (
    organization_id, incubator_id, family_id, version, version_label,
    name, description, instructions, status, changelog, based_on_version_id, created_by
  ) values (
    source_template.organization_id, source_template.incubator_id,
    source_template.family_id, next_version,
    coalesce(nullif(btrim(new_version_label), ''), next_version::text || '.0'),
    source_template.name, source_template.description, source_template.instructions,
    'draft', coalesce(btrim(version_changelog), ''), source_template.id, auth.uid()
  ) returning id into created_template_id;

  for source_dimension in
    select * from public.diagnostic_dimensions d
    where d.template_id = source_template.id order by d.position
  loop
    insert into public.diagnostic_dimensions (
      organization_id, incubator_id, template_id, code, name, description,
      weight, position, is_essential
    ) values (
      source_dimension.organization_id, source_dimension.incubator_id,
      created_template_id, source_dimension.code, source_dimension.name,
      source_dimension.description, source_dimension.weight,
      source_dimension.position, source_dimension.is_essential
    ) returning id into created_dimension_id;

    insert into public.diagnostic_dimension_stages (organization_id, template_id, dimension_id, stage)
    select organization_id, created_template_id, created_dimension_id, stage
    from public.diagnostic_dimension_stages where dimension_id = source_dimension.id;

    for source_criterion in
      select * from public.diagnostic_criteria c
      where c.dimension_id = source_dimension.id order by c.position
    loop
      insert into public.diagnostic_criteria (
        organization_id, incubator_id, template_id, dimension_id, code, prompt,
        help_text, response_type, weight, maximum_score, is_required,
        allows_not_applicable, evidence_required_from, options, rubric, position,
        requires_not_applicable_justification, not_applicable_guidance, internal_notes
      ) values (
        source_criterion.organization_id, source_criterion.incubator_id,
        created_template_id, created_dimension_id, source_criterion.code,
        source_criterion.prompt, source_criterion.help_text,
        source_criterion.response_type, source_criterion.weight,
        source_criterion.maximum_score, source_criterion.is_required,
        source_criterion.allows_not_applicable, source_criterion.evidence_required_from,
        source_criterion.options, source_criterion.rubric, source_criterion.position,
        source_criterion.requires_not_applicable_justification,
        source_criterion.not_applicable_guidance, source_criterion.internal_notes
      ) returning id into created_criterion_id;

      criterion_map := criterion_map || jsonb_build_object(
        source_criterion.id::text, created_criterion_id::text
      );

      insert into public.diagnostic_criterion_stages (organization_id, template_id, criterion_id, stage)
      select organization_id, created_template_id, created_criterion_id, stage
      from public.diagnostic_criterion_stages where criterion_id = source_criterion.id;

      insert into public.diagnostic_criterion_levels (
        organization_id, incubator_id, template_id, criterion_id,
        score, label, description, position
      ) select organization_id, incubator_id, created_template_id,
        created_criterion_id, score, label, description, position
      from public.diagnostic_criterion_levels where criterion_id = source_criterion.id;
    end loop;
  end loop;

  insert into public.diagnostic_classification_ranges (
    organization_id, incubator_id, template_id, code, label,
    minimum_score, maximum_score, color_token, position
  ) select organization_id, incubator_id, created_template_id, code, label,
    minimum_score, maximum_score, color_token, position
  from public.diagnostic_classification_ranges where template_id = source_template.id;

  for source_indicator in
    select * from public.diagnostic_indicator_definitions i
    where i.template_id = source_template.id order by i.position
  loop
    insert into public.diagnostic_indicator_definitions (
      organization_id, incubator_id, template_id, code, category, name, unit,
      value_type, evidence_hint, is_derived, formula_key, position
    ) values (
      source_indicator.organization_id, source_indicator.incubator_id,
      created_template_id, source_indicator.code, source_indicator.category,
      source_indicator.name, source_indicator.unit, source_indicator.value_type,
      source_indicator.evidence_hint, source_indicator.is_derived,
      source_indicator.formula_key, source_indicator.position
    ) returning id into created_indicator_id;
    indicator_map := indicator_map || jsonb_build_object(
      source_indicator.id::text, created_indicator_id::text
    );
  end loop;

  insert into public.diagnostic_trigger_rules (
    organization_id, incubator_id, template_id, code, name, source_type,
    criterion_id, indicator_definition_id, aggregate_key, operator, threshold,
    severity, message, recommended_action, position
  ) select
    organization_id, incubator_id, created_template_id, code, name, source_type,
    case when criterion_id is null then null else (criterion_map ->> criterion_id::text)::uuid end,
    case when indicator_definition_id is null then null else (indicator_map ->> indicator_definition_id::text)::uuid end,
    aggregate_key, operator, threshold, severity, message, recommended_action, position
  from public.diagnostic_trigger_rules where template_id = source_template.id;

  return created_template_id;
end;
$$;

create or replace function public.submit_diagnostic_assessment(target_assessment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  assessment public.diagnostic_assessments%rowtype;
  missing_count integer;
begin
  select * into assessment from public.diagnostic_assessments a
  where a.id = target_assessment_id for update;
  if not found or not private.can_respond_diagnostic_assessment(target_assessment_id) then
    raise exception 'Avaliação inexistente ou sem permissão' using errcode = '42501';
  end if;
  if assessment.status not in ('draft', 'in_progress') then
    raise exception 'A avaliação não está aberta para envio' using errcode = '23514';
  end if;

  select count(*) into missing_count
  from public.diagnostic_criteria c
  left join public.diagnostic_responses r
    on r.assessment_id = assessment.id and r.criterion_id = c.id
  where c.template_id = assessment.template_id and c.is_required
    and (r.id is null or (not r.is_not_applicable and r.self_value is null));
  if missing_count > 0 then
    raise exception 'Responda todos os critérios obrigatórios antes de enviar' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.diagnostic_responses r
    join public.diagnostic_criteria c on c.id = r.criterion_id
    where r.assessment_id = assessment.id and not r.is_not_applicable
      and c.evidence_required_from is not null
      and jsonb_typeof(r.self_value) = 'number'
      and (r.self_value #>> '{}')::numeric >= c.evidence_required_from
      and nullif(btrim(r.evidence_notes), '') is null
      and not exists (
        select 1 from public.diagnostic_response_evidence e
        where e.response_id = r.id and e.status = 'available' and e.deleted_at is null
      )
  ) then
    raise exception 'Anexe ou descreva as evidências obrigatórias antes de enviar' using errcode = '23514';
  end if;

  perform private.recompute_diagnostic_assessment_scores(assessment.id);
  update public.diagnostic_assessments
  set status = 'submitted', submitted_at = now(), lock_version = lock_version + 1
  where id = assessment.id;
  update public.diagnostic_campaign_startups
  set status = 'submitted', submitted_at = now()
  where id = assessment.campaign_startup_id;
  insert into public.diagnostic_history_events (
    organization_id, incubator_id, assessment_id, event_type, actor_id,
    from_status, to_status
  ) values (
    assessment.organization_id, assessment.incubator_id, assessment.id,
    'assessment_submitted', auth.uid(), assessment.status::text, 'submitted'
  );
end;
$$;

create or replace function public.reopen_diagnostic_assessment(target_assessment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  assessment public.diagnostic_assessments%rowtype;
begin
  select * into assessment from public.diagnostic_assessments a
  where a.id = target_assessment_id for update;
  if not found or not private.can_validate_diagnostic_assessment(target_assessment_id) then
    raise exception 'Avaliação inexistente ou sem permissão' using errcode = '42501';
  end if;
  if assessment.status not in ('submitted', 'under_review') then
    raise exception 'Somente avaliações enviadas ou em revisão podem ser reabertas' using errcode = '23514';
  end if;
  update public.diagnostic_assessments
  set status = 'in_progress', submitted_at = null, lock_version = lock_version + 1
  where id = assessment.id;
  update public.diagnostic_campaign_startups
  set status = 'in_progress', submitted_at = null
  where id = assessment.campaign_startup_id;
  insert into public.diagnostic_history_events (
    organization_id, incubator_id, assessment_id, event_type, actor_id,
    from_status, to_status
  ) values (
    assessment.organization_id, assessment.incubator_id, assessment.id,
    'assessment_reopened', auth.uid(), assessment.status::text, 'in_progress'
  );
end;
$$;

create or replace function public.finalize_diagnostic_assessment(target_assessment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  assessment public.diagnostic_assessments%rowtype;
  response_record record;
  next_revision integer;
begin
  select * into assessment from public.diagnostic_assessments a
  where a.id = target_assessment_id for update;
  if not found or not private.can_validate_diagnostic_assessment(target_assessment_id) then
    raise exception 'Avaliação inexistente ou sem permissão' using errcode = '42501';
  end if;
  if assessment.status not in ('submitted', 'under_review') then
    raise exception 'A avaliação precisa estar enviada ou em revisão' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.diagnostic_criteria c
    left join public.diagnostic_responses r
      on r.assessment_id = assessment.id and r.criterion_id = c.id
    where c.template_id = assessment.template_id and c.is_required
      and (r.id is null or (not r.is_not_applicable and r.validated_value is null))
  ) then
    raise exception 'Valide todos os critérios obrigatórios antes de concluir' using errcode = '23514';
  end if;

  for response_record in
    select r.* from public.diagnostic_responses r where r.assessment_id = assessment.id
  loop
    select coalesce(max(v.revision), 0) + 1 into next_revision
    from public.diagnostic_response_validations v where v.response_id = response_record.id;
    insert into public.diagnostic_response_validations (
      organization_id, incubator_id, response_id, revision, validated_value,
      evaluator_comment, status, validator_id, finalized_at
    ) values (
      assessment.organization_id, assessment.incubator_id, response_record.id,
      next_revision, response_record.validated_value,
      response_record.evaluator_comment, 'final', auth.uid(), now()
    );
  end loop;

  perform private.recompute_diagnostic_assessment_scores(assessment.id);
  update public.diagnostic_assessments
  set status = 'validated', validated_at = now(), lock_version = lock_version + 1
  where id = assessment.id;
  update public.diagnostic_campaign_startups
  set status = 'validated', validated_at = now()
  where id = assessment.campaign_startup_id;
  insert into public.diagnostic_history_events (
    organization_id, incubator_id, assessment_id, event_type, actor_id,
    from_status, to_status
  ) values (
    assessment.organization_id, assessment.incubator_id, assessment.id,
    'assessment_validated', auth.uid(), assessment.status::text, 'validated'
  );
end;
$$;

do $$
declare
  current_definition text;
begin
  select pg_get_functiondef('private.recompute_diagnostic_assessment_scores(uuid)'::regprocedure)
    into current_definition;
  if position('e.status = ''active''' in current_definition) > 0 then
    execute replace(current_definition, 'e.status = ''active''', 'e.status = ''available''');
  end if;
end;
$$;

revoke execute on function public.create_diagnostic_template_draft(uuid, text, text, text) from public, anon;
revoke execute on function public.add_diagnostic_dimension(uuid, text, text, text, numeric, boolean) from public, anon;
revoke execute on function public.add_diagnostic_criterion_with_rubric(uuid, text, text, text, numeric, boolean, boolean, numeric, text[]) from public, anon;
revoke execute on function public.duplicate_diagnostic_template_version(uuid, text, text) from public, anon;
revoke execute on function public.submit_diagnostic_assessment(uuid) from public, anon;
revoke execute on function public.reopen_diagnostic_assessment(uuid) from public, anon;
revoke execute on function public.finalize_diagnostic_assessment(uuid) from public, anon;

grant execute on function public.create_diagnostic_template_draft(uuid, text, text, text) to authenticated;
grant execute on function public.add_diagnostic_dimension(uuid, text, text, text, numeric, boolean) to authenticated;
grant execute on function public.add_diagnostic_criterion_with_rubric(uuid, text, text, text, numeric, boolean, boolean, numeric, text[]) to authenticated;
grant execute on function public.duplicate_diagnostic_template_version(uuid, text, text) to authenticated;
grant execute on function public.submit_diagnostic_assessment(uuid) to authenticated;
grant execute on function public.reopen_diagnostic_assessment(uuid) to authenticated;
grant execute on function public.finalize_diagnostic_assessment(uuid) to authenticated;

comment on function public.duplicate_diagnostic_template_version(uuid, text, text) is
  'Clona integralmente uma versão publicada para um novo rascunho editável da mesma família.';
comment on function public.submit_diagnostic_assessment(uuid) is
  'Valida completude e evidências, calcula o snapshot e envia a autoavaliação.';
comment on function public.finalize_diagnostic_assessment(uuid) is
  'Persiste revisões finais imutáveis e conclui a validação oficial.';

commit;
