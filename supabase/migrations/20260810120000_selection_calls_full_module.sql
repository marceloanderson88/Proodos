-- Chamadas públicas, avaliação de propostas, ranking, recursos e conversão em matrícula.

begin;

do $$ begin create type public.selection_call_status as enum ('draft','published','applications_open','applications_closed','evaluating','preliminary_result','appeals','final_result','completed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.selection_application_status as enum ('draft','submitted','eligible','ineligible','under_review','reviewed','selected','waitlisted','not_selected','withdrawn'); exception when duplicate_object then null; end $$;
do $$ begin create type public.selection_assignment_status as enum ('assigned','in_progress','submitted','replaced','conflict'); exception when duplicate_object then null; end $$;
do $$ begin create type public.selection_appeal_status as enum ('submitted','under_review','granted','partially_granted','denied'); exception when duplicate_object then null; end $$;
do $$ begin create type public.selection_convocation_status as enum ('pending','accepted','declined','expired','converted'); exception when duplicate_object then null; end $$;

create table public.selection_calls (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  incubator_id uuid not null, program_id uuid not null, cohort_id uuid not null,
  code text not null, slug text not null, title text not null, summary text, rules_url text,
  status public.selection_call_status not null default 'draft', applications_open_at timestamptz not null,
  applications_close_at timestamptz not null, evaluations_open_at timestamptz, evaluations_close_at timestamptz,
  appeals_open_at timestamptz, appeals_close_at timestamptz, total_vacancies integer not null default 1,
  waitlist_size integer not null default 0, reviewers_per_application integer not null default 2,
  divergence_threshold numeric(6,2), quota_rules jsonb not null default '[]'::jsonb,
  tie_break_rules jsonb not null default '["total","submitted_at"]'::jsonb,
  public_result_fields jsonb not null default '["startup_name","city","state"]'::jsonb,
  published_at timestamptz, completed_at timestamptz, created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint selection_calls_org_id_unique unique (organization_id,id),
  constraint selection_calls_incubator_same_org foreign key (organization_id,incubator_id) references public.incubators(organization_id,id),
  constraint selection_calls_program_same_org foreign key (organization_id,program_id) references public.programs(organization_id,id),
  constraint selection_calls_cohort_same_org foreign key (organization_id,cohort_id) references public.cohorts(organization_id,id),
  constraint selection_calls_code_valid check (code=btrim(code) and char_length(code) between 2 and 60),
  constraint selection_calls_slug_valid check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 3 and 100),
  constraint selection_calls_title_valid check (title=btrim(title) and char_length(title) between 3 and 200),
  constraint selection_calls_dates_valid check (
    applications_open_at < applications_close_at
    and (evaluations_open_at is null or evaluations_open_at >= applications_close_at)
    and (evaluations_close_at is null or evaluations_open_at is not null)
    and (evaluations_close_at is null or evaluations_open_at < evaluations_close_at)
    and (appeals_open_at is null or evaluations_close_at is not null)
    and (appeals_open_at is null or appeals_open_at >= evaluations_close_at)
    and (appeals_close_at is null or appeals_open_at is not null)
    and (appeals_close_at is null or appeals_open_at < appeals_close_at)
  ),
  constraint selection_calls_numbers_valid check (total_vacancies between 1 and 100000 and waitlist_size between 0 and 100000 and reviewers_per_application between 1 and 15 and (divergence_threshold is null or divergence_threshold between 0 and 1000)),
  constraint selection_calls_json_valid check (jsonb_typeof(quota_rules)='array' and jsonb_typeof(tie_break_rules)='array' and jsonb_typeof(public_result_fields)='array')
);
create unique index selection_calls_slug_uidx on public.selection_calls(lower(slug));
create unique index selection_calls_code_scope_uidx on public.selection_calls(organization_id,incubator_id,code);
create index selection_calls_scope_status_idx on public.selection_calls(organization_id,incubator_id,status,applications_open_at desc);

create table public.selection_form_versions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  call_id uuid not null, version integer not null default 1, title text not null default 'Formulário de inscrição',
  published_at timestamptz, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  constraint selection_form_versions_org_id_unique unique(organization_id,id),
  constraint selection_form_versions_call_same_org foreign key(organization_id,call_id) references public.selection_calls(organization_id,id) on delete cascade,
  constraint selection_form_versions_version_unique unique(call_id,version), constraint selection_form_versions_version_valid check(version>0)
);
create table public.selection_questions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  form_version_id uuid not null, code text not null, label text not null, help_text text,
  kind text not null, required boolean not null default true, position integer not null,
  options jsonb not null default '[]'::jsonb, validation jsonb not null default '{}'::jsonb,
  constraint selection_questions_org_id_unique unique(organization_id,id),
  constraint selection_questions_form_same_org foreign key(organization_id,form_version_id) references public.selection_form_versions(organization_id,id) on delete cascade,
  constraint selection_questions_code_unique unique(form_version_id,code),
  constraint selection_questions_kind_valid check(kind in ('short_text','long_text','number','single_choice','multiple_choice','url','date','boolean')),
  constraint selection_questions_content_valid check(code ~ '^[a-z][a-z0-9_]{1,59}$' and label=btrim(label) and char_length(label) between 2 and 300 and position between 1 and 1000 and jsonb_typeof(options)='array' and jsonb_typeof(validation)='object')
);
create table public.selection_criteria (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  call_id uuid not null, code text not null, name text not null, description text,
  weight numeric(8,3) not null, min_score numeric(8,3) not null default 1, max_score numeric(8,3) not null default 5,
  position integer not null, active boolean not null default true,
  constraint selection_criteria_org_id_unique unique(organization_id,id),
  constraint selection_criteria_call_same_org foreign key(organization_id,call_id) references public.selection_calls(organization_id,id) on delete cascade,
  constraint selection_criteria_code_unique unique(call_id,code),
  constraint selection_criteria_valid check(code ~ '^[a-z][a-z0-9_]{1,59}$' and name=btrim(name) and char_length(name) between 2 and 160 and weight>0 and min_score>=0 and max_score>min_score and position between 1 and 1000)
);

create table public.selection_applications (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  incubator_id uuid not null, call_id uuid not null, form_version_id uuid not null,
  applicant_user_id uuid references auth.users(id), applicant_name text not null, applicant_email text not null,
  applicant_phone text, startup_name text not null, legal_name text, tax_id text, city text, state text,
  sector text, stage public.startup_stage not null default 'idea', summary text,
  status public.selection_application_status not null default 'submitted', protocol text not null,
  submitted_at timestamptz not null default now(), eligibility_notes text, eligibility_reviewed_by uuid references auth.users(id),
  eligibility_reviewed_at timestamptz, converted_startup_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint selection_applications_org_id_unique unique(organization_id,id),
  constraint selection_applications_incubator_same_org foreign key(organization_id,incubator_id) references public.incubators(organization_id,id),
  constraint selection_applications_call_same_org foreign key(organization_id,call_id) references public.selection_calls(organization_id,id),
  constraint selection_applications_form_same_org foreign key(organization_id,form_version_id) references public.selection_form_versions(organization_id,id),
  constraint selection_applications_startup_same_org foreign key(organization_id,converted_startup_id) references public.startups(organization_id,id),
  constraint selection_applications_protocol_unique unique(protocol),
  constraint selection_applications_identity_valid check(applicant_name=btrim(applicant_name) and char_length(applicant_name) between 2 and 160 and applicant_email=lower(btrim(applicant_email)) and applicant_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and startup_name=btrim(startup_name) and char_length(startup_name) between 2 and 160)
);
create unique index selection_applications_call_email_uidx on public.selection_applications(call_id,applicant_email) where status<>'withdrawn';
create index selection_applications_queue_idx on public.selection_applications(organization_id,incubator_id,call_id,status,submitted_at);
create table public.selection_application_answers (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), application_id uuid not null,
  question_id uuid not null, answer jsonb not null, created_at timestamptz not null default now(),
  constraint selection_answers_application_same_org foreign key(organization_id,application_id) references public.selection_applications(organization_id,id) on delete cascade,
  constraint selection_answers_question_same_org foreign key(organization_id,question_id) references public.selection_questions(organization_id,id),
  constraint selection_answers_unique unique(application_id,question_id)
);

