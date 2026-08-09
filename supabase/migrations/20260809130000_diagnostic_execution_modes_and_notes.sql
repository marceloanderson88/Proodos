begin;

-- A CLI Supabase 2.111.0 foi executada antes da criação deste arquivo, mas
-- falhou no diretório sincronizado pelo OneDrive com LegacyMigrationNewWriteError.
do $$ begin
  create type public.diagnostic_execution_mode as enum ('self_assessment', 'facilitated');
exception when duplicate_object then null; end $$;

alter table public.diagnostic_campaigns
  add column if not exists execution_mode public.diagnostic_execution_mode
    not null default 'self_assessment';

alter table public.diagnostic_assessments
  add column if not exists execution_mode public.diagnostic_execution_mode
    not null default 'self_assessment';

alter table public.diagnostic_campaigns
  add constraint diagnostic_campaigns_facilitator_required
  check (execution_mode = 'self_assessment' or default_evaluator_id is not null)
  not valid;
alter table public.diagnostic_campaigns
  validate constraint diagnostic_campaigns_facilitator_required;

alter table public.diagnostic_assessments
  add constraint diagnostic_assessments_facilitator_required
  check (execution_mode = 'self_assessment' or evaluator_id is not null)
  not valid;
alter table public.diagnostic_assessments
  validate constraint diagnostic_assessments_facilitator_required;

create index if not exists diagnostic_assessments_family_timeline_idx
  on public.diagnostic_assessments
    (organization_id, incubator_id, startup_id, template_id, validated_at desc, created_at desc);

create table public.diagnostic_assessment_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  incubator_id uuid not null,
  assessment_id uuid not null,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, incubator_id)
    references public.incubators(organization_id, id) on delete restrict,
  foreign key (organization_id, assessment_id)
    references public.diagnostic_assessments(organization_id, id) on delete cascade,
  check (body = btrim(body) and char_length(body) between 2 and 4000)
);

create index diagnostic_assessment_notes_timeline_idx
  on public.diagnostic_assessment_notes (assessment_id, created_at desc, id);
create index diagnostic_assessment_notes_author_idx
  on public.diagnostic_assessment_notes (author_id, created_at desc);

create or replace function private.validate_diagnostic_execution_mode()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign_mode public.diagnostic_execution_mode;
begin
  if new.campaign_id is not null then
    select c.execution_mode into campaign_mode
    from public.diagnostic_campaigns c
    where c.organization_id = new.organization_id
      and c.id = new.campaign_id;
    if campaign_mode is null or campaign_mode <> new.execution_mode then
      raise exception 'O modo da aplicação deve ser o mesmo da campanha' using errcode = '23514';
    end if;
  end if;
  if new.execution_mode = 'facilitated' and new.evaluator_id is null then
    raise exception 'Diagnóstico conduzido exige uma pessoa responsável' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists diagnostic_assessments_validate_execution_mode
  on public.diagnostic_assessments;
create trigger diagnostic_assessments_validate_execution_mode
before insert or update of organization_id, campaign_id, execution_mode, evaluator_id
on public.diagnostic_assessments
for each row execute function private.validate_diagnostic_execution_mode();

create or replace function private.can_respond_diagnostic_assessment(target_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.diagnostic_assessments a
    where a.id = target_assessment_id
      and a.status not in ('validated', 'cancelled')
      and (
        (
          a.execution_mode = 'self_assessment'
          and private.is_active_org_member(a.organization_id)
          and exists (
            select 1
            from public.startup_members sm
            where sm.organization_id = a.organization_id
              and sm.startup_id = a.startup_id
              and sm.user_id = (select auth.uid())
              and sm.status = 'active'
              and (
                sm.is_representative
                or exists (
                  select 1 from public.diagnostic_respondents dr
                  where dr.organization_id = a.organization_id
                    and dr.assessment_id = a.id
                    and dr.user_id = (select auth.uid())
                    and dr.role in ('primary', 'collaborator')
                    and dr.revoked_at is null
                )
              )
          )
        )
        or (
          a.execution_mode = 'facilitated'
          and private.has_permission(
            a.organization_id, 'diagnostic.respond', null, a.incubator_id
          )
          and (
            private.has_permission(
              a.organization_id, 'diagnostic.manage', null, a.incubator_id
            )
            or a.evaluator_id = (select auth.uid())
            or exists (
              select 1 from public.diagnostic_respondents dr
              where dr.organization_id = a.organization_id
                and dr.assessment_id = a.id
                and dr.user_id = (select auth.uid())
                and dr.role in ('primary', 'collaborator')
                and dr.revoked_at is null
            )
          )
        )
      )
  );
