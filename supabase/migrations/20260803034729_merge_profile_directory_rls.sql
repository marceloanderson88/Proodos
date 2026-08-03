-- Remove políticas permissivas duplicadas sem ampliar o conjunto de linhas visíveis.
begin;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_shared_organization_manager on public.profiles;
drop policy if exists profiles_select_own_or_shared_manager on public.profiles;

create policy profiles_select_own_or_shared_manager
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.organization_memberships membership
    where membership.user_id = profiles.id
      and membership.status = 'active'
      and (select private.has_permission(membership.organization_id, 'member.read'))
  )
);

comment on policy profiles_select_own_or_shared_manager on public.profiles is
  'O usuário lê o próprio perfil; gestores com member.read leem membros ativos da mesma organização.';

commit;
