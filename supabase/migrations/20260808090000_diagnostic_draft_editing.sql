-- A CLI Supabase 2.111.0 falha neste workspace OneDrive com
-- LegacyMigrationNewWriteError ao encontrar o diretório migrations existente.
-- Arquivo versionado manualmente após tentativa obrigatória via CLI.

create or replace function public.update_diagnostic_dimension(
  target_dimension_id uuid,
  dimension_code text,
  dimension_name text,
  dimension_description text,
  dimension_weight numeric,
  dimension_is_essential boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  dimension public.diagnostic_dimensions%rowtype;
  template_status public.diagnostic_template_status;
begin
  select d.* into dimension
  from public.diagnostic_dimensions d
  where d.id = target_dimension_id
  for update;

  if not found or not private.has_permission(
    dimension.organization_id, 'diagnostic.manage', null, dimension.incubator_id
  ) then
    raise exception 'Dimensão inexistente ou sem permissão' using errcode = '42501';
  end if;

  select t.status into template_status
  from public.diagnostic_templates t
  where t.id = dimension.template_id;
  if template_status <> 'draft' then
    raise exception 'Somente rascunhos podem ser editados' using errcode = '23514';
  end if;
  if upper(btrim(dimension_code)) !~ '^[A-Z][A-Z0-9]{0,9}$'
    or nullif(btrim(dimension_name), '') is null
    or dimension_weight <= 0 or dimension_weight > 100 then
    raise exception 'Dados da dimensão inválidos' using errcode = '23514';
  end if;

  update public.diagnostic_dimensions
  set code = upper(btrim(dimension_code)),
      name = btrim(dimension_name),
      description = coalesce(btrim(dimension_description), ''),
      weight = dimension_weight,
      is_essential = dimension_is_essential,
      updated_at = now()
  where id = dimension.id;
end;
$$;

create or replace function public.delete_diagnostic_dimension(target_dimension_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  dimension public.diagnostic_dimensions%rowtype;
  template_status public.diagnostic_template_status;
begin
  select d.* into dimension
  from public.diagnostic_dimensions d
  where d.id = target_dimension_id
  for update;
  if not found or not private.has_permission(
    dimension.organization_id, 'diagnostic.manage', null, dimension.incubator_id
  ) then
    raise exception 'Dimensão inexistente ou sem permissão' using errcode = '42501';
  end if;
  select t.status into template_status
  from public.diagnostic_templates t where t.id = dimension.template_id;
  if template_status <> 'draft' then
    raise exception 'Somente rascunhos podem ser editados' using errcode = '23514';
  end if;

  delete from public.diagnostic_dimensions where id = dimension.id;

  with ordered as (
    select d.id, row_number() over (order by d.position, d.created_at, d.id) - 1 as new_position
    from public.diagnostic_dimensions d
    where d.template_id = dimension.template_id
  )
  update public.diagnostic_dimensions d
  set position = ordered.new_position + 1000000
  from ordered where d.id = ordered.id;
  update public.diagnostic_dimensions
  set position = position - 1000000
  where template_id = dimension.template_id and position >= 1000000;
end;
$$;

create or replace function public.reorder_diagnostic_dimensions(
  target_template_id uuid,
  ordered_dimension_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  template public.diagnostic_templates%rowtype;
  expected_count integer;
begin
  select t.* into template from public.diagnostic_templates t
  where t.id = target_template_id for update;
  if not found or not private.has_permission(
    template.organization_id, 'diagnostic.manage', null, template.incubator_id
  ) then
    raise exception 'Modelo inexistente ou sem permissão' using errcode = '42501';
  end if;
  if template.status <> 'draft' then
    raise exception 'Somente rascunhos podem ser reordenados' using errcode = '23514';
  end if;

  select count(*) into expected_count from public.diagnostic_dimensions d
  where d.template_id = template.id;
  if cardinality(ordered_dimension_ids) <> expected_count
    or (select count(distinct item) from unnest(ordered_dimension_ids) item) <> expected_count
    or exists (
      select 1 from unnest(ordered_dimension_ids) item
      where not exists (
        select 1 from public.diagnostic_dimensions d
        where d.id = item and d.template_id = template.id
      )
    ) then
    raise exception 'A ordem deve conter exatamente todas as dimensões do modelo' using errcode = '23514';
  end if;

  update public.diagnostic_dimensions d set position = d.position + 1000000
  where d.template_id = template.id;
  update public.diagnostic_dimensions d
  set position = ordered.ordinality - 1, updated_at = now()
  from unnest(ordered_dimension_ids) with ordinality ordered(id, ordinality)
  where d.id = ordered.id;
end;
$$;

create or replace function public.update_diagnostic_criterion_with_rubric(
  target_criterion_id uuid,
  criterion_code text,
  criterion_prompt text,
  criterion_help_text text,
  criterion_weight numeric,
  criterion_allows_na boolean,
  criterion_requires_na_justification boolean,
  criterion_evidence_required_from numeric,
  rubric_descriptions text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  criterion public.diagnostic_criteria%rowtype;
  template_status public.diagnostic_template_status;
  rubric_index integer;
begin
  select c.* into criterion from public.diagnostic_criteria c
  where c.id = target_criterion_id for update;
  if not found or not private.has_permission(
    criterion.organization_id, 'diagnostic.manage', null, criterion.incubator_id
  ) then
    raise exception 'Critério inexistente ou sem permissão' using errcode = '42501';
  end if;
  select t.status into template_status from public.diagnostic_templates t
  where t.id = criterion.template_id;
  if template_status <> 'draft' then
    raise exception 'Somente rascunhos podem ser editados' using errcode = '23514';
  end if;
  if upper(btrim(criterion_code)) !~ '^[A-Z][A-Z0-9]{0,11}$'
    or nullif(btrim(criterion_prompt), '') is null
    or criterion_weight <= 0 or criterion_weight > 100
    or criterion_evidence_required_from < 0 or criterion_evidence_required_from > 4 then
    raise exception 'Dados do critério inválidos' using errcode = '23514';
  end if;
  if cardinality(rubric_descriptions) <> 5 or exists (
    select 1 from unnest(rubric_descriptions) item
    where nullif(btrim(item), '') is null
  ) then
    raise exception 'A rubrica precisa descrever os cinco níveis de 0 a 4' using errcode = '23514';
  end if;

  update public.diagnostic_criteria
  set code = upper(btrim(criterion_code)),
      prompt = btrim(criterion_prompt),
      help_text = coalesce(btrim(criterion_help_text), ''),
      weight = criterion_weight,
      allows_not_applicable = criterion_allows_na,
      requires_not_applicable_justification = criterion_allows_na and criterion_requires_na_justification,
      evidence_required_from = criterion_evidence_required_from,
      updated_at = now()
  where id = criterion.id;

  for rubric_index in 1..5 loop
    update public.diagnostic_criterion_levels
    set description = btrim(rubric_descriptions[rubric_index]), updated_at = now()
    where criterion_id = criterion.id and score = rubric_index - 1;
  end loop;
end;
$$;

create or replace function public.delete_diagnostic_criterion(target_criterion_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  criterion public.diagnostic_criteria%rowtype;
  template_status public.diagnostic_template_status;
begin
  select c.* into criterion from public.diagnostic_criteria c
  where c.id = target_criterion_id for update;
  if not found or not private.has_permission(
    criterion.organization_id, 'diagnostic.manage', null, criterion.incubator_id
  ) then
    raise exception 'Critério inexistente ou sem permissão' using errcode = '42501';
  end if;
  select t.status into template_status from public.diagnostic_templates t
  where t.id = criterion.template_id;
  if template_status <> 'draft' then
    raise exception 'Somente rascunhos podem ser editados' using errcode = '23514';
  end if;

  delete from public.diagnostic_criteria where id = criterion.id;
  with ordered as (
    select c.id, row_number() over (order by c.position, c.created_at, c.id) - 1 as new_position
    from public.diagnostic_criteria c where c.dimension_id = criterion.dimension_id
  )
  update public.diagnostic_criteria c
  set position = ordered.new_position + 1000000
  from ordered where c.id = ordered.id;
  update public.diagnostic_criteria
  set position = position - 1000000
  where dimension_id = criterion.dimension_id and position >= 1000000;
end;
$$;

create or replace function public.reorder_diagnostic_criteria(
  target_dimension_id uuid,
  ordered_criterion_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  dimension public.diagnostic_dimensions%rowtype;
  template_status public.diagnostic_template_status;
  expected_count integer;
begin
  select d.* into dimension from public.diagnostic_dimensions d
  where d.id = target_dimension_id for update;
  if not found or not private.has_permission(
    dimension.organization_id, 'diagnostic.manage', null, dimension.incubator_id
  ) then
    raise exception 'Dimensão inexistente ou sem permissão' using errcode = '42501';
  end if;
  select t.status into template_status from public.diagnostic_templates t
  where t.id = dimension.template_id;
  if template_status <> 'draft' then
    raise exception 'Somente rascunhos podem ser reordenados' using errcode = '23514';
  end if;

  select count(*) into expected_count from public.diagnostic_criteria c
  where c.dimension_id = dimension.id;
  if cardinality(ordered_criterion_ids) <> expected_count
    or (select count(distinct item) from unnest(ordered_criterion_ids) item) <> expected_count
    or exists (
      select 1 from unnest(ordered_criterion_ids) item
      where not exists (
        select 1 from public.diagnostic_criteria c
        where c.id = item and c.dimension_id = dimension.id
      )
    ) then
    raise exception 'A ordem deve conter exatamente todos os critérios da dimensão' using errcode = '23514';
  end if;

  update public.diagnostic_criteria c set position = c.position + 1000000
  where c.dimension_id = dimension.id;
  update public.diagnostic_criteria c
  set position = ordered.ordinality - 1, updated_at = now()
  from unnest(ordered_criterion_ids) with ordinality ordered(id, ordinality)
  where c.id = ordered.id;
end;
$$;

revoke execute on function public.update_diagnostic_dimension(uuid, text, text, text, numeric, boolean) from public, anon;
revoke execute on function public.delete_diagnostic_dimension(uuid) from public, anon;
revoke execute on function public.reorder_diagnostic_dimensions(uuid, uuid[]) from public, anon;
revoke execute on function public.update_diagnostic_criterion_with_rubric(uuid, text, text, text, numeric, boolean, boolean, numeric, text[]) from public, anon;
revoke execute on function public.delete_diagnostic_criterion(uuid) from public, anon;
revoke execute on function public.reorder_diagnostic_criteria(uuid, uuid[]) from public, anon;

grant execute on function public.update_diagnostic_dimension(uuid, text, text, text, numeric, boolean) to authenticated;
grant execute on function public.delete_diagnostic_dimension(uuid) to authenticated;
grant execute on function public.reorder_diagnostic_dimensions(uuid, uuid[]) to authenticated;
grant execute on function public.update_diagnostic_criterion_with_rubric(uuid, text, text, text, numeric, boolean, boolean, numeric, text[]) to authenticated;
grant execute on function public.delete_diagnostic_criterion(uuid) to authenticated;
grant execute on function public.reorder_diagnostic_criteria(uuid, uuid[]) to authenticated;

comment on function public.update_diagnostic_dimension(uuid, text, text, text, numeric, boolean) is
  'Edita uma dimensão somente em versão rascunho e exige diagnostic.manage na incubadora.';
comment on function public.update_diagnostic_criterion_with_rubric(uuid, text, text, text, numeric, boolean, boolean, numeric, text[]) is
  'Edita critério e seus cinco níveis atomicamente somente em versão rascunho.';
