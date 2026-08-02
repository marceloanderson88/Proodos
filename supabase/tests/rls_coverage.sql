-- Executável contra um banco local ou remoto de teste.
-- Falha se qualquer tabela exposta em public estiver sem RLS ou sem ao menos uma policy.

do $$
declare
  violation text;
begin
  select string_agg(format('%I.%I', n.nspname, c.relname), ', ')
    into violation
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and not c.relrowsecurity;

  if violation is not null then
    raise exception 'RLS desabilitada nas tabelas expostas: %', violation;
  end if;

  select string_agg(format('%I.%I', n.nspname, c.relname), ', ')
    into violation
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and c.relrowsecurity
    and not exists (
      select 1 from pg_policy p where p.polrelid = c.oid
    );

  if violation is not null then
    raise exception 'Tabelas com RLS, mas sem policies: %', violation;
  end if;

  if has_schema_privilege('anon', 'public', 'create')
    or has_schema_privilege('authenticated', 'public', 'create') then
    raise exception 'anon/authenticated não podem possuir CREATE no schema public';
  end if;
end
$$;
