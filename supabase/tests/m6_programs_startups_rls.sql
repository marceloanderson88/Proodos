-- Marco 6: fluxo vertical, isolamento cross-tenant e acesso restrito da startup.

begin;

select plan(1);

insert into auth.users (id, email, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('60000000-0000-4000-8000-000000000001', 'm6-admin-a@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('60000000-0000-4000-8000-000000000002', 'm6-admin-b@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('60000000-0000-4000-8000-000000000003', 'm6-representative@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now());

insert into private.platform_admins (user_id, reason) values
  ('60000000-0000-4000-8000-000000000001', 'bootstrap sintético M6 A'),
  ('60000000-0000-4000-8000-000000000002', 'bootstrap sintético M6 B');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select * from public.create_organization('Organização M6 A', 'm6-vertical-a');
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
select * from public.create_organization('Organização M6 B', 'm6-vertical-b');
reset role;

select set_config('test.m6_org_a', (select id::text from public.organizations where slug = 'm6-vertical-a'), true);
select set_config('test.m6_org_b', (select id::text from public.organizations where slug = 'm6-vertical-b'), true);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);

insert into public.organization_memberships (organization_id, user_id, status, joined_at, created_by)
values (current_setting('test.m6_org_a')::uuid, '60000000-0000-4000-8000-000000000003', 'active', now(), '60000000-0000-4000-8000-000000000001');

with inserted as (
  insert into public.incubators (organization_id, name, slug, created_by)
  values (current_setting('test.m6_org_a')::uuid, 'Incubadora M6 A', 'incubadora-m6-a', '60000000-0000-4000-8000-000000000001')
  returning id
)
select set_config('test.m6_incubator_a', id::text, true) from inserted;

with inserted as (
  insert into public.program_types (organization_id, incubator_id, code, name, created_by)
  values (current_setting('test.m6_org_a')::uuid, current_setting('test.m6_incubator_a')::uuid, 'incubacao', 'Incubação', '60000000-0000-4000-8000-000000000001')
  returning id
)
select set_config('test.m6_program_type_a', id::text, true) from inserted;

with inserted as (
  insert into public.programs (organization_id, incubator_id, type_id, code, name, status, created_by)
  values (current_setting('test.m6_org_a')::uuid, current_setting('test.m6_incubator_a')::uuid, current_setting('test.m6_program_type_a')::uuid, 'M6-A', 'Programa M6 A', 'active', '60000000-0000-4000-8000-000000000001')
  returning id
)
select set_config('test.m6_program_a', id::text, true) from inserted;

with inserted as (
  insert into public.cohorts (organization_id, program_id, code, name, status, created_by)
  values (current_setting('test.m6_org_a')::uuid, current_setting('test.m6_program_a')::uuid, 'T-A', 'Turma M6 A', 'active', '60000000-0000-4000-8000-000000000001')
  returning id
)
select set_config('test.m6_cohort_a', id::text, true) from inserted;

with inserted as (
  insert into public.cohorts (organization_id, program_id, code, name, status, created_by)
  values (current_setting('test.m6_org_a')::uuid, current_setting('test.m6_program_a')::uuid, 'T-B', 'Turma M6 B', 'planned', '60000000-0000-4000-8000-000000000001')
  returning id
)
select set_config('test.m6_cohort_b', id::text, true) from inserted;

with inserted as (
  insert into public.startups (organization_id, incubator_id, name, stage, created_by)
  values (current_setting('test.m6_org_a')::uuid, current_setting('test.m6_incubator_a')::uuid, 'Startup M6 A1', 'validation', '60000000-0000-4000-8000-000000000001')
  returning id
)
select set_config('test.m6_startup_a1', id::text, true) from inserted;

with inserted as (
  insert into public.startups (organization_id, incubator_id, name, stage, created_by)
  values (current_setting('test.m6_org_a')::uuid, current_setting('test.m6_incubator_a')::uuid, 'Startup M6 A2', 'idea', '60000000-0000-4000-8000-000000000001')
  returning id
)
select set_config('test.m6_startup_a2', id::text, true) from inserted;

insert into public.startup_members (organization_id, startup_id, user_id, full_name, email, role, is_representative, created_by)
values (current_setting('test.m6_org_a')::uuid, current_setting('test.m6_startup_a1')::uuid, '60000000-0000-4000-8000-000000000003', 'Representante M6', 'm6-representative@example.invalid', 'representative', true, '60000000-0000-4000-8000-000000000001');

insert into public.startup_enrollments (organization_id, startup_id, cohort_id, created_by)
values (current_setting('test.m6_org_a')::uuid, current_setting('test.m6_startup_a1')::uuid, current_setting('test.m6_cohort_a')::uuid, '60000000-0000-4000-8000-000000000001');

select public.transfer_startup_enrollment(
  current_setting('test.m6_startup_a1')::uuid,
  current_setting('test.m6_cohort_b')::uuid,
  current_date
);

do $$
declare visible_count integer;
declare history_count integer;
begin
  select count(*) into visible_count from public.startups;
  if visible_count <> 2 then raise exception 'Administrador A deveria ver duas startups próprias; obteve %', visible_count; end if;

  select count(*) into history_count from public.startup_history where startup_id = current_setting('test.m6_startup_a1')::uuid;
  if history_count < 3 then raise exception 'Linha do tempo não registrou cadastro, equipe e matrícula'; end if;

  if not exists (select 1 from public.startup_enrollments where startup_id = current_setting('test.m6_startup_a1')::uuid) then
    raise exception 'Matrícula do fluxo vertical não ficou visível';
  end if;

  if (select count(*) from public.startup_enrollments where startup_id = current_setting('test.m6_startup_a1')::uuid) <> 2
    or not exists (
      select 1 from public.startup_enrollments
      where startup_id = current_setting('test.m6_startup_a1')::uuid
        and cohort_id = current_setting('test.m6_cohort_a')::uuid
        and status = 'transferred'
    )
    or not exists (
      select 1 from public.startup_enrollments
      where startup_id = current_setting('test.m6_startup_a1')::uuid
        and cohort_id = current_setting('test.m6_cohort_b')::uuid
        and status = 'active'
        and previous_enrollment_id is not null
    ) then
    raise exception 'Transferência não preservou matrícula anterior e novo vínculo';
  end if;
end $$;

reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);

with inserted as (
  insert into public.incubators (organization_id, name, slug, created_by)
  values (current_setting('test.m6_org_b')::uuid, 'Incubadora M6 B', 'incubadora-m6-b', '60000000-0000-4000-8000-000000000002')
  returning id
)
select set_config('test.m6_incubator_b', id::text, true) from inserted;

with inserted as (
  insert into public.startups (organization_id, incubator_id, name, created_by)
  values (current_setting('test.m6_org_b')::uuid, current_setting('test.m6_incubator_b')::uuid, 'Startup M6 B', '60000000-0000-4000-8000-000000000002')
  returning id
)
select set_config('test.m6_startup_b', id::text, true) from inserted;

do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.startups;
  if visible_count <> 1 then raise exception 'Administrador B deveria ver apenas a startup B; obteve %', visible_count; end if;
end $$;

reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000003', true);

do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.startups;
  if visible_count <> 1 then raise exception 'Representante deveria ver somente a própria startup; obteve %', visible_count; end if;

  if not exists (select 1 from public.startups where id = current_setting('test.m6_startup_a1')::uuid) then
    raise exception 'Representante não acessou a própria startup';
  end if;

  begin
    insert into public.startups (organization_id, incubator_id, name, created_by)
    values (current_setting('test.m6_org_b')::uuid, current_setting('test.m6_incubator_b')::uuid, 'Invasão M6', '60000000-0000-4000-8000-000000000003');
    raise exception 'Representante inseriu startup em outro tenant';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

do $$
begin
  if has_table_privilege('anon', 'public.programs', 'select')
    or has_table_privilege('anon', 'public.startups', 'select')
    or has_table_privilege('anon', 'public.startup_history', 'select') then
    raise exception 'anon recebeu acesso ao domínio do Marco 6';
  end if;

  if has_column_privilege('authenticated', 'public.startups', 'organization_id', 'update')
    or has_column_privilege('authenticated', 'public.startup_enrollments', 'cohort_id', 'update') then
    raise exception 'Coluna estrutural pode ser alterada diretamente pelo cliente';
  end if;
end $$;

select pass('Fluxo programa-turma-startup, histórico e isolamento do Marco 6 foram verificados');
select * from finish();

rollback;
