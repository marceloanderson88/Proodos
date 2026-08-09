-- Permite que o trigger de aceite registre a startup criada depois que o convite
-- genérico já mudou de pending para accepted. Novos vínculos continuam exigindo
-- convite pendente.

begin;

create or replace function private.validate_startup_onboarding_scope()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare invitation_status public.invitation_status;
begin
  select i.status
    into invitation_status
  from public.invitations i
  where i.id = new.invitation_id
    and i.organization_id = new.organization_id
    and i.incubator_id = new.incubator_id;

  if invitation_status is null then
    raise exception 'Convite de acesso inválido para a incubadora';
  end if;

  if tg_op = 'INSERT' and invitation_status <> 'pending' then
    raise exception 'Somente convites pendentes podem receber contexto de startup';
  end if;

  if new.startup_id is not null and not exists (
    select 1 from public.startups s
    where s.organization_id = new.organization_id
      and s.incubator_id = new.incubator_id
      and s.id = new.startup_id
      and s.deleted_at is null
  ) then
    raise exception 'Startup fora da incubadora';
  end if;

  if new.cohort_id is not null and not exists (
    select 1 from public.cohorts c
    join public.programs p on p.organization_id = c.organization_id and p.id = c.program_id
    where c.organization_id = new.organization_id
      and c.id = new.cohort_id
      and p.incubator_id = new.incubator_id
      and c.deleted_at is null
      and p.deleted_at is null
  ) then
    raise exception 'Turma fora da incubadora';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_startup_onboarding_scope() from public, anon, authenticated;

commit;