$$;

create or replace function private.can_add_diagnostic_assessment_note(
  target_assessment_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.diagnostic_assessments a
    where a.id = target_assessment_id
      and private.can_read_diagnostic_assessment(a.id)
      and (
        private.has_permission(
          a.organization_id, 'diagnostic.manage', null, a.incubator_id
        )
        or a.evaluator_id = (select auth.uid())
        or exists (
          select 1 from public.diagnostic_respondents dr
          where dr.organization_id = a.organization_id
            and dr.assessment_id = a.id
            and dr.user_id = (select auth.uid())
            and dr.revoked_at is null
        )
        or (
          a.execution_mode = 'self_assessment'
          and exists (
            select 1 from public.startup_members sm
            where sm.organization_id = a.organization_id
              and sm.startup_id = a.startup_id
              and sm.user_id = (select auth.uid())
              and sm.status = 'active'
          )
        )
      )
  );
$$;

create or replace function public.create_diagnostic_campaign_with_mode(
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
  communication_message text default '',
  campaign_execution_mode public.diagnostic_execution_mode default 'self_assessment'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_organization_id uuid;
  created_campaign_id uuid;
  required_permission text;
begin
  select i.organization_id into target_organization_id
  from public.incubators i
  where i.id = target_incubator_id and i.deleted_at is null;

  required_permission := case
    when campaign_execution_mode = 'facilitated' then 'diagnostic.respond'
    else 'diagnostic.validate'
  end;

  if campaign_execution_mode = 'facilitated' and target_evaluator_id is null then
    raise exception 'Selecione quem conduzirá o diagnóstico' using errcode = '23514';
  end if;
  if target_evaluator_id is not null and not private.user_has_permission(
    target_evaluator_id, target_organization_id, required_permission, target_incubator_id
  ) then
    raise exception 'A pessoa selecionada não possui a permissão necessária nesta incubadora'
      using errcode = '23514';
  end if;

  created_campaign_id := public.create_diagnostic_campaign(
    target_incubator_id,
    target_template_id,
    campaign_name,
    campaign_starts_at,
    campaign_ends_at,
    target_startup_ids,
    target_program_id,
    target_cohort_id,
    target_evaluator_id,
    campaign_timezone,
    communication_subject,
    communication_message
  );

  update public.diagnostic_campaigns
  set execution_mode = campaign_execution_mode
  where id = created_campaign_id;

  update public.diagnostic_assessments
  set execution_mode = campaign_execution_mode
  where campaign_id = created_campaign_id;

  insert into public.diagnostic_history_events (
    organization_id, incubator_id, assessment_id, event_type, actor_id, details
  )
  select a.organization_id, a.incubator_id, a.id,
    'execution_mode_defined', actor_id,
    jsonb_build_object('execution_mode', campaign_execution_mode)
  from public.diagnostic_assessments a
  where a.campaign_id = created_campaign_id;

  return created_campaign_id;
end;
$$;

create or replace function public.complete_facilitated_diagnostic_assessment(
  target_assessment_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  assessment public.diagnostic_assessments%rowtype;
  response_record record;
  next_revision integer;
begin
  select a.* into assessment
  from public.diagnostic_assessments a
  where a.id = target_assessment_id
  for update;

  if not found or not private.can_respond_diagnostic_assessment(target_assessment_id) then
    raise exception 'Avaliação inexistente ou sem permissão' using errcode = '42501';
  end if;
  if assessment.execution_mode <> 'facilitated' then
    raise exception 'Esta operação é exclusiva do diagnóstico conduzido' using errcode = '23514';
  end if;
  if assessment.status not in ('draft', 'in_progress') then
    raise exception 'A avaliação não está aberta para conclusão' using errcode = '23514';
  end if;
  if exists (
    select 1
    from public.diagnostic_criteria c
    left join public.diagnostic_responses r
      on r.assessment_id = assessment.id and r.criterion_id = c.id
    where c.template_id = assessment.template_id
      and c.is_required
      and (r.id is null or (not r.is_not_applicable and r.self_value is null))
  ) then
    raise exception 'Responda todos os critérios obrigatórios antes de concluir' using errcode = '23514';
  end if;
  if exists (
    select 1
    from public.diagnostic_responses r
    join public.diagnostic_criteria c on c.id = r.criterion_id
    where r.assessment_id = assessment.id
      and not r.is_not_applicable
      and c.evidence_required_from is not null
      and jsonb_typeof(r.self_value) = 'number'
      and (r.self_value #>> '{}')::numeric >= c.evidence_required_from
      and nullif(btrim(r.evidence_notes), '') is null
      and not exists (
        select 1 from public.diagnostic_response_evidence e
        where e.response_id = r.id and e.status = 'available' and e.deleted_at is null
      )
  ) then
    raise exception 'Anexe ou descreva as evidências obrigatórias antes de concluir' using errcode = '23514';
  end if;

  update public.diagnostic_responses
  set validated_value = self_value,
      validated_by = (select auth.uid()),
      validated_at = now(),
      updated_at = now()
  where assessment_id = assessment.id;

  for response_record in
    select r.* from public.diagnostic_responses r where r.assessment_id = assessment.id
  loop
    select coalesce(max(v.revision), 0) + 1 into next_revision
    from public.diagnostic_response_validations v
    where v.response_id = response_record.id;
    insert into public.diagnostic_response_validations (
      organization_id, incubator_id, response_id, revision, validated_value,
      evaluator_comment, status, validator_id, finalized_at
    ) values (
      assessment.organization_id, assessment.incubator_id, response_record.id,
      next_revision, response_record.self_value, response_record.self_comment,
      'final', (select auth.uid()), now()
    );
  end loop;

  perform private.recompute_diagnostic_assessment_scores(assessment.id);
  update public.diagnostic_assessments
  set status = 'validated', submitted_at = now(), validated_at = now(),
      lock_version = lock_version + 1
  where id = assessment.id;
  update public.diagnostic_campaign_startups
  set status = 'validated', submitted_at = now(), validated_at = now()
  where id = assessment.campaign_startup_id;
  insert into public.diagnostic_history_events (
    organization_id, incubator_id, assessment_id, event_type, actor_id,
    from_status, to_status, details
  ) values (
    assessment.organization_id, assessment.incubator_id, assessment.id,
    'facilitated_assessment_completed', (select auth.uid()),
    assessment.status::text, 'validated',
    jsonb_build_object('execution_mode', 'facilitated')
  );
end;
$$;

create or replace function public.assign_diagnostic_evaluator(
  target_assessment_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  assessment public.diagnostic_assessments%rowtype;
  required_permission text;
begin
  select a.* into assessment from public.diagnostic_assessments a
  where a.id = target_assessment_id for update;
  if not found or not private.has_permission(
    assessment.organization_id, 'diagnostic.manage', null, assessment.incubator_id
  ) then
    raise exception 'Avaliação inexistente ou sem permissão' using errcode = '42501';
  end if;
  if assessment.status in ('validated', 'cancelled') then
    raise exception 'A avaliação concluída não permite trocar a pessoa responsável' using errcode = '23514';
  end if;
  required_permission := case
    when assessment.execution_mode = 'facilitated' then 'diagnostic.respond'
    else 'diagnostic.validate'
  end;
  if not private.user_has_permission(
    target_user_id, assessment.organization_id, required_permission, assessment.incubator_id
  ) then
    raise exception 'A pessoa selecionada não possui a permissão necessária nesta incubadora'
      using errcode = '23514';
  end if;

  update public.diagnostic_assessments
  set evaluator_id = target_user_id, updated_at = now(), lock_version = lock_version + 1
  where id = assessment.id;
  insert into public.diagnostic_history_events (
    organization_id, incubator_id, assessment_id, event_type, actor_id, details
  ) values (
    assessment.organization_id, assessment.incubator_id, assessment.id,
    'evaluator_assigned', (select auth.uid()),
    jsonb_build_object('user_id', target_user_id, 'required_permission', required_permission)
  );
end;
$$;

-- Mantém o provisionamento correto também para organizações criadas após esta
-- migration. Representantes continuam limitados às aplicações da própria
-- startup pelas funções de escopo.
create or replace function private.seed_m6_role_permissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare permission_code text;
begin
  if not new.is_system or new.code = 'organization_admin' then return new; end if;
  foreach permission_code in array
    case new.code
      when 'incubator_manager' then array[
        'program.read', 'program.manage', 'startup.read', 'startup.manage',
        'diagnostic.read', 'diagnostic.manage', 'diagnostic.respond', 'diagnostic.validate'
      ]
      when 'program_coordinator' then array[
        'program.read', 'program.manage', 'startup.read', 'startup.manage',
        'diagnostic.read', 'diagnostic.manage', 'diagnostic.respond'
      ]
      when 'agent' then array[
        'program.read', 'startup.read', 'startup.manage',
        'diagnostic.read', 'diagnostic.manage', 'diagnostic.respond'
      ]
      when 'evaluator' then array[
        'program.read', 'startup.read', 'diagnostic.read',
        'diagnostic.respond', 'diagnostic.validate'
      ]
      when 'mentor' then array[
        'program.read', 'startup.read', 'diagnostic.read', 'diagnostic.respond'
      ]
      when 'startup_representative' then array[
        'program.read', 'startup.read', 'diagnostic.read', 'diagnostic.respond'
      ]
      when 'startup_member' then array[
        'program.read', 'startup.read', 'diagnostic.read', 'diagnostic.respond'
      ]
      when 'auditor' then array['program.read', 'startup.read', 'diagnostic.read']
      else array[]::text[]
    end
  loop
    insert into public.role_permissions (organization_id, role_id, permission_code)
    values (new.organization_id, new.id, permission_code)
    on conflict do nothing;
  end loop;
  return new;
end;
$$;

-- Mentores e avaliadores podem conduzir aplicações; membros de startup podem
-- responder somente no contexto da startup a que pertencem.
insert into public.role_permissions (organization_id, role_id, permission_code)
select r.organization_id, r.id, p.permission_code
from public.roles r
cross join lateral unnest(
  case r.code
    when 'mentor' then array['diagnostic.read', 'diagnostic.respond']
    when 'evaluator' then array['diagnostic.read', 'diagnostic.respond', 'diagnostic.validate']
    when 'startup_representative' then array['diagnostic.read', 'diagnostic.respond']
    when 'startup_member' then array['diagnostic.read', 'diagnostic.respond']
    else array[]::text[]
  end
) p(permission_code)
where r.is_system
on conflict do nothing;

alter table public.diagnostic_assessment_notes enable row level security;
revoke all on public.diagnostic_assessment_notes from anon, authenticated;
grant select, insert on public.diagnostic_assessment_notes to authenticated;

create policy diagnostic_assessment_notes_select
on public.diagnostic_assessment_notes for select to authenticated
using (private.can_read_diagnostic_assessment(assessment_id));

create policy diagnostic_assessment_notes_insert
on public.diagnostic_assessment_notes for insert to authenticated
with check (
  author_id = (select auth.uid())
  and private.can_add_diagnostic_assessment_note(assessment_id)
);

grant select (execution_mode) on public.diagnostic_campaigns to authenticated;
grant select (execution_mode) on public.diagnostic_assessments to authenticated;

revoke all on function private.validate_diagnostic_execution_mode()
  from public, anon, authenticated;
revoke all on function private.can_add_diagnostic_assessment_note(uuid)
  from public, anon, authenticated;
revoke all on function private.seed_m6_role_permissions()
  from public, anon, authenticated;
revoke execute on function public.create_diagnostic_campaign_with_mode(
  uuid, uuid, text, timestamptz, timestamptz, uuid[], uuid, uuid, uuid,
  text, text, text, public.diagnostic_execution_mode
) from public, anon;
grant execute on function public.create_diagnostic_campaign_with_mode(
  uuid, uuid, text, timestamptz, timestamptz, uuid[], uuid, uuid, uuid,
  text, text, text, public.diagnostic_execution_mode
) to authenticated;
revoke execute on function public.complete_facilitated_diagnostic_assessment(uuid)
  from public, anon;
grant execute on function public.complete_facilitated_diagnostic_assessment(uuid)
  to authenticated;

comment on column public.diagnostic_campaigns.execution_mode is
  'Define se a startup responde ou se uma pessoa da incubadora/mentoria conduz a campanha.';
comment on column public.diagnostic_assessments.execution_mode is
  'Snapshot imutável do modo definido na criação da aplicação.';
comment on table public.diagnostic_assessment_notes is
  'Observações cronológicas e auditáveis da aplicação, sem sobrescrita destrutiva.';
comment on function public.complete_facilitated_diagnostic_assessment(uuid) is
  'Conclui um diagnóstico conduzido, promovendo as respostas técnicas a resultado oficial.';

commit;
