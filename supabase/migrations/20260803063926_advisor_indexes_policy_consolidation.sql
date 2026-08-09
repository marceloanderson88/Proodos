begin;

create index if not exists cohorts_created_by_idx
  on public.cohorts (created_by);
create index if not exists program_members_created_by_idx
  on public.program_members (created_by);
create index if not exists program_types_created_by_idx
  on public.program_types (created_by);
create index if not exists programs_created_by_idx
  on public.programs (created_by);
create index if not exists startup_enrollments_created_by_idx
  on public.startup_enrollments (created_by);
create index if not exists startup_enrollments_previous_org_idx
  on public.startup_enrollments (organization_id, previous_enrollment_id)
  where previous_enrollment_id is not null;
create index if not exists startup_history_actor_idx
  on public.startup_history (actor_user_id)
  where actor_user_id is not null;
create index if not exists startup_members_created_by_idx
  on public.startup_members (created_by);
create index if not exists startups_created_by_idx
  on public.startups (created_by);

drop policy if exists diagnostic_dimensions_select on public.diagnostic_dimensions;
drop policy if exists diagnostic_dimensions_manage on public.diagnostic_dimensions;
create policy diagnostic_dimensions_select on public.diagnostic_dimensions
  for select to authenticated
  using (
    (select private.has_permission(organization_id, 'diagnostic.read', null, incubator_id))
    or (select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id))
  );
create policy diagnostic_dimensions_insert on public.diagnostic_dimensions
  for insert to authenticated
  with check ((select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id)));
create policy diagnostic_dimensions_update on public.diagnostic_dimensions
  for update to authenticated
  using ((select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id)))
  with check ((select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id)));
create policy diagnostic_dimensions_delete on public.diagnostic_dimensions
  for delete to authenticated
  using ((select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id)));

drop policy if exists diagnostic_criteria_select on public.diagnostic_criteria;
drop policy if exists diagnostic_criteria_manage on public.diagnostic_criteria;
create policy diagnostic_criteria_select on public.diagnostic_criteria
  for select to authenticated
  using (
    (select private.has_permission(organization_id, 'diagnostic.read', null, incubator_id))
    or (select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id))
  );
create policy diagnostic_criteria_insert on public.diagnostic_criteria
  for insert to authenticated
  with check ((select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id)));
create policy diagnostic_criteria_update on public.diagnostic_criteria
  for update to authenticated
  using ((select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id)))
  with check ((select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id)));
create policy diagnostic_criteria_delete on public.diagnostic_criteria
  for delete to authenticated
  using ((select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id)));

commit;
