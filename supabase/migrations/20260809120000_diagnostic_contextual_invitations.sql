begin;

-- A CLI não cria migrations no diretório sincronizado pelo OneDrive
-- (LegacyMigrationNewWriteError); arquivo versionado manualmente.
create table public.diagnostic_respondent_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  incubator_id uuid not null,
  assessment_id uuid not null,
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  respondent_role public.diagnostic_respondent_role not null default 'collaborator',
  can_submit boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  respondent_user_id uuid references public.profiles(id) on delete restrict,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invitation_id),
  unique (assessment_id, invitation_id),
  foreign key (organization_id, assessment_id)
    references public.diagnostic_assessments(organization_id, id) on delete cascade,
  foreign key (organization_id, incubator_id)
    references public.incubators(organization_id, id) on delete restrict,
  check ((respondent_role = 'primary' and can_submit) or respondent_role <> 'primary'),
  check ((accepted_at is null and respondent_user_id is null)
    or (accepted_at is not null and respondent_user_id is not null))
);

create index diagnostic_respondent_invitations_assessment_idx
  on public.diagnostic_respondent_invitations (assessment_id, created_at desc);
create index diagnostic_respondent_invitations_user_idx
  on public.diagnostic_respondent_invitations (respondent_user_id)
  where respondent_user_id is not null;

create or replace function private.validate_diagnostic_respondent_invitation_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assessment public.diagnostic_assessments%rowtype;
  invitation public.invitations%rowtype;
begin
  select a.* into assessment from public.diagnostic_assessments a
  where a.id = new.assessment_id;
  select i.* into invitation from public.invitations i
  where i.id = new.invitation_id;
  if assessment.id is null or invitation.id is null
    or assessment.organization_id <> new.organization_id
    or assessment.incubator_id <> new.incubator_id
    or invitation.organization_id <> new.organization_id
    or invitation.incubator_id <> new.incubator_id then
    raise exception 'Convite e avaliação precisam pertencer à mesma incubadora'
      using errcode = '23514';
  end if;
  if tg_op = 'INSERT' and invitation.status <> 'pending' then
    raise exception 'Somente convites pendentes podem ser vinculados'
      using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.role_permissions rp
    where rp.organization_id = invitation.organization_id
      and rp.role_id = invitation.role_id
      and rp.permission_code = 'diagnostic.respond'
  ) then
    raise exception 'O papel organizacional precisa permitir responder diagnósticos'
      using errcode = '23514';
  end if;
  new.can_submit := new.respondent_role = 'primary';
  return new;
end;
$$;

create trigger diagnostic_respondent_invitations_validate_scope
before insert or update on public.diagnostic_respondent_invitations
for each row execute function private.validate_diagnostic_respondent_invitation_scope();
create trigger diagnostic_respondent_invitations_set_updated_at
before update on public.diagnostic_respondent_invitations
for each row execute function private.set_updated_at();

create or replace function private.bind_accepted_diagnostic_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mapping public.diagnostic_respondent_invitations%rowtype;
begin
  if new.status <> 'accepted' or new.accepted_by is null
    or old.status = 'accepted' then
    return new;
  end if;
  for mapping in
    select m.* from public.diagnostic_respondent_invitations m
    where m.invitation_id = new.id and m.accepted_at is null
    for update
  loop
    insert into public.diagnostic_respondents (
      organization_id, incubator_id, assessment_id, user_id,
      role, can_submit, invited_by, accepted_at, revoked_at
    ) values (
      mapping.organization_id, mapping.incubator_id, mapping.assessment_id,
      new.accepted_by, mapping.respondent_role, mapping.can_submit,
      mapping.created_by, now(), null
    )
    on conflict (assessment_id, user_id) do update set
      role = excluded.role,
      can_submit = excluded.can_submit,
      invited_by = excluded.invited_by,
      invited_at = now(),
      accepted_at = now(),
      revoked_at = null,
      updated_at = now();

    update public.diagnostic_respondent_invitations
    set respondent_user_id = new.accepted_by, accepted_at = now()
    where id = mapping.id;

    insert into public.diagnostic_history_events (
      organization_id, incubator_id, assessment_id,
      event_type, actor_id, details
    ) values (
      mapping.organization_id, mapping.incubator_id, mapping.assessment_id,
      'respondent_invitation_accepted', new.accepted_by,
      jsonb_build_object('invitation_id', new.id, 'role', mapping.respondent_role)
    );
  end loop;
  return new;
end;
$$;

create trigger invitations_bind_diagnostic_respondent
after update of status on public.invitations
for each row execute function private.bind_accepted_diagnostic_invitation();

alter table public.diagnostic_respondent_invitations enable row level security;

create policy diagnostic_respondent_invitations_select
on public.diagnostic_respondent_invitations for select to authenticated
using (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id));
create policy diagnostic_respondent_invitations_insert
on public.diagnostic_respondent_invitations for insert to authenticated
with check (
  private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id)
  and created_by = (select auth.uid())
);
create policy diagnostic_respondent_invitations_delete
on public.diagnostic_respondent_invitations for delete to authenticated
using (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id));

grant select, insert, delete on public.diagnostic_respondent_invitations
  to authenticated;
revoke all on function private.validate_diagnostic_respondent_invitation_scope()
  from public, anon, authenticated;
revoke all on function private.bind_accepted_diagnostic_invitation()
  from public, anon, authenticated;

comment on table public.diagnostic_respondent_invitations is
  'Vincula um convite organizacional a uma avaliação; o respondente só recebe acesso após aceitar o convite destinado ao próprio e-mail.';

commit;
