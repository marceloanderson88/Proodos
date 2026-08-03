begin;

create type public.diagnostic_template_status as enum ('draft', 'published', 'archived');
create type public.diagnostic_response_type as enum ('numeric', 'text', 'single_choice', 'currency', 'percentage', 'date', 'link', 'file');
create type public.diagnostic_assessment_status as enum ('draft', 'in_progress', 'submitted', 'under_review', 'validated', 'cancelled');

create table public.diagnostic_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  incubator_id uuid not null,
  family_id uuid not null default gen_random_uuid(),
  version integer not null default 1 check (version > 0),
  name text not null check (char_length(trim(name)) between 2 and 160),
  description text not null default '',
  instructions text not null default '',
  status public.diagnostic_template_status not null default 'draft',
  published_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, id),
  unique (family_id, version),
  foreign key (organization_id, incubator_id) references public.incubators(organization_id, id) on delete restrict,
  check ((status = 'published' and published_at is not null) or status <> 'published')
);

create table public.diagnostic_dimensions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  incubator_id uuid not null,
  template_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text not null default '',
  weight numeric(8,3) not null default 1 check (weight > 0),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (template_id, position),
  foreign key (organization_id, template_id) references public.diagnostic_templates(organization_id, id) on delete cascade,
  foreign key (organization_id, incubator_id) references public.incubators(organization_id, id) on delete restrict
);

create table public.diagnostic_criteria (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  incubator_id uuid not null,
  template_id uuid not null,
  dimension_id uuid not null,
  prompt text not null check (char_length(trim(prompt)) between 3 and 500),
  help_text text not null default '',
  response_type public.diagnostic_response_type not null default 'numeric',
  weight numeric(8,3) not null default 1 check (weight > 0),
  maximum_score numeric(8,3) not null default 5 check (maximum_score > 0),
  is_required boolean not null default true,
  allows_not_applicable boolean not null default false,
  evidence_required_from numeric(8,3),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  rubric jsonb not null default '[]'::jsonb check (jsonb_typeof(rubric) = 'array'),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (dimension_id, position),
  foreign key (organization_id, template_id) references public.diagnostic_templates(organization_id, id) on delete cascade,
  foreign key (organization_id, dimension_id) references public.diagnostic_dimensions(organization_id, id) on delete cascade,
  foreign key (organization_id, incubator_id) references public.incubators(organization_id, id) on delete restrict,
  check (evidence_required_from is null or evidence_required_from between 0 and maximum_score)
);

create table public.diagnostic_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  incubator_id uuid not null,
  startup_id uuid not null,
  template_id uuid not null,
  cycle_label text not null check (char_length(trim(cycle_label)) between 2 and 120),
  status public.diagnostic_assessment_status not null default 'draft',
  started_by uuid not null references public.profiles(id) on delete restrict,
  evaluator_id uuid references public.profiles(id) on delete restrict,
  self_score numeric(8,3),
  validated_score numeric(8,3),
  submitted_at timestamptz,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, incubator_id) references public.incubators(organization_id, id) on delete restrict,
  foreign key (organization_id, startup_id) references public.startups(organization_id, id) on delete restrict,
  foreign key (organization_id, template_id) references public.diagnostic_templates(organization_id, id) on delete restrict
);

create table public.diagnostic_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  incubator_id uuid not null,
  assessment_id uuid not null,
  criterion_id uuid not null,
  self_value jsonb,
  validated_value jsonb,
  is_not_applicable boolean not null default false,
  not_applicable_justification text,
  evidence_notes text not null default '',
  self_comment text not null default '',
  evaluator_comment text not null default '',
  validated_by uuid references public.profiles(id) on delete restrict,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, criterion_id),
  foreign key (organization_id, assessment_id) references public.diagnostic_assessments(organization_id, id) on delete cascade,
  foreign key (organization_id, criterion_id) references public.diagnostic_criteria(organization_id, id) on delete restrict,
  foreign key (organization_id, incubator_id) references public.incubators(organization_id, id) on delete restrict,
  check (not is_not_applicable or nullif(trim(not_applicable_justification), '') is not null)
);

