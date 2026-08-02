-- Teste transacional: provisionamento de perfil e isolamento por auth.uid().

begin;

select plan(1);

insert into auth.users (
  id,
  email,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'm2-user-a@example.invalid',
    'authenticated',
    'authenticated',
    '{}'::jsonb,
    '{"full_name":"Usuário A"}'::jsonb,
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'm2-user-b@example.invalid',
    'authenticated',
    'authenticated',
    '{}'::jsonb,
    '{"full_name":"Usuário B"}'::jsonb,
    now(),
    now()
  );

do $$
declare
  provisioned integer;
begin
  select count(*) into provisioned
  from public.profiles
  where id in (
    '10000000-0000-4000-8000-000000000001'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid
  );

  if provisioned <> 2 then
    raise exception 'O trigger deveria provisionar exatamente dois perfis; obteve %', provisioned;
  end if;
end
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  visible integer;
  affected integer;
begin
  select count(*) into visible from public.profiles;
  if visible <> 1 then
    raise exception 'Usuário A deveria enxergar um perfil; obteve %', visible;
  end if;

  update public.profiles
  set display_name = 'Tentativa indevida'
  where id = '10000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Usuário A conseguiu atualizar o perfil do usuário B';
  end if;

  update public.profiles
  set display_name = 'Nome atualizado'
  where id = '10000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Usuário A não conseguiu atualizar o próprio perfil';
  end if;
end
$$;

reset role;

do $$
begin
  if has_table_privilege('anon', 'public.profiles', 'select') then
    raise exception 'anon não pode possuir SELECT em profiles';
  end if;

  if has_column_privilege('authenticated', 'public.profiles', 'id', 'update') then
    raise exception 'authenticated não pode alterar o identificador do perfil';
  end if;

  if has_function_privilege('public', 'private.handle_new_user()', 'execute')
    or has_function_privilege('anon', 'private.handle_new_user()', 'execute')
    or has_function_privilege('authenticated', 'private.handle_new_user()', 'execute') then
    raise exception 'A função de provisionamento não pode ser executável por clientes';
  end if;
end
$$;

select pass('Provisionamento e isolamento de perfis foram verificados');
select * from finish();

rollback;
