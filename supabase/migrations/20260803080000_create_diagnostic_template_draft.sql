begin;

create or replace function public.create_diagnostic_template_draft(
  target_incubator_id uuid,
  template_name text,
  template_description text default '',
  template_instructions text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_organization_id uuid;
  created_family_id uuid := gen_random_uuid();
  created_template_id uuid;
begin
  if actor_id is null then
    raise exception 'Autenticação obrigatória' using errcode = '42501';
  end if;

  select i.organization_id into target_organization_id
  from public.incubators i
  where i.id = target_incubator_id
    and i.deleted_at is null;

  if target_organization_id is null
    or not private.has_permission(
      target_organization_id, 'diagnostic.manage', null, target_incubator_id
    ) then
    raise exception 'Incubadora inexistente ou sem permissão' using errcode = '42501';
  end if;

  if nullif(btrim(template_name), '') is null
    or char_length(btrim(template_name)) > 160 then
    raise exception 'Nome do modelo inválido' using errcode = '23514';
  end if;

  insert into public.diagnostic_template_families (
    id, organization_id, incubator_id, code, name, description,
    scope, is_standard, created_by
  ) values (
    created_family_id, target_organization_id, target_incubator_id,
    'modelo-' || substr(replace(created_family_id::text, '-', ''), 1, 12),
    btrim(template_name), coalesce(btrim(template_description), ''),
    'incubator', false, actor_id
  );

  insert into public.diagnostic_templates (
    organization_id, incubator_id, family_id, version, version_label,
    name, description, instructions, status, created_by
  ) values (
    target_organization_id, target_incubator_id, created_family_id,
    1, '1.0', btrim(template_name),
    coalesce(btrim(template_description), ''),
    coalesce(btrim(template_instructions), ''), 'draft', actor_id
  ) returning id into created_template_id;

  return created_template_id;
end;
$$;

revoke execute on function public.create_diagnostic_template_draft(
  uuid, text, text, text
) from public, anon;
grant execute on function public.create_diagnostic_template_draft(
  uuid, text, text, text
) to authenticated;

comment on function public.create_diagnostic_template_draft(uuid, text, text, text) is
  'Cria família e primeira versão de um modelo em uma transação, com código técnico automático.';

commit;
