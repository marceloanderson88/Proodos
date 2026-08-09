begin;

select plan(4);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);

select set_config('test.invite_org', id::text, true)
from public.organizations where slug = 'seed-org-a';
select set_config('test.invite_incubator', id::text, true)
from public.incubators
where organization_id = current_setting('test.invite_org')::uuid
  and slug = 'incubadora-sintetica-sertao';
select set_config('test.invite_startup', id::text, true)
from public.startups
where organization_id = current_setting('test.invite_org')::uuid
  and incubator_id = current_setting('test.invite_incubator')::uuid
order by created_at limit 1;
select set_config('test.invite_template', id::text, true)
from public.diagnostic_templates
where organization_id = current_setting('test.invite_org')::uuid
  and incubator_id = current_setting('test.invite_incubator')::uuid
  and status = 'published'
order by version desc limit 1;
select set_config('test.invite_role', rp.role_id::text, true)
from public.role_permissions rp
join public.roles r
  on r.organization_id = rp.organization_id and r.id = rp.role_id
where rp.organization_id = current_setting('test.invite_org')::uuid
  and rp.permission_code = 'diagnostic.respond'
  and r.scope_type = 'incubator' and r.archived_at is null
order by rp.role_id limit 1;

reset role;
insert into public.diagnostic_assessments (
  id, organization_id, incubator_id, startup_id, template_id,
  cycle_label, status, started_by
) values (
  '10000000-0000-4000-8000-000000000097',
  current_setting('test.invite_org')::uuid,
  current_setting('test.invite_incubator')::uuid,
  current_setting('test.invite_startup')::uuid,
  current_setting('test.invite_template')::uuid,
  'Teste de convite contextual', 'draft',
  '90000000-0000-4000-8000-000000000001'
);
insert into public.invitations (
  id, organization_id, email, token_hash, role_id, incubator_id,
  status, expires_at, invited_by, invited_name
) values (
  '20000000-0000-4000-8000-000000000097',
  current_setting('test.invite_org')::uuid,
  'admin-a@example.invalid', repeat('a', 64),
  current_setting('test.invite_role')::uuid,
  current_setting('test.invite_incubator')::uuid,
  'pending', now() + interval '7 days',
  '90000000-0000-4000-8000-000000000001', 'Responsável convidado'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$insert into public.diagnostic_respondent_invitations (
    organization_id, incubator_id, assessment_id, invitation_id,
    respondent_role, created_by
  ) values (
    current_setting('test.invite_org')::uuid,
    current_setting('test.invite_incubator')::uuid,
    '10000000-0000-4000-8000-000000000097',
    '20000000-0000-4000-8000-000000000097',
    'primary', '90000000-0000-4000-8000-000000000001'
  )$$,
  'gestor pode vincular convite pendente à avaliação'
);

select is(
  (select count(*) from public.diagnostic_respondents
   where assessment_id = '10000000-0000-4000-8000-000000000097'),
  0::bigint,
  'convite pendente ainda não libera acesso'
);

reset role;
update public.invitations set
  status = 'accepted',
  accepted_by = '90000000-0000-4000-8000-000000000001',
  accepted_at = now()
where id = '20000000-0000-4000-8000-000000000097';

select ok(
  exists (
    select 1 from public.diagnostic_respondents
    where assessment_id = '10000000-0000-4000-8000-000000000097'
      and user_id = '90000000-0000-4000-8000-000000000001'
      and role = 'primary' and can_submit and revoked_at is null
  ),
  'aceite cria respondente principal com permissão de envio'
);

select ok(
  exists (
    select 1 from public.diagnostic_respondent_invitations
    where invitation_id = '20000000-0000-4000-8000-000000000097'
      and respondent_user_id = '90000000-0000-4000-8000-000000000001'
      and accepted_at is not null
  ),
  'mapeamento registra usuário e aceite'
);

select * from finish();
rollback;
