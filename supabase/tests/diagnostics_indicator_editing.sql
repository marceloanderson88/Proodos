begin;

select plan(7);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);

select set_config('test.indicator_org', id::text, true)
from public.organizations where slug = 'seed-org-a';
select set_config('test.indicator_incubator', id::text, true)
from public.incubators
where organization_id = current_setting('test.indicator_org')::uuid
  and slug = 'incubadora-sintetica-sertao';
select set_config('test.indicator_startup', id::text, true)
from public.startups
where organization_id = current_setting('test.indicator_org')::uuid
  and incubator_id = current_setting('test.indicator_incubator')::uuid
order by created_at limit 1;
select set_config('test.indicator_template', id::text, true)
from public.diagnostic_templates
where organization_id = current_setting('test.indicator_org')::uuid
  and incubator_id = current_setting('test.indicator_incubator')::uuid
  and status = 'published'
order by version desc limit 1;
select set_config('test.indicator_manual', id::text, true)
from public.diagnostic_indicator_definitions
where template_id = current_setting('test.indicator_template')::uuid
  and not is_derived
order by position limit 1;
select set_config('test.indicator_derived', id::text, true)
from public.diagnostic_indicator_definitions
where template_id = current_setting('test.indicator_template')::uuid
  and is_derived
order by position limit 1;
select set_config('test.indicator_burn', id::text, true)
from public.diagnostic_indicator_definitions
where template_id = current_setting('test.indicator_template')::uuid
  and code = 'monthly_burn';

reset role;
with inserted as (
  insert into public.diagnostic_assessments (
    organization_id, incubator_id, startup_id, template_id,
    cycle_label, status, started_by
  ) values (
    current_setting('test.indicator_org')::uuid,
    current_setting('test.indicator_incubator')::uuid,
    current_setting('test.indicator_startup')::uuid,
    current_setting('test.indicator_template')::uuid,
    'Teste de indicadores', 'draft',
    '90000000-0000-4000-8000-000000000001'
  ) returning id
) select set_config('test.indicator_assessment', id::text, true) from inserted;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);

select lives_ok(
  format(
    $sql$select * from public.save_diagnostic_indicator_value(%L::uuid, %L::uuid, 0, 8500.50, 10000, false, null, 'Relatório financeiro')$sql$,
    current_setting('test.indicator_assessment'),
    current_setting('test.indicator_manual')
  ),
  'indicador manual é salvo com a versão atual'
);

select is(
  (select numeric_value from public.diagnostic_indicator_values
   where assessment_id = current_setting('test.indicator_assessment')::uuid
     and indicator_definition_id = current_setting('test.indicator_manual')::uuid),
  8500.5000::numeric,
  'valor e escopo do indicador são persistidos'
);

select is(
  (select lock_version from public.diagnostic_assessments
   where id = current_setting('test.indicator_assessment')::uuid),
  1::bigint,
  'salvamento incrementa lock_version atomicamente'
);

select throws_ok(
  format(
    $sql$select * from public.save_diagnostic_indicator_value(%L::uuid, %L::uuid, 0, 9000, null, false, null, '')$sql$,
    current_setting('test.indicator_assessment'),
    current_setting('test.indicator_manual')
  ),
  '40001',
  'A versão do diagnóstico foi alterada por outra sessão',
  'versão obsoleta não sobrescreve o indicador'
);

select throws_ok(
  format(
    $sql$select * from public.save_diagnostic_indicator_value(%L::uuid, %L::uuid, 1, 2.5, null, false, null, '')$sql$,
    current_setting('test.indicator_assessment'),
    current_setting('test.indicator_derived')
  ),
  '42501',
  'Indicadores derivados são calculados pelo sistema',
  'indicador derivado não pode ser sobrescrito manualmente'
);

select lives_ok(
  format(
    $sql$select * from public.save_diagnostic_indicator_value(%L::uuid, %L::uuid, 1, 2000, null, false, null, 'Fluxo de caixa')$sql$,
    current_setting('test.indicator_assessment'),
    current_setting('test.indicator_burn')
  ),
  'segunda entrada da fórmula é salva'
);

select is(
  (select numeric_value from public.diagnostic_indicator_values
   where assessment_id = current_setting('test.indicator_assessment')::uuid
     and indicator_definition_id = current_setting('test.indicator_derived')::uuid),
  4.2503::numeric,
  'runway é derivado automaticamente com precisão do banco'
);

select * from finish();
rollback;
