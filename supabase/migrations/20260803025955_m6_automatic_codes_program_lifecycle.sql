-- Marco 6: simplifica cadastros e torna o ciclo de vida de programas transacional.

begin;

alter table public.startups add column code text;

update public.startups
set code = 'STP-' || upper(substr(replace(id::text, '-', ''), 1, 12))
where code is null;

alter table public.startups alter column code set not null;
alter table public.startups
  add constraint startups_code_valid
  check (code ~ '^STP-[A-F0-9]{12}$');

create unique index startups_code_uidx
  on public.startups (organization_id, code);

create or replace function private.assign_m6_automatic_code()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.code is null or btrim(new.code) = '' then
    if tg_table_name = 'programs' then
      new.code := 'PRG-' || upper(substr(replace(new.id::text, '-', ''), 1, 12));
    elsif tg_table_name = 'cohorts' then
      new.code := 'TUR-' || upper(substr(replace(new.id::text, '-', ''), 1, 12));
    elsif tg_table_name = 'startups' then
      new.code := 'STP-' || upper(substr(replace(new.id::text, '-', ''), 1, 12));
    else
      raise exception 'Tabela sem prefixo de codigo automatico';
    end if;
  end if;
  return new;
end;
$$;

create trigger programs_assign_automatic_code
before insert on public.programs
for each row execute function private.assign_m6_automatic_code();

create trigger cohorts_assign_automatic_code
before insert on public.cohorts
for each row execute function private.assign_m6_automatic_code();

create trigger startups_assign_automatic_code
before insert on public.startups
for each row execute function private.assign_m6_automatic_code();

revoke insert (code), update (code) on public.programs from authenticated;
revoke insert (code), update (code) on public.cohorts from authenticated;

create or replace function public.manage_program_lifecycle(
  target_program_id uuid,
  requested_action text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  tenant_id uuid;
  target_incubator_id uuid;
  target_deleted_at timestamptz;
  has_linked_startups boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'Autenticacao obrigatoria' using errcode = '42501';
  end if;

  select p.organization_id, p.incubator_id, p.deleted_at
  into tenant_id, target_incubator_id, target_deleted_at
  from public.programs p
  where p.id = target_program_id
  for update;

  if not found or target_deleted_at is not null then
    raise exception 'Programa indisponivel' using errcode = 'P0002';
  end if;

  if not (select private.has_permission(tenant_id, 'program.manage', null, target_incubator_id)) then
    raise exception 'Sem permissao para gerenciar o programa' using errcode = '42501';
  end if;

  perform 1
  from public.cohorts c
  where c.organization_id = tenant_id
    and c.program_id = target_program_id
  for update;

  select exists (
    select 1
    from public.cohorts c
    join public.startup_enrollments se
      on se.organization_id = c.organization_id
      and se.cohort_id = c.id
    where c.organization_id = tenant_id
      and c.program_id = target_program_id
  ) into has_linked_startups;

  if requested_action = 'delete' then
    if has_linked_startups then
      raise exception 'Programa com startup vinculada deve ser arquivado' using errcode = '23514';
    end if;

    update public.cohorts
    set status = 'cancelled', deleted_at = now(), updated_at = now()
    where organization_id = tenant_id
      and program_id = target_program_id
      and deleted_at is null;

    update public.programs
    set status = 'archived', deleted_at = now(), updated_at = now()
    where organization_id = tenant_id and id = target_program_id;

    return 'deleted';
  elsif requested_action = 'archive' then
    update public.programs
    set status = 'archived', updated_at = now()
    where organization_id = tenant_id and id = target_program_id;

    return 'archived';
  end if;

  raise exception 'Acao de ciclo de vida invalida' using errcode = '22023';
end;
$$;

revoke all on function public.manage_program_lifecycle(uuid, text) from public;
revoke all on function public.manage_program_lifecycle(uuid, text) from anon;
revoke all on function public.manage_program_lifecycle(uuid, text) from authenticated;
grant execute on function public.manage_program_lifecycle(uuid, text) to authenticated;

comment on column public.startups.code is
  'Codigo tecnico imutavel, gerado automaticamente pelo banco.';
comment on function private.assign_m6_automatic_code() is
  'Gera codigos tecnicos imutaveis a partir do UUID antes do INSERT.';
comment on function public.manage_program_lifecycle(uuid, text) is
  'Exclui logicamente programas sem matriculas ou arquiva programas preservando todo o historico.';

commit;
