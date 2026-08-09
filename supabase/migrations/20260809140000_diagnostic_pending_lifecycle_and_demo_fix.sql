begin;

-- Contexto interno e efêmero: somente a função de instalação de demonstração
-- consegue registrar a transação. Isso permite montar respostas fictícias sem
-- ampliar a autorização de autodiagnósticos reais.
create table if not exists private.diagnostic_demo_install_context (
  transaction_id bigint primary key,
  actor_id uuid not null,
  created_at timestamptz not null default now()
);

alter table private.diagnostic_demo_install_context enable row level security;
revoke all on private.diagnostic_demo_install_context from public, anon, authenticated;

create or replace function private.enforce_diagnostic_response_field_permissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assessment public.diagnostic_assessments%rowtype;
  internal_demo_install boolean;
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

  select exists (
    select 1
    from private.diagnostic_demo_install_context c
    where c.transaction_id = txid_current()
      and c.actor_id = (select auth.uid())
  ) into internal_demo_install;

  may_respond := internal_demo_install
    or private.can_respond_diagnostic_assessment(assessment.id);
  may_validate := internal_demo_install
    or private.has_permission(
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
    raise exception 'Você não pode responder este diagnóstico'
      using errcode = '42501';
  end if;

  if validation_fields_changed and not may_validate then
    raise exception 'A validação exige a permissão diagnostic.validate'
      using errcode = '42501';
  end if;

  if validation_fields_changed
    and new.validated_by is distinct from (select auth.uid()) then
    raise exception 'O avaliador registrado deve ser o usuário autenticado'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.update_pending_diagnostic_assessment(
  target_assessment_id uuid,
  assessment_cycle_label text,
  assessment_due_at timestamptz,
  target_evaluator_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  assessment public.diagnostic_assessments%rowtype;
  required_permission text;
begin
  select a.* into assessment
  from public.diagnostic_assessments a
  where a.id = target_assessment_id
  for update;

  if not found or not private.has_permission(
    assessment.organization_id, 'diagnostic.manage', null, assessment.incubator_id
  ) then
    raise exception 'Aplicação inexistente ou sem permissão' using errcode = '42501';
  end if;

  if assessment.status <> 'draft'
    or exists (
      select 1 from public.diagnostic_responses r
      where r.assessment_id = assessment.id
    )
    or exists (
      select 1 from public.diagnostic_history_events h
      where h.assessment_id = assessment.id
        and h.event_type = 'assessment_started'
    ) then
    raise exception 'Somente um diagnóstico ainda não iniciado pode ser editado'
      using errcode = '23514';
  end if;

  if nullif(btrim(assessment_cycle_label), '') is null
    or char_length(btrim(assessment_cycle_label)) not between 2 and 120 then
    raise exception 'Informe um nome de ciclo entre 2 e 120 caracteres'
      using errcode = '23514';
  end if;

  if assessment_due_at is null then
    raise exception 'Informe o prazo do diagnóstico' using errcode = '23514';
  end if;

  if assessment.campaign_id is not null and not exists (
    select 1
    from public.diagnostic_campaigns c
    where c.organization_id = assessment.organization_id
      and c.id = assessment.campaign_id
      and assessment_due_at between c.starts_at and c.ends_at
  ) then
    raise exception 'O prazo deve permanecer dentro do período da campanha'
      using errcode = '23514';
  end if;

  required_permission := case
    when assessment.execution_mode = 'facilitated' then 'diagnostic.respond'
    else 'diagnostic.validate'
  end;

  if assessment.execution_mode = 'facilitated' and target_evaluator_id is null then
    raise exception 'A aplicação assistida exige uma pessoa responsável'
      using errcode = '23514';
  end if;

  if target_evaluator_id is not null and not private.user_has_permission(
    target_evaluator_id,
    assessment.organization_id,
    required_permission,
    assessment.incubator_id
  ) then
    raise exception 'A pessoa selecionada não possui a permissão necessária'
      using errcode = '23514';
  end if;

  update public.diagnostic_assessments
  set cycle_label = btrim(assessment_cycle_label),
      due_at = assessment_due_at,
      evaluator_id = target_evaluator_id,
      updated_at = now(),
      lock_version = lock_version + 1
  where id = assessment.id;

  update public.diagnostic_campaign_startups
  set evaluator_id = target_evaluator_id,
      updated_at = now()
  where id = assessment.campaign_startup_id
    and status in ('invited', 'not_started');

  insert into public.diagnostic_history_events (
    organization_id, incubator_id, assessment_id, event_type, actor_id, details
  ) values (
    assessment.organization_id,
    assessment.incubator_id,
    assessment.id,
    'pending_assessment_updated',
    (select auth.uid()),
    jsonb_build_object(
      'cycle_label', btrim(assessment_cycle_label),
      'due_at', assessment_due_at,
      'evaluator_id', target_evaluator_id
    )
  );
end;
$$;

create or replace function public.delete_pending_diagnostic_assessment(
  target_assessment_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  assessment public.diagnostic_assessments%rowtype;
  participant_id uuid;
begin
  select a.* into assessment
  from public.diagnostic_assessments a
  where a.id = target_assessment_id
  for update;

  if not found or not private.has_permission(
    assessment.organization_id, 'diagnostic.manage', null, assessment.incubator_id
  ) then
    raise exception 'Aplicação inexistente ou sem permissão' using errcode = '42501';
  end if;

  if assessment.status <> 'draft'
    or exists (
      select 1 from public.diagnostic_responses r
      where r.assessment_id = assessment.id
    )
    or exists (
      select 1 from public.diagnostic_history_events h
      where h.assessment_id = assessment.id
        and h.event_type = 'assessment_started'
    ) then
    raise exception 'Um diagnóstico iniciado não pode ser excluído; o histórico deve ser preservado'
      using errcode = '23514';
  end if;

  if exists (
    select 1 from public.diagnostic_assessment_notes n
    where n.assessment_id = assessment.id
  ) or exists (
    select 1 from public.diagnostic_respondent_invitations i
    where i.assessment_id = assessment.id
  ) then
    raise exception 'Remova observações e revogue convites antes de excluir o diagnóstico'
      using errcode = '23514';
  end if;

  participant_id := assessment.campaign_startup_id;

  delete from public.diagnostic_assessments
  where id = assessment.id;

  if participant_id is not null then
    delete from public.diagnostic_campaign_startups
    where id = participant_id
      and status in ('invited', 'not_started');
  end if;
end;
$$;

create or replace function public.delete_unused_diagnostic_template(
  target_template_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  template public.diagnostic_templates%rowtype;
begin
  select t.* into template
  from public.diagnostic_templates t
  where t.id = target_template_id
  for update;

  if not found or not private.has_permission(
    template.organization_id, 'diagnostic.manage', null, template.incubator_id
  ) then
    raise exception 'Modelo inexistente ou sem permissão' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.diagnostic_assessments a
    where a.template_id = template.id
  ) or exists (
    select 1 from public.diagnostic_campaigns c
    where c.template_id = template.id
  ) then
    raise exception 'Este modelo já foi usado e não pode ser excluído; o histórico deve ser preservado'
      using errcode = '23514';
  end if;

  if template.status = 'published' then
    update public.diagnostic_templates
    set status = 'archived', archived_at = now()
    where id = template.id;
  end if;

  delete from public.diagnostic_templates
  where id = template.id;
end;
$$;

create or replace function public.install_diagnostic_demo_cases(
  target_incubator_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_organization_id uuid;
  target_template_id uuid;
  target_program_type_id uuid;
  target_program_id uuid;
  target_cohort_id uuid;
  demo record;
  cycle_number integer;
  target_startup_id uuid;
  target_assessment_id uuid;
  target_mode public.diagnostic_execution_mode;
  declared_level integer;
  official_level integer;
  installed_count integer := 0;
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

  select t.id into target_template_id
  from public.diagnostic_templates t
  join public.diagnostic_template_families f
    on f.organization_id = t.organization_id and f.id = t.family_id
  where t.organization_id = target_organization_id
    and t.incubator_id = target_incubator_id
    and t.status = 'published'
  order by f.is_standard desc, t.published_at desc nulls last, t.created_at desc
  limit 1;
  if target_template_id is null then
    raise exception 'Publique ao menos um modelo antes de instalar os exemplos' using errcode = '23514';
  end if;

  select pt.id into target_program_type_id
  from public.program_types pt
  where pt.organization_id = target_organization_id
    and pt.incubator_id = target_incubator_id
    and pt.code = 'incubacao'
  limit 1;

  if target_program_type_id is null then
    insert into public.program_types (
      organization_id, incubator_id, code, name, description,
      is_active, settings, created_by
    ) values (
      target_organization_id, target_incubator_id, 'incubacao', 'Incubação',
      'Tipo criado pelo ambiente de demonstração do módulo de diagnósticos.',
      true, jsonb_build_object('is_demo', true), actor_id
    ) returning id into target_program_type_id;
  end if;

  select p.id into target_program_id
  from public.programs p
  where p.organization_id = target_organization_id
    and p.incubator_id = target_incubator_id
    and p.deleted_at is null
    and p.settings ->> 'diagnostic_demo_key' = 'jornada_maturidade'
  limit 1;

  if target_program_id is null then
    insert into public.programs (
      organization_id, incubator_id, type_id, name, description,
      starts_on, ends_on, status, settings, created_by
    ) values (
      target_organization_id, target_incubator_id, target_program_type_id,
      '[EXEMPLO] Jornada de Maturidade',
      'Programa inteiramente fictício para visualizar startups, ciclos e diagnósticos aplicados.',
      current_date - 540, current_date + 180, 'active',
      jsonb_build_object(
        'is_demo', true,
        'diagnostic_demo_key', 'jornada_maturidade',
        'demo_notice', 'Dados inteiramente fictícios para demonstração.'
      ),
      actor_id
    ) returning id into target_program_id;
  end if;

  select c.id into target_cohort_id
  from public.cohorts c
  where c.organization_id = target_organization_id
    and c.program_id = target_program_id
    and c.deleted_at is null
    and c.settings ->> 'diagnostic_demo_key' = 'turma_demonstrativa'
  limit 1;

  if target_cohort_id is null then
    insert into public.cohorts (
      organization_id, program_id, name, launches_on, starts_on, ends_on,
      enrollment_starts_on, enrollment_ends_on, status, capacity,
      settings, created_by
    ) values (
      target_organization_id, target_program_id,
      '[EXEMPLO] Turma Demonstrativa',
      current_date - 570, current_date - 540, current_date + 180,
      current_date - 570, current_date - 541, 'active', 20,
      jsonb_build_object(
        'is_demo', true,
        'diagnostic_demo_key', 'turma_demonstrativa',
        'demo_notice', 'Dados inteiramente fictícios para demonstração.'
      ),
      actor_id
    ) returning id into target_cohort_id;
  end if;

  delete from private.diagnostic_demo_install_context
  where created_at < now() - interval '1 hour';
  insert into private.diagnostic_demo_install_context (transaction_id, actor_id)
  values (txid_current(), actor_id)
  on conflict (transaction_id) do update set actor_id = excluded.actor_id, created_at = now();

  for demo in
    select * from (values
      ('agro-pulso', '[EXEMPLO] AgroPulso', 'Agtech', 'validation'::public.startup_stage, 1, 2,
       'Evoluiu da validação inicial para uma operação com experimentos comerciais documentados.'),
      ('saude-conecta', '[EXEMPLO] Saúde Conecta', 'Healthtech', 'operation'::public.startup_stage, 2, 3,
       'O diagnóstico conduzido destacou governança de dados e estruturação do processo comercial.'),
      ('sertao-solar', '[EXEMPLO] Sertão Solar', 'Cleantech', 'traction'::public.startup_stage, 2, 4,
       'A comparação demonstra ganho de maturidade e redução dos principais gaps do ciclo anterior.')
    ) as examples(demo_key, startup_name, sector, stage, initial_level, current_level, observation)
  loop
    select s.id into target_startup_id
    from public.startups s
    where s.organization_id = target_organization_id
      and s.incubator_id = target_incubator_id
      and s.deleted_at is null
      and s.custom_fields ->> 'diagnostic_demo_key' = demo.demo_key;

    if target_startup_id is null then
      insert into public.startups (
        organization_id, incubator_id, name, sector, stage, status,
        city, state, custom_fields, created_by
      ) values (
        target_organization_id, target_incubator_id, demo.startup_name,
        demo.sector, demo.stage, 'active', 'Salgueiro', 'PE',
        jsonb_build_object(
          'is_demo', true,
          'diagnostic_demo_key', demo.demo_key,
          'demo_notice', 'Dados inteiramente fictícios para demonstração.'
        ),
        actor_id
      ) returning id into target_startup_id;
    end if;

    if not exists (
      select 1
      from public.startup_enrollments se
      where se.organization_id = target_organization_id
        and se.startup_id = target_startup_id
        and se.cohort_id = target_cohort_id
        and se.status in ('invited', 'active', 'suspended')
    ) then
      insert into public.startup_enrollments (
        organization_id, startup_id, cohort_id, status, source,
        entry_date, created_by
      ) values (
        target_organization_id, target_startup_id, target_cohort_id,
        'active', 'manual', current_date - 540, actor_id
      );
    end if;

    for cycle_number in 0..1 loop
      target_mode := case when cycle_number = 0
        then 'self_assessment'::public.diagnostic_execution_mode
        else 'facilitated'::public.diagnostic_execution_mode end;
      declared_level := case when cycle_number = 0
        then demo.initial_level else demo.current_level end;
      official_level := case when cycle_number = 0
        then greatest(0, demo.initial_level - 1) else demo.current_level end;

      select a.id into target_assessment_id
      from public.diagnostic_assessments a
      where a.organization_id = target_organization_id
        and a.incubator_id = target_incubator_id
        and a.startup_id = target_startup_id
        and a.template_id = target_template_id
        and a.cycle_label = format('[EXEMPLO] T%s · %s', cycle_number, demo.demo_key);

      if target_assessment_id is null then
        insert into public.diagnostic_assessments (
          organization_id, incubator_id, startup_id, template_id, cycle_label,
          status, started_by, evaluator_id, execution_mode,
          submitted_at, validated_at, created_at, updated_at
        ) values (
          target_organization_id, target_incubator_id, target_startup_id,
          target_template_id,
          format('[EXEMPLO] T%s · %s', cycle_number, demo.demo_key),
          'draft', actor_id, actor_id, target_mode,
          now() - ((18 - cycle_number * 9) || ' months')::interval,
          now() - ((18 - cycle_number * 9) || ' months')::interval,
          now() - ((18 - cycle_number * 9) || ' months')::interval,
          now() - ((18 - cycle_number * 9) || ' months')::interval
        ) returning id into target_assessment_id;

        insert into public.diagnostic_responses (
          organization_id, incubator_id, assessment_id, criterion_id,
          self_value, validated_value, is_not_applicable,
          evidence_notes, self_comment, evaluator_comment,
          validated_by, validated_at, created_at, updated_at
        )
        select
          target_organization_id, target_incubator_id, target_assessment_id, c.id,
          to_jsonb(least(c.maximum_score::integer, greatest(0,
            declared_level + case when c.position % 4 = 0 then -1 else 0 end
          ))),
          to_jsonb(least(c.maximum_score::integer, greatest(0,
            official_level + case when c.position % 5 = 0 then -1 else 0 end
          ))),
          false,
          'Evidência fictícia registrada apenas para demonstrar o fluxo.',
          'Resposta fictícia da aplicação demonstrativa.',
          'Validação fictícia; não representa uma startup real.',
          actor_id,
          now() - ((18 - cycle_number * 9) || ' months')::interval,
          now() - ((18 - cycle_number * 9) || ' months')::interval,
          now() - ((18 - cycle_number * 9) || ' months')::interval
        from public.diagnostic_criteria c
        where c.template_id = target_template_id;

        perform private.recompute_diagnostic_assessment_scores(target_assessment_id);
        update public.diagnostic_assessments
        set status = 'validated', updated_at = now()
        where id = target_assessment_id;

        insert into public.diagnostic_assessment_notes (
          organization_id, incubator_id, assessment_id, author_id, body, created_at
        ) values (
          target_organization_id, target_incubator_id, target_assessment_id,
          actor_id,
          '[EXEMPLO FICTÍCIO] ' || demo.observation,
          now() - ((18 - cycle_number * 9) || ' months')::interval
        );
        insert into public.diagnostic_history_events (
          organization_id, incubator_id, assessment_id, event_type, actor_id,
          from_status, to_status, details
        ) values (
          target_organization_id, target_incubator_id, target_assessment_id,
          'demo_assessment_installed', actor_id, 'draft', 'validated',
          jsonb_build_object('is_demo', true, 'execution_mode', target_mode)
        );
        installed_count := installed_count + 1;
      end if;
    end loop;
  end loop;

  delete from private.diagnostic_demo_install_context
  where transaction_id = txid_current()
    and actor_id = (select auth.uid());

  return installed_count;
end;
$$;

revoke all on function private.enforce_diagnostic_response_field_permissions()
  from public, anon, authenticated;
revoke execute on function public.update_pending_diagnostic_assessment(
  uuid, text, timestamptz, uuid
) from public, anon;
grant execute on function public.update_pending_diagnostic_assessment(
  uuid, text, timestamptz, uuid
) to authenticated;
revoke execute on function public.delete_pending_diagnostic_assessment(uuid)
  from public, anon;
grant execute on function public.delete_pending_diagnostic_assessment(uuid)
  to authenticated;
revoke execute on function public.delete_unused_diagnostic_template(uuid)
  from public, anon;
grant execute on function public.delete_unused_diagnostic_template(uuid)
  to authenticated;
revoke execute on function public.install_diagnostic_demo_cases(uuid)
  from public, anon;
grant execute on function public.install_diagnostic_demo_cases(uuid)
  to authenticated;

comment on function public.update_pending_diagnostic_assessment(uuid, text, timestamptz, uuid) is
  'Edita nome do ciclo, prazo e responsável somente antes do início da aplicação.';
comment on function public.delete_pending_diagnostic_assessment(uuid) is
  'Exclui uma aplicação ainda não iniciada e remove sua participação pendente da campanha.';
comment on function public.delete_unused_diagnostic_template(uuid) is
  'Exclui um modelo sem campanhas ou aplicações, preservando versões já utilizadas.';
comment on function public.install_diagnostic_demo_cases(uuid) is
  'Instala de forma idempotente um programa, uma turma, três startups e seis aplicações explicitamente fictícias para demonstração.';

commit;