create table public.selection_reviewers (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), incubator_id uuid not null,
  call_id uuid not null, user_id uuid not null references auth.users(id), active boolean not null default true,
  confidentiality_accepted_at timestamptz, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  constraint selection_reviewers_org_id_unique unique(organization_id,id),
  constraint selection_reviewers_call_same_org foreign key(organization_id,call_id) references public.selection_calls(organization_id,id) on delete cascade,
  constraint selection_reviewers_incubator_same_org foreign key(organization_id,incubator_id) references public.incubators(organization_id,id),
  constraint selection_reviewers_unique unique(call_id,user_id)
);
create table public.selection_assignments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), call_id uuid not null,
  application_id uuid not null, reviewer_id uuid not null, sequence integer not null,
  status public.selection_assignment_status not null default 'assigned', assigned_at timestamptz not null default now(),
  started_at timestamptz, submitted_at timestamptz, replaced_by uuid, created_by uuid not null references auth.users(id),
  constraint selection_assignments_org_id_unique unique(organization_id,id),
  constraint selection_assignments_call_same_org foreign key(organization_id,call_id) references public.selection_calls(organization_id,id),
  constraint selection_assignments_application_same_org foreign key(organization_id,application_id) references public.selection_applications(organization_id,id),
  constraint selection_assignments_reviewer_same_org foreign key(organization_id,reviewer_id) references public.selection_reviewers(organization_id,id),
  constraint selection_assignments_replacement_same_org foreign key(organization_id,replaced_by) references public.selection_assignments(organization_id,id),
  constraint selection_assignments_unique unique(application_id,reviewer_id), constraint selection_assignments_sequence_unique unique(application_id,sequence),
  constraint selection_assignments_sequence_valid check(sequence between 1 and 50)
);
create index selection_assignments_reviewer_idx on public.selection_assignments(reviewer_id,status,assigned_at);
create table public.selection_conflicts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), assignment_id uuid not null,
  reason_type text not null, justification text not null, declared_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  constraint selection_conflicts_assignment_same_org foreign key(organization_id,assignment_id) references public.selection_assignments(organization_id,id),
  constraint selection_conflicts_unique unique(assignment_id), constraint selection_conflicts_valid check(reason_type in ('ownership','professional','family','other') and char_length(btrim(justification)) between 20 and 2000)
);
create table public.selection_reviews (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), assignment_id uuid not null,
  general_justification text not null, private_notes text, total_score numeric(12,4) not null default 0,
  submitted_at timestamptz not null default now(), revision integer not null default 1,
  constraint selection_reviews_org_id_unique unique(organization_id,id),
  constraint selection_reviews_assignment_same_org foreign key(organization_id,assignment_id) references public.selection_assignments(organization_id,id),
  constraint selection_reviews_assignment_unique unique(assignment_id), constraint selection_reviews_justification_valid check(char_length(btrim(general_justification)) between 30 and 5000)
);
create table public.selection_review_scores (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), review_id uuid not null,
  criterion_id uuid not null, score numeric(8,3) not null, comment text,
  constraint selection_scores_review_same_org foreign key(organization_id,review_id) references public.selection_reviews(organization_id,id) on delete cascade,
  constraint selection_scores_criterion_same_org foreign key(organization_id,criterion_id) references public.selection_criteria(organization_id,id),
  constraint selection_scores_unique unique(review_id,criterion_id)
);

create table public.selection_rankings (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), call_id uuid not null,
  application_id uuid not null, version integer not null, average_score numeric(12,4) not null, review_count integer not null,
  divergence numeric(8,3), general_position integer not null, quota_position integer, outcome text not null,
  quota_applied jsonb not null default '[]'::jsonb, generated_by uuid not null references auth.users(id), generated_at timestamptz not null default now(),
  constraint selection_rankings_call_same_org foreign key(organization_id,call_id) references public.selection_calls(organization_id,id),
  constraint selection_rankings_application_same_org foreign key(organization_id,application_id) references public.selection_applications(organization_id,id),
  constraint selection_rankings_unique unique(call_id,version,application_id), constraint selection_rankings_outcome_valid check(outcome in ('selected','waitlisted','not_selected'))
);
create index selection_rankings_call_version_idx on public.selection_rankings(call_id,version,general_position);
create table public.selection_appeals (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), call_id uuid not null,
  application_id uuid not null, grounds text not null, status public.selection_appeal_status not null default 'submitted',
  decision text, score_adjustment numeric(12,4), submitted_at timestamptz not null default now(), decided_by uuid references auth.users(id), decided_at timestamptz,
  constraint selection_appeals_call_same_org foreign key(organization_id,call_id) references public.selection_calls(organization_id,id),
  constraint selection_appeals_application_same_org foreign key(organization_id,application_id) references public.selection_applications(organization_id,id),
  constraint selection_appeals_unique unique(call_id,application_id), constraint selection_appeals_grounds_valid check(char_length(btrim(grounds)) between 30 and 5000)
);
create table public.selection_publications (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), call_id uuid not null,
  ranking_version integer not null, phase text not null, title text not null, content text, published_by uuid not null references auth.users(id), published_at timestamptz not null default now(),
  constraint selection_publications_call_same_org foreign key(organization_id,call_id) references public.selection_calls(organization_id,id),
  constraint selection_publications_unique unique(call_id,phase,ranking_version), constraint selection_publications_phase_valid check(phase in ('preliminary','final'))
);
create table public.selection_convocations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), call_id uuid not null,
  application_id uuid not null, status public.selection_convocation_status not null default 'pending', deadline_at timestamptz not null,
  responded_at timestamptz, converted_startup_id uuid, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  constraint selection_convocations_call_same_org foreign key(organization_id,call_id) references public.selection_calls(organization_id,id),
  constraint selection_convocations_application_same_org foreign key(organization_id,application_id) references public.selection_applications(organization_id,id),
  constraint selection_convocations_startup_same_org foreign key(organization_id,converted_startup_id) references public.startups(organization_id,id),
  constraint selection_convocations_unique unique(call_id,application_id)
);
create table public.selection_application_events (
  id bigint generated always as identity primary key, organization_id uuid not null references public.organizations(id), application_id uuid not null,
  actor_user_id uuid references auth.users(id), event_type text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  constraint selection_events_application_same_org foreign key(organization_id,application_id) references public.selection_applications(organization_id,id),
  constraint selection_events_type_valid check(event_type ~ '^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$')
);

insert into public.permissions(code,name,description,category) values
 ('selection.read','Visualizar chamadas','Visualizar chamadas, inscrições e resultados autorizados.','Seleção'),
 ('selection.manage','Gerenciar chamadas','Criar chamadas, habilitar inscrições, gerenciar avaliadores e recursos.','Seleção'),
 ('selection.review','Avaliar propostas','Acessar e avaliar propostas explicitamente atribuídas.','Seleção'),
 ('selection.publish','Publicar resultados','Gerar ranking, publicar resultados e converter selecionados.','Seleção')
on conflict(code) do update set name=excluded.name,description=excluded.description,category=excluded.category;

insert into public.role_permissions(organization_id,role_id,permission_code)
select r.organization_id,r.id,p.code from public.roles r join public.permissions p on p.code=any(case r.code
 when 'organization_admin' then array['selection.read','selection.manage','selection.review','selection.publish']
 when 'incubator_manager' then array['selection.read','selection.manage','selection.review','selection.publish']
 when 'program_coordinator' then array['selection.read','selection.manage','selection.review','selection.publish']
 when 'evaluator' then array['selection.read','selection.review']
 when 'auditor' then array['selection.read'] else array[]::text[] end)
where r.is_system on conflict do nothing;

