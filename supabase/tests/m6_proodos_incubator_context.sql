begin;

select plan(1);

do $$
declare
  test_org_id uuid := '73000000-0000-4000-8000-000000000001';
  test_user_id uuid := '73000000-0000-4000-8000-000000000002';
  membership_id uuid;
  admin_role_id uuid;
  empty_incubator_id uuid := '73000000-0000-4000-8000-000000000003';
  linked_incubator_id uuid := '73000000-0000-4000-8000-000000000004';
  program_type_id uuid := '73000000-0000-4000-8000-000000000005';
begin
  insert into auth.users (id, email, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (test_user_id, 'proodos-admin@example.test', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now());
  insert into public.organizations (id, name, slug, created_by)
  values (test_org_id, 'Proodos Teste', 'proodos-teste', test_user_id);
  insert into public.organization_memberships (organization_id, user_id, status, joined_at, created_by)
  values (test_org_id, test_user_id, 'active', now(), test_user_id)
  returning id into membership_id;
  insert into public.roles (organization_id, code, name, description, scope_type, is_system)
  values (
    test_org_id,
    'organization_admin',
    'Administrador',
    'Administrador de teste da organização.',
    'organization',
    true
  )
  returning id into admin_role_id;
  insert into public.role_permissions (organization_id, role_id, permission_code)
  values (test_org_id, admin_role_id, 'incubator.manage'), (test_org_id, admin_role_id, 'incubator.read');
  insert into public.role_assignments (organization_id, membership_id, role_id, created_by)
  values (test_org_id, membership_id, admin_role_id, test_user_id);
  insert into public.incubators (id, organization_id, name, slug, created_by)
  values
    (empty_incubator_id, test_org_id, 'Vazia', 'vazia', test_user_id),
    (linked_incubator_id, test_org_id, 'Com dados', 'com-dados', test_user_id);
  insert into public.program_types (id, organization_id, incubator_id, code, name, created_by)
  values (program_type_id, test_org_id, linked_incubator_id, 'incubacao', 'Incubação', test_user_id);

end $$;

select set_config('request.jwt.claim.sub', '73000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $$
begin
  if public.manage_incubator_lifecycle('73000000-0000-4000-8000-000000000003', 'delete') <> 'deleted' then
    raise exception 'Incubadora vazia não foi excluída';
  end if;
  begin
    perform public.manage_incubator_lifecycle('73000000-0000-4000-8000-000000000004', 'delete');
    raise exception 'Incubadora vinculada foi excluída';
  exception when check_violation then null;
  end;
  if public.manage_incubator_lifecycle('73000000-0000-4000-8000-000000000004', 'archive') <> 'archived' then
    raise exception 'Incubadora vinculada não foi arquivada';
  end if;
  if public.manage_incubator_lifecycle('73000000-0000-4000-8000-000000000004', 'restore') <> 'restored' then
    raise exception 'Incubadora não foi reativada';
  end if;
end $$;

reset role;
select pass('Ciclo de vida administrativo das incubadoras foi verificado');
select * from finish();
rollback;
