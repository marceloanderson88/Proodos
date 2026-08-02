-- Marco 3: isolamento CRUD entre organizações, suspensão e grants mínimos.

begin;

insert into auth.users (id, email, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('30000000-0000-4000-8000-000000000001', 'm3-admin-a@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('30000000-0000-4000-8000-000000000002', 'm3-admin-b@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now());

insert into private.platform_admins (user_id, reason) values
  ('30000000-0000-4000-8000-000000000001', 'bootstrap sintético do teste A'),
  ('30000000-0000-4000-8000-000000000002', 'bootstrap sintético do teste B');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select * from public.create_organization('Organização Teste A', 'm3-org-a');
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', true);
select * from public.create_organization('Organização Teste B', 'm3-org-b');

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);

do $$
declare visible_count integer;
declare org_a uuid;
declare org_b uuid;
declare affected integer;
begin
  select count(*) into visible_count from public.organizations;
  if visible_count <> 1 then raise exception 'A deveria ver exatamente um tenant; obteve %', visible_count; end if;

  select id into org_a from public.organizations where slug = 'm3-org-a';
  if org_a is null then raise exception 'A não consegue resolver sua organização'; end if;

  -- O tenant B não é visível por RLS, portanto o subselect resulta nulo.
  select id into org_b from public.organizations where slug = 'm3-org-b';
  if org_b is not null then raise exception 'A conseguiu ler a organização B'; end if;

  insert into public.organization_units (organization_id, name, slug, created_by)
  values (org_a, 'Unidade A', 'unidade-a', (select auth.uid()));

  select count(*) into visible_count from public.organization_units;
  if visible_count <> 1 then raise exception 'A deveria ver sua unidade'; end if;

  update public.organizations set name = 'Organização A Atualizada' where id = org_a;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Administrador A não conseguiu atualizar seu tenant'; end if;
end $$;

reset role;
select set_config('test.m3_org_b', (select id::text from public.organizations where slug = 'm3-org-b'), true);
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);

do $$
declare org_b uuid;
begin
  org_b := current_setting('test.m3_org_b')::uuid;
  begin
    insert into public.organization_units (organization_id, name, slug, created_by)
    values (org_b, 'Invasão', 'invasao', '30000000-0000-4000-8000-000000000001');
    raise exception 'A conseguiu inserir no tenant B';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;
update public.organization_memberships
set status = 'suspended', suspended_at = now()
where user_id = '30000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);

do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.organizations;
  if visible_count <> 0 then raise exception 'Membro suspenso ainda acessa o tenant'; end if;
end $$;

reset role;

do $$
begin
  if has_table_privilege('anon', 'public.organizations', 'select')
    or has_table_privilege('anon', 'public.organization_memberships', 'select')
    or has_table_privilege('anon', 'public.audit_logs', 'select') then
    raise exception 'anon recebeu acesso a tabelas multi-tenant';
  end if;

  if has_table_privilege('authenticated', 'private.platform_admins', 'select') then
    raise exception 'platform_admins foi exposta a authenticated';
  end if;

  if has_column_privilege('authenticated', 'public.invitations', 'token_hash', 'select') then
    raise exception 'authenticated consegue ler hashes de convite';
  end if;

  if has_column_privilege('authenticated', 'public.organization_units', 'organization_id', 'update') then
    raise exception 'organization_id de unidade pode ser alterado pelo cliente';
  end if;
end $$;

rollback;
