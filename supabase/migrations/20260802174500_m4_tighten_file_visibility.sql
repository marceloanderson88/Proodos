-- Alinha versões e vínculos à visibilidade do arquivo lógico e permite que
-- auditores consultem tentativas negadas que ainda não possuem file_id resolvido.

begin;

create or replace function private.can_view_file(target_file_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.files f
    where f.id = target_file_id
      and (
        (f.status = 'available' and private.has_permission(f.organization_id, 'file.read', f.unit_id, f.incubator_id))
        or private.has_permission(f.organization_id, 'file.manage', f.unit_id, f.incubator_id)
      )
  );
$$;

revoke execute on function private.can_view_file(uuid) from public, anon, authenticated;
grant execute on function private.can_view_file(uuid) to authenticated;

drop policy files_select_authorized on public.files;
create policy files_select_authorized on public.files for select to authenticated
using ((select private.can_view_file(id)));

drop policy file_versions_select_authorized on public.file_versions;
create policy file_versions_select_authorized on public.file_versions for select to authenticated
using ((select private.can_view_file(file_id)));

drop policy file_links_select_authorized on public.file_links;
create policy file_links_select_authorized on public.file_links for select to authenticated
using ((select private.can_view_file(file_id)));

drop policy file_access_logs_select_auditor on public.file_access_logs;
create policy file_access_logs_select_auditor on public.file_access_logs for select to authenticated
using (
  (file_id is not null and (select private.can_access_file(file_id, 'file.audit')))
  or (file_id is null and (select private.has_permission(organization_id, 'file.audit')))
);

comment on policy files_select_authorized on public.files is 'Arquivos disponíveis exigem file.read; estados internos exigem file.manage no escopo tipado.';
comment on policy file_versions_select_authorized on public.file_versions is 'Versões seguem a mesma visibilidade do arquivo lógico, inclusive em estados internos.';
comment on policy file_links_select_authorized on public.file_links is 'Vínculos seguem a mesma visibilidade do arquivo lógico.';
comment on policy file_access_logs_select_auditor on public.file_access_logs is 'file.audit permite logs do arquivo e tentativas sem file_id já resolvido no tenant.';

commit;
