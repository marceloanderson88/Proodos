begin;

select plan(12);

insert into auth.users (
  id, email, email_confirmed_at, aud, role,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '74200000-0000-4000-8000-000000000001',
  'diagnostics-phase2-owner@example.invalid',
  now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()
);

insert into private.platform_admins (user_id, reason)
values (
  '74200000-0000-4000-8000-000000000001',
  'bootstrap sintético do diagnóstico v2.1'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '74200000-0000-4000-8000-000000000001', true);
select * from public.create_organization('Organização Diagnóstico v2.1', 'diagnostics-phase2');

select set_config(
  'test.diag_v21_org',
  (select id::text from public.organizations where slug = 'diagnostics-phase2'),
  true
);

with inserted as (
  insert into public.incubators (organization_id, name, slug, created_by)
  values (
    current_setting('test.diag_v21_org')::uuid,
    'Incubadora Diagnóstico v2.1',
    'incubadora-diagnostico-v21',
    '74200000-0000-4000-8000-000000000001'
  ) returning id
)
select set_config('test.diag_v21_incubator', id::text, true) from inserted;

select set_config(
  'test.diag_v21_template',
  (
    select id::text
    from public.diagnostic_templates
    where organization_id = current_setting('test.diag_v21_org')::uuid
      and incubator_id = current_setting('test.diag_v21_incubator')::uuid
      and version_label = '2.1'
  ),
  true
);

select is(
  (select count(*) from public.diagnostic_dimensions where template_id = current_setting('test.diag_v21_template')::uuid),
  9::bigint,
  'modelo oficial possui 9 dimensões'
);
select is(
  (select sum(weight) from public.diagnostic_dimensions where template_id = current_setting('test.diag_v21_template')::uuid),
  100.000::numeric,
  'pesos das dimensões somam 100%'
);
select is(
  (select count(*) from public.diagnostic_criteria where template_id = current_setting('test.diag_v21_template')::uuid),
  36::bigint,
  'modelo oficial possui 36 critérios'
);
select is(
  (
    select count(*)
    from public.diagnostic_criterion_levels
    where template_id = current_setting('test.diag_v21_template')::uuid
  ),
  180::bigint,
  'cada critério possui cinco rubricas'
);
select is(
  (
    select count(*)
    from public.diagnostic_indicator_definitions
    where template_id = current_setting('test.diag_v21_template')::uuid
  ),
  25::bigint,
  'planilha oficial mapeia 25 indicadores'
);
select is(
  (
    select count(*)
    from public.diagnostic_trigger_rules
    where template_id = current_setting('test.diag_v21_template')::uuid
  ),
  13::bigint,
  'modelo oficial possui 13 gatilhos'
);

with inserted as (
  insert into public.startups (organization_id, incubator_id, name, stage, created_by)
  values (
    current_setting('test.diag_v21_org')::uuid,
    current_setting('test.diag_v21_incubator')::uuid,
    'Startup Diagnóstico v2.1',
    'validation',
    '74200000-0000-4000-8000-000000000001'
  ) returning id
)
select set_config('test.diag_v21_startup', id::text, true) from inserted;

-- Este fixture valida exclusivamente o motor de cálculo. As fronteiras RLS são
-- cobertas pelos testes dedicados e não devem impedir a montagem do cenário.
reset role;

with inserted as (
  insert into public.diagnostic_assessments (
    organization_id, incubator_id, startup_id, template_id,
    cycle_label, status, execution_mode, started_by, evaluator_id
  ) values (
    current_setting('test.diag_v21_org')::uuid,
    current_setting('test.diag_v21_incubator')::uuid,
    current_setting('test.diag_v21_startup')::uuid,
    current_setting('test.diag_v21_template')::uuid,
    'T0 · teste oficial',
    'in_progress',
    'facilitated',
    '74200000-0000-4000-8000-000000000001',
    '74200000-0000-4000-8000-000000000001'
  ) returning id
)
select set_config('test.diag_v21_assessment', id::text, true) from inserted;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '74200000-0000-4000-8000-000000000001', true);

insert into public.diagnostic_responses (
  organization_id, incubator_id, assessment_id, criterion_id,
  self_value, validated_value, validated_by, validated_at
)
select
  current_setting('test.diag_v21_org')::uuid,
  current_setting('test.diag_v21_incubator')::uuid,
  current_setting('test.diag_v21_assessment')::uuid,
  c.id,
  '4'::jsonb,
  '3'::jsonb,
  '74200000-0000-4000-8000-000000000001',
  now()
from public.diagnostic_criteria c
where c.template_id = current_setting('test.diag_v21_template')::uuid;

select is(
  (select self_score from public.diagnostic_assessments where id = current_setting('test.diag_v21_assessment')::uuid),
  100.000::numeric,
  'pontuação autodeclarada é normalizada para 100'
);
select is(
  (select validated_score from public.diagnostic_assessments where id = current_setting('test.diag_v21_assessment')::uuid),
  75.000::numeric,
  'pontuação validada é normalizada para 75'
);
select is(
  (select average_gap from public.diagnostic_assessments where id = current_setting('test.diag_v21_assessment')::uuid),
  1.000::numeric,
  'gap médio preserva a diferença na escala 0–4'
);
select is(
  (select classification_code from public.diagnostic_assessments where id = current_setting('test.diag_v21_assessment')::uuid),
  'validado'::text,
  'classificação usa o score oficial arredondado'
);
select is(
  (select count(*) from public.diagnostic_dimension_scores where assessment_id = current_setting('test.diag_v21_assessment')::uuid),
  9::bigint,
  'pontuações das nove dimensões são materializadas'
);
select is(
  (select count(*) from public.diagnostic_trigger_results where assessment_id = current_setting('test.diag_v21_assessment')::uuid),
  13::bigint,
  'todos os gatilhos são avaliados, inclusive os sem dado'
);

select * from finish();
rollback;
