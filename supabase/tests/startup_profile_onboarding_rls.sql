begin;

select plan(1);

insert into auth.users (id, email, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('91000000-0000-4000-8000-000000000001', 'startup-flow-admin@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('91000000-0000-4000-8000-000000000002', 'startup-flow-applicant@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('91000000-0000-4000-8000-000000000003', 'startup-flow-outsider@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now());

insert into private.platform_admins (user_id, reason)
values ('91000000-0000-4000-8000-000000000001', 'Teste do onboarding de startups');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select * from public.create_organization('Organização Startup Flow', 'startup-flow');

with inserted as (
  insert into public.incubators (organization_id, name, slug, created_by)
  select id, 'Incubadora Startup Flow', 'incubadora-startup-flow', '91000000-0000-4000-8000-000000000001'
  from public.organizations where slug = 'startup-flow'
  returning organization_id, id
)
select
  set_config('test.startup_flow_org', organization_id::text, true),
  set_config('test.startup_flow_incubator', id::text, true)
from inserted;
reset role;

with inserted as (
  insert into public.startup_applications (
    organization_id, incubator_id, applicant_user_id, applicant_name,
    applicant_email, startup_name, sector, stage
  ) values (
    current_setting('test.startup_flow_org')::uuid,
    current_setting('test.startup_flow_incubator')::uuid,
    '91000000-0000-4000-8000-000000000002',
    'Representante Teste', 'startup-flow-applicant@example.invalid',
    'Startup Solicitante', 'Tecnologia', 'validation'
  ) returning id
)
select set_config('test.startup_flow_application', id::text, true) from inserted;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
do $$ begin
  if (select count(*) from public.startup_applications) <> 1 then
    raise exception 'Solicitante não visualizou a própria solicitação';
  end if;
  if exists (select 1 from public.startups where name = 'Startup Solicitante') then
    raise exception 'Solicitação pendente apareceu prematuramente no portfólio';
  end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000003', true);
do $$ begin
  if exists (select 1 from public.startup_applications) then
    raise exception 'Usuário externo visualizou solicitação de outro contexto';
  end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select public.review_startup_application(
  current_setting('test.startup_flow_application')::uuid, 'approve', 'Aprovada no teste'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
do $$ begin
  if not exists (
    select 1 from public.startup_applications
    where status = 'approved' and startup_id is not null
  ) then raise exception 'Solicitação não foi aprovada'; end if;
  if not exists (
    select 1 from public.startups s
    join public.startup_members sm on sm.organization_id = s.organization_id and sm.startup_id = s.id
    where s.name = 'Startup Solicitante'
      and sm.user_id = '91000000-0000-4000-8000-000000000002'
      and sm.is_representative
  ) then raise exception 'Startup e representante não foram ativados de forma transacional'; end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
with inserted as (
  insert into public.invitations (
    organization_id, incubator_id, invited_name, email, role_id,
    token_hash, expires_at, invited_by
  )
  select
    current_setting('test.startup_flow_org')::uuid,
    current_setting('test.startup_flow_incubator')::uuid,
    'Representante Convidado', 'startup-flow-outsider@example.invalid', r.id,
    encode(digest('startup-flow-invite-token-00000001', 'sha256'), 'hex'),
    now() + interval '1 day', '91000000-0000-4000-8000-000000000001'
  from public.roles r
  where r.organization_id = current_setting('test.startup_flow_org')::uuid
    and r.code = 'startup_representative'
  returning id
)
insert into public.startup_onboarding_invitations (
  invitation_id, organization_id, incubator_id, startup_name, created_by
)
select
  id, current_setting('test.startup_flow_org')::uuid,
  current_setting('test.startup_flow_incubator')::uuid,
  'Startup Convidada', '91000000-0000-4000-8000-000000000001'
from inserted;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000003', true);
select public.accept_invitation('startup-flow-invite-token-00000001');
do $$ begin
  if not exists (
    select 1
    from public.startups s
    join public.startup_members sm
      on sm.organization_id = s.organization_id and sm.startup_id = s.id
    where s.name = 'Startup Convidada'
      and sm.user_id = '91000000-0000-4000-8000-000000000003'
      and sm.is_representative
  ) then
    raise exception 'Aceite do convite não criou startup e representante';
  end if;
end $$;
reset role;

do $$ begin
  if has_table_privilege('anon', 'public.startup_applications', 'select')
    or has_table_privilege('anon', 'public.startup_onboarding_invitations', 'select') then
    raise exception 'anon recebeu acesso aos dados de onboarding';
  end if;
end $$;

select pass('Perfil, aprovação, vínculo do representante e isolamento do onboarding foram verificados');
select * from finish();

rollback;
