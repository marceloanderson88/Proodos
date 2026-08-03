-- Consolida o Proodos como tenant raiz e formaliza o ciclo de vida das incubadoras.

begin;

update public.organizations
set
  name = 'Proodos',
  slug = 'proodos',
  logo_url = '/brand/proodos-logo-transparent.png',
  updated_at = now()
where slug = 'sertao-maker'
  and deleted_at is null
  and not exists (
    select 1
    from public.organizations existing
    where existing.slug = 'proodos'
      and existing.id <> organizations.id
      and existing.deleted_at is null
  );

update public.organizations
set
  name = 'Proodos',
  logo_url = '/brand/proodos-logo-transparent.png',
  updated_at = now()
where slug = 'proodos'
  and deleted_at is null;

create or replace function public.manage_incubator_lifecycle(
  target_incubator_id uuid,
  requested_action text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  tenant_id uuid;
  target_status public.organization_status;
  target_deleted_at timestamptz;
  has_linked_data boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'Autenticacao obrigatoria' using errcode = '42501';
  end if;

  select i.organization_id, i.status, i.deleted_at
  into tenant_id, target_status, target_deleted_at
  from public.incubators i
  where i.id = target_incubator_id
  for update;

  if not found or target_deleted_at is not null then
    raise exception 'Incubadora indisponivel' using errcode = 'P0002';
  end if;

  if not (select private.has_permission(tenant_id, 'incubator.manage', null, target_incubator_id))
    or not (select private.has_permission(tenant_id, 'incubator.manage')) then
    raise exception 'Somente a administracao do Proodos pode alterar o ciclo de vida da incubadora'
      using errcode = '42501';
  end if;

  select
    exists (
      select 1 from public.programs p
      where p.organization_id = tenant_id and p.incubator_id = target_incubator_id
    )
    or exists (
      select 1 from public.startups s
      where s.organization_id = tenant_id and s.incubator_id = target_incubator_id
    )
    or exists (
      select 1 from public.program_types pt
      where pt.organization_id = tenant_id and pt.incubator_id = target_incubator_id
    )
    or exists (
      select 1 from public.files f
      where f.organization_id = tenant_id and f.incubator_id = target_incubator_id
    )
    or exists (
      select 1 from public.file_links fl
      where fl.organization_id = tenant_id and fl.incubator_id = target_incubator_id
    )
    or exists (
      select 1 from public.role_assignments ra
      where ra.organization_id = tenant_id and ra.incubator_id = target_incubator_id
    )
    or exists (
      select 1 from public.invitations inv
      where inv.organization_id = tenant_id and inv.incubator_id = target_incubator_id
    )
  into has_linked_data;

  if requested_action = 'delete' then
    if has_linked_data then
      raise exception 'Incubadora com dados vinculados deve ser arquivada'
        using errcode = '23514';
    end if;

    update public.incubators
    set status = 'inactive', deleted_at = now(), updated_at = now()
    where organization_id = tenant_id and id = target_incubator_id;

    return 'deleted';
  elsif requested_action = 'archive' then
    update public.incubators
    set status = 'inactive', updated_at = now()
    where organization_id = tenant_id and id = target_incubator_id;

    return 'archived';
  elsif requested_action = 'restore' then
    if target_status <> 'inactive' then
      raise exception 'Somente incubadoras arquivadas podem ser reativadas'
        using errcode = '23514';
    end if;

    update public.incubators
    set status = 'active', updated_at = now()
    where organization_id = tenant_id and id = target_incubator_id;

    return 'restored';
  end if;

  raise exception 'Acao de ciclo de vida invalida' using errcode = '22023';
end;
$$;

revoke all on function public.manage_incubator_lifecycle(uuid, text) from public;
revoke all on function public.manage_incubator_lifecycle(uuid, text) from anon;
revoke all on function public.manage_incubator_lifecycle(uuid, text) from authenticated;
grant execute on function public.manage_incubator_lifecycle(uuid, text) to authenticated;

comment on function public.manage_incubator_lifecycle(uuid, text) is
  'Exclui logicamente incubadora vazia ou arquiva/reativa preservando dados. Exige incubator.manage em escopo organizacional.';

commit;
