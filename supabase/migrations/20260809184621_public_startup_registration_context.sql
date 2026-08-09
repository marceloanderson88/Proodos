-- Leitura pública mínima; nenhuma chave administrativa é necessária para renderização.
create or replace function public.get_startup_registration_context(
  organization_slug text,
  incubator_slug text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'organization', jsonb_build_object('name', organization.name),
    'incubator', jsonb_build_object(
      'name', incubator.name,
      'shortDescription', incubator.short_description
    ),
    'cohorts', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', cohort.id,
          'label', program.name || ' · ' || cohort.name
        )
        order by program.name, cohort.name
      )
      from public.programs as program
      join public.cohorts as cohort
        on cohort.organization_id = program.organization_id
       and cohort.program_id = program.id
       and cohort.deleted_at is null
       and cohort.status in ('planned', 'enrollment_open', 'active')
      where program.organization_id = organization.id
        and program.incubator_id = incubator.id
        and program.status = 'active'
        and program.deleted_at is null
    ), '[]'::jsonb)
  )
  from public.organizations as organization
  join public.incubators as incubator
    on incubator.organization_id = organization.id
   and incubator.slug = lower(btrim(incubator_slug))
   and incubator.status = 'active'
   and incubator.deleted_at is null
  where organization.slug = lower(btrim(organization_slug))
    and organization.status = 'active'
    and organization.deleted_at is null;
$$;

comment on function public.get_startup_registration_context(text, text) is
  'Expõe somente o contexto mínimo necessário para renderizar o autocadastro público de startups.';

revoke all on function public.get_startup_registration_context(text, text) from public;
grant execute on function public.get_startup_registration_context(text, text) to anon, authenticated;
