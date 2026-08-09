begin;

-- A CLI Supabase 2.111.0 foi executada antes da criação deste arquivo, mas
-- falhou no diretório sincronizado pelo OneDrive com LegacyMigrationNewWriteError.
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
          'validated', actor_id, actor_id, target_mode,
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
        insert into public.diagnostic_assessment_notes (
          organization_id, incubator_id, assessment_id, author_id, body,
          created_at
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
  return installed_count;
end;
$$;

revoke execute on function public.install_diagnostic_demo_cases(uuid)
  from public, anon;
grant execute on function public.install_diagnostic_demo_cases(uuid)
  to authenticated;

comment on function public.install_diagnostic_demo_cases(uuid) is
  'Instala de forma idempotente três startups e seis aplicações explicitamente fictícias para demonstração.';

commit;