create index diagnostic_templates_scope_idx on public.diagnostic_templates (organization_id, incubator_id, status);
create index diagnostic_dimensions_template_idx on public.diagnostic_dimensions (template_id, position);
create index diagnostic_criteria_template_idx on public.diagnostic_criteria (template_id, dimension_id, position);
create index diagnostic_assessments_startup_idx on public.diagnostic_assessments (organization_id, incubator_id, startup_id, created_at desc);
create index diagnostic_assessments_template_idx on public.diagnostic_assessments (template_id);
create index diagnostic_responses_assessment_idx on public.diagnostic_responses (assessment_id);
create index diagnostic_responses_criterion_idx on public.diagnostic_responses (criterion_id);

create or replace function private.validate_diagnostic_scope()
returns trigger language plpgsql security definer set search_path = '' as $$
declare expected_template uuid;
declare expected_incubator uuid;
begin
  if tg_table_name = 'diagnostic_assessments' then
    if not exists (
      select 1 from public.diagnostic_templates t
      where t.organization_id = new.organization_id and t.incubator_id = new.incubator_id
        and t.id = new.template_id and t.status = 'published'
    ) then raise exception 'A aplicação exige uma versão publicada da mesma incubadora' using errcode = '23514'; end if;
    if not exists (
      select 1 from public.startups s
      where s.organization_id = new.organization_id and s.incubator_id = new.incubator_id
        and s.id = new.startup_id and s.deleted_at is null
    ) then raise exception 'Startup fora do escopo da incubadora' using errcode = '23514'; end if;
  elsif tg_table_name = 'diagnostic_criteria' then
    select d.template_id, d.incubator_id into expected_template, expected_incubator
    from public.diagnostic_dimensions d
    where d.organization_id = new.organization_id and d.id = new.dimension_id;
    if expected_template is distinct from new.template_id or expected_incubator is distinct from new.incubator_id then
      raise exception 'Critério fora do escopo da dimensão' using errcode = '23514';
    end if;
  elsif tg_table_name = 'diagnostic_responses' then
    select a.template_id, a.incubator_id into expected_template, expected_incubator
    from public.diagnostic_assessments a
    where a.organization_id = new.organization_id and a.id = new.assessment_id;
    if expected_incubator is distinct from new.incubator_id or not exists (
      select 1 from public.diagnostic_criteria c
      where c.organization_id = new.organization_id and c.id = new.criterion_id and c.template_id = expected_template
    ) then raise exception 'Resposta fora da versão aplicada' using errcode = '23514'; end if;
  end if;
  return new;
end $$;

create or replace function private.protect_published_diagnostic()
returns trigger language plpgsql set search_path = '' as $$
declare template_status public.diagnostic_template_status;
begin
  if tg_table_name = 'diagnostic_templates' then
    if old.status = 'published' and (new.name, new.description, new.instructions, new.version, new.family_id)
      is distinct from (old.name, old.description, old.instructions, old.version, old.family_id) then
      raise exception 'Versão publicada é imutável; crie uma nova versão' using errcode = '23514';
    end if;
    return new;
  end if;
  select t.status into template_status from public.diagnostic_templates t
  where t.id = coalesce(new.template_id, old.template_id);
  if template_status = 'published' then
    raise exception 'Estrutura de versão publicada é imutável' using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger diagnostic_criteria_validate_scope before insert or update on public.diagnostic_criteria
