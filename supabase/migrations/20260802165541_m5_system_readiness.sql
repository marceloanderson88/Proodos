-- Readiness probe deliberately exposes no schema or tenant data.
-- Version aligned with the remote migration history after controlled apply.
create or replace function public.system_readiness()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select true;
$$;

revoke all on function public.system_readiness() from public;
grant execute on function public.system_readiness() to anon, authenticated;

comment on function public.system_readiness() is
  'Readiness probe for the Data API; returns no application or tenant data.';
