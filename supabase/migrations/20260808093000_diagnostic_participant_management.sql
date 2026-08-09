-- A CLI Supabase 2.111.0 falha neste workspace OneDrive com
-- LegacyMigrationNewWriteError ao encontrar o diretório migrations existente.
-- Arquivo versionado manualmente após tentativa obrigatória via CLI.

create or replace function private.user_has_permission(
  target_user_id uuid,
  target_organization_id uuid,
  target_permission_code text,
  target_incubator_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships m
    join public.role_assignments a
      on a.organization_id = m.organization_id and a.membership_id = m.id
    join public.role_permissions rp
      on rp.organization_id = a.organization_id and rp.role_id = a.role_id
    where m.organization_id = target_organization_id
      and m.user_id = target_user_id
      and m.status = 'active'
      and rp.permission_code = target_permission_code
      and (
        (a.unit_id is null and a.incubator_id is null)
        or a.incubator_id = target_incubator_id
        or (
          a.unit_id is not null and a.incubator_id is null and exists (
            select 1 from public.incubators i
            where i.organization_id = target_organization_id
              and i.id = target_incubator_id and i.unit_id = a.unit_id
          )
        )
      )
  );
$$;

revoke all on function private.user_has_permission(uuid, uuid, text, uuid) from public, anon, authenticated;

create or replace function public.assign_diagnostic_respondent(
  target_assessment_id uuid,
  target_user_id uuid,
  target_role public.diagnostic_respondent_role
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  assessment public.diagnostic_assessments%rowtype;
  respondent_id uuid;
begin
  select a.* into assessment from public.diagnostic_assessments a
  where a.id = target_assessment_id for update;
  if not found or not private.has_permission(
    assessment.organization_id, 'diagnostic.manage', null, assessment.incubator_id
  ) then
    raise exception 'Avaliação inexistente ou sem permissão' using errcode = '42501';
  end if;
  if assessment.status in ('validated', 'cancelled') then
    raise exception 'A avaliação concluída não aceita novos respondentes' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.organization_memberships m
    where m.organization_id = assessment.organization_id
      and m.user_id = target_user_id and m.status = 'active'
  ) then
    raise exception 'A pessoa precisa aceitar o convite da organização antes de participar' using errcode = '23514';
  end if;
  if not private.user_has_permission(
    target_user_id, assessment.organization_id, 'diagnostic.respond', assessment.incubator_id
  ) and not exists (
    select 1 from public.startup_members sm
    where sm.organization_id = assessment.organization_id
      and sm.startup_id = assessment.startup_id
      and sm.user_id = target_user_id
      and sm.status = 'active'
  ) then
    raise exception 'A pessoa não está vinculada à startup nem possui permissão para responder' using errcode = '23514';
  end if;

  insert into public.diagnostic_respondents (
    organization_id, incubator_id, assessment_id, user_id,
    role, can_submit, invited_by, accepted_at, revoked_at
  ) values (
    assessment.organization_id, assessment.incubator_id, assessment.id,
    target_user_id, target_role, target_role = 'primary', auth.uid(), now(), null
  )
  on conflict (assessment_id, user_id) do update
  set role = excluded.role,
      can_submit = excluded.can_submit,
      invited_by = excluded.invited_by,
      invited_at = now(),
      accepted_at = now(),
      revoked_at = null,
      updated_at = now()
  returning id into respondent_id;

  insert into public.diagnostic_history_events (
    organization_id, incubator_id, assessment_id, event_type, actor_id, details
  ) values (
    assessment.organization_id, assessment.incubator_id, assessment.id,
    'respondent_assigned', auth.uid(),
    jsonb_build_object('user_id', target_user_id, 'role', target_role)
  );
  return respondent_id;
end;
$$;

create or replace function public.revoke_diagnostic_respondent(
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
begin
  select a.* into assessment from public.diagnostic_assessments a
  where a.id = target_assessment_id for update;
  if not found or not private.has_permission(
    assessment.organization_id, 'diagnostic.manage', null, assessment.incubator_id
  ) then
    raise exception 'Avaliação inexistente ou sem permissão' using errcode = '42501';
  end if;
  update public.diagnostic_respondents
  set revoked_at = now(), updated_at = now()
  where assessment_id = assessment.id and user_id = target_user_id and revoked_at is null;
  if not found then
    raise exception 'Respondente ativo não encontrado' using errcode = 'P0002';
  end if;
  insert into public.diagnostic_history_events (
    organization_id, incubator_id, assessment_id, event_type, actor_id, details
  ) values (
    assessment.organization_id, assessment.incubator_id, assessment.id,
    'respondent_revoked', auth.uid(), jsonb_build_object('user_id', target_user_id)
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
begin
  select a.* into assessment from public.diagnostic_assessments a
  where a.id = target_assessment_id for update;
  if not found or not private.has_permission(
    assessment.organization_id, 'diagnostic.manage', null, assessment.incubator_id
  ) then
    raise exception 'Avaliação inexistente ou sem permissão' using errcode = '42501';
  end if;
  if assessment.status in ('validated', 'cancelled') then
    raise exception 'A avaliação concluída não permite trocar o avaliador' using errcode = '23514';
  end if;
  if not private.user_has_permission(
    target_user_id, assessment.organization_id, 'diagnostic.validate', assessment.incubator_id
  ) then
    raise exception 'A pessoa selecionada não possui permissão diagnostic.validate nesta incubadora' using errcode = '23514';
  end if;

  update public.diagnostic_assessments
  set evaluator_id = target_user_id, updated_at = now(), lock_version = lock_version + 1
  where id = assessment.id;
  insert into public.diagnostic_history_events (
    organization_id, incubator_id, assessment_id, event_type, actor_id, details
  ) values (
    assessment.organization_id, assessment.incubator_id, assessment.id,
    'evaluator_assigned', auth.uid(), jsonb_build_object('user_id', target_user_id)
  );
end;
$$;

revoke execute on function public.assign_diagnostic_respondent(uuid, uuid, public.diagnostic_respondent_role) from public, anon;
revoke execute on function public.revoke_diagnostic_respondent(uuid, uuid) from public, anon;
revoke execute on function public.assign_diagnostic_evaluator(uuid, uuid) from public, anon;
grant execute on function public.assign_diagnostic_respondent(uuid, uuid, public.diagnostic_respondent_role) to authenticated;
grant execute on function public.revoke_diagnostic_respondent(uuid, uuid) to authenticated;
grant execute on function public.assign_diagnostic_evaluator(uuid, uuid) to authenticated;

comment on function public.assign_diagnostic_respondent(uuid, uuid, public.diagnostic_respondent_role) is
  'Vincula pessoa elegível como respondente; somente gestor do diagnóstico pode executar.';
comment on function public.assign_diagnostic_evaluator(uuid, uuid) is
  'Define avaliador com diagnostic.validate na mesma incubadora; somente gestor pode executar.';
