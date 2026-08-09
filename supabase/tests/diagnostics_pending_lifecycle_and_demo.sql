begin;

select plan(9);

insert into auth.users (
  id, email, email_confirmed_at, aud, role,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '74300000-0000-4000-8000-000000000001',
  'diagnostics-lifecycle@example.invalid', now(),
  'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()
);

insert into private.platform_admins (user_id, reason)
values (
  '74300000-0000-4000-8000-000000000001',
  'bootstrap sintético do ciclo de vida diagnóstico'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '74300000-0000-4000-8000-000000000001', true);
select * from public.create_organization(
  'Organização Ciclo Diagnóstico', 'diagnostics-lifecycle'
);

select set_config(
  'test.diag_lifecycle_org',
  (select id::text from public.organizations where slug = 'diagnostics-lifecycle'),
  true
);

with inserted as (
  insert into public.incubators (organization_id, name, slug, created_by)
  values (
    current_setting('test.diag_lifecycle_org')::uuid,
    'Incubadora Ciclo Diagnóstico',
    'incubadora-ciclo-diagnostico',
    '74300000-0000-4000-8000-000000000001'
  ) returning id
) select set_config('test.diag_lifecycle_incubator', id::text, true) from inserted;

with inserted as (
  insert into public.startups (
    organization_id, incubator_id, name, stage, created_by
  ) values
  (
    current_setting('test.diag_lifecycle_org')::uuid,
    current_setting('test.diag_lifecycle_incubator')::uuid,
    'Startup Pendente A', 'validation',
    '74300000-0000-4000-8000-000000000001'
  ),
  (
    current_setting('test.diag_lifecycle_org')::uuid,
    current_setting('test.diag_lifecycle_incubator')::uuid,
    'Startup Pendente B', 'validation',
    '74300000-0000-4000-8000-000000000001'
  ) returning id, name
) select
  set_config(
    case when name = 'Startup Pendente A'
      then 'test.diag_lifecycle_startup_a'
      else 'test.diag_lifecycle_startup_b'
    end,
    id::text,
    true
  )
from inserted;

select set_config(
  'test.diag_lifecycle_template',
  public.create_diagnostic_template_draft(
    current_setting('test.diag_lifecycle_incubator')::uuid,
    'Modelo Ciclo Diagnóstico',
    'Fixture de edição, exclusão e demonstração.',
    ''
  )::text,
  true
);

reset role;

with inserted as (
  insert into public.diagnostic_dimensions (
    organization_id, incubator_id, template_id, code, name, weight, position
  ) values (
    current_setting('test.diag_lifecycle_org')::uuid,
    current_setting('test.diag_lifecycle_incubator')::uuid,
    current_setting('test.diag_lifecycle_template')::uuid,
    'D1', 'Maturidade', 100, 0
  ) returning id
) select set_config('test.diag_lifecycle_dimension', id::text, true) from inserted;

insert into public.diagnostic_criteria (
  organization_id, incubator_id, template_id, dimension_id,
  code, prompt, response_type, maximum_score, position
) values (
  current_setting('test.diag_lifecycle_org')::uuid,
  current_setting('test.diag_lifecycle_incubator')::uuid,
  current_setting('test.diag_lifecycle_template')::uuid,
  current_setting('test.diag_lifecycle_dimension')::uuid,
  'C1', 'Qual é o nível de maturidade?', 'numeric', 4, 0
);

update public.diagnostic_templates
set status = 'published', published_at = now()
where id = current_setting('test.diag_lifecycle_template')::uuid;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '74300000-0000-4000-8000-000000000001', true);

select set_config(
  'test.diag_lifecycle_campaign',
  public.create_diagnostic_campaign_with_mode(
    target_incubator_id := current_setting('test.diag_lifecycle_incubator')::uuid,
    target_template_id := current_setting('test.diag_lifecycle_template')::uuid,
    campaign_name := 'Campanha pendente',
    campaign_starts_at := now() + interval '1 day',
    campaign_ends_at := now() + interval '10 days',
    target_startup_ids := array[
      current_setting('test.diag_lifecycle_startup_a')::uuid,
      current_setting('test.diag_lifecycle_startup_b')::uuid
    ],
    campaign_execution_mode := 'self_assessment'
  )::text,
  true
);

