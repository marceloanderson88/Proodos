begin;

select plan(4);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);

select set_config('test.autosave_org', id::text, true)
from public.organizations where slug = 'seed-org-a';
select set_config('test.autosave_incubator', id::text, true)
from public.incubators
where organization_id = current_setting('test.autosave_org')::uuid
  and slug = 'incubadora-sintetica-sertao';
select set_config('test.autosave_startup', id::text, true)
from public.startups
where organization_id = current_setting('test.autosave_org')::uuid
  and incubator_id = current_setting('test.autosave_incubator')::uuid
order by created_at limit 1;
select set_config('test.autosave_template', id::text, true)
from public.diagnostic_templates
where organization_id = current_setting('test.autosave_org')::uuid
  and incubator_id = current_setting('test.autosave_incubator')::uuid
  and status = 'published'
order by version desc limit 1;
select set_config('test.autosave_criterion', id::text, true)
from public.diagnostic_criteria
where organization_id = current_setting('test.autosave_org')::uuid
  and template_id = current_setting('test.autosave_template')::uuid
order by position limit 1;

-- A criação da avaliação é coberta por m7_diagnostics_rls.sql; este fixture
-- isola somente o contrato de autosave e concorrência.
reset role;
with inserted as (
  insert into public.diagnostic_assessments (
    organization_id, incubator_id, startup_id, template_id,
    cycle_label, status, started_by
  ) values (
    current_setting('test.autosave_org')::uuid,
    current_setting('test.autosave_incubator')::uuid,
    current_setting('test.autosave_startup')::uuid,
    current_setting('test.autosave_template')::uuid,
    'Teste de concorrência', 'draft',
    '90000000-0000-4000-8000-000000000001'
  ) returning id
) select set_config('test.autosave_assessment', id::text, true) from inserted;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);

select lives_ok(
  format(
    $sql$select * from public.autosave_diagnostic_response(%L::uuid, %L::uuid, 0, '3'::jsonb, false, null, 'Primeira sessão', '')$sql$,
    current_setting('test.autosave_assessment'),
    current_setting('test.autosave_criterion')
  ),
  'primeiro autosave com versão atual é aceito'
);

select is(
  (select lock_version from public.diagnostic_assessments
   where id = current_setting('test.autosave_assessment')::uuid),
  1::bigint,
  'autosave incrementa lock_version atomicamente'
);

select is(
  (select self_value from public.diagnostic_responses
   where assessment_id = current_setting('test.autosave_assessment')::uuid
     and criterion_id = current_setting('test.autosave_criterion')::uuid),
  '3'::jsonb,
  'resposta é persistida no critério correto'
);

select throws_ok(
  format(
    $sql$select * from public.autosave_diagnostic_response(%L::uuid, %L::uuid, 0, '4'::jsonb, false, null, 'Sessão obsoleta', '')$sql$,
    current_setting('test.autosave_assessment'),
    current_setting('test.autosave_criterion')
  ),
  '40001',
  'A versão do diagnóstico foi alterada por outra sessão',
  'versão obsoleta não sobrescreve a resposta'
);

select * from finish();
rollback;