create or replace function private.seed_selection_role_permissions() returns trigger language plpgsql security definer set search_path='' as $$
declare permission_code text;
begin if not new.is_system then return new; end if; foreach permission_code in array case new.code when 'organization_admin' then array['selection.read','selection.manage','selection.review','selection.publish'] when 'incubator_manager' then array['selection.read','selection.manage','selection.review','selection.publish'] when 'program_coordinator' then array['selection.read','selection.manage','selection.review','selection.publish'] when 'evaluator' then array['selection.read','selection.review'] when 'auditor' then array['selection.read'] else array[]::text[] end loop insert into public.role_permissions(organization_id,role_id,permission_code) values(new.organization_id,new.id,permission_code) on conflict do nothing; end loop; return new; end $$;
create trigger roles_seed_selection_permissions after insert on public.roles for each row execute function private.seed_selection_role_permissions();

create or replace function private.validate_selection_call_scope() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.cohorts c join public.programs p on p.organization_id=c.organization_id and p.id=c.program_id where c.organization_id=new.organization_id and c.id=new.cohort_id and p.id=new.program_id and p.incubator_id=new.incubator_id and c.deleted_at is null and p.deleted_at is null) then raise exception 'Programa e turma fora da incubadora' using errcode='23514'; end if;
 return new;
end $$;
create trigger selection_calls_validate_scope before insert or update of organization_id,incubator_id,program_id,cohort_id on public.selection_calls for each row execute function private.validate_selection_call_scope();

