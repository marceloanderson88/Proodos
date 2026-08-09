-- Etapas 1-3: perfil operacional de startups, autocadastro aprovado e convites contextuais.

begin;

do $$ begin
  create type public.startup_application_status as enum ('pending', 'approved', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;

create table public.startup_applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  incubator_id uuid not null,
  applicant_user_id uuid not null references auth.users(id) on delete restrict,
  applicant_name text not null,
  applicant_email text not null,
  startup_name text not null,
  legal_name text,
  tax_id text,
  sector text,
  business_model text,
  stage public.startup_stage not null default 'idea',
  city text,
  state text,
  website_url text,
  cohort_id uuid,
  status public.startup_application_status not null default 'pending',
  decision_notes text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  startup_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint startup_applications_incubator_same_org foreign key (organization_id, incubator_id)
    references public.incubators(organization_id, id),
  constraint startup_applications_cohort_same_org foreign key (organization_id, cohort_id)
    references public.cohorts(organization_id, id),
  constraint startup_applications_startup_same_org foreign key (organization_id, startup_id)
    references public.startups(organization_id, id),
  constraint startup_applications_applicant_name_valid check (applicant_name = btrim(applicant_name) and char_length(applicant_name) between 2 and 160),
  constraint startup_applications_email_valid check (applicant_email = lower(btrim(applicant_email)) and applicant_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint startup_applications_startup_name_valid check (startup_name = btrim(startup_name) and char_length(startup_name) between 2 and 160),
  constraint startup_applications_decision_valid check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null and startup_id is null)
    or (status = 'approved' and reviewed_by is not null and reviewed_at is not null and startup_id is not null)
    or (status = 'rejected' and reviewed_by is not null and reviewed_at is not null and startup_id is null)
    or (status = 'withdrawn' and startup_id is null)
  )
);

create unique index startup_applications_pending_user_uidx
  on public.startup_applications(organization_id, incubator_id, applicant_user_id)
  where status = 'pending';
create index startup_applications_review_queue_idx
  on public.startup_applications(organization_id, incubator_id, status, created_at desc);
create index startup_applications_cohort_idx
  on public.startup_applications(organization_id, cohort_id) where cohort_id is not null;

create table public.startup_onboarding_invitations (
  invitation_id uuid primary key references public.invitations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  incubator_id uuid not null,
  startup_id uuid,
  startup_name text not null,
  cohort_id uuid,
  accepted_startup_id uuid,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint startup_onboarding_invites_incubator_same_org foreign key (organization_id, incubator_id)
    references public.incubators(organization_id, id),
  constraint startup_onboarding_invites_startup_same_org foreign key (organization_id, startup_id)
    references public.startups(organization_id, id),
  constraint startup_onboarding_invites_cohort_same_org foreign key (organization_id, cohort_id)
    references public.cohorts(organization_id, id),
  constraint startup_onboarding_invites_accepted_startup_same_org foreign key (organization_id, accepted_startup_id)
    references public.startups(organization_id, id),
  constraint startup_onboarding_invites_name_valid check (startup_name = btrim(startup_name) and char_length(startup_name) between 2 and 160)
);

create index startup_onboarding_invites_scope_idx
  on public.startup_onboarding_invitations(organization_id, incubator_id, created_at desc);

create or replace function private.validate_startup_onboarding_scope()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.invitations i
    where i.id = new.invitation_id
      and i.organization_id = new.organization_id
      and i.incubator_id = new.incubator_id
      and i.status = 'pending'
  ) then
    raise exception 'Convite de acesso inválido para a incubadora';
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

create trigger startup_onboarding_invitations_validate_scope
before insert or update on public.startup_onboarding_invitations
for each row execute function private.validate_startup_onboarding_scope();

create trigger startup_applications_set_updated_at
before update on public.startup_applications
for each row execute function private.set_updated_at();
create trigger startup_onboarding_invitations_set_updated_at
before update on public.startup_onboarding_invitations
for each row execute function private.set_updated_at();

create or replace function private.bind_accepted_startup_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare mapping public.startup_onboarding_invitations%rowtype;
declare target_startup_id uuid;
begin
  if new.status <> 'accepted' or old.status = 'accepted' or new.accepted_by is null then
    return new;
  end if;

  select m.* into mapping
  from public.startup_onboarding_invitations m
  where m.invitation_id = new.id
  for update;
  if mapping.invitation_id is null then return new; end if;

  target_startup_id := mapping.startup_id;
  if target_startup_id is null then
    insert into public.startups (
      organization_id, incubator_id, code, name, stage, status, created_by
    ) values (
      mapping.organization_id, mapping.incubator_id, '', mapping.startup_name, 'idea', 'active', new.invited_by
    ) returning id into target_startup_id;
  end if;

  insert into public.startup_members (
    organization_id, startup_id, user_id, full_name, email, role,
    is_representative, status, joined_on, created_by
  ) values (
    mapping.organization_id, target_startup_id, new.accepted_by,
    coalesce(new.invited_name, mapping.startup_name), new.email, 'representative',
    true, 'active', current_date, new.invited_by
  )
  on conflict (organization_id, startup_id, user_id) where user_id is not null and status = 'active'
  do update set is_representative = true, email = excluded.email, updated_at = now();

  if mapping.cohort_id is not null and not exists (
    select 1 from public.startup_enrollments e
    where e.organization_id = mapping.organization_id
      and e.startup_id = target_startup_id
      and e.cohort_id = mapping.cohort_id
      and e.status in ('invited', 'active', 'suspended')
  ) then
    insert into public.startup_enrollments (
      organization_id, startup_id, cohort_id, status, source, entry_date, created_by
    ) values (
      mapping.organization_id, target_startup_id, mapping.cohort_id,
      'active', 'invitation', current_date, new.invited_by
    );
  end if;

  update public.startup_onboarding_invitations
  set accepted_startup_id = target_startup_id
  where invitation_id = new.id;
  return new;
