-- Corrige ambiguidade entre a coluna organization_id e o nome da coluna de saída
-- da função de aceite. O comportamento e os grants permanecem inalterados.

begin;

create or replace function public.accept_invitation(raw_token text)
returns table (organization_id uuid, organization_slug text, membership_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare caller_id uuid := (select auth.uid());
declare caller_email text;
declare invite public.invitations%rowtype;
declare member_id uuid;
begin
  if caller_id is null then raise exception 'Autenticação necessária' using errcode = '42501'; end if;
  if raw_token is null or char_length(raw_token) < 32 then raise exception 'Convite inválido'; end if;

  select lower(u.email) into caller_email from auth.users u where u.id = caller_id and u.email_confirmed_at is not null;
  if caller_email is null then raise exception 'E-mail confirmado é necessário'; end if;

  select i.* into invite
  from public.invitations i
  where i.token_hash = encode(extensions.digest(raw_token, 'sha256'), 'hex')
  for update;

  if invite.id is null then raise exception 'Convite inválido'; end if;
  if invite.email <> caller_email then raise exception 'Convite destinado a outro e-mail' using errcode = '42501'; end if;

  if invite.status = 'accepted' and invite.accepted_by = caller_id then
    select m.id into member_id from public.organization_memberships m
    where m.organization_id = invite.organization_id and m.user_id = caller_id;
    return query select invite.organization_id, o.slug, member_id from public.organizations o where o.id = invite.organization_id;
    return;
  end if;

  if invite.status <> 'pending' then raise exception 'Convite não está pendente'; end if;
  if invite.expires_at <= now() then
    update public.invitations set status = 'expired' where id = invite.id;
    raise exception 'Convite expirado';
  end if;

  insert into public.organization_memberships (organization_id, user_id, status, joined_at, created_by)
  values (invite.organization_id, caller_id, 'active', now(), invite.invited_by)
  on conflict on constraint organization_memberships_org_user_unique do update
    set status = 'active', joined_at = coalesce(public.organization_memberships.joined_at, now()), suspended_at = null
    where public.organization_memberships.status in ('invited', 'active')
  returning id into member_id;

  if member_id is null then raise exception 'Vínculo suspenso ou removido exige reativação administrativa' using errcode = '42501'; end if;

  insert into public.role_assignments (organization_id, membership_id, role_id, unit_id, incubator_id, created_by)
  values (invite.organization_id, member_id, invite.role_id, invite.unit_id, invite.incubator_id, invite.invited_by)
  on conflict on constraint role_assignments_unique_scope do nothing;

  update public.invitations
  set status = 'accepted', accepted_by = caller_id, accepted_at = now()
  where id = invite.id;

  insert into public.user_preferences (user_id, active_organization_id)
  values (caller_id, invite.organization_id)
  on conflict (user_id) do update set active_organization_id = excluded.active_organization_id;

  return query select invite.organization_id, o.slug, member_id from public.organizations o where o.id = invite.organization_id;
end;
$$;

revoke execute on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

commit;