create or replace function private.selection_may_manage(org_id uuid,inc_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select private.has_permission(org_id,'selection.manage',null,inc_id) $$;
create or replace function private.selection_may_publish(org_id uuid,inc_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select private.has_permission(org_id,'selection.publish',null,inc_id) $$;
create or replace function private.selection_may_read(org_id uuid,inc_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select private.has_permission(org_id,'selection.read',null,inc_id) or private.has_permission(org_id,'selection.review',null,inc_id) $$;

create or replace function public.create_selection_call(
 target_organization_id uuid,target_incubator_id uuid,target_cohort_id uuid,call_code text,call_slug text,call_title text,call_summary text,
 applications_open_at timestamptz,applications_close_at timestamptz,evaluations_open_at timestamptz,evaluations_close_at timestamptz,
 appeals_open_at timestamptz,appeals_close_at timestamptz,total_vacancies integer,waitlist_size integer,reviewers_per_application integer,
 divergence_threshold numeric,quota_rules jsonb,questions jsonb,criteria jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); program uuid; call_id uuid; form_id uuid; item jsonb; pos integer:=0;
begin
 select c.program_id into program from public.cohorts c join public.programs p on p.organization_id=c.organization_id and p.id=c.program_id where c.organization_id=target_organization_id and c.id=target_cohort_id and p.incubator_id=target_incubator_id and c.deleted_at is null and p.deleted_at is null;
 if actor is null or program is null or not private.selection_may_manage(target_organization_id,target_incubator_id) then raise exception 'Permissão insuficiente ou turma inválida' using errcode='42501'; end if;
 if jsonb_typeof(questions)<>'array' or jsonb_array_length(questions)=0 or jsonb_typeof(criteria)<>'array' or jsonb_array_length(criteria)=0 then raise exception 'Formulário e critérios são obrigatórios' using errcode='22023'; end if;
 insert into public.selection_calls(organization_id,incubator_id,program_id,cohort_id,code,slug,title,summary,applications_open_at,applications_close_at,evaluations_open_at,evaluations_close_at,appeals_open_at,appeals_close_at,total_vacancies,waitlist_size,reviewers_per_application,divergence_threshold,quota_rules,created_by)
 values(target_organization_id,target_incubator_id,program,target_cohort_id,btrim(call_code),lower(btrim(call_slug)),btrim(call_title),nullif(btrim(call_summary),''),applications_open_at,applications_close_at,evaluations_open_at,evaluations_close_at,appeals_open_at,appeals_close_at,total_vacancies,waitlist_size,reviewers_per_application,divergence_threshold,coalesce(quota_rules,'[]'),actor) returning id into call_id;
 insert into public.selection_form_versions(organization_id,call_id,created_by) values(target_organization_id,call_id,actor) returning id into form_id;
 for item in select * from jsonb_array_elements(questions) loop pos:=pos+1; insert into public.selection_questions(organization_id,form_version_id,code,label,help_text,kind,required,position,options,validation) values(target_organization_id,form_id,item->>'code',item->>'label',nullif(item->>'helpText',''),coalesce(item->>'kind','long_text'),coalesce((item->>'required')::boolean,true),pos,coalesce(item->'options','[]'),coalesce(item->'validation','{}')); end loop;
 pos:=0; for item in select * from jsonb_array_elements(criteria) loop pos:=pos+1; insert into public.selection_criteria(organization_id,call_id,code,name,description,weight,min_score,max_score,position) values(target_organization_id,call_id,item->>'code',item->>'name',nullif(item->>'description',''),coalesce((item->>'weight')::numeric,1),coalesce((item->>'minScore')::numeric,1),coalesce((item->>'maxScore')::numeric,5),pos); end loop;
 return call_id;
end $$;

create or replace function public.publish_selection_call(target_call_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare c public.selection_calls%rowtype; cohort_capacity integer; occupied_vacancies bigint; reserved_vacancies bigint;
begin select * into c from public.selection_calls where id=target_call_id for update; if not found or not private.selection_may_manage(c.organization_id,c.incubator_id) then raise exception 'Chamada indisponível' using errcode='42501'; end if; if c.status<>'draft' then raise exception 'Somente rascunhos podem ser publicados'; end if;
 if not exists(select 1 from public.selection_criteria where call_id=c.id and active) or not exists(select 1 from public.selection_questions q join public.selection_form_versions f on f.organization_id=q.organization_id and f.id=q.form_version_id where f.call_id=c.id) then raise exception 'Configure formulário e critérios'; end if;
 select co.capacity into cohort_capacity from public.cohorts co where co.organization_id=c.organization_id and co.id=c.cohort_id for update;
 select count(*) into occupied_vacancies from public.startup_enrollments e where e.organization_id=c.organization_id and e.cohort_id=c.cohort_id and e.status in ('invited','active','suspended');
 select coalesce(sum(greatest(0,other.total_vacancies-(select count(*) from public.selection_applications converted where converted.call_id=other.id and converted.converted_startup_id is not null))),0) into reserved_vacancies from public.selection_calls other where other.organization_id=c.organization_id and other.cohort_id=c.cohort_id and other.id<>c.id and other.status not in ('draft','cancelled','completed');
 if cohort_capacity is not null and occupied_vacancies+reserved_vacancies+c.total_vacancies>cohort_capacity then raise exception 'As matrículas e vagas reservadas excedem a capacidade de % da turma',cohort_capacity using errcode='23514'; end if;
 update public.selection_calls set status=case when now() between applications_open_at and applications_close_at then 'applications_open'::public.selection_call_status else 'published'::public.selection_call_status end,published_at=now(),updated_at=now() where id=c.id;
 update public.selection_form_versions set published_at=now() where call_id=c.id and published_at is null;
end $$;

create or replace function public.get_public_selection_call(call_slug text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',c.id,'slug',c.slug,'title',c.title,'summary',c.summary,'code',c.code,'status',c.status,'openAt',c.applications_open_at,'closeAt',c.applications_close_at,'incubatorName',i.name,'programName',p.name,'cohortName',co.name,'questions',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'code',q.code,'label',q.label,'helpText',q.help_text,'kind',q.kind,'required',q.required,'options',q.options) order by q.position) from public.selection_form_versions f join public.selection_questions q on q.organization_id=f.organization_id and q.form_version_id=f.id where f.call_id=c.id and f.published_at is not null),'[]'::jsonb),'result',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('startupName',case when c.public_result_fields ? 'startup_name' then a.startup_name end,'city',case when c.public_result_fields ? 'city' then a.city end,'state',case when c.public_result_fields ? 'state' then a.state end,'position',case when c.public_result_fields ? 'position' then r.general_position end,'score',case when c.public_result_fields ? 'score' then r.average_score end,'outcome',r.outcome)) order by r.general_position) from public.selection_publications publication join public.selection_rankings r on r.organization_id=publication.organization_id and r.call_id=publication.call_id and r.version=publication.ranking_version join public.selection_applications a on a.organization_id=r.organization_id and a.id=r.application_id where publication.call_id=c.id and publication.id=(select latest.id from public.selection_publications latest where latest.call_id=c.id order by (latest.phase='final') desc,latest.published_at desc limit 1) and r.outcome in ('selected','waitlisted')),'[]'::jsonb))
 from public.selection_calls c join public.incubators i on i.organization_id=c.organization_id and i.id=c.incubator_id join public.programs p on p.organization_id=c.organization_id and p.id=c.program_id join public.cohorts co on co.organization_id=c.organization_id and co.id=c.cohort_id
 where lower(c.slug)=lower(call_slug) and c.status<>'draft' and c.status<>'cancelled';
$$;

create or replace function public.list_public_selection_calls() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('slug',c.slug,'code',c.code,'title',c.title,'summary',c.summary,'status',c.status,'openAt',c.applications_open_at,'closeAt',c.applications_close_at,'incubatorName',i.name,'programName',p.name,'cohortName',co.name) order by c.applications_open_at desc),'[]'::jsonb)
 from public.selection_calls c join public.incubators i on i.organization_id=c.organization_id and i.id=c.incubator_id join public.programs p on p.organization_id=c.organization_id and p.id=c.program_id join public.cohorts co on co.organization_id=c.organization_id and co.id=c.cohort_id
 where c.status not in ('draft','cancelled') and c.published_at is not null;
$$;

create or replace function public.list_open_selection_call_slugs() returns text[] language sql stable security definer set search_path='' as $$
 select coalesce(array_agg(c.slug order by c.slug),array[]::text[]) from public.selection_calls c where c.status in ('published','applications_open') and now() between c.applications_open_at and c.applications_close_at;
$$;

create or replace function public.submit_selection_application(call_slug text,applicant_name text,applicant_email text,applicant_phone text,startup_name text,legal_name text,tax_id text,city text,state text,sector text,stage public.startup_stage,summary text,answers jsonb)
returns text language plpgsql security definer set search_path='' as $$
declare c public.selection_calls%rowtype; form_id uuid; app_id uuid; protocol text; item jsonb; q public.selection_questions%rowtype;
begin
 select * into c from public.selection_calls where lower(slug)=lower(call_slug) for update; if not found or c.status not in ('published','applications_open') or now() not between c.applications_open_at and c.applications_close_at then raise exception 'Inscrições encerradas' using errcode='22023'; end if;
 select id into form_id from public.selection_form_versions where call_id=c.id and published_at is not null order by version desc limit 1;
 if jsonb_typeof(answers)<>'object' then raise exception 'Respostas inválidas'; end if;
 for q in select sq.* from public.selection_questions sq where sq.form_version_id=form_id and sq.required loop if not answers ? q.code or answers->q.code in ('null'::jsonb,'""'::jsonb,'[]'::jsonb) then raise exception 'Campo obrigatório: %',q.label using errcode='22023'; end if; end loop;
 protocol:=upper(substr(replace(c.id::text,'-',''),1,6))||'-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISS')||'-'||upper(substr(encode(extensions.gen_random_bytes(3),'hex'),1,6));
 insert into public.selection_applications(organization_id,incubator_id,call_id,form_version_id,applicant_user_id,applicant_name,applicant_email,applicant_phone,startup_name,legal_name,tax_id,city,state,sector,stage,summary,protocol)
 values(c.organization_id,c.incubator_id,c.id,form_id,(select auth.uid()),btrim(applicant_name),lower(btrim(applicant_email)),nullif(btrim(applicant_phone),''),btrim(startup_name),nullif(btrim(legal_name),''),nullif(btrim(tax_id),''),nullif(btrim(city),''),nullif(btrim(state),''),nullif(btrim(sector),''),coalesce(stage,'idea'),nullif(btrim(summary),''),protocol) returning id into app_id;
 for q in select * from public.selection_questions where form_version_id=form_id loop if answers ? q.code then insert into public.selection_application_answers(organization_id,application_id,question_id,answer) values(c.organization_id,app_id,q.id,answers->q.code); end if; end loop;
 insert into public.selection_application_events(organization_id,application_id,actor_user_id,event_type,metadata) values(c.organization_id,app_id,(select auth.uid()),'application.submitted',jsonb_build_object('protocol',protocol)); return protocol;
end $$;

create or replace function public.review_selection_eligibility(target_application_id uuid,eligible boolean,notes text) returns void language plpgsql security definer set search_path='' as $$
declare a public.selection_applications%rowtype;
begin select * into a from public.selection_applications where id=target_application_id for update; if not found or not private.selection_may_manage(a.organization_id,a.incubator_id) then raise exception 'Inscrição indisponível' using errcode='42501'; end if; if a.status not in ('submitted','eligible','ineligible') then raise exception 'Etapa de habilitação encerrada'; end if;
 update public.selection_applications set status=case when eligible then 'eligible'::public.selection_application_status else 'ineligible'::public.selection_application_status end,eligibility_notes=nullif(btrim(notes),''),eligibility_reviewed_by=(select auth.uid()),eligibility_reviewed_at=now(),updated_at=now() where id=a.id;
 insert into public.selection_application_events(organization_id,application_id,actor_user_id,event_type,metadata) values(a.organization_id,a.id,(select auth.uid()),case when eligible then 'application.eligible' else 'application.ineligible' end,jsonb_build_object('notes',notes));
end $$;

create or replace function public.add_selection_reviewer(target_call_id uuid,reviewer_user_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.selection_calls%rowtype; rid uuid;
begin select * into c from public.selection_calls where id=target_call_id; if not found or not private.selection_may_manage(c.organization_id,c.incubator_id) then raise exception 'Chamada indisponível' using errcode='42501'; end if; if not exists(select 1 from public.organization_memberships m where m.organization_id=c.organization_id and m.user_id=reviewer_user_id and m.status='active') then raise exception 'Avaliador não pertence à organização'; end if;
 if not exists(select 1 from public.organization_memberships m join public.role_assignments ra on ra.organization_id=m.organization_id and ra.membership_id=m.id join public.role_permissions rp on rp.organization_id=ra.organization_id and rp.role_id=ra.role_id where m.organization_id=c.organization_id and m.user_id=reviewer_user_id and m.status='active' and rp.permission_code='selection.review' and (ra.incubator_id is null or ra.incubator_id=c.incubator_id)) then raise exception 'A pessoa precisa ter permissão de avaliação nesta incubadora' using errcode='42501'; end if;
 insert into public.selection_reviewers(organization_id,incubator_id,call_id,user_id,created_by) values(c.organization_id,c.incubator_id,c.id,reviewer_user_id,(select auth.uid())) on conflict(call_id,user_id) do update set active=true returning id into rid; return rid;
end $$;

create or replace function public.accept_selection_confidentiality(target_call_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin update public.selection_reviewers set confidentiality_accepted_at=coalesce(confidentiality_accepted_at,now()) where call_id=target_call_id and user_id=(select auth.uid()) and active; if not found then raise exception 'Avaliador não habilitado nesta chamada' using errcode='42501'; end if; end $$;

create or replace function public.assign_selection_reviewer(target_application_id uuid,target_reviewer_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare a public.selection_applications%rowtype; r public.selection_reviewers%rowtype; seq integer; aid uuid;
begin select * into a from public.selection_applications where id=target_application_id for update; select * into r from public.selection_reviewers where id=target_reviewer_id and active; if not found or a.id is null or r.call_id<>a.call_id or not private.selection_may_manage(a.organization_id,a.incubator_id) then raise exception 'Atribuição inválida' using errcode='42501'; end if;
 select coalesce(max(sequence),0)+1 into seq from public.selection_assignments where application_id=a.id; insert into public.selection_assignments(organization_id,call_id,application_id,reviewer_id,sequence,created_by) values(a.organization_id,a.call_id,a.id,r.id,seq,(select auth.uid())) returning id into aid; update public.selection_applications set status='under_review',updated_at=now() where id=a.id and status='eligible'; return aid;
end $$;

create or replace function public.auto_assign_selection_reviewers(target_call_id uuid) returns integer language plpgsql security definer set search_path='' as $$
declare c public.selection_calls%rowtype; app record; reviewer record; needed integer; seq integer; created integer:=0;
begin select * into c from public.selection_calls where id=target_call_id for update; if not found or not private.selection_may_manage(c.organization_id,c.incubator_id) then raise exception 'Chamada indisponível' using errcode='42501'; end if;
 for app in select a.id from public.selection_applications a where a.call_id=c.id and a.status in ('eligible','under_review') order by a.submitted_at loop
  select greatest(0,c.reviewers_per_application-count(*)) into needed from public.selection_assignments x where x.application_id=app.id and x.status not in ('replaced','conflict');
  select coalesce(max(x.sequence),0) into seq from public.selection_assignments x where x.application_id=app.id;
  for reviewer in select r.id from public.selection_reviewers r where r.call_id=c.id and r.active and not exists(select 1 from public.selection_assignments x where x.application_id=app.id and x.reviewer_id=r.id) order by (select count(*) from public.selection_assignments load where load.reviewer_id=r.id and load.status in ('assigned','in_progress')),r.created_at limit needed loop
   seq:=seq+1; insert into public.selection_assignments(organization_id,call_id,application_id,reviewer_id,sequence,created_by) values(c.organization_id,c.id,app.id,reviewer.id,seq,(select auth.uid())); created:=created+1;
  end loop;
  if needed>0 then update public.selection_applications set status='under_review',updated_at=now() where id=app.id; end if;
 end loop; return created;
end $$;

create or replace function public.declare_selection_conflict(target_assignment_id uuid,reason_type text,justification text) returns void language plpgsql security definer set search_path='' as $$
declare ass public.selection_assignments%rowtype; rev public.selection_reviewers%rowtype;
begin select * into ass from public.selection_assignments where id=target_assignment_id for update; select * into rev from public.selection_reviewers where id=ass.reviewer_id; if not found or (rev.user_id<>(select auth.uid()) and not private.selection_may_manage(ass.organization_id,rev.incubator_id)) then raise exception 'Atribuição indisponível' using errcode='42501'; end if;
 insert into public.selection_conflicts(organization_id,assignment_id,reason_type,justification,declared_by) values(ass.organization_id,ass.id,reason_type,btrim(justification),(select auth.uid())); update public.selection_assignments set status='conflict' where id=ass.id;
end $$;

create or replace function public.submit_selection_review(target_assignment_id uuid,scores jsonb,general_justification text,private_notes text) returns uuid language plpgsql security definer set search_path='' as $$
declare ass public.selection_assignments%rowtype; rev public.selection_reviewers%rowtype; criterion public.selection_criteria%rowtype; review_id uuid; value numeric; weighted numeric:=0; weights numeric:=0; expected integer; received integer;
begin select * into ass from public.selection_assignments where id=target_assignment_id for update; select * into rev from public.selection_reviewers where id=ass.reviewer_id; if ass.id is null or rev.user_id<>(select auth.uid()) or ass.status in ('submitted','replaced','conflict') then raise exception 'Atribuição indisponível' using errcode='42501'; end if;
 if rev.confidentiality_accepted_at is null then raise exception 'Aceite o termo de confidencialidade antes de avaliar' using errcode='42501'; end if;
 select count(*) into expected from public.selection_criteria where call_id=ass.call_id and active; select count(*) into received from jsonb_object_keys(scores); if received<>expected then raise exception 'Avalie todos os critérios'; end if;
 insert into public.selection_reviews(organization_id,assignment_id,general_justification,private_notes) values(ass.organization_id,ass.id,btrim(general_justification),nullif(btrim(private_notes),'')) returning id into review_id;
 for criterion in select * from public.selection_criteria where call_id=ass.call_id and active loop value:=(scores->>criterion.code)::numeric; if value<criterion.min_score or value>criterion.max_score then raise exception 'Nota fora da escala: %',criterion.name; end if; insert into public.selection_review_scores(organization_id,review_id,criterion_id,score) values(ass.organization_id,review_id,criterion.id,value); weighted:=weighted+(value*criterion.weight); weights:=weights+criterion.weight; end loop;
 update public.selection_reviews set total_score=round(weighted/nullif(weights,0),4) where id=review_id; update public.selection_assignments set status='submitted',submitted_at=now() where id=ass.id;
 if not exists(select 1 from public.selection_assignments x where x.application_id=ass.application_id and x.status in ('assigned','in_progress')) then update public.selection_applications set status='reviewed',updated_at=now() where id=ass.application_id; end if; return review_id;
end $$;

create or replace function public.generate_selection_ranking(target_call_id uuid) returns integer language plpgsql security definer set search_path='' as $$
declare c public.selection_calls%rowtype; ver integer; incomplete integer; divergent integer; rule jsonb; quota_seats integer; quota_field text; quota_values text[];
begin select * into c from public.selection_calls where id=target_call_id for update; if not found or not private.selection_may_publish(c.organization_id,c.incubator_id) then raise exception 'Chamada indisponível' using errcode='42501'; end if;
 select count(*) into incomplete from public.selection_applications a where a.call_id=c.id and a.status not in ('ineligible','withdrawn') and (select count(*) from public.selection_assignments x where x.application_id=a.id and x.status='submitted')<c.reviewers_per_application; if incomplete>0 then raise exception 'Existem % inscrições sem o número mínimo de avaliações',incomplete using errcode='23514'; end if;
 if c.divergence_threshold is not null then select count(*) into divergent from (select a.id from public.selection_applications a join public.selection_assignments x on x.application_id=a.id and x.status='submitted' join public.selection_reviews r on r.assignment_id=x.id where a.call_id=c.id group by a.id having count(*)=c.reviewers_per_application and avg(r.total_score)<>0 and ((max(r.total_score)-min(r.total_score))/avg(r.total_score))*100>=c.divergence_threshold) d; if divergent>0 then raise exception 'Existem % propostas que exigem uma avaliação adicional por divergência',divergent using errcode='23514'; end if; end if;
 select coalesce(max(version),0)+1 into ver from public.selection_rankings where call_id=c.id;
 insert into public.selection_rankings(organization_id,call_id,application_id,version,average_score,review_count,divergence,general_position,outcome,generated_by)
 select c.organization_id,c.id,a.id,ver,round(avg(r.total_score),4),count(r.id),case when count(r.id)>1 and avg(r.total_score)<>0 then round(((max(r.total_score)-min(r.total_score))/avg(r.total_score))*100,3) end,row_number() over(order by avg(r.total_score) desc,a.submitted_at,a.id),case when row_number() over(order by avg(r.total_score) desc,a.submitted_at,a.id)<=c.total_vacancies then 'selected' when row_number() over(order by avg(r.total_score) desc,a.submitted_at,a.id)<=c.total_vacancies+c.waitlist_size then 'waitlisted' else 'not_selected' end,(select auth.uid())
 from public.selection_applications a join public.selection_assignments x on x.organization_id=a.organization_id and x.application_id=a.id and x.status='submitted' join public.selection_reviews r on r.organization_id=x.organization_id and r.assignment_id=x.id where a.call_id=c.id and a.status not in ('ineligible','withdrawn') group by a.id,a.submitted_at;
 update public.selection_rankings r set average_score=r.average_score+coalesce(ap.score_adjustment,0) from public.selection_appeals ap where ap.organization_id=r.organization_id and ap.call_id=r.call_id and ap.application_id=r.application_id and ap.status in ('granted','partially_granted') and r.call_id=c.id and r.version=ver;
 with ordered as (select r.id,row_number() over(order by r.average_score desc,a.submitted_at,a.id) as new_position from public.selection_rankings r join public.selection_applications a on a.organization_id=r.organization_id and a.id=r.application_id where r.call_id=c.id and r.version=ver) update public.selection_rankings r set general_position=ordered.new_position,outcome=case when ordered.new_position<=c.total_vacancies then 'selected' when ordered.new_position<=c.total_vacancies+c.waitlist_size then 'waitlisted' else 'not_selected' end from ordered where r.id=ordered.id;
 if jsonb_array_length(c.quota_rules)>0 then
  rule:=c.quota_rules->0; quota_field:=rule->>'field'; select array_agg(lower(btrim(entries.value))) into quota_values from jsonb_array_elements_text(coalesce(rule->'values','[]'::jsonb)) as entries(value); quota_seats:=ceil(c.total_vacancies*coalesce((rule->>'minimumPercentage')::numeric,0)/100.0);
  update public.selection_rankings set outcome='not_selected',quota_applied='[]'::jsonb where call_id=c.id and version=ver;
  with quota_pick as (select r.id from public.selection_rankings r join public.selection_applications a on a.organization_id=r.organization_id and a.id=r.application_id where r.call_id=c.id and r.version=ver and lower(case quota_field when 'city' then coalesce(a.city,'') else coalesce(a.state,'') end)=any(coalesce(quota_values,array[]::text[])) order by r.general_position limit quota_seats) update public.selection_rankings r set outcome='selected',quota_applied=jsonb_build_array(rule) where r.id in(select id from quota_pick);
  with general_pick as (select r.id from public.selection_rankings r where r.call_id=c.id and r.version=ver and r.outcome<>'selected' order by r.general_position limit greatest(0,c.total_vacancies-(select count(*) from public.selection_rankings q where q.call_id=c.id and q.version=ver and q.outcome='selected'))) update public.selection_rankings r set outcome='selected' where r.id in(select id from general_pick);
  with waitlist_pick as (select r.id from public.selection_rankings r where r.call_id=c.id and r.version=ver and r.outcome='not_selected' order by r.general_position limit c.waitlist_size) update public.selection_rankings r set outcome='waitlisted' where r.id in(select id from waitlist_pick);
 end if;
 update public.selection_applications a set status=case r.outcome when 'selected' then 'selected'::public.selection_application_status when 'waitlisted' then 'waitlisted'::public.selection_application_status else 'not_selected'::public.selection_application_status end,updated_at=now() from public.selection_rankings r where r.application_id=a.id and r.call_id=c.id and r.version=ver;
 update public.selection_calls set status='preliminary_result',updated_at=now() where id=c.id; return ver;
end $$;

create or replace function public.register_selection_appeal(target_application_id uuid,grounds text) returns uuid language plpgsql security definer set search_path='' as $$
declare a public.selection_applications%rowtype; c public.selection_calls%rowtype; result uuid;
begin select * into a from public.selection_applications where id=target_application_id; select * into c from public.selection_calls where id=a.call_id; if a.id is null or now() not between c.appeals_open_at and c.appeals_close_at then raise exception 'Prazo de recurso indisponível'; end if; if (select auth.uid()) is distinct from a.applicant_user_id and not private.selection_may_manage(a.organization_id,a.incubator_id) then raise exception 'Permissão insuficiente' using errcode='42501'; end if; insert into public.selection_appeals(organization_id,call_id,application_id,grounds) values(a.organization_id,a.call_id,a.id,btrim(grounds)) returning id into result; return result; end $$;

create or replace function public.submit_public_selection_appeal(call_slug text,application_protocol text,applicant_email text,grounds text) returns uuid language plpgsql security definer set search_path='' as $$
declare a public.selection_applications%rowtype; c public.selection_calls%rowtype; result uuid;
begin select ap.* into a from public.selection_applications ap join public.selection_calls sc on sc.organization_id=ap.organization_id and sc.id=ap.call_id where lower(sc.slug)=lower(call_slug) and ap.protocol=upper(btrim(application_protocol)) and ap.applicant_email=lower(btrim(applicant_email)); if not found then raise exception 'Protocolo ou e-mail inválido' using errcode='P0002'; end if; select * into c from public.selection_calls where id=a.call_id; if c.appeals_open_at is null or c.appeals_close_at is null or now() not between c.appeals_open_at and c.appeals_close_at then raise exception 'Prazo de recurso indisponível' using errcode='22023'; end if; insert into public.selection_appeals(organization_id,call_id,application_id,grounds) values(a.organization_id,a.call_id,a.id,btrim(grounds)) returning id into result; insert into public.selection_application_events(organization_id,application_id,event_type,metadata) values(a.organization_id,a.id,'appeal.submitted',jsonb_build_object('appealId',result)); return result; end $$;

create or replace function public.respond_selection_convocation(application_protocol text,applicant_email text,accept boolean) returns text language plpgsql security definer set search_path='' as $$
declare a public.selection_applications%rowtype; v public.selection_convocations%rowtype;
begin select * into a from public.selection_applications where protocol=upper(btrim(application_protocol)) and applicant_email=lower(btrim(applicant_email)); if not found then raise exception 'Protocolo ou e-mail inválido' using errcode='P0002'; end if; select * into v from public.selection_convocations where application_id=a.id for update; if not found or v.status<>'pending' or v.deadline_at<=now() then raise exception 'Convocação indisponível' using errcode='22023'; end if; update public.selection_convocations set status=case when accept then 'accepted'::public.selection_convocation_status else 'declined'::public.selection_convocation_status end,responded_at=now() where id=v.id; insert into public.selection_application_events(organization_id,application_id,event_type,metadata) values(a.organization_id,a.id,case when accept then 'convocation.accepted' else 'convocation.declined' end,'{}'); return case when accept then 'accepted' else 'declined' end; end $$;

create or replace function public.decide_selection_appeal(target_appeal_id uuid,decision_status public.selection_appeal_status,decision_text text,score_adjustment numeric) returns void language plpgsql security definer set search_path='' as $$
declare ap public.selection_appeals%rowtype; c public.selection_calls%rowtype;
begin select * into ap from public.selection_appeals where id=target_appeal_id for update; select * into c from public.selection_calls where id=ap.call_id; if not found or not private.selection_may_manage(ap.organization_id,c.incubator_id) or decision_status not in ('granted','partially_granted','denied') then raise exception 'Decisão inválida' using errcode='42501'; end if; update public.selection_appeals set status=decision_status,decision=btrim(decision_text),score_adjustment=$4,decided_by=(select auth.uid()),decided_at=now() where id=ap.id; end $$;

create or replace function public.publish_selection_result(target_call_id uuid,publication_phase text,publication_title text,publication_content text) returns void language plpgsql security definer set search_path='' as $$
declare c public.selection_calls%rowtype; ver integer;
begin select * into c from public.selection_calls where id=target_call_id for update; if not found or not private.selection_may_publish(c.organization_id,c.incubator_id) then raise exception 'Chamada indisponível' using errcode='42501'; end if; select max(version) into ver from public.selection_rankings where call_id=c.id; if ver is null or publication_phase not in ('preliminary','final') then raise exception 'Ranking ou fase inválida'; end if; insert into public.selection_publications(organization_id,call_id,ranking_version,phase,title,content,published_by) values(c.organization_id,c.id,ver,publication_phase,btrim(publication_title),nullif(btrim(publication_content),''),(select auth.uid())) on conflict(call_id,phase,ranking_version) do update set title=excluded.title,content=excluded.content,published_by=excluded.published_by,published_at=now(); update public.selection_calls set status=case when publication_phase='final' then 'final_result'::public.selection_call_status else 'preliminary_result'::public.selection_call_status end,updated_at=now() where id=c.id; end $$;

create or replace function public.create_selection_convocations(target_call_id uuid,deadline_at timestamptz) returns integer language plpgsql security definer set search_path='' as $$
declare c public.selection_calls%rowtype; ver integer; affected integer;
begin select * into c from public.selection_calls where id=target_call_id; if not found or not private.selection_may_publish(c.organization_id,c.incubator_id) or deadline_at<=now() then raise exception 'Convocação inválida' using errcode='42501'; end if; select max(p.ranking_version) into ver from public.selection_publications p where p.call_id=c.id and p.phase='final'; if ver is null then raise exception 'Publique o resultado final antes de convocar' using errcode='23514'; end if; insert into public.selection_convocations(organization_id,call_id,application_id,deadline_at,created_by) select c.organization_id,c.id,r.application_id,deadline_at,(select auth.uid()) from public.selection_rankings r where r.call_id=c.id and r.version=ver and r.outcome='selected' on conflict(call_id,application_id) do update set deadline_at=excluded.deadline_at where public.selection_convocations.status in ('pending','expired'); get diagnostics affected=row_count; return affected; end $$;

create or replace function public.convert_selection_application(target_application_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare a public.selection_applications%rowtype; c public.selection_calls%rowtype; convocation public.selection_convocations%rowtype; cohort_record public.cohorts%rowtype; startup_id uuid; actor uuid:=(select auth.uid()); membership_id uuid; representative_role_id uuid; occupied integer; already_enrolled boolean;
begin select * into a from public.selection_applications where id=target_application_id for update; select * into c from public.selection_calls where id=a.call_id; if a.id is null or a.status<>'selected' or not private.selection_may_publish(a.organization_id,a.incubator_id) then raise exception 'Inscrição não pode ser convertida' using errcode='42501'; end if; if a.converted_startup_id is not null then return a.converted_startup_id; end if;
 select * into convocation from public.selection_convocations v where v.organization_id=a.organization_id and v.application_id=a.id for update; if not found or convocation.status<>'accepted' then raise exception 'A convocação precisa estar aceita antes da matrícula' using errcode='23514'; end if;
 if not exists(select 1 from public.selection_publications p where p.organization_id=a.organization_id and p.call_id=a.call_id and p.phase='final') then raise exception 'O resultado final precisa estar publicado' using errcode='23514'; end if;
 select * into cohort_record from public.cohorts co where co.organization_id=a.organization_id and co.id=c.cohort_id for update;
 select s.id into startup_id from public.startups s where s.organization_id=a.organization_id and s.tax_id is not distinct from a.tax_id and a.tax_id is not null and s.deleted_at is null limit 1;
 if startup_id is not null and not exists(select 1 from public.startups s where s.organization_id=a.organization_id and s.id=startup_id and s.incubator_id=a.incubator_id) then raise exception 'Já existe startup com este documento em outra incubadora da organização' using errcode='23514'; end if;
 if startup_id is null then insert into public.startups(organization_id,incubator_id,code,name,legal_name,tax_id,sector,stage,status,city,state,created_by) values(a.organization_id,a.incubator_id,'',a.startup_name,a.legal_name,a.tax_id,a.sector,a.stage,'active',a.city,a.state,actor) returning id into startup_id; end if;
 select exists(select 1 from public.startup_enrollments e where e.organization_id=a.organization_id and e.startup_id=startup_id and e.cohort_id=c.cohort_id and e.status in ('invited','active','suspended')) into already_enrolled; select count(*) into occupied from public.startup_enrollments e where e.organization_id=a.organization_id and e.cohort_id=c.cohort_id and e.status in ('invited','active','suspended'); if not already_enrolled and cohort_record.capacity is not null and occupied>=cohort_record.capacity then raise exception 'A turma atingiu sua capacidade de % startups',cohort_record.capacity using errcode='23514'; end if;
 if a.applicant_user_id is not null then insert into public.organization_memberships(organization_id,user_id,status,joined_at,created_by) values(a.organization_id,a.applicant_user_id,'active',now(),actor) on conflict(organization_id,user_id) do update set status='active',joined_at=coalesce(public.organization_memberships.joined_at,now()),suspended_at=null; select m.id into membership_id from public.organization_memberships m where m.organization_id=a.organization_id and m.user_id=a.applicant_user_id; select r.id into representative_role_id from public.roles r where r.organization_id=a.organization_id and r.code='startup_representative' and r.archived_at is null; if membership_id is not null and representative_role_id is not null then insert into public.role_assignments(organization_id,membership_id,role_id,incubator_id,created_by) values(a.organization_id,membership_id,representative_role_id,a.incubator_id,actor) on conflict do nothing; end if; end if;
 if not exists(select 1 from public.startup_members m where m.organization_id=a.organization_id and m.startup_id=startup_id and lower(m.email)=a.applicant_email and m.status='active') then insert into public.startup_members(organization_id,startup_id,user_id,full_name,email,role,is_representative,status,joined_on,created_by) values(a.organization_id,startup_id,a.applicant_user_id,a.applicant_name,a.applicant_email,'representative',true,'active',current_date,actor); end if;
 if not exists(select 1 from public.startup_enrollments e where e.organization_id=a.organization_id and e.startup_id=startup_id and e.cohort_id=c.cohort_id and e.status in ('invited','active','suspended')) then insert into public.startup_enrollments(organization_id,startup_id,cohort_id,status,source,entry_date,created_by) values(a.organization_id,startup_id,c.cohort_id,'active','selection_process',current_date,actor); end if;
 update public.selection_applications set converted_startup_id=startup_id,updated_at=now() where id=a.id; update public.selection_convocations set status='converted',converted_startup_id=startup_id,responded_at=coalesce(responded_at,now()) where application_id=a.id; insert into public.selection_application_events(organization_id,application_id,actor_user_id,event_type,metadata) values(a.organization_id,a.id,actor,'application.converted',jsonb_build_object('startupId',startup_id,'cohortId',c.cohort_id)); return startup_id;
end $$;

create or replace function public.get_selection_workspace(target_organization_id uuid,target_incubator_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare may_read boolean:=private.selection_may_read(target_organization_id,target_incubator_id); may_manage boolean:=private.selection_may_manage(target_organization_id,target_incubator_id); may_publish boolean:=private.selection_may_publish(target_organization_id,target_incubator_id); actor uuid:=(select auth.uid());
begin if actor is null or not may_read then raise exception 'Permissão insuficiente' using errcode='42501'; end if;
 return jsonb_build_object('canManage',may_manage,'canPublish',may_publish,
 'calls',coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from public.selection_calls c where c.organization_id=target_organization_id and c.incubator_id=target_incubator_id),'[]'::jsonb),
 'programs',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'cohorts',(select coalesce(jsonb_agg(jsonb_build_object('id',co.id,'name',co.name,'code',co.code) order by co.starts_on desc),'[]'::jsonb) from public.cohorts co where co.organization_id=p.organization_id and co.program_id=p.id and co.deleted_at is null)) order by p.name) from public.programs p where p.organization_id=target_organization_id and p.incubator_id=target_incubator_id and p.deleted_at is null),'[]'::jsonb),
 'applications',coalesce((select jsonb_agg((case when may_manage then to_jsonb(a) else to_jsonb(a)-array['applicant_name','applicant_email','applicant_phone','legal_name','tax_id','eligibility_notes','eligibility_reviewed_by'] end)||jsonb_build_object('answers',(select coalesce(jsonb_object_agg(q.code,ans.answer),'{}'::jsonb) from public.selection_application_answers ans join public.selection_questions q on q.organization_id=ans.organization_id and q.id=ans.question_id where ans.organization_id=a.organization_id and ans.application_id=a.id)) order by a.submitted_at desc) from public.selection_applications a where a.organization_id=target_organization_id and a.incubator_id=target_incubator_id and (may_manage or exists(select 1 from public.selection_assignments x join public.selection_reviewers r on r.organization_id=x.organization_id and r.id=x.reviewer_id where x.organization_id=a.organization_id and x.application_id=a.id and r.user_id=actor))),'[]'::jsonb),
 'criteria',coalesce((select jsonb_agg(to_jsonb(cr) order by cr.call_id,cr.position) from public.selection_criteria cr join public.selection_calls c on c.organization_id=cr.organization_id and c.id=cr.call_id where c.organization_id=target_organization_id and c.incubator_id=target_incubator_id),'[]'::jsonb),
 'reviewers',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('display_name',p.display_name,'email',p.email) order by p.display_name) from public.selection_reviewers r join public.profiles p on p.id=r.user_id where r.organization_id=target_organization_id and r.incubator_id=target_incubator_id and (may_manage or r.user_id=actor)),'[]'::jsonb),
 'eligiblePeople',case when may_manage then coalesce((select jsonb_agg(distinct jsonb_build_object('id',p.id,'display_name',p.display_name,'email',p.email)) from public.organization_memberships m join public.profiles p on p.id=m.user_id join public.role_assignments ra on ra.organization_id=m.organization_id and ra.membership_id=m.id join public.role_permissions rp on rp.organization_id=ra.organization_id and rp.role_id=ra.role_id where m.organization_id=target_organization_id and m.status='active' and rp.permission_code='selection.review' and (ra.incubator_id is null or ra.incubator_id=target_incubator_id)),'[]'::jsonb) else '[]'::jsonb end,
 'assignments',coalesce((select jsonb_agg(to_jsonb(x)||jsonb_build_object('reviewer_user_id',r.user_id) order by x.assigned_at desc) from public.selection_assignments x join public.selection_reviewers r on r.organization_id=x.organization_id and r.id=x.reviewer_id join public.selection_calls c on c.organization_id=x.organization_id and c.id=x.call_id where c.organization_id=target_organization_id and c.incubator_id=target_incubator_id and (may_manage or r.user_id=actor)),'[]'::jsonb),
 'reviews',coalesce((select jsonb_agg(to_jsonb(rv)||jsonb_build_object('scores',(select coalesce(jsonb_object_agg(cr.code,s.score),'{}'::jsonb) from public.selection_review_scores s join public.selection_criteria cr on cr.organization_id=s.organization_id and cr.id=s.criterion_id where s.review_id=rv.id))) from public.selection_reviews rv join public.selection_assignments x on x.organization_id=rv.organization_id and x.id=rv.assignment_id join public.selection_reviewers r on r.organization_id=x.organization_id and r.id=x.reviewer_id join public.selection_calls c on c.organization_id=x.organization_id and c.id=x.call_id where c.organization_id=target_organization_id and c.incubator_id=target_incubator_id and (may_manage or r.user_id=actor)),'[]'::jsonb),
 'rankings',case when may_manage or may_publish then coalesce((select jsonb_agg(to_jsonb(r) order by r.version desc,r.general_position) from public.selection_rankings r join public.selection_calls c on c.organization_id=r.organization_id and c.id=r.call_id where c.organization_id=target_organization_id and c.incubator_id=target_incubator_id),'[]'::jsonb) else '[]'::jsonb end,
 'appeals',case when may_manage then coalesce((select jsonb_agg(to_jsonb(a) order by a.submitted_at desc) from public.selection_appeals a join public.selection_calls c on c.organization_id=a.organization_id and c.id=a.call_id where c.organization_id=target_organization_id and c.incubator_id=target_incubator_id),'[]'::jsonb) else '[]'::jsonb end,
 'convocations',case when may_manage or may_publish then coalesce((select jsonb_agg(to_jsonb(v) order by v.created_at desc) from public.selection_convocations v join public.selection_calls c on c.organization_id=v.organization_id and c.id=v.call_id where c.organization_id=target_organization_id and c.incubator_id=target_incubator_id),'[]'::jsonb) else '[]'::jsonb end);
