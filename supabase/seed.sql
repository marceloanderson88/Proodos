-- Dados estritamente sintéticos para desenvolvimento local. Nunca aplicar em produção.
insert into auth.users (id, email, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('90000000-0000-4000-8000-000000000001', 'admin-a@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{"full_name":"Admin Sintético A"}'::jsonb, now(), now()),
  ('90000000-0000-4000-8000-000000000002', 'admin-b@example.invalid', now(), 'authenticated', 'authenticated', '{}'::jsonb, '{"full_name":"Admin Sintético B"}'::jsonb, now(), now())
on conflict (id) do nothing;

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