for each row execute function private.validate_diagnostic_scope();
create trigger diagnostic_assessments_validate_scope before insert or update of organization_id, incubator_id, startup_id, template_id on public.diagnostic_assessments
for each row execute function private.validate_diagnostic_scope();
create trigger diagnostic_responses_validate_scope before insert or update on public.diagnostic_responses
for each row execute function private.validate_diagnostic_scope();
create trigger diagnostic_templates_protect_published before update on public.diagnostic_templates
for each row execute function private.protect_published_diagnostic();
create trigger diagnostic_dimensions_protect_published before insert or update or delete on public.diagnostic_dimensions
for each row execute function private.protect_published_diagnostic();
create trigger diagnostic_criteria_protect_published before insert or update or delete on public.diagnostic_criteria
for each row execute function private.protect_published_diagnostic();

do $$ declare table_name text; begin
  foreach table_name in array array['diagnostic_templates','diagnostic_dimensions','diagnostic_criteria','diagnostic_assessments','diagnostic_responses'] loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.write_audit_log()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end $$;

insert into public.permissions (code, name, description, category) values
  ('diagnostic.read', 'Consultar diagnósticos', 'Consulta modelos e aplicações da incubadora.', 'diagnostics'),
  ('diagnostic.manage', 'Gerenciar diagnósticos', 'Cria modelos, versões e aplicações.', 'diagnostics'),
  ('diagnostic.respond', 'Responder diagnósticos', 'Preenche autoavaliações de startups autorizadas.', 'diagnostics'),
  ('diagnostic.validate', 'Validar diagnósticos', 'Registra notas oficiais e pareceres.', 'diagnostics')
on conflict (code) do update set name = excluded.name, description = excluded.description, category = excluded.category;

insert into public.role_permissions (organization_id, role_id, permission_code)
select r.organization_id, r.id, p.code
from public.roles r cross join public.permissions p
where p.code like 'diagnostic.%' and (
  r.code in ('organization_admin','incubator_manager')
  or (r.code in ('program_coordinator','agent') and p.code in ('diagnostic.read','diagnostic.manage','diagnostic.respond'))
  or (r.code = 'evaluator' and p.code in ('diagnostic.read','diagnostic.validate'))
  or (r.code = 'auditor' and p.code = 'diagnostic.read')
) on conflict do nothing;

create policy diagnostic_templates_select on public.diagnostic_templates for select to authenticated
using ((select private.has_permission(organization_id, 'diagnostic.read', null, incubator_id)));
create policy diagnostic_templates_insert on public.diagnostic_templates for insert to authenticated
with check ((select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id)) and created_by = (select auth.uid()));
create policy diagnostic_templates_update on public.diagnostic_templates for update to authenticated
using ((select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id)))
with check ((select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id)));

create policy diagnostic_dimensions_select on public.diagnostic_dimensions for select to authenticated
using ((select private.has_permission(organization_id, 'diagnostic.read', null, incubator_id)));
create policy diagnostic_dimensions_manage on public.diagnostic_dimensions for all to authenticated
using ((select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id)))
with check ((select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id)));
create policy diagnostic_criteria_select on public.diagnostic_criteria for select to authenticated
using ((select private.has_permission(organization_id, 'diagnostic.read', null, incubator_id)));
create policy diagnostic_criteria_manage on public.diagnostic_criteria for all to authenticated
using ((select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id)))
with check ((select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id)));

create policy diagnostic_assessments_select on public.diagnostic_assessments for select to authenticated
using ((select private.has_permission(organization_id, 'diagnostic.read', null, incubator_id)) or (select private.can_access_startup(organization_id, startup_id, incubator_id)));
create policy diagnostic_assessments_insert on public.diagnostic_assessments for insert to authenticated
with check (started_by = (select auth.uid()) and ((select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id)) or (select private.can_manage_startup(organization_id, startup_id, incubator_id))));
create policy diagnostic_assessments_update on public.diagnostic_assessments for update to authenticated
using ((select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id)) or (select private.can_manage_startup(organization_id, startup_id, incubator_id)))
with check ((select private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id)) or (select private.can_manage_startup(organization_id, startup_id, incubator_id)));

