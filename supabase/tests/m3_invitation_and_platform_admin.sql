-- Marco 3: bootstrap privilegiado e aceite de convite hasheado/idempotente.

begin;

select plan(1);

insert into auth.users (id, email, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('31000000-0000-4000-8000-000000000001', 'm3-platform@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('31000000-0000-4000-8000-000000000002', 'm3-invited@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('31000000-0000-4000-8000-000000000003', 'm3-outsider@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now());

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '31000000-0000-4000-8000-000000000003', true);

do $$ begin
  perform public.create_organization('Tenant indevido', 'tenant-indevido');
  raise exception 'Usuário comum criou uma organização';
exception when insufficient_privilege then null;
end $$;

reset role;
insert into private.platform_admins (user_id, reason)
values ('31000000-0000-4000-8000-000000000001', 'bootstrap sintético do teste');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '31000000-0000-4000-8000-000000000001', true);
select * from public.create_organization('Tenant de Convites', 'm3-convites');

insert into public.invitations (
  organization_id, email, token_hash, role_id, expires_at, invited_by
)
select
  o.id,
  'm3-invited@example.invalid',
  encode(extensions.digest('token-sintetico-seguro-com-mais-de-32-caracteres', 'sha256'), 'hex'),
  r.id,
  now() + interval '2 days',
  (select auth.uid())
from public.organizations o
join public.roles r on r.organization_id = o.id and r.code = 'organization_admin'
where o.slug = 'm3-convites';

select set_config('request.jwt.claim.sub', '31000000-0000-4000-8000-000000000002', true);
select * from public.accept_invitation('token-sintetico-seguro-com-mais-de-32-caracteres');
select * from public.accept_invitation('token-sintetico-seguro-com-mais-de-32-caracteres');

do $$
declare membership_count integer;
declare assignment_count integer;
begin
  select count(*) into membership_count
  from public.organization_memberships m
  where m.user_id = (select auth.uid()) and m.status = 'active';
  if membership_count <> 1 then raise exception 'Aceite deveria criar um único vínculo ativo'; end if;

  select count(*) into assignment_count
  from public.role_assignments a
  join public.organization_memberships m on m.id = a.membership_id and m.organization_id = a.organization_id
  where m.user_id = (select auth.uid());
  if assignment_count <> 1 then raise exception 'Aceite idempotente duplicou a atribuição'; end if;
end $$;

reset role;

do $$
declare audit_count integer;
begin
  select count(*) into audit_count from public.audit_logs where event_type = 'update.invitations';
  if audit_count < 1 then raise exception 'Aceite do convite não foi auditado'; end if;
end $$;

select pass('Bootstrap privilegiado e aceite de convite permanecem seguros e idempotentes');
select * from finish();

rollback;
