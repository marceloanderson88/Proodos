-- Regressão de segurança: autoavaliação, validação e totais derivados têm
-- autoridades distintas mesmo compartilhando a mesma instância.
begin;

select plan(9);

insert into auth.users (
  id, email, email_confirmed_at, aud, role,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('74100000-0000-4000-8000-000000000001', 'diagnostics-owner@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('74100000-0000-4000-8000-000000000002', 'diagnostics-agent@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('74100000-0000-4000-8000-000000000003', 'diagnostics-evaluator@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now());

insert into private.platform_admins (user_id, reason)
values ('74100000-0000-4000-8000-000000000001', 'bootstrap sintético de autorização diagnóstica');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '74100000-0000-4000-8000-000000000001', true);
select * from public.create_organization('Organização Segurança Diagnóstica', 'diagnostics-field-auth');
reset role;

select set_config(
  'test.diag_auth_org',
  (select id::text from public.organizations where slug = 'diagnostics-field-auth'),
  true
);

insert into public.organization_memberships (
  organization_id, user_id, status, joined_at, created_by
) values
  (current_setting('test.diag_auth_org')::uuid, '74100000-0000-4000-8000-000000000002', 'active', now(), '74100000-0000-4000-8000-000000000001'),
  (current_setting('test.diag_auth_org')::uuid, '74100000-0000-4000-8000-000000000003', 'active', now(), '74100000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '74100000-0000-4000-8000-000000000001', true);

with inserted as (
  insert into public.incubators (organization_id, name, slug, created_by)
  values (
    current_setting('test.diag_auth_org')::uuid,
    'Incubadora Segurança Diagnóstica',
    'incubadora-seguranca-diagnostica',
    '74100000-0000-4000-8000-000000000001'
  ) returning id
) select set_config('test.diag_auth_incubator', id::text, true) from inserted;

reset role;
insert into public.role_assignments (
  organization_id, membership_id, role_id, incubator_id, created_by
)
select
  m.organization_id,
  m.id,
  r.id,
  current_setting('test.diag_auth_incubator')::uuid,
  '74100000-0000-4000-8000-000000000001'
from public.organization_memberships m
join public.roles r
  on r.organization_id = m.organization_id
 and r.code = case
   when m.user_id = '74100000-0000-4000-8000-000000000002' then 'agent'
   else 'evaluator'
 end
where m.organization_id = current_setting('test.diag_auth_org')::uuid
  and m.user_id in (
    '74100000-0000-4000-8000-000000000002',
    '74100000-0000-4000-8000-000000000003'
  );

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '74100000-0000-4000-8000-000000000001', true);

with inserted as (
  insert into public.startups (organization_id, incubator_id, name, stage, created_by)
  values (
    current_setting('test.diag_auth_org')::uuid,
    current_setting('test.diag_auth_incubator')::uuid,
    'Startup Segurança Diagnóstica',
    'validation',
    '74100000-0000-4000-8000-000000000001'
  ) returning id
) select set_config('test.diag_auth_startup', id::text, true) from inserted;

select set_config(
  'test.diag_auth_template',
  public.create_diagnostic_template_draft(
    current_setting('test.diag_auth_incubator')::uuid,
    'Modelo Segurança Diagnóstica',
    'Fixture de autorização por campo',
    ''
  )::text,
  true
);

with inserted as (
  insert into public.diagnostic_dimensions (
    organization_id, incubator_id, template_id, name, weight, position
  ) values (
    current_setting('test.diag_auth_org')::uuid,
    current_setting('test.diag_auth_incubator')::uuid,
    current_setting('test.diag_auth_template')::uuid,
    'Dimensão segura', 1, 0
  ) returning id
) select set_config('test.diag_auth_dimension', id::text, true) from inserted;

with inserted as (
  insert into public.diagnostic_criteria (
    organization_id, incubator_id, template_id, dimension_id,
    prompt, response_type, weight, maximum_score, position
  ) values (
    current_setting('test.diag_auth_org')::uuid,
    current_setting('test.diag_auth_incubator')::uuid,
    current_setting('test.diag_auth_template')::uuid,
    current_setting('test.diag_auth_dimension')::uuid,
    'Critério com autoridade separada?', 'numeric', 1, 5, 0
  ) returning id
) select set_config('test.diag_auth_criterion', id::text, true) from inserted;

update public.diagnostic_templates
set status = 'published', published_at = now()
where id = current_setting('test.diag_auth_template')::uuid;

-- A montagem do fixture não é o objeto deste teste. A autorização de criação
-- da avaliação é coberta por m7_diagnostics_rls.sql.
reset role;

with inserted as (
  insert into public.diagnostic_assessments (
    organization_id, incubator_id, startup_id, template_id, cycle_label,
    started_by, evaluator_id
  ) values (
    current_setting('test.diag_auth_org')::uuid,
    current_setting('test.diag_auth_incubator')::uuid,
    current_setting('test.diag_auth_startup')::uuid,
    current_setting('test.diag_auth_template')::uuid,
    'Ciclo seguro',
    '74100000-0000-4000-8000-000000000001',
    '74100000-0000-4000-8000-000000000003'
  ) returning id
) select set_config('test.diag_auth_assessment', id::text, true) from inserted;

insert into public.diagnostic_respondents (
  organization_id, incubator_id, assessment_id, user_id,
  role, can_submit, invited_by, accepted_at
) values (
  current_setting('test.diag_auth_org')::uuid,
  current_setting('test.diag_auth_incubator')::uuid,
  current_setting('test.diag_auth_assessment')::uuid,
  '74100000-0000-4000-8000-000000000002',
  'primary', true,
  '74100000-0000-4000-8000-000000000001',
  now()
);

-- Neste teste a mesma identidade possui um papel interno e também representa
-- a startup. O vínculo explícito é o que autoriza o preenchimento no modo de
-- autodiagnóstico; somente o papel interno não seria suficiente.
insert into public.startup_members (
  organization_id, startup_id, user_id, full_name, email, role,
  is_representative, status, created_by
) values (
  current_setting('test.diag_auth_org')::uuid,
  current_setting('test.diag_auth_startup')::uuid,
  '74100000-0000-4000-8000-000000000002',
  'Representante sintético', 'diagnostics-agent@example.invalid',
  'representative', true, 'active',
  '74100000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '74100000-0000-4000-8000-000000000002', true);

with inserted as (
  insert into public.diagnostic_responses (
    organization_id, incubator_id, assessment_id, criterion_id, self_value
  ) values (
    current_setting('test.diag_auth_org')::uuid,
    current_setting('test.diag_auth_incubator')::uuid,
    current_setting('test.diag_auth_assessment')::uuid,
    current_setting('test.diag_auth_criterion')::uuid,
    '1'::jsonb
  ) returning id
) select set_config('test.diag_auth_response', id::text, true) from inserted;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '74100000-0000-4000-8000-000000000001', true);

select ok(
  not has_column_privilege('authenticated', 'public.diagnostic_assessments', 'self_score', 'UPDATE'),
  'authenticated não pode gravar o total autodeclarado'
);
select ok(
  not has_column_privilege('authenticated', 'public.diagnostic_assessments', 'validated_score', 'UPDATE'),
  'authenticated não pode gravar o total validado'
);

select set_config('request.jwt.claim.sub', '74100000-0000-4000-8000-000000000002', true);
select lives_ok(
  format(
    'update public.diagnostic_responses set self_value = %L::jsonb where id = %L::uuid',
    '2', current_setting('test.diag_auth_response')
  ),
  'agente com diagnostic.respond atualiza somente a autoavaliação'
);
select throws_ok(
  format(
    'update public.diagnostic_responses set validated_value = %L::jsonb, validated_by = %L::uuid, validated_at = now() where id = %L::uuid',
    '3', '74100000-0000-4000-8000-000000000002', current_setting('test.diag_auth_response')
  ),
  '42501',
  'A validação exige a permissão diagnostic.validate',
  'respondente não consegue gravar validação oficial'
);

select public.submit_diagnostic_assessment(
  current_setting('test.diag_auth_assessment')::uuid
);

select set_config('request.jwt.claim.sub', '74100000-0000-4000-8000-000000000003', true);
select ok(
  private.has_permission(
    current_setting('test.diag_auth_org')::uuid,
    'diagnostic.validate',
    null,
    current_setting('test.diag_auth_incubator')::uuid
  ),
  'nova organização provisiona diagnostic.validate para o papel avaliador'
);
select lives_ok(
  format(
    'update public.diagnostic_responses set validated_value = %L::jsonb, validated_by = %L::uuid, validated_at = now() where id = %L::uuid',
    '3', '74100000-0000-4000-8000-000000000003', current_setting('test.diag_auth_response')
  ),
  'avaliador com diagnostic.validate registra a validação'
);
select throws_ok(
  format(
    'update public.diagnostic_responses set self_value = %L::jsonb where id = %L::uuid',
    '4', current_setting('test.diag_auth_response')
  ),
  '42501',
  'A autoavaliação exige a permissão diagnostic.respond',
  'avaliador não consegue reescrever a autoavaliação'
);

reset role;
select is(
  (select self_score from public.diagnostic_assessments where id = current_setting('test.diag_auth_assessment')::uuid),
  40.000::numeric,
  'score autodeclarado é recalculado pelo banco na escala 0–100'
);
select is(
  (select validated_score from public.diagnostic_assessments where id = current_setting('test.diag_auth_assessment')::uuid),
  60.000::numeric,
  'score validado é recalculado pelo banco na escala 0–100'
);

select * from finish();
rollback;