create policy diagnostic_responses_select on public.diagnostic_responses for select to authenticated using (exists (
  select 1 from public.diagnostic_assessments a where a.organization_id = diagnostic_responses.organization_id and a.id = diagnostic_responses.assessment_id
));
create policy diagnostic_responses_insert on public.diagnostic_responses for insert to authenticated with check (exists (
  select 1 from public.diagnostic_assessments a where a.organization_id = diagnostic_responses.organization_id and a.id = diagnostic_responses.assessment_id
    and ((select private.has_permission(a.organization_id, 'diagnostic.respond', null, a.incubator_id)) or (select private.can_manage_startup(a.organization_id, a.startup_id, a.incubator_id)))
));
create policy diagnostic_responses_update on public.diagnostic_responses for update to authenticated using (exists (
  select 1 from public.diagnostic_assessments a where a.organization_id = diagnostic_responses.organization_id and a.id = diagnostic_responses.assessment_id
    and ((select private.has_permission(a.organization_id, 'diagnostic.respond', null, a.incubator_id)) or (select private.has_permission(a.organization_id, 'diagnostic.validate', null, a.incubator_id)) or (select private.can_manage_startup(a.organization_id, a.startup_id, a.incubator_id)))
)) with check (exists (
  select 1 from public.diagnostic_assessments a where a.organization_id = diagnostic_responses.organization_id and a.id = diagnostic_responses.assessment_id
));

grant select on public.diagnostic_templates, public.diagnostic_dimensions, public.diagnostic_criteria, public.diagnostic_assessments, public.diagnostic_responses to authenticated;
grant insert (organization_id, incubator_id, family_id, version, name, description, instructions, status, published_at, created_by) on public.diagnostic_templates to authenticated;
grant update (name, description, instructions, status, published_at, archived_at) on public.diagnostic_templates to authenticated;
grant insert (organization_id, incubator_id, template_id, name, description, weight, position) on public.diagnostic_dimensions to authenticated;
grant update (name, description, weight, position) on public.diagnostic_dimensions to authenticated;
grant delete on public.diagnostic_dimensions to authenticated;
grant insert (organization_id, incubator_id, template_id, dimension_id, prompt, help_text, response_type, weight, maximum_score, is_required, allows_not_applicable, evidence_required_from, options, rubric, position) on public.diagnostic_criteria to authenticated;
grant update (prompt, help_text, response_type, weight, maximum_score, is_required, allows_not_applicable, evidence_required_from, options, rubric, position) on public.diagnostic_criteria to authenticated;
grant delete on public.diagnostic_criteria to authenticated;
grant insert (organization_id, incubator_id, startup_id, template_id, cycle_label, status, started_by, evaluator_id) on public.diagnostic_assessments to authenticated;
grant update (status, evaluator_id, self_score, validated_score, submitted_at, validated_at) on public.diagnostic_assessments to authenticated;
grant insert (organization_id, incubator_id, assessment_id, criterion_id, self_value, validated_value, is_not_applicable, not_applicable_justification, evidence_notes, self_comment, evaluator_comment, validated_by, validated_at) on public.diagnostic_responses to authenticated;
grant update (self_value, validated_value, is_not_applicable, not_applicable_justification, evidence_notes, self_comment, evaluator_comment, validated_by, validated_at) on public.diagnostic_responses to authenticated;

revoke execute on function private.validate_diagnostic_scope() from public, anon, authenticated;
revoke execute on function private.protect_published_diagnostic() from public, anon, authenticated;

comment on table public.diagnostic_templates is 'Famílias/versionamentos de metodologias opcionais; CERNE nunca é obrigatório.';
comment on table public.diagnostic_assessments is 'Aplicações imutavelmente ligadas a uma startup e à versão publicada do modelo.';
comment on policy diagnostic_assessments_select on public.diagnostic_assessments is 'Gestores autorizados ou membros da startup acessam apenas aplicações do seu tenant.';

commit;