end;
$$;

create trigger invitations_bind_startup_onboarding
after update of status on public.invitations
for each row execute function private.bind_accepted_startup_invitation();

create or replace function public.review_startup_application(
  target_application_id uuid,
  requested_decision text,
  review_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := (select auth.uid());
declare application public.startup_applications%rowtype;
declare created_startup_id uuid;
declare membership_id uuid;
declare representative_role_id uuid;
begin
  if actor_id is null then raise exception 'Autenticação obrigatória' using errcode = '42501'; end if;
  if requested_decision not in ('approve', 'reject') then raise exception 'Decisão inválida' using errcode = '22023'; end if;

  select a.* into application from public.startup_applications a
  where a.id = target_application_id for update;
  if application.id is null then raise exception 'Solicitação não encontrada' using errcode = 'P0002'; end if;
  if application.status <> 'pending' then raise exception 'Solicitação já analisada' using errcode = '23514'; end if;
  if not (select private.has_permission(application.organization_id, 'startup.manage', null, application.incubator_id)) then
    raise exception 'Permissão insuficiente' using errcode = '42501';
  end if;

  if requested_decision = 'reject' then
    update public.startup_applications set
      status = 'rejected', decision_notes = nullif(btrim(review_notes), ''),
      reviewed_by = actor_id, reviewed_at = now()
    where id = application.id;
    return null;
  end if;

  insert into public.startups (
    organization_id, incubator_id, code, name, legal_name, tax_id, sector,
    business_model, stage, city, state, website_url, created_by
  ) values (
    application.organization_id, application.incubator_id, '', application.startup_name,
    application.legal_name, application.tax_id, application.sector,
    application.business_model, application.stage, application.city,
    application.state, application.website_url, actor_id
  ) returning id into created_startup_id;

  insert into public.organization_memberships (
    organization_id, user_id, status, joined_at, created_by
  ) values (
    application.organization_id, application.applicant_user_id, 'active', now(), actor_id
  ) on conflict (organization_id, user_id) do update
    set status = 'active', joined_at = coalesce(public.organization_memberships.joined_at, now()), suspended_at = null;

  select m.id into membership_id from public.organization_memberships m
  where m.organization_id = application.organization_id and m.user_id = application.applicant_user_id;
  select r.id into representative_role_id from public.roles r
  where r.organization_id = application.organization_id and r.code = 'startup_representative';
  if representative_role_id is null then raise exception 'Papel de representante não configurado'; end if;

  insert into public.role_assignments (
    organization_id, membership_id, role_id, incubator_id, created_by
  ) values (
    application.organization_id, membership_id, representative_role_id, application.incubator_id, actor_id
  ) on conflict do nothing;

  insert into public.startup_members (
    organization_id, startup_id, user_id, full_name, email, role,
    is_representative, status, joined_on, created_by
  ) values (
    application.organization_id, created_startup_id, application.applicant_user_id,
    application.applicant_name, application.applicant_email, 'founder',
    true, 'active', current_date, actor_id
  );

  if application.cohort_id is not null then
    insert into public.startup_enrollments (
      organization_id, startup_id, cohort_id, status, source, entry_date, created_by
    ) values (
      application.organization_id, created_startup_id, application.cohort_id,
      'active', 'selection_process', current_date, actor_id
    );
  end if;

  update public.startup_applications set
    status = 'approved', decision_notes = nullif(btrim(review_notes), ''),
    reviewed_by = actor_id, reviewed_at = now(), startup_id = created_startup_id
  where id = application.id;
  return created_startup_id;
end;
$$;

alter table public.startup_applications enable row level security;
alter table public.startup_onboarding_invitations enable row level security;
revoke all on public.startup_applications, public.startup_onboarding_invitations from anon, authenticated;

grant select on public.startup_applications to authenticated;
grant select on public.startup_onboarding_invitations to authenticated;
grant insert (invitation_id, organization_id, incubator_id, startup_id, startup_name, cohort_id, created_by)
  on public.startup_onboarding_invitations to authenticated;

create policy startup_applications_select_authorized
on public.startup_applications for select to authenticated
using (
  applicant_user_id = (select auth.uid())
  or (select private.has_permission(organization_id, 'startup.manage', null, incubator_id))
);

create policy startup_onboarding_invitations_select_manager
on public.startup_onboarding_invitations for select to authenticated
using ((select private.has_permission(organization_id, 'startup.manage', null, incubator_id)));

create policy startup_onboarding_invitations_insert_manager
on public.startup_onboarding_invitations for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.has_permission(organization_id, 'startup.manage', null, incubator_id))
);

revoke all on function private.validate_startup_onboarding_scope() from public, anon, authenticated;
revoke all on function private.bind_accepted_startup_invitation() from public, anon, authenticated;
revoke all on function public.review_startup_application(uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_startup_application(uuid, text, text) to authenticated;

comment on table public.startup_applications is 'Solicitações de entrada criadas após cadastro autenticado e aprovadas transacionalmente pela incubadora.';
comment on table public.startup_onboarding_invitations is 'Contexto de negócio associado ao convite genérico: startup, incubadora e turma opcional.';
comment on function public.review_startup_application(uuid, text, text) is 'Aprova ou rejeita uma solicitação; a aprovação cria startup, representante, membership, papel e matrícula opcional em uma transação.';

commit;