end $$;

do $$ declare t text; begin foreach t in array array['selection_calls','selection_form_versions','selection_questions','selection_criteria','selection_applications','selection_application_answers','selection_reviewers','selection_assignments','selection_conflicts','selection_reviews','selection_review_scores','selection_rankings','selection_appeals','selection_publications','selection_convocations','selection_application_events'] loop execute format('alter table public.%I enable row level security',t); execute format('revoke all on public.%I from public,anon,authenticated',t); end loop; end $$;

-- Defesa em profundidade: as telas usam RPCs; não há grants diretos às tabelas.
create policy selection_calls_select on public.selection_calls for select to authenticated using(private.selection_may_read(organization_id,incubator_id));
create policy selection_applications_select on public.selection_applications for select to authenticated using(private.selection_may_manage(organization_id,incubator_id) or applicant_user_id=(select auth.uid()) or exists(select 1 from public.selection_assignments x join public.selection_reviewers r on r.organization_id=x.organization_id and r.id=x.reviewer_id where x.organization_id=selection_applications.organization_id and x.application_id=selection_applications.id and r.user_id=(select auth.uid())));

do $$ declare t text; begin foreach t in array array['selection_calls','selection_form_versions','selection_questions','selection_criteria','selection_applications','selection_application_answers','selection_reviewers','selection_assignments','selection_conflicts','selection_reviews','selection_review_scores','selection_rankings','selection_appeals','selection_publications','selection_convocations'] loop execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.write_audit_log()',t,t); end loop; end $$;
create trigger selection_calls_updated before update on public.selection_calls for each row execute function private.set_updated_at();
create trigger selection_applications_updated before update on public.selection_applications for each row execute function private.set_updated_at();

