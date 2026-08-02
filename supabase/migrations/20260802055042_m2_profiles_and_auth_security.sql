-- Marco 2: perfil mínimo, provisionamento transacional e políticas de acesso próprio.
-- Nenhum campo desta tabela participa de autorização; identidade vem de auth.users.

begin;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  locale text not null default 'pt-BR',
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_valid check (
    display_name is null
    or (
      display_name = btrim(display_name)
      and char_length(display_name) between 1 and 120
    )
  ),
  constraint profiles_avatar_url_length check (
    avatar_url is null or char_length(avatar_url) <= 2048
  ),
  constraint profiles_locale_valid check (
    locale = btrim(locale) and char_length(locale) between 2 and 35
  ),
  constraint profiles_timezone_valid check (
    timezone = btrim(timezone) and char_length(timezone) between 1 and 100
  )
);

comment on table public.profiles is
  'Perfil de apresentação do usuário. Não contém papéis, permissões ou decisões de autorização.';

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, avatar_url, locale, timezone)
  on table public.profiles to authenticated;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

comment on policy profiles_select_own on public.profiles is
  'Permite que um usuário autenticado leia somente o próprio perfil.';

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

comment on policy profiles_update_own on public.profiles is
  'Permite atualizar somente campos de apresentação do próprio perfil; colunas sensíveis não possuem grant.';

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function private.set_updated_at() from public;
revoke execute on function private.set_updated_at() from anon;
revoke execute on function private.set_updated_at() from authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text;
  normalized_avatar text;
begin
  normalized_name := nullif(
    btrim(
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name',
        ''
      )
    ),
    ''
  );
  normalized_avatar := nullif(
    btrim(
      coalesce(
        new.raw_user_meta_data ->> 'avatar_url',
        new.raw_user_meta_data ->> 'picture',
        ''
      )
    ),
    ''
  );

  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    case when normalized_name is null then null else left(normalized_name, 120) end,
    case when normalized_avatar is null then null else left(normalized_avatar, 2048) end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public;
revoke execute on function private.handle_new_user() from anon;
revoke execute on function private.handle_new_user() from authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Reparo idempotente para identidades que já existiam antes desta migration.
insert into public.profiles (id, display_name, avatar_url)
select
  users.id,
  left(
    nullif(
      btrim(
        coalesce(
          users.raw_user_meta_data ->> 'full_name',
          users.raw_user_meta_data ->> 'name',
          ''
        )
      ),
      ''
    ),
    120
  ),
  left(
    nullif(
      btrim(
        coalesce(
          users.raw_user_meta_data ->> 'avatar_url',
          users.raw_user_meta_data ->> 'picture',
          ''
        )
      ),
      ''
    ),
    2048
  )
from auth.users as users
on conflict (id) do nothing;

commit;
