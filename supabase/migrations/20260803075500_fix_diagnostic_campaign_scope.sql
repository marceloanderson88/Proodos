begin;

create or replace function public.create_diagnostic_campaign(
  target_incubator_id uuid,
  target_template_id uuid,
  campaign_name text,
  campaign_starts_at timestamptz,
  campaign_ends_at timestamptz,
  target_startup_ids uuid[],
  target_program_id uuid default null,
  target_cohort_id uuid default null,
  target_evaluator_id uuid default null,
  campaign_timezone text default 'America/Sao_Paulo',
  communication_subject text default '',
  communication_message text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_organization_id uuid;
  campaign_id uuid;
  sanitized_startup_ids uuid[];
  initial_status public.diagnostic_campaign_status;
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

  if nullif(btrim(campaign_name), '') is null
    or char_length(btrim(campaign_name)) > 180 then
    raise exception 'Nome da campanha inválido' using errcode = '23514';
  end if;
  if campaign_starts_at >= campaign_ends_at then
    raise exception 'O término deve ser posterior ao início' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.diagnostic_templates t
    where t.organization_id = target_organization_id
      and t.incubator_id = target_incubator_id
      and t.id = target_template_id
      and t.status = 'published'
  ) then
    raise exception 'Selecione uma versão publicada desta incubadora' using errcode = '23514';
  end if;

  if target_program_id is not null and not exists (
    select 1 from public.programs p
    where p.organization_id = target_organization_id
      and p.incubator_id = target_incubator_id
      and p.id = target_program_id
      and p.deleted_at is null
  ) then
    raise exception 'Programa fora da incubadora' using errcode = '23514';
  end if;

  if target_cohort_id is not null and not exists (
    select 1
    from public.cohorts c
    join public.programs p
      on p.organization_id = c.organization_id
      and p.id = c.program_id
    where c.organization_id = target_organization_id
      and c.id = target_cohort_id
      and c.program_id = target_program_id
      and c.deleted_at is null
      and p.incubator_id = target_incubator_id
      and p.deleted_at is null
  ) then
    raise exception 'Turma fora do programa selecionado' using errcode = '23514';
  end if;

  if target_evaluator_id is not null and not exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = target_organization_id
      and m.user_id = target_evaluator_id
      and m.status = 'active'
  ) then
    raise exception 'Avaliador fora da organização' using errcode = '23514';
  end if;

  select array_agg(distinct startup_id order by startup_id)
  into sanitized_startup_ids
  from unnest(coalesce(target_startup_ids, '{}'::uuid[])) as startup_id;

  if coalesce(cardinality(sanitized_startup_ids), 0) = 0 then
    raise exception 'Selecione ao menos uma startup' using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(sanitized_startup_ids) requested(startup_id)
    left join public.startups s
      on s.organization_id = target_organization_id
      and s.incubator_id = target_incubator_id
      and s.id = requested.startup_id
      and s.deleted_at is null
    where s.id is null
  ) then
    raise exception 'Há startup fora da incubadora' using errcode = '23514';
  end if;

  if target_program_id is not null and exists (
    select 1
    from unnest(sanitized_startup_ids) requested(startup_id)
    where not exists (
      select 1
      from public.startup_enrollments se
      join public.cohorts enrolled_cohort
        on enrolled_cohort.organization_id = se.organization_id
        and enrolled_cohort.id = se.cohort_id
      where se.organization_id = target_organization_id
        and se.startup_id = requested.startup_id
        and enrolled_cohort.incubator_id = target_incubator_id
        and enrolled_cohort.program_id = target_program_id
        and se.status in ('invited', 'active', 'suspended')
        and (target_cohort_id is null or se.cohort_id = target_cohort_id)
    )
  ) then
    raise exception 'Todas as startups precisam pertencer ao programa/turma selecionado' using errcode = '23514';
  end if;

  initial_status := case
    when campaign_starts_at <= now() and campaign_ends_at > now() then 'open'
    when campaign_starts_at > now() then 'scheduled'
    else 'closed'
  end;

  insert into public.diagnostic_campaigns (
    organization_id, incubator_id, template_id, program_id, cohort_id,
    name, status, starts_at, ends_at, timezone, default_evaluator_id,
    communication_subject, communication_message, created_by
  ) values (
    target_organization_id, target_incubator_id, target_template_id,
    target_program_id, target_cohort_id, btrim(campaign_name), initial_status,
    campaign_starts_at, campaign_ends_at, campaign_timezone,
    target_evaluator_id, coalesce(communication_subject, ''),
    coalesce(communication_message, ''), actor_id
  ) returning id into campaign_id;

  with participants as (
    insert into public.diagnostic_campaign_startups (
      organization_id, incubator_id, campaign_id, startup_id,
      status, evaluator_id
    )
    select
      target_organization_id, target_incubator_id, campaign_id,
      startup_id, 'invited', target_evaluator_id
    from unnest(sanitized_startup_ids) startup_id
    returning id, startup_id, evaluator_id
  )
  insert into public.diagnostic_assessments (
    organization_id, incubator_id, startup_id, template_id, cycle_label,
    status, started_by, evaluator_id, campaign_id, campaign_startup_id, due_at
  )
  select
    target_organization_id, target_incubator_id, p.startup_id,
    target_template_id, btrim(campaign_name), 'draft', actor_id,
    p.evaluator_id, campaign_id, p.id, campaign_ends_at
  from participants p;

  insert into public.diagnostic_history_events (
    organization_id, incubator_id, assessment_id, event_type, actor_id, details
  )
  select
    a.organization_id, a.incubator_id, a.id, 'campaign_invited', actor_id,
    jsonb_build_object('campaign_id', campaign_id, 'campaign_name', btrim(campaign_name))
  from public.diagnostic_assessments a
  where a.campaign_id = campaign_id;

  return campaign_id;
end;
$$;

commit;
