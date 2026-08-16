begin;

select plan(4);

insert into auth.users (
  id, email, email_confirmed_at, aud, role,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('93000000-0000-4000-8000-000000000001', 'cerne-manager@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('93000000-0000-4000-8000-000000000002', 'cerne-reviewer@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now());

insert into private.platform_admins (user_id, reason)
values ('93000000-0000-4000-8000-000000000001', 'Teste da autorização CERNE');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000001', true);
select * from public.create_organization('Organização CERNE Authorization', 'cerne-authorization');
reset role;

with inserted as (
  insert into public.incubators (organization_id, name, slug, created_by)
  select id, 'Incubadora CERNE Authorization', 'incubadora-cerne-authorization',
    '93000000-0000-4000-8000-000000000001'
  from public.organizations where slug = 'cerne-authorization'
  returning organization_id, id
)
select
  set_config('test.cerne_auth_org', organization_id::text, true),
  set_config('test.cerne_auth_incubator', id::text, true)
from inserted;

with membership as (
  insert into public.organization_memberships (
    organization_id, user_id, status, joined_at, created_by
  ) values (
    current_setting('test.cerne_auth_org')::uuid,
    '93000000-0000-4000-8000-000000000002',
    'active', now(), '93000000-0000-4000-8000-000000000001'
  ) returning id, organization_id
)
insert into public.role_assignments (
  organization_id, membership_id, role_id, incubator_id, created_by
)
select membership.organization_id, membership.id, role.id,
  current_setting('test.cerne_auth_incubator')::uuid,
  '93000000-0000-4000-8000-000000000001'
from membership
join public.roles role
  on role.organization_id = membership.organization_id and role.code = 'evaluator';

insert into public.role_permissions (organization_id, role_id, permission_code)
select role.organization_id, role.id, 'cerne.review'
from public.roles role
where role.organization_id = current_setting('test.cerne_auth_org')::uuid
  and role.code = 'evaluator'
on conflict do nothing;

delete from public.role_permissions permission
using public.roles role
where role.organization_id = permission.organization_id
  and role.id = permission.role_id
  and role.organization_id = current_setting('test.cerne_auth_org')::uuid
  and role.code = 'evaluator'
  and permission.permission_code = 'cerne.read';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000001', true);
select set_config(
  'test.cerne_auth_cycle',
  public.create_cerne_cycle(
    current_setting('test.cerne_auth_org')::uuid,
    current_setting('test.cerne_auth_incubator')::uuid,
    'Ciclo de autorização', 2026, 1, current_date, current_date + 365
  )::text,
  true
);
select set_config(
  'test.cerne_auth_evidence',
  public.register_cerne_evidence(
    current_setting('test.cerne_auth_cycle')::uuid,
    requirement.practice_code,
    requirement.id,
    'Evidência de autorização',
    'Documento usado para testar o isolamento da banca.',
    'https://example.invalid/evidencia',
    'governance',
    null,
    null,
    '{}'::jsonb,
    'incubator',
    null
  )::text,
  true
)
from public.cerne_evidence_requirements requirement
where requirement.practice_code = '1.1.1'
order by requirement.name
limit 1;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select public.review_cerne_evidence(current_setting('test.cerne_auth_evidence')::uuid, 'valid', 'Parecer sem designação')$$,
  '42501', 'Evidência indisponível',
  'a permissão de avaliador sem designação não libera a evidência'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000001', true);
select set_config(
  'test.cerne_auth_assignment',
  public.assign_cerne_reviewer(
    current_setting('test.cerne_auth_cycle')::uuid,
    '93000000-0000-4000-8000-000000000002',
    '1.1.1'
  )::text,
  true
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select public.review_cerne_evidence(current_setting('test.cerne_auth_evidence')::uuid, 'valid', 'Parecer antes do aceite')$$,
  '42501', 'Evidência indisponível',
  'a designação sem confidencialidade aceita não libera a evidência'
);
select lives_ok(
  $$select public.accept_cerne_confidentiality(current_setting('test.cerne_auth_assignment')::uuid)$$,
  'o avaliador aceita a confidencialidade da designação'
);
select lives_ok(
  $$select public.review_cerne_evidence(current_setting('test.cerne_auth_evidence')::uuid, 'valid', 'Parecer após designação e aceite')$$,
  'a designação ativa e aceita permite avaliar a prática atribuída'
);
reset role;

select * from finish();
rollback;
