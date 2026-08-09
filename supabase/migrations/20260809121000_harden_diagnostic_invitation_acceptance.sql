begin;

-- A CLI não cria migrations no diretório sincronizado pelo OneDrive
-- (LegacyMigrationNewWriteError); arquivo versionado manualmente.
create or replace function private.bind_accepted_diagnostic_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mapping public.diagnostic_respondent_invitations%rowtype;
  accepted_email text;
begin
  if new.status <> 'accepted' or new.accepted_by is null
    or old.status = 'accepted' then
    return new;
  end if;
  select lower(u.email) into accepted_email
  from auth.users u
  where u.id = new.accepted_by and u.email_confirmed_at is not null;
  if accepted_email is null or accepted_email <> new.email then
    raise exception 'O aceite do diagnóstico precisa usar o e-mail confirmado do convite'
      using errcode = '42501';
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

revoke all on function private.bind_accepted_diagnostic_invitation()
  from public, anon, authenticated;

comment on function private.bind_accepted_diagnostic_invitation() is
  'Libera acesso diagnóstico somente após aceite pelo usuário do e-mail confirmado no convite.';

commit;
