-- Marco 4: isolamento dos metadados, grants mínimos e máquina de estados.

begin;

select plan(1);

insert into auth.users (id, email, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('40000000-0000-4000-8000-000000000001', 'm4-admin-a@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('40000000-0000-4000-8000-000000000002', 'm4-admin-b@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('40000000-0000-4000-8000-000000000003', 'm4-auditor@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now());

insert into private.platform_admins (user_id, reason) values
  ('40000000-0000-4000-8000-000000000001', 'bootstrap sintético M4 A'),
  ('40000000-0000-4000-8000-000000000002', 'bootstrap sintético M4 B');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);
select * from public.create_organization('Arquivos Teste A', 'm4-files-a');

insert into public.files (
  organization_id, original_name, display_name, mime_type,
  expected_size_bytes, classification, created_by
)
select id, 'evidencia-a.pdf', 'Evidência A', 'application/pdf', 2048, 'confidential', (select auth.uid())
from public.organizations where slug = 'm4-files-a';

select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000002', true);
select * from public.create_organization('Arquivos Teste B', 'm4-files-b');

insert into public.files (
  organization_id, original_name, display_name, mime_type,
  expected_size_bytes, classification, created_by
)
select id, 'evidencia-b.pdf', 'Evidência B', 'application/pdf', 4096, 'restricted', (select auth.uid())
from public.organizations where slug = 'm4-files-b';

reset role;
select set_config('test.m4_org_a', (select id::text from public.organizations where slug = 'm4-files-a'), true);
select set_config('test.m4_org_b', (select id::text from public.organizations where slug = 'm4-files-b'), true);
select set_config('test.m4_file_a', (select id::text from public.files where display_name = 'Evidência A'), true);
select set_config('test.m4_file_b', (select id::text from public.files where display_name = 'Evidência B'), true);

with new_membership as (
  insert into public.organization_memberships (organization_id, user_id, status, joined_at, created_by)
  values (
    current_setting('test.m4_org_a')::uuid,
    '40000000-0000-4000-8000-000000000003',
    'active',
    now(),
    '40000000-0000-4000-8000-000000000001'
  ) returning id, organization_id
)
insert into public.role_assignments (organization_id, membership_id, role_id, created_by)
select m.organization_id, m.id, r.id, '40000000-0000-4000-8000-000000000001'
from new_membership m
join public.roles r on r.organization_id = m.organization_id and r.code = 'auditor';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);

do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.files;
  if visible_count <> 1 then raise exception 'A deveria ver somente seu arquivo pendente; obteve %', visible_count; end if;

  insert into public.file_links (organization_id, file_id, purpose, created_by)
  values (
    current_setting('test.m4_org_a')::uuid,
    current_setting('test.m4_file_a')::uuid,
    'organization_document',
    (select auth.uid())
  );

  begin
    insert into public.files (
      organization_id, original_name, display_name, mime_type,
      expected_size_bytes, classification, created_by
    ) values (
      current_setting('test.m4_org_b')::uuid,
      'invasao.pdf', 'Invasão', 'application/pdf', 100, 'internal', (select auth.uid())
    );
    raise exception 'A conseguiu inserir metadados no tenant B';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000003', true);
do $$
declare file_count integer;
declare link_count integer;
begin
  select count(*) into file_count from public.files;
  select count(*) into link_count from public.file_links;
  if file_count <> 0 or link_count <> 0 then
    raise exception 'Leitor enxergou arquivo ou vínculo ainda pendente';
  end if;
end $$;

reset role;

insert into public.organization_units (organization_id, name, slug, created_by)
values (
  current_setting('test.m4_org_b')::uuid,
  'Unidade B',
  'unidade-b',
  '40000000-0000-4000-8000-000000000002'
);

do $$ begin
  insert into public.file_links (organization_id, file_id, unit_id, purpose, created_by)
  values (
    current_setting('test.m4_org_a')::uuid,
    current_setting('test.m4_file_a')::uuid,
    (select id from public.organization_units where slug = 'unidade-b'),
    'unit_document',
    '40000000-0000-4000-8000-000000000001'
  );
  raise exception 'FK permitiu vínculo de arquivo com unidade de outro tenant';
exception when foreign_key_violation then null;
end $$;

update public.files set status = 'uploading'
where id = current_setting('test.m4_file_a')::uuid;
update public.files set status = 'validating'
where id = current_setting('test.m4_file_a')::uuid;
update public.files
set status = 'available', provider_file_id = 'drive-file-a', provider_drive_id = 'shared-drive-a',
    size_bytes = 2048, current_version_number = 1
where id = current_setting('test.m4_file_a')::uuid;

insert into public.file_versions (
  organization_id, file_id, version_number, provider_file_id,
  mime_type, size_bytes, created_by
) values (
  current_setting('test.m4_org_a')::uuid,
  current_setting('test.m4_file_a')::uuid,
  1,
  'drive-file-a',
  'application/pdf',
  2048,
  '40000000-0000-4000-8000-000000000001'
);

do $$
declare transition_blocked boolean := false;
begin
  begin
    update public.files set status = 'pending'
    where id = current_setting('test.m4_file_a')::uuid;
  exception when raise_exception then
    transition_blocked := true;
  end;
  if not transition_blocked then
    raise exception 'Máquina de estados aceitou available -> pending';
  end if;
end $$;

insert into public.upload_sessions (
  organization_id, file_id, idempotency_key, expected_size_bytes, expires_at, created_by
) values (
  current_setting('test.m4_org_a')::uuid,
  current_setting('test.m4_file_a')::uuid,
  'm4:test:session:0001',
  2048,
  now() + interval '1 hour',
  '40000000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000003', true);

do $$
declare file_count integer;
declare version_count integer;
declare link_count integer;
declare session_count integer;
begin
  select count(*) into file_count from public.files;
  select count(*) into version_count from public.file_versions;
  select count(*) into link_count from public.file_links;
  select count(*) into session_count from public.upload_sessions;
  if file_count <> 1 or version_count <> 1 or link_count <> 1 then
    raise exception 'Auditor deveria ver arquivo disponível, versão e vínculo';
  end if;
  if session_count <> 0 then raise exception 'Leitor sem file.manage enxergou sessão de upload'; end if;
end $$;

reset role;

do $$ begin
  if has_table_privilege('anon', 'public.files', 'select')
    or has_table_privilege('anon', 'public.file_access_logs', 'select') then
    raise exception 'anon recebeu acesso aos metadados de arquivos';
  end if;
  if has_column_privilege('authenticated', 'public.files', 'status', 'update')
    or has_column_privilege('authenticated', 'public.files', 'provider_file_id', 'update') then
    raise exception 'Cliente consegue forjar conclusão do upload';
  end if;
  if has_table_privilege('authenticated', 'public.file_versions', 'insert')
    or has_table_privilege('authenticated', 'public.file_access_logs', 'insert')
    or has_table_privilege('authenticated', 'public.upload_sessions', 'insert') then
    raise exception 'Tabelas reservadas ao backend receberam grants de escrita';
  end if;
end $$;

select pass('Metadados de arquivos, grants e máquina de estados respeitam o tenant');
select * from finish();

rollback;
