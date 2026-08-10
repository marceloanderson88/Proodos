-- Corrige o bootstrap de novas organizações e mantém as permissões CERNE sincronizadas.

create or replace function private.seed_mentoring_role_permissions()
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
      when 'incubator_manager' then array['mentoring.read', 'mentoring.manage', 'mentoring.conduct']
      when 'program_coordinator' then array['mentoring.read', 'mentoring.manage', 'mentoring.conduct']
      when 'agent' then array['mentoring.read', 'mentoring.conduct']
      when 'mentor' then array['mentoring.conduct']
      else array[]::text[]
    end
  loop
    insert into public.role_permissions(organization_id, role_id, permission_code)
    values(new.organization_id, new.id, permission_code)
    on conflict do nothing;
  end loop;
  return new;
end;
$$;

create or replace function private.seed_selection_role_permissions()
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
      when 'incubator_manager' then array['selection.read','selection.manage','selection.review','selection.publish']
      when 'program_coordinator' then array['selection.read','selection.manage','selection.review','selection.publish']
      when 'evaluator' then array['selection.read','selection.review']
      when 'auditor' then array['selection.read']
      else array[]::text[]
    end
  loop
    insert into public.role_permissions(organization_id, role_id, permission_code)
    values(new.organization_id, new.id, permission_code)
    on conflict do nothing;
  end loop;
  return new;
end;
$$;

create or replace function private.seed_cerne_role_permissions()
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
      when 'incubator_manager' then array['cerne.read','cerne.manage','cerne.submit','cerne.review']
      when 'program_coordinator' then array['cerne.read','cerne.manage','cerne.submit','cerne.review']
      when 'agent' then array['cerne.read','cerne.submit']
      when 'mentor' then array['cerne.read','cerne.submit']
      when 'evaluator' then array['cerne.read','cerne.review']
      when 'auditor' then array['cerne.read']
      else array[]::text[]
    end
  loop
    insert into public.role_permissions(organization_id, role_id, permission_code)
    values(new.organization_id, new.id, permission_code)
    on conflict do nothing;
  end loop;
  return new;
end;
$$;

revoke all on function private.seed_cerne_role_permissions() from public, anon, authenticated;

do $$
begin
  create trigger roles_seed_cerne_permissions
  after insert on public.roles
  for each row execute function private.seed_cerne_role_permissions();
exception when duplicate_object then null;
end $$;

delete from public.role_permissions rp
using public.roles r
where r.organization_id = rp.organization_id
  and r.id = rp.role_id
  and r.code = 'startup_representative'
  and rp.permission_code like 'cerne.%';

insert into public.role_permissions(organization_id, role_id, permission_code)
select r.organization_id, r.id, permission_code
from public.roles r
cross join lateral unnest(
  case r.code
    when 'organization_admin' then array['cerne.read','cerne.manage','cerne.submit','cerne.review']
    when 'incubator_manager' then array['cerne.read','cerne.manage','cerne.submit','cerne.review']
    when 'program_coordinator' then array['cerne.read','cerne.manage','cerne.submit','cerne.review']
    when 'agent' then array['cerne.read','cerne.submit']
    when 'mentor' then array['cerne.read','cerne.submit']
    when 'evaluator' then array['cerne.read','cerne.review']
    when 'auditor' then array['cerne.read']
    else array[]::text[]
  end
) as permissions(permission_code)
where r.is_system
on conflict do nothing;

-- Estas tabelas são acessadas exclusivamente por RPCs SECURITY DEFINER que
-- validam tenant, escopo e usuário. As policies explícitas preservam negação
-- por padrão caso algum grant direto seja adicionado no futuro.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'selection_form_versions',
    'selection_questions',
    'selection_criteria',
    'selection_application_answers',
    'selection_reviewers',
    'selection_assignments',
    'selection_conflicts',
    'selection_reviews',
    'selection_review_scores',
    'selection_rankings',
    'selection_appeals',
    'selection_publications',
    'selection_convocations',
    'selection_application_events',
    'cerne_practice_owners',
    'cerne_evidence_slots',
    'cerne_drive_folders',
    'cerne_review_assignments',
    'cerne_evidence_reviews',
    'cerne_alerts'
  ] loop
    begin
      execute format(
        'create policy %I on public.%I for all to authenticated using (false) with check (false)',
        table_name || '_rpc_only',
        table_name
      );
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