select set_config(
  'test.diag_lifecycle_assessment_a',
  (
    select id::text from public.diagnostic_assessments
    where campaign_id = current_setting('test.diag_lifecycle_campaign')::uuid
      and startup_id = current_setting('test.diag_lifecycle_startup_a')::uuid
  ),
  true
);
select set_config(
  'test.diag_lifecycle_assessment_b',
  (
    select id::text from public.diagnostic_assessments
    where campaign_id = current_setting('test.diag_lifecycle_campaign')::uuid
      and startup_id = current_setting('test.diag_lifecycle_startup_b')::uuid
  ),
  true
);
select set_config(
  'test.diag_lifecycle_participant_b',
  (
    select campaign_startup_id::text from public.diagnostic_assessments
    where id = current_setting('test.diag_lifecycle_assessment_b')::uuid
  ),
  true
);

select public.update_pending_diagnostic_assessment(
  current_setting('test.diag_lifecycle_assessment_a')::uuid,
  'Ciclo revisado antes do início',
  now() + interval '5 days',
  null
);

select is(
  (
    select cycle_label from public.diagnostic_assessments
    where id = current_setting('test.diag_lifecycle_assessment_a')::uuid
  ),
  'Ciclo revisado antes do início',
  'gestor edita o nome do ciclo antes do início'
);
select ok(
  (
    select due_at between now() + interval '4 days 23 hours'
      and now() + interval '5 days 1 hour'
    from public.diagnostic_assessments
    where id = current_setting('test.diag_lifecycle_assessment_a')::uuid
  ),
  'gestor edita o prazo dentro do período da campanha'
);

select public.delete_pending_diagnostic_assessment(
  current_setting('test.diag_lifecycle_assessment_b')::uuid
);
select is(
  (
    select count(*)::integer from public.diagnostic_assessments
    where id = current_setting('test.diag_lifecycle_assessment_b')::uuid
  ),
  0,
  'aplicação pendente é excluída'
);
select is(
  (
    select count(*)::integer from public.diagnostic_campaign_startups
    where id = current_setting('test.diag_lifecycle_participant_b')::uuid
  ),
  0,
  'participação pendente é removida junto com a aplicação'
);

reset role;
update public.diagnostic_assessments
set status = 'in_progress'
where id = current_setting('test.diag_lifecycle_assessment_a')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '74300000-0000-4000-8000-000000000001', true);

select throws_ok(
  format(
    'select public.update_pending_diagnostic_assessment(%L::uuid, %L, now() + interval ''5 days'', null)',
    current_setting('test.diag_lifecycle_assessment_a'),
    'Tentativa tardia'
  ),
  '23514',
  'Somente um diagnóstico ainda não iniciado pode ser editado',
  'aplicação iniciada não pode ser editada'
);
select throws_ok(
  format(
    'select public.delete_pending_diagnostic_assessment(%L::uuid)',
    current_setting('test.diag_lifecycle_assessment_a')
  ),
  '23514',
  'Um diagnóstico iniciado não pode ser excluído; o histórico deve ser preservado',
  'aplicação iniciada não pode ser excluída'
);

select set_config(
  'test.diag_lifecycle_unused_template',
  public.create_diagnostic_template_draft(
    current_setting('test.diag_lifecycle_incubator')::uuid,
    'Modelo descartável', '', ''
  )::text,
  true
);
select public.delete_unused_diagnostic_template(
  current_setting('test.diag_lifecycle_unused_template')::uuid
);
select is(
  (
    select count(*)::integer from public.diagnostic_templates
    where id = current_setting('test.diag_lifecycle_unused_template')::uuid
  ),
  0,
  'modelo nunca utilizado pode ser excluído'
);

select is(
  public.install_diagnostic_demo_cases(
    current_setting('test.diag_lifecycle_incubator')::uuid
  ),
  6,
  'instalador cria seis aplicações fictícias sem burlar diagnósticos reais'
);
select is(
  public.install_diagnostic_demo_cases(
    current_setting('test.diag_lifecycle_incubator')::uuid
  ),
  0,
  'instalador de exemplos permanece idempotente'
);

select * from finish();
rollback;
