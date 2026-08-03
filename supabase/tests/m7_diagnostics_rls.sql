-- Marco 7: diagnóstico sempre ligado à startup e isolado por organização/incubadora.
begin;

select plan(2);

insert into auth.users (id, email, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('74000000-0000-4000-8000-000000000001', 'm7-admin-a@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('74000000-0000-4000-8000-000000000002', 'm7-admin-b@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now());

insert into private.platform_admins (user_id, reason) values
  ('74000000-0000-4000-8000-000000000001', 'bootstrap sintético M7 A'),
  ('74000000-0000-4000-8000-000000000002', 'bootstrap sintético M7 B');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '74000000-0000-4000-8000-000000000001', true);
select * from public.create_organization('Organização M7 A', 'm7-diagnostics-a');
select set_config('request.jwt.claim.sub', '74000000-0000-4000-8000-000000000002', true);
select * from public.create_organization('Organização M7 B', 'm7-diagnostics-b');
reset role;

select set_config('test.m7_org_a', (select id::text from public.organizations where slug = 'm7-diagnostics-a'), true);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '74000000-0000-4000-8000-000000000001', true);

with inserted as (
  insert into public.incubators (organization_id, name, slug, created_by)
  values (current_setting('test.m7_org_a')::uuid, 'Incubadora M7 A', 'incubadora-m7-a', '74000000-0000-4000-8000-000000000001') returning id
) select set_config('test.m7_incubator_a', id::text, true) from inserted;
with inserted as (
  insert into public.startups (organization_id, incubator_id, name, stage, created_by)
  values (current_setting('test.m7_org_a')::uuid, current_setting('test.m7_incubator_a')::uuid, 'Startup M7 A', 'validation', '74000000-0000-4000-8000-000000000001') returning id
) select set_config('test.m7_startup_a', id::text, true) from inserted;
with inserted as (
  insert into public.diagnostic_templates (organization_id, incubator_id, name, created_by)
  values (current_setting('test.m7_org_a')::uuid, current_setting('test.m7_incubator_a')::uuid, 'Maturidade M7', '74000000-0000-4000-8000-000000000001') returning id
) select set_config('test.m7_template_a', id::text, true) from inserted;
with inserted as (
  insert into public.diagnostic_dimensions (organization_id, incubator_id, template_id, name, position)
  values (current_setting('test.m7_org_a')::uuid, current_setting('test.m7_incubator_a')::uuid, current_setting('test.m7_template_a')::uuid, 'Mercado', 0) returning id
) select set_config('test.m7_dimension_a', id::text, true) from inserted;
insert into public.diagnostic_criteria (organization_id, incubator_id, template_id, dimension_id, prompt, response_type, maximum_score, position)
values (current_setting('test.m7_org_a')::uuid, current_setting('test.m7_incubator_a')::uuid, current_setting('test.m7_template_a')::uuid, current_setting('test.m7_dimension_a')::uuid, 'A startup validou o problema?', 'numeric', 5, 0);
update public.diagnostic_templates set status = 'published', published_at = now() where id = current_setting('test.m7_template_a')::uuid;
insert into public.diagnostic_assessments (organization_id, incubator_id, startup_id, template_id, cycle_label, started_by)
values (current_setting('test.m7_org_a')::uuid, current_setting('test.m7_incubator_a')::uuid, current_setting('test.m7_startup_a')::uuid, current_setting('test.m7_template_a')::uuid, 'Entrada 2026.2', '74000000-0000-4000-8000-000000000001');

select is((select count(*)::integer from public.diagnostic_assessments), 1, 'Administrador A acessa o diagnóstico ligado à sua startup');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '74000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.diagnostic_assessments), 0, 'Administrador B não enxerga diagnósticos do tenant A');

select * from finish();
rollback;
