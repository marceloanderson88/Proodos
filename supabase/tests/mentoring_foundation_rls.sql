-- Mentorias: perfis, vínculos e isolamento entre gestor, mentor e startup.

begin;

select plan(1);

insert into auth.users (
  id, email, email_confirmed_at, aud, role, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
) values
  ('91000000-0000-4000-8000-000000000001', 'mentoring-admin@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('91000000-0000-4000-8000-000000000002', 'mentoring-mentor@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('91000000-0000-4000-8000-000000000003', 'mentoring-startup@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('91000000-0000-4000-8000-000000000004', 'mentoring-outsider@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now());

insert into private.platform_admins (user_id, reason)
values ('91000000-0000-4000-8000-000000000001', 'bootstrap sintético de mentorias');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select * from public.create_organization('Organização Mentorias', 'mentoring-rls');
reset role;

select set_config(
  'test.mentoring_org',
  (select id::text from public.organizations where slug = 'mentoring-rls'),
  true
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);

with inserted as (
  insert into public.incubators (organization_id, name, slug, created_by)
  values (
    current_setting('test.mentoring_org')::uuid,
    'Incubadora Mentorias',
    'incubadora-mentorias',
    '91000000-0000-4000-8000-000000000001'
  ) returning id
)
select set_config('test.mentoring_incubator', id::text, true) from inserted;

insert into public.organization_memberships (
  organization_id, user_id, status, joined_at, created_by
) values
  (current_setting('test.mentoring_org')::uuid, '91000000-0000-4000-8000-000000000002', 'active', now(), '91000000-0000-4000-8000-000000000001'),
  (current_setting('test.mentoring_org')::uuid, '91000000-0000-4000-8000-000000000003', 'active', now(), '91000000-0000-4000-8000-000000000001');

insert into public.role_assignments (
  organization_id, membership_id, role_id, incubator_id, created_by
)
select
  membership.organization_id,
  membership.id,
  role.id,
  current_setting('test.mentoring_incubator')::uuid,
  '91000000-0000-4000-8000-000000000001'
from public.organization_memberships membership
join public.roles role on role.organization_id = membership.organization_id
where membership.organization_id = current_setting('test.mentoring_org')::uuid
  and (
    (membership.user_id = '91000000-0000-4000-8000-000000000002' and role.code = 'mentor')
    or (membership.user_id = '91000000-0000-4000-8000-000000000003' and role.code = 'startup_representative')
  );

with inserted as (
  insert into public.startups (
    organization_id, incubator_id, name, stage, created_by
  ) values (
    current_setting('test.mentoring_org')::uuid,
    current_setting('test.mentoring_incubator')::uuid,
    'Startup acompanhada',
    'validation',
    '91000000-0000-4000-8000-000000000001'
  ) returning id
)
select set_config('test.mentoring_startup', id::text, true) from inserted;

insert into public.startup_members (
  organization_id, startup_id, user_id, full_name, email, role,
  is_representative, created_by
) values (
  current_setting('test.mentoring_org')::uuid,
  current_setting('test.mentoring_startup')::uuid,
  '91000000-0000-4000-8000-000000000003',
  'Representante Startup',
  'mentoring-startup@example.invalid',
  'representative',
  true,
  '91000000-0000-4000-8000-000000000001'
);

select set_config(
  'test.mentoring_profile',
  public.create_mentor_profile(
    current_setting('test.mentoring_org')::uuid,
    current_setting('test.mentoring_incubator')::uuid,
    '91000000-0000-4000-8000-000000000002',
    'Especialista em produto e crescimento',
    'Mentor experiente em validação, produto e estratégias de crescimento sustentável.',
    'America/Sao_Paulo',
    null,
    array['Produto', 'Go-to-market'],
    array['SaaS']
  )::text,
  true
);

insert into public.mentor_startup_assignments (
  organization_id, incubator_id, mentor_profile_id, startup_id, focus, created_by
) values (
  current_setting('test.mentoring_org')::uuid,
  current_setting('test.mentoring_incubator')::uuid,
  current_setting('test.mentoring_profile')::uuid,
  current_setting('test.mentoring_startup')::uuid,
  'Validar posicionamento e canais comerciais.',
  '91000000-0000-4000-8000-000000000001'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
do $$
begin
  if (select count(*) from public.mentor_profiles) <> 1
    or (select count(*) from public.mentor_startup_assignments) <> 1 then
    raise exception 'Mentor não visualizou o próprio perfil e vínculo';
  end if;
  if (select count(*) from public.startups) <> 1 then
    raise exception 'Mentor não visualizou a startup vinculada';
  end if;

  begin
    insert into public.mentor_startup_assignments (
      organization_id, incubator_id, mentor_profile_id, startup_id, created_by
    ) values (
      current_setting('test.mentoring_org')::uuid,
      current_setting('test.mentoring_incubator')::uuid,
      current_setting('test.mentoring_profile')::uuid,
      current_setting('test.mentoring_startup')::uuid,
      '91000000-0000-4000-8000-000000000002'
    );
    raise exception 'Mentor criou vínculo sem mentoring.manage';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000003', true);
do $$
begin
  if (select count(*) from public.mentor_profiles) <> 1
    or (select count(*) from public.mentor_startup_assignments) <> 1 then
    raise exception 'Startup não visualizou o mentor que lhe foi atribuído';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = '91000000-0000-4000-8000-000000000002'
  ) then
    raise exception 'Startup não visualizou a identidade do mentor vinculado';
  end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000004', true);
do $$
begin
  if exists (select 1 from public.mentor_profiles)
    or exists (select 1 from public.mentor_startup_assignments) then
    raise exception 'Pessoa externa acessou dados de mentorias';
  end if;
end $$;
reset role;

do $$
begin
  if has_table_privilege('anon', 'public.mentor_profiles', 'select')
    or has_table_privilege('anon', 'public.mentor_skills', 'select')
    or has_table_privilege('anon', 'public.mentor_startup_assignments', 'select') then
    raise exception 'anon recebeu acesso ao domínio de mentorias';
  end if;
end $$;

do $$
begin
  if not has_function_privilege(
    'authenticated',
    'private.can_access_mentor_profile(uuid,uuid,uuid)',
    'execute'
  ) or not has_function_privilege(
    'authenticated',
    'private.can_access_mentoring_assignment(uuid,uuid)',
    'execute'
  ) or not has_function_privilege(
    'authenticated',
    'private.can_access_mentoring_session(uuid,uuid)',
    'execute'
  ) then
    raise exception 'authenticated não executa helpers exigidos pelas políticas RLS de mentorias';
  end if;

  if has_function_privilege(
    'anon',
    'private.can_access_mentor_profile(uuid,uuid,uuid)',
    'execute'
  ) or has_function_privilege(
    'anon',
    'private.can_access_mentoring_assignment(uuid,uuid)',
    'execute'
  ) or has_function_privilege(
    'anon',
    'private.can_access_mentoring_session(uuid,uuid)',
    'execute'
  ) then
    raise exception 'anon executa helpers privados de mentorias';
  end if;
end $$;

select pass('Mentorias respeitam papéis, vínculo com startup e isolamento multi-tenant');
select * from finish();

rollback;