revoke execute on function private.validate_selection_call_scope() from public,anon,authenticated;
revoke execute on function private.seed_selection_role_permissions() from public,anon,authenticated;
revoke execute on function private.selection_may_manage(uuid,uuid),private.selection_may_publish(uuid,uuid),private.selection_may_read(uuid,uuid) from public,anon;
grant execute on function private.selection_may_manage(uuid,uuid),private.selection_may_publish(uuid,uuid),private.selection_may_read(uuid,uuid) to authenticated;
revoke execute on function public.create_selection_call(uuid,uuid,uuid,text,text,text,text,timestamptz,timestamptz,timestamptz,timestamptz,timestamptz,timestamptz,integer,integer,integer,numeric,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.create_selection_call(uuid,uuid,uuid,text,text,text,text,timestamptz,timestamptz,timestamptz,timestamptz,timestamptz,timestamptz,integer,integer,integer,numeric,jsonb,jsonb,jsonb) to authenticated;
revoke execute on function public.publish_selection_call(uuid),public.review_selection_eligibility(uuid,boolean,text),public.add_selection_reviewer(uuid,uuid),public.accept_selection_confidentiality(uuid),public.assign_selection_reviewer(uuid,uuid),public.auto_assign_selection_reviewers(uuid),public.declare_selection_conflict(uuid,text,text),public.submit_selection_review(uuid,jsonb,text,text),public.generate_selection_ranking(uuid),public.register_selection_appeal(uuid,text),public.decide_selection_appeal(uuid,public.selection_appeal_status,text,numeric),public.publish_selection_result(uuid,text,text,text),public.create_selection_convocations(uuid,timestamptz),public.convert_selection_application(uuid),public.get_selection_workspace(uuid,uuid) from public,anon;
grant execute on function public.publish_selection_call(uuid),public.review_selection_eligibility(uuid,boolean,text),public.add_selection_reviewer(uuid,uuid),public.accept_selection_confidentiality(uuid),public.assign_selection_reviewer(uuid,uuid),public.auto_assign_selection_reviewers(uuid),public.declare_selection_conflict(uuid,text,text),public.submit_selection_review(uuid,jsonb,text,text),public.generate_selection_ranking(uuid),public.register_selection_appeal(uuid,text),public.decide_selection_appeal(uuid,public.selection_appeal_status,text,numeric),public.publish_selection_result(uuid,text,text,text),public.create_selection_convocations(uuid,timestamptz),public.convert_selection_application(uuid),public.get_selection_workspace(uuid,uuid) to authenticated;
revoke execute on function public.list_public_selection_calls(),public.list_open_selection_call_slugs(),public.get_public_selection_call(text),public.submit_selection_application(text,text,text,text,text,text,text,text,text,text,public.startup_stage,text,jsonb),public.submit_public_selection_appeal(text,text,text,text),public.respond_selection_convocation(text,text,boolean) from public;
grant execute on function public.list_public_selection_calls(),public.list_open_selection_call_slugs(),public.get_public_selection_call(text),public.submit_selection_application(text,text,text,text,text,text,text,text,text,text,public.startup_stage,text,jsonb),public.submit_public_selection_appeal(text,text,text,text),public.respond_selection_convocation(text,text,boolean) to anon,authenticated;

commit;
