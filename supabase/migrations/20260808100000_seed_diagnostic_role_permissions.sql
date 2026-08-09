begin;

-- O bootstrap de M7 preencheu papéis já existentes, porém organizações criadas
-- depois da migration recebiam apenas as permissões de M6 pelo trigger abaixo.
-- Mantemos um único provisionador para papéis sistêmicos futuros.
create or replace function private.seed_m6_role_permissions()
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
      when 'incubator_manager' then array[
        'program.read', 'program.manage', 'startup.read', 'startup.manage',
        'diagnostic.read', 'diagnostic.manage', 'diagnostic.respond', 'diagnostic.validate'
      ]
      when 'program_coordinator' then array[
        'program.read', 'program.manage', 'startup.read', 'startup.manage',
        'diagnostic.read', 'diagnostic.manage', 'diagnostic.respond'
      ]
      when 'agent' then array[
        'program.read', 'startup.read', 'startup.manage',
        'diagnostic.read', 'diagnostic.manage', 'diagnostic.respond'
      ]
      when 'evaluator' then array[
        'program.read', 'startup.read', 'diagnostic.read', 'diagnostic.validate'
      ]
      when 'auditor' then array[
        'program.read', 'startup.read', 'diagnostic.read'
      ]
      else array[]::text[]
    end
  loop
    insert into public.role_permissions (organization_id, role_id, permission_code)
    values (new.organization_id, new.id, permission_code)
    on conflict do nothing;
  end loop;
  return new;
end;
$$;

-- Reparo idempotente para organizações criadas entre M7 e esta correção.
insert into public.role_permissions (organization_id, role_id, permission_code)
select r.organization_id, r.id, permission_code
from public.roles r
cross join lateral unnest(
  case r.code
    when 'organization_admin' then array[
      'diagnostic.read', 'diagnostic.manage', 'diagnostic.respond', 'diagnostic.validate'
    ]
    when 'incubator_manager' then array[
      'diagnostic.read', 'diagnostic.manage', 'diagnostic.respond', 'diagnostic.validate'
    ]
    when 'program_coordinator' then array[
      'diagnostic.read', 'diagnostic.manage', 'diagnostic.respond'
    ]
    when 'agent' then array[
      'diagnostic.read', 'diagnostic.manage', 'diagnostic.respond'
    ]
    when 'evaluator' then array['diagnostic.read', 'diagnostic.validate']
    when 'auditor' then array['diagnostic.read']
    else array[]::text[]
  end
) permission_code
where r.is_system
on conflict do nothing;

revoke execute on function private.seed_m6_role_permissions()
  from public, anon, authenticated;

comment on function private.seed_m6_role_permissions() is
  'Provisiona permissões de programas, startups e diagnósticos em novos papéis sistêmicos.';

commit;
