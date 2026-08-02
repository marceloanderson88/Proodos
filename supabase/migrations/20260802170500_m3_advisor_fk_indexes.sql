-- Índices de cobertura para FKs apontadas pelo advisor de performance.
-- Índices ainda não usados são esperados em tabelas recém-criadas e vazias.

begin;

create index platform_admins_granted_by_idx on private.platform_admins (granted_by) where granted_by is not null;
create index organizations_created_by_idx on public.organizations (created_by);
create index organization_units_created_by_idx on public.organization_units (created_by);
create index incubators_created_by_idx on public.incubators (created_by);
create index organization_memberships_created_by_idx on public.organization_memberships (created_by) where created_by is not null;
create index role_assignments_created_by_idx on public.role_assignments (created_by);
create index invitations_role_idx on public.invitations (organization_id, role_id);
create index invitations_unit_idx on public.invitations (organization_id, unit_id) where unit_id is not null;
create index invitations_incubator_idx on public.invitations (organization_id, incubator_id) where incubator_id is not null;
create index invitations_invited_by_idx on public.invitations (invited_by);
create index invitations_accepted_by_idx on public.invitations (accepted_by) where accepted_by is not null;
create index user_preferences_active_org_idx on public.user_preferences (active_organization_id) where active_organization_id is not null;

commit;
