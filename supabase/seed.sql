-- Dados estritamente sintéticos para desenvolvimento local. Nunca aplicar em produção.
insert into auth.users (
  instance_id,
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  aud,
  role,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone_change,
  phone_change_token,
  email_change_token_current,
  email_change_confirm_status,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  is_sso_user,
  is_anonymous,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '90000000-0000-4000-8000-000000000001',
    'admin-a@example.invalid',
    '',
    now(),
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    0,
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin Sintético A"}'::jsonb,
    false,
    false,
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '90000000-0000-4000-8000-000000000002',
    'admin-b@example.invalid',
    '',
    now(),
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    0,
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin Sintético B"}'::jsonb,
    false,
    false,
    false,
    now(),
    now()
  )
on conflict (id) do update
set encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    confirmation_token = excluded.confirmation_token,
    recovery_token = excluded.recovery_token,
    email_change_token_new = excluded.email_change_token_new,
    email_change = excluded.email_change,
    phone_change = excluded.phone_change,
    phone_change_token = excluded.phone_change_token,
    email_change_token_current = excluded.email_change_token_current,
    email_change_confirm_status = excluded.email_change_confirm_status,
    reauthentication_token = excluded.reauthentication_token,
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    is_super_admin = excluded.is_super_admin,
    is_sso_user = excluded.is_sso_user,
    is_anonymous = excluded.is_anonymous,
    updated_at = excluded.updated_at;

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    '91000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000001',
    '{"sub":"90000000-0000-4000-8000-000000000001","email":"admin-a@example.invalid","email_verified":true}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '91000000-0000-4000-8000-000000000002',
    '90000000-0000-4000-8000-000000000002',
    '90000000-0000-4000-8000-000000000002',
    '{"sub":"90000000-0000-4000-8000-000000000002","email":"admin-b@example.invalid","email_verified":true}'::jsonb,
    'email',
    now(),
    now(),
    now()
  )
on conflict (provider_id, provider) do update
set identity_data = excluded.identity_data,
    updated_at = excluded.updated_at;

insert into private.platform_admins (user_id, reason)
values
  ('90000000-0000-4000-8000-000000000001', 'seed local sintético'),
  ('90000000-0000-4000-8000-000000000002', 'seed local sintético')
on conflict (user_id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
do $$ begin
  if not exists (select 1 from public.organizations where slug = 'seed-org-a') then
    perform public.create_organization('Incubadora Sintética A', 'seed-org-a');
  end if;
end $$;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);
do $$ begin
  if not exists (select 1 from public.organizations where slug = 'seed-org-b') then
    perform public.create_organization('Incubadora Sintética B', 'seed-org-b');
  end if;
end $$;
reset role;
