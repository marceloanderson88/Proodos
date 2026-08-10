-- Gestão integrada de conformidade e evidências CERNE 1 e 2.

do $$ begin
  create type public.cerne_cycle_status as enum ('draft', 'active', 'internal_review', 'external_review', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.cerne_slot_status as enum ('pending', 'submitted', 'approved', 'rejected', 'waived');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.cerne_sync_status as enum ('not_required', 'pending', 'syncing', 'synced', 'failed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.cerne_review_result as enum ('valid', 'partial', 'invalid');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.cerne_alert_severity as enum ('info', 'warning', 'critical');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.cerne_alert_status as enum ('open', 'acknowledged', 'resolved');
exception when duplicate_object then null; end $$;

create table if not exists public.cerne_practices (
  code text primary key,
  level smallint not null check (level in (1, 2)),
  process_code text not null,
  process_name text not null,
  name text not null,
  description text not null,
  manual_order smallint not null unique,
  applicable_modules text[] not null default '{}',
  active boolean not null default true,
  check (code ~ '^[12]\.[1-5]\.[1-3]$'),
  check (process_code ~ '^[12]\.[1-5]$')
);

create table if not exists public.cerne_evidence_requirements (
  id uuid primary key default gen_random_uuid(),
  practice_code text not null references public.cerne_practices(code),
  code text not null,
  name text not null,
  description text not null default '',
  mandatory boolean not null default true,
  periodicity text not null default 'por_ciclo',
  suggested_source_module text,
  scope_hint text not null default 'incubator' check (scope_hint in ('incubator', 'program', 'cohort', 'startup', 'selection_call')),
  manual_gap boolean not null default false,
  unique (practice_code, code)
);

create table if not exists public.cerne_cycles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  incubator_id uuid not null,
  name text not null,
  reference_year integer not null check (reference_year between 2020 and 2100),
  target_level smallint not null default 2 check (target_level in (1, 2)),
  starts_on date not null,
  ends_on date not null,
  status public.cerne_cycle_status not null default 'draft',
  drive_root_path text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, incubator_id, reference_year, name),
  foreign key (organization_id, incubator_id) references public.incubators(organization_id, id),
  check (name = btrim(name) and char_length(name) between 3 and 160),
  check (starts_on <= ends_on)
);

create table if not exists public.cerne_practice_owners (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  cycle_id uuid not null,
  practice_code text not null references public.cerne_practices(code),
  responsible_user_id uuid references auth.users(id),
  implementation_status text not null default 'to_validate' check (implementation_status in ('to_validate', 'implementing', 'implemented', 'not_applicable')),
  notes text,
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, practice_code),
  foreign key (organization_id, cycle_id) references public.cerne_cycles(organization_id, id) on delete cascade
);

create table if not exists public.cerne_evidence_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  cycle_id uuid not null,
  practice_code text not null references public.cerne_practices(code),
  requirement_id uuid not null references public.cerne_evidence_requirements(id),
  scope_type text not null default 'incubator' check (scope_type in ('incubator', 'program', 'cohort', 'startup', 'selection_call')),
  program_id uuid,
  cohort_id uuid,
  startup_id uuid,
  selection_call_id uuid,
  title text not null,
  due_at timestamptz,
  responsible_user_id uuid references auth.users(id),
  status public.cerne_slot_status not null default 'pending',
  waiver_reason text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, cycle_id) references public.cerne_cycles(organization_id, id) on delete cascade,
  foreign key (organization_id, program_id) references public.programs(organization_id, id),
  foreign key (organization_id, cohort_id) references public.cohorts(organization_id, id),
  foreign key (organization_id, startup_id) references public.startups(organization_id, id),
  foreign key (organization_id, selection_call_id) references public.selection_calls(organization_id, id),
  check (title = btrim(title) and char_length(title) between 3 and 240),
  check (
    (scope_type = 'incubator' and num_nonnulls(program_id, cohort_id, startup_id, selection_call_id) = 0)
    or (scope_type = 'program' and program_id is not null and num_nonnulls(cohort_id, startup_id, selection_call_id) = 0)
    or (scope_type = 'cohort' and cohort_id is not null and num_nonnulls(program_id, startup_id, selection_call_id) = 0)
    or (scope_type = 'startup' and startup_id is not null and num_nonnulls(program_id, cohort_id, selection_call_id) = 0)
    or (scope_type = 'selection_call' and selection_call_id is not null and num_nonnulls(program_id, cohort_id, startup_id) = 0)
  )
);

create table if not exists public.cerne_drive_folders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  cycle_id uuid not null,
  practice_code text references public.cerne_practices(code),
  folder_kind text not null check (folder_kind in ('root', 'level', 'process', 'practice', 'context')),
  logical_path text not null,
  provider_folder_id text,
  sync_status public.cerne_sync_status not null default 'pending',
  failure_detail text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, logical_path),
  foreign key (organization_id, cycle_id) references public.cerne_cycles(organization_id, id) on delete cascade,
  check (logical_path like 'CERNE/%')
);

create table if not exists public.cerne_evidences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  cycle_id uuid not null,
  slot_id uuid not null,
  practice_code text not null references public.cerne_practices(code),
  title text not null,
  description text,
  observed_at timestamptz not null default now(),
  file_id uuid,
  external_url text,
  source_module text,
  source_entity_type text,
  source_entity_id uuid,
  source_snapshot jsonb not null default '{}'::jsonb,
  drive_path text not null,
  sync_status public.cerne_sync_status not null default 'not_required',
  status public.cerne_slot_status not null default 'submitted',
  submitted_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, cycle_id) references public.cerne_cycles(organization_id, id) on delete cascade,
  foreign key (organization_id, slot_id) references public.cerne_evidence_slots(organization_id, id) on delete cascade,
  foreign key (organization_id, file_id) references public.files(organization_id, id),
  check (title = btrim(title) and char_length(title) between 3 and 240),
  check (external_url is null or (external_url ~ '^https://' and char_length(external_url) <= 2048)),
  check (num_nonnulls(file_id, external_url, source_entity_id) >= 1),
  check ((source_entity_id is null) = (source_entity_type is null))
);

create table if not exists public.cerne_review_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  cycle_id uuid not null,
  reviewer_user_id uuid not null references auth.users(id),
  practice_code text references public.cerne_practices(code),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status text not null default 'active' check (status in ('invited', 'active', 'completed', 'revoked')),
  confidentiality_accepted_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique nulls not distinct (cycle_id, reviewer_user_id, practice_code),
  foreign key (organization_id, cycle_id) references public.cerne_cycles(organization_id, id) on delete cascade
);

create table if not exists public.cerne_evidence_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  evidence_id uuid not null,
  assignment_id uuid,
  reviewer_user_id uuid not null references auth.users(id),
  result public.cerne_review_result not null,
  notes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evidence_id, reviewer_user_id),
  foreign key (organization_id, evidence_id) references public.cerne_evidences(organization_id, id) on delete cascade,
  foreign key (organization_id, assignment_id) references public.cerne_review_assignments(organization_id, id)
);

create table if not exists public.cerne_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  incubator_id uuid not null,
  cycle_id uuid not null,
  alert_key text not null,
  severity public.cerne_alert_severity not null,
  alert_type text not null,
  title text not null,
  message text not null,
  practice_code text references public.cerne_practices(code),
  slot_id uuid,
  evidence_id uuid,
  due_at timestamptz,
  status public.cerne_alert_status not null default 'open',
  acknowledged_by uuid references auth.users(id),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, alert_key),
  foreign key (organization_id, incubator_id) references public.incubators(organization_id, id),
  foreign key (organization_id, cycle_id) references public.cerne_cycles(organization_id, id) on delete cascade,
  foreign key (organization_id, slot_id) references public.cerne_evidence_slots(organization_id, id) on delete cascade,
  foreign key (organization_id, evidence_id) references public.cerne_evidences(organization_id, id) on delete cascade
);

create index if not exists cerne_slots_cycle_status_idx on public.cerne_evidence_slots(cycle_id, status, due_at);
create index if not exists cerne_evidences_cycle_practice_idx on public.cerne_evidences(cycle_id, practice_code, created_at desc);
create index if not exists cerne_alerts_scope_status_idx on public.cerne_alerts(organization_id, incubator_id, status, severity);

insert into public.cerne_practices(code,level,process_code,process_name,name,description,manual_order,applicable_modules) values
('1.1.1',1,'1.1','Sistema de Sensibilização e Prospecção','Sensibilização','Mobilizar públicos e difundir a cultura empreendedora.',1,array['programs','events','communications']),
('1.1.2',1,'1.1','Sistema de Sensibilização e Prospecção','Prospecção','Identificar ideias, projetos, equipes e demandas com potencial inovador.',2,array['programs','startups']),
('1.1.3',1,'1.1','Sistema de Sensibilização e Prospecção','Qualificação de Potenciais Empreendedores','Preparar potenciais empreendedores para estruturar e validar negócios.',3,array['programs','cohorts','contents']),
('1.2.1',1,'1.2','Sistema de Seleção','Recepção de Propostas','Receber propostas de forma estruturada, transparente e acessível.',4,array['selection']),
('1.2.2',1,'1.2','Sistema de Seleção','Avaliação','Avaliar e classificar propostas com critérios e banca qualificada.',5,array['selection']),
('1.2.3',1,'1.2','Sistema de Seleção','Contratação','Formalizar direitos, deveres e ingresso no programa.',6,array['selection','programs','startups']),
('1.3.1',1,'1.3','Desenvolvimento do Empreendimento','Planejamento do Empreendimento','Diagnosticar e planejar o desenvolvimento nos cinco eixos.',7,array['diagnostics','programs','startups','action_plans']),
('1.3.2',1,'1.3','Desenvolvimento do Empreendimento','Agregação de Valor','Oferecer capacitações, mentorias, serviços e conexões.',8,array['mentoring','contents','programs','startups']),
('1.3.3',1,'1.3','Desenvolvimento do Empreendimento','Monitoramento do Empreendimento','Acompanhar evolução, desvios, resultados e prontidão para graduação.',9,array['diagnostics','reports','startups','programs']),
('1.4.1',1,'1.4','Graduação e Relacionamento com Graduados','Graduação','Formalizar a conclusão do ciclo e a mudança de status.',10,array['startups','programs']),
('1.4.2',1,'1.4','Graduação e Relacionamento com Graduados','Relacionamento com Graduados','Acompanhar graduados e manter serviços e relacionamento.',11,array['startups','reports','mentoring']),
('1.5.1',1,'1.5','Gerenciamento Básico','Estrutura Organizacional','Comprovar existência institucional, governança, papéis e competências.',12,array['people','governance']),
('1.5.2',1,'1.5','Gerenciamento Básico','Operação da Incubadora','Viabilizar recursos, sustentabilidade, infraestrutura e serviços.',13,array['governance','reports']),
('1.5.3',1,'1.5','Gerenciamento Básico','Comunicação e Marketing','Divulgar a incubadora e os empreendimentos apoiados.',14,array['communications','startups']),
('2.1.1',2,'2.1','Gestão Estratégica','Planejamento Estratégico','Definir visão, objetivos, metas e prioridades institucionais.',15,array['governance','reports']),
('2.1.2',2,'2.1','Gestão Estratégica','Administração Estratégica','Executar, acompanhar e realimentar o planejamento.',16,array['governance','reports']),
('2.2.1',2,'2.2','Ampliação de Limites','Ambientes de Ideação','Operar ou apoiar ambientes de ideação e inovação.',17,array['programs','events']),
('2.2.2',2,'2.2','Ampliação de Limites','Serviços a Organizações','Prestar serviços a organizações e ampliar alcance e receitas.',18,array['programs','reports']),
('2.3.1',2,'2.3','Avaliação da Incubadora','Avaliação da Qualidade','Avaliar e demonstrar a qualidade dos empreendimentos apoiados.',19,array['startups','diagnostics','selection','reports']),
('2.3.2',2,'2.3','Avaliação da Incubadora','Avaliação dos Impactos','Demonstrar impactos econômicos, sociais, ambientais e territoriais.',20,array['reports','startups'])
on conflict(code) do update set level=excluded.level,process_code=excluded.process_code,process_name=excluded.process_name,name=excluded.name,description=excluded.description,manual_order=excluded.manual_order,applicable_modules=excluded.applicable_modules,active=true;

insert into public.cerne_evidence_requirements(practice_code,code,name,description,periodicity,suggested_source_module,scope_hint,manual_gap) values
('1.1.1','plan','Plano anual de sensibilização','Programação das ações, públicos, metas e responsáveis.','anual','programs','incubator',false),
('1.1.1','events','Registros de ações de sensibilização','Gravações, fotos, listas de presença, materiais e prints.','por_evento','events','incubator',false),
('1.1.1','effectiveness','Indicadores e avaliação da efetividade','Planilha de metas e ata de avaliação anual.','anual','reports','incubator',false),
('1.1.2','plan','Plano anual de prospecção','Plano de contatos, territórios e oportunidades.','anual','programs','incubator',false),
('1.1.2','opportunities','Banco de oportunidades','Ideias, TCCs, projetos, equipes e demandas prospectadas.','continuo','startups','incubator',false),
('1.1.2','meetings','Registros de prospecção','Atas, relatórios de análise e contatos com parceiros.','por_acao','governance','incubator',false),
('1.1.3','program','Programa de pré-incubação e qualificação','Edital, plano, cronograma, metodologia e inscritos.','por_ciclo','programs','program',false),
('1.1.3','participation','Registros de participação','Fotos, materiais, certificados e registros de oficinas.','por_acao','contents','cohort',false),
('1.1.3','effectiveness','Indicadores e avaliação da qualificação','Metas, conclusão e ata de efetividade.','anual','reports','incubator',false),
('1.2.1','call','Edital ou chamada publicada','Versão publicada com requisitos, prazos e critérios.','por_ciclo','selection','selection_call',false),
('1.2.1','applications','Propostas e recibos de inscrição','Propostas recebidas, protocolos e avisos aos proponentes.','por_ciclo','selection','selection_call',false),
('1.2.1','eligibility','Habilitação das propostas','Relação e justificativas de propostas habilitadas e inabilitadas.','por_ciclo','selection','selection_call',false),
('1.2.2','rubric','Critérios e avaliações da banca','Rubrica, notas, pareceres e conflitos de interesse.','por_ciclo','selection','selection_call',false),
('1.2.2','minutes','Ata e resultado do processo','Ata da banca, ranking e resultado publicado.','por_ciclo','selection','selection_call',false),
('1.2.3','agreement','Instrumento de formalização','Termo de adesão ou contrato assinado.','por_ingresso','selection','startup',false),
('1.2.3','enrollment','Cadastro e matrícula','Registro do empreendimento e vínculo com programa e turma.','por_ingresso','startups','startup',false),
('1.3.1','diagnostic','Diagnóstico inicial ou periódico','Relatório e radar de maturidade nos cinco eixos.','semestral','diagnostics','startup',false),
('1.3.1','development_plan','Plano de desenvolvimento','Metas, entregas, responsáveis e cronograma do empreendimento.','semestral','action_plans','startup',false),
('1.3.1','effectiveness','Indicadores e avaliação do planejamento','Cobertura de planos atualizados e ata de efetividade.','anual','reports','incubator',false),
('1.3.2','services','Registros de agregação de valor','Mentorias, consultorias, capacitações, créditos e serviços prestados.','por_acao','mentoring','startup',false),
('1.3.2','portfolio','Portfólio e plano anual de serviços','Oferta planejada de serviços e trilhas.','anual','contents','program',false),
('1.3.2','effectiveness','Indicadores e avaliação da agregação de valor','Horas, serviços e ata de efetividade.','anual','reports','incubator',false),
('1.3.3','monitoring','Instrumentos e relatórios de monitoramento','Agenda, radar de evolução, acompanhamento e decisões.','trimestral','diagnostics','startup',false),
('1.3.3','indicators','Indicadores do empreendimento','Faturamento, empregos, impostos, captação e permanência.','semestral','reports','startup',false),
('1.3.3','effectiveness','Avaliação da efetividade do monitoramento','Plano anual, metas e ata de revisão.','anual','reports','incubator',false),
('1.4.1','graduation','Parecer, termo e certificado de graduação','Critérios, parecer, termo, certificado e registros do rito.','por_saida','startups','startup',false),
('1.4.1','effectiveness','Indicadores e avaliação da graduação','Metas, resultados e ata de efetividade.','anual','reports','incubator',false),
('1.4.2','followup','Acompanhamento de graduados','Instrumentos preenchidos e relatório consolidado.','anual','startups','startup',false),
('1.4.2','services','Serviços a graduados','Portfólio e registros de serviços prestados.','por_acao','mentoring','startup',false),
('1.4.2','effectiveness','Indicadores e avaliação do relacionamento','Permanência, crescimento, empregos e ata de efetividade.','anual','reports','incubator',false),
('1.5.1','institutional','Atos institucionais e governança','Regimento, portarias, resoluções, comitês e atas.','anual','governance','incubator',true),
('1.5.1','roles','Organograma e matriz de papéis','Papéis, responsabilidades, equipe e células locais.','anual','people','incubator',true),
('1.5.1','competencies','Competências e capacitação da equipe','Currículos, perfis, lacunas e registros de capacitação.','anual','people','incubator',true),
('1.5.1','partnerships','Instrumentos de parceria','Acordos, convênios e registros de parceiros.','anual','governance','incubator',true),
('1.5.2','finance','Orçamento, fluxo de caixa e sustentabilidade','Controle financeiro e plano de sustentabilidade.','anual','reports','incubator',false),
('1.5.2','infrastructure','Infraestrutura e regras de uso','Descrição de espaços, laboratórios, equipamentos e regras.','anual','governance','incubator',false),
('1.5.2','operations','Serviços operacionais e Plano Anual','Descrição dos serviços e Plano Anual de Operação.','anual','governance','incubator',false),
('1.5.3','materials','Materiais de comunicação','Peças impressas e digitais da incubadora e startups.','por_acao','communications','incubator',false),
('1.5.3','presence','Estratégia de presença digital','Canais, calendário, métricas e registros de publicação.','anual','communications','incubator',false),
('1.5.3','crisis','Plano de comunicação de crise','Fluxos, responsáveis e mensagens de contingência.','anual','communications','incubator',false),
('2.1.1','strategy','Planejamento estratégico','Documento aprovado com visão, objetivos, indicadores e metas.','bianual','governance','incubator',false),
('2.1.1','construction','Registros de elaboração','Atas, participação e registros das reuniões.','bianual','governance','incubator',false),
('2.1.2','annual_plan','Plano de Ação Anual','Ações, metas, responsáveis, recursos e prazos.','anual','governance','incubator',false),
('2.1.2','governance','Rotinas de administração estratégica','Atas de equipe, células, instância institucional e ferramenta de gestão.','trimestral','governance','incubator',false),
('2.1.2','repository','Repositório institucional','Referência do repositório em nuvem e sua organização.','continuo','files','incubator',false),
('2.2.1','operation','Operação de ambientes de ideação','Cronograma, agenda, divulgações, fotos e utilização.','por_evento','programs','incubator',false),
('2.2.1','effectiveness','Indicadores e avaliação dos ambientes','Metas e ata de avaliação.','anual','reports','incubator',false),
('2.2.2','portfolio','Portfólio de serviços a organizações','Oferta, condições e público dos serviços.','anual','programs','incubator',false),
('2.2.2','execution','Execução de serviços','Contratos, relatórios de execução e documentos fiscais.','por_servico','reports','incubator',false),
('2.3.1','quality','Avaliações de qualidade','Avaliações, classificação, prêmios e participação em oportunidades.','anual','reports','startup',false),
('2.3.1','effectiveness','Plano e avaliação da qualidade','Plano anual, indicadores e ata de efetividade.','anual','reports','incubator',false),
('2.3.2','impact_report','Relatório de avaliação dos impactos','Resultados e contribuição para o desenvolvimento regional.','anual','reports','incubator',false),
('2.3.2','impact_plan','Plano e indicadores de impacto','Plano anual, fórmula, fonte, responsável e metas.','anual','reports','incubator',false),
('2.3.2','effectiveness','Avaliação da efetividade dos impactos','Ata de avaliação e decisões de melhoria.','anual','governance','incubator',false)
on conflict(practice_code,code) do update set name=excluded.name,description=excluded.description,periodicity=excluded.periodicity,suggested_source_module=excluded.suggested_source_module,scope_hint=excluded.scope_hint,manual_gap=excluded.manual_gap;

insert into public.permissions(code,name,description,category) values
('cerne.read','Visualizar conformidade CERNE','Acessar ciclos, matriz, evidências e alertas CERNE.','CERNE'),
('cerne.manage','Gerenciar conformidade CERNE','Criar ciclos, responsáveis, requisitos e estrutura documental.','CERNE'),
('cerne.submit','Registrar evidências CERNE','Registrar evidências nos contextos autorizados.','CERNE'),
('cerne.review','Avaliar evidências CERNE','Validar evidências como equipe interna ou banca designada.','CERNE')
on conflict(code) do update set name=excluded.name,description=excluded.description,category=excluded.category;

insert into public.role_permissions(organization_id,role_id,permission_code)
select r.organization_id,r.id,p.code from public.roles r cross join (values
('cerne.read'),('cerne.manage'),('cerne.submit'),('cerne.review')) p(code)
where r.code in ('organization_admin','incubator_manager','program_coordinator') on conflict do nothing;
insert into public.role_permissions(organization_id,role_id,permission_code)
select r.organization_id,r.id,p.code from public.roles r cross join (values('cerne.read'),('cerne.submit')) p(code)
where r.code in ('agent','mentor') on conflict do nothing;
insert into public.role_permissions(organization_id,role_id,permission_code)
select r.organization_id,r.id,p.code from public.roles r cross join (values('cerne.read'),('cerne.review')) p(code)
where r.code='evaluator' on conflict do nothing;
insert into public.role_permissions(organization_id,role_id,permission_code)
select r.organization_id,r.id,'cerne.read' from public.roles r where r.code='auditor' on conflict do nothing;

create or replace function private.cerne_segment(value text) returns text language sql immutable set search_path='' as $$
 select regexp_replace(regexp_replace(btrim(coalesce(value,'sem nome')), '[\\/:*?"<>|]+', '-', 'g'), '\s+', ' ', 'g')
$$;
create or replace function private.cerne_may_manage(org_id uuid,inc_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select private.has_permission(org_id,'cerne.manage',null,inc_id) $$;
create or replace function private.cerne_may_submit(org_id uuid,inc_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select private.has_permission(org_id,'cerne.submit',null,inc_id) or private.has_permission(org_id,'cerne.manage',null,inc_id) $$;
create or replace function private.cerne_may_review(org_id uuid,inc_id uuid,cycle uuid default null) returns boolean language sql stable security definer set search_path='' as $$
 select private.has_permission(org_id,'cerne.review',null,inc_id) or private.has_permission(org_id,'cerne.manage',null,inc_id) or exists(
   select 1 from public.cerne_review_assignments a
   join public.cerne_cycles c on c.organization_id=a.organization_id and c.id=a.cycle_id
   where a.organization_id=org_id and c.incubator_id=inc_id and (cycle is null or a.cycle_id=cycle)
     and a.reviewer_user_id=(select auth.uid()) and a.status='active'
     and a.confidentiality_accepted_at is not null and (a.ends_at is null or a.ends_at>now())
 )
$$;
create or replace function private.cerne_may_read(org_id uuid,inc_id uuid,cycle uuid default null) returns boolean language sql stable security definer set search_path='' as $$
 select private.has_permission(org_id,'cerne.read',null,inc_id) or private.cerne_may_submit(org_id,inc_id) or private.cerne_may_review(org_id,inc_id,cycle) or exists(
   select 1 from public.cerne_review_assignments a
   join public.cerne_cycles c on c.organization_id=a.organization_id and c.id=a.cycle_id
   where a.organization_id=org_id and c.incubator_id=inc_id and (cycle is null or a.cycle_id=cycle)
     and a.reviewer_user_id=(select auth.uid()) and a.status='invited' and (a.ends_at is null or a.ends_at>now())
 )
$$;

create or replace function public.create_cerne_cycle(target_organization_id uuid,target_incubator_id uuid,cycle_name text,reference_year integer,target_level integer,starts_on date,ends_on date)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); cycle_id uuid; inc_slug text; root_path text;
begin
 if actor is null or not private.cerne_may_manage(target_organization_id,target_incubator_id) then raise exception 'Permissão insuficiente' using errcode='42501'; end if;
 select slug into inc_slug from public.incubators where organization_id=target_organization_id and id=target_incubator_id;
 if inc_slug is null or starts_on>ends_on or target_level not in(1,2) then raise exception 'Ciclo CERNE inválido' using errcode='22023'; end if;
 root_path:=format('CERNE/%s/%s - %s',private.cerne_segment(inc_slug),reference_year,private.cerne_segment(cycle_name));
 insert into public.cerne_cycles(organization_id,incubator_id,name,reference_year,target_level,starts_on,ends_on,status,drive_root_path,created_by) values(target_organization_id,target_incubator_id,btrim(cycle_name),reference_year,target_level,starts_on,ends_on,'active',root_path,actor) returning id into cycle_id;
 insert into public.cerne_practice_owners(organization_id,cycle_id,practice_code,updated_by) select target_organization_id,cycle_id,p.code,actor from public.cerne_practices p where p.level<=target_level;
 insert into public.cerne_evidence_slots(organization_id,cycle_id,practice_code,requirement_id,title,due_at,created_by) select target_organization_id,cycle_id,r.practice_code,r.id,r.name,ends_on::timestamptz,actor from public.cerne_evidence_requirements r join public.cerne_practices p on p.code=r.practice_code where p.level<=target_level;
 insert into public.cerne_drive_folders(organization_id,cycle_id,practice_code,folder_kind,logical_path,created_by)
 select target_organization_id,cycle_id,null,'root',root_path,actor union all
 select target_organization_id,cycle_id,null,'level',format('%s/CERNE %s',root_path,p.level),actor from (select distinct level from public.cerne_practices where level<=target_level) p union all
 select target_organization_id,cycle_id,null,'process',format('%s/CERNE %s/%s - %s',root_path,p.level,p.process_code,private.cerne_segment(p.process_name)),actor from (select distinct level,process_code,process_name from public.cerne_practices where level<=target_level) p union all
 select target_organization_id,cycle_id,p.code,'practice',format('%s/CERNE %s/%s - %s/%s - %s',root_path,p.level,p.process_code,private.cerne_segment(p.process_name),p.code,private.cerne_segment(p.name)),actor from public.cerne_practices p where p.level<=target_level;
 return cycle_id;
end $$;

create or replace function public.register_cerne_evidence(target_cycle_id uuid,target_practice_code text,target_requirement_id uuid,evidence_title text,evidence_description text,external_url text,source_module text,source_entity_type text,source_entity_id uuid,source_snapshot jsonb,scope_type text,scope_entity_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); c public.cerne_cycles%rowtype; slot_id uuid; evidence_id uuid; folder_path text; scope_label text:='Incubadora'; program_id uuid; cohort_id uuid; startup_id uuid; call_id uuid;
begin
 select * into c from public.cerne_cycles where id=target_cycle_id; if not found or not private.cerne_may_submit(c.organization_id,c.incubator_id) then raise exception 'Ciclo indisponível' using errcode='42501'; end if;
 if not exists(select 1 from public.cerne_evidence_requirements r where r.id=target_requirement_id and r.practice_code=target_practice_code) then raise exception 'Requisito incompatível' using errcode='23514'; end if;
 if nullif(btrim(external_url),'') is null and source_entity_id is null then raise exception 'Informe um link ou uma origem do sistema' using errcode='22023'; end if;
 case scope_type when 'program' then program_id:=scope_entity_id; select name into scope_label from public.programs where organization_id=c.organization_id and id=program_id and incubator_id=c.incubator_id;
 when 'cohort' then cohort_id:=scope_entity_id; select co.name into scope_label from public.cohorts co join public.programs p on p.organization_id=co.organization_id and p.id=co.program_id where co.organization_id=c.organization_id and co.id=cohort_id and p.incubator_id=c.incubator_id;
 when 'startup' then startup_id:=scope_entity_id; select name into scope_label from public.startups where organization_id=c.organization_id and id=startup_id and incubator_id=c.incubator_id;
 when 'selection_call' then call_id:=scope_entity_id; select title into scope_label from public.selection_calls where organization_id=c.organization_id and id=call_id and incubator_id=c.incubator_id;
 else scope_type:='incubator'; end case;
 if scope_type<>'incubator' and scope_label is null then raise exception 'Contexto fora da incubadora' using errcode='23514'; end if;
 select s.id into slot_id from public.cerne_evidence_slots s where s.cycle_id=c.id and s.requirement_id=target_requirement_id and s.scope_type=scope_type and s.program_id is not distinct from program_id and s.cohort_id is not distinct from cohort_id and s.startup_id is not distinct from startup_id and s.selection_call_id is not distinct from call_id limit 1;
 if slot_id is null then insert into public.cerne_evidence_slots(organization_id,cycle_id,practice_code,requirement_id,scope_type,program_id,cohort_id,startup_id,selection_call_id,title,due_at,created_by) select c.organization_id,c.id,target_practice_code,target_requirement_id,scope_type,program_id,cohort_id,startup_id,call_id,r.name,c.ends_on::timestamptz,actor from public.cerne_evidence_requirements r where r.id=target_requirement_id returning id into slot_id; end if;
 select logical_path into folder_path from public.cerne_drive_folders where cycle_id=c.id and practice_code=target_practice_code and folder_kind='practice'; folder_path:=format('%s/%s/%s',folder_path,case scope_type when 'incubator' then '00 - Incubadora' when 'program' then '01 - Programas' when 'cohort' then '02 - Turmas' when 'startup' then '03 - Startups' else '04 - Chamadas e Selecao' end,private.cerne_segment(scope_label));
 insert into public.cerne_drive_folders(organization_id,cycle_id,practice_code,folder_kind,logical_path,created_by)
 values(c.organization_id,c.id,target_practice_code,'context',folder_path,actor)
 on conflict(cycle_id,logical_path) do nothing;
 insert into public.cerne_evidences(organization_id,cycle_id,slot_id,practice_code,title,description,external_url,source_module,source_entity_type,source_entity_id,source_snapshot,drive_path,sync_status,submitted_by) values(c.organization_id,c.id,slot_id,target_practice_code,btrim(evidence_title),nullif(btrim(evidence_description),''),nullif(btrim(external_url),''),nullif(btrim(source_module),''),source_entity_type,source_entity_id,coalesce(source_snapshot,'{}'),folder_path,case when nullif(btrim(external_url),'') is null then 'pending'::public.cerne_sync_status else 'not_required'::public.cerne_sync_status end,actor) returning id into evidence_id;
 update public.cerne_evidence_slots set status='submitted',updated_at=now() where id=slot_id;
 return evidence_id;
end $$;

create or replace function public.review_cerne_evidence(target_evidence_id uuid,review_result public.cerne_review_result,review_notes text) returns void language plpgsql security definer set search_path='' as $$
declare e public.cerne_evidences%rowtype; c public.cerne_cycles%rowtype; assignment uuid;
begin select * into e from public.cerne_evidences where id=target_evidence_id for update; select * into c from public.cerne_cycles where id=e.cycle_id; if e.id is null or not private.cerne_may_review(e.organization_id,c.incubator_id,c.id) then raise exception 'Evidência indisponível' using errcode='42501'; end if;
 select id into assignment from public.cerne_review_assignments a where a.cycle_id=c.id and a.reviewer_user_id=(select auth.uid()) and a.status='active' and (a.practice_code is null or a.practice_code=e.practice_code) limit 1;
 insert into public.cerne_evidence_reviews(organization_id,evidence_id,assignment_id,reviewer_user_id,result,notes) values(e.organization_id,e.id,assignment,(select auth.uid()),review_result,btrim(review_notes)) on conflict(evidence_id,reviewer_user_id) do update set result=excluded.result,notes=excluded.notes,updated_at=now();
 update public.cerne_evidences set status=case when review_result='valid' then 'approved'::public.cerne_slot_status else 'rejected'::public.cerne_slot_status end,updated_at=now() where id=e.id;
 update public.cerne_evidence_slots set status=case when review_result='valid' then 'approved'::public.cerne_slot_status else 'rejected'::public.cerne_slot_status end,reviewed_by=(select auth.uid()),reviewed_at=now(),updated_at=now() where id=e.slot_id;
end $$;

create or replace function public.refresh_cerne_alerts(target_organization_id uuid,target_incubator_id uuid) returns integer language plpgsql security definer set search_path='' as $$
declare affected integer;
begin if not private.cerne_may_submit(target_organization_id,target_incubator_id) then raise exception 'Permissão insuficiente' using errcode='42501'; end if;
 update public.cerne_alerts set status='resolved',updated_at=now() where organization_id=target_organization_id and incubator_id=target_incubator_id and status='open';
 insert into public.cerne_alerts(organization_id,incubator_id,cycle_id,alert_key,severity,alert_type,title,message,practice_code,slot_id,due_at)
 select c.organization_id,c.incubator_id,c.id,'slot:'||s.id||':unassigned','warning','unassigned','Evidência sem responsável',s.title||' ainda não possui responsável.',s.practice_code,s.id,s.due_at from public.cerne_evidence_slots s join public.cerne_cycles c on c.organization_id=s.organization_id and c.id=s.cycle_id where c.organization_id=target_organization_id and c.incubator_id=target_incubator_id and c.status in('active','internal_review','external_review') and s.status in('pending','rejected') and s.responsible_user_id is null
 union all select c.organization_id,c.incubator_id,c.id,'slot:'||s.id||':due',case when s.due_at<now() then 'critical'::public.cerne_alert_severity else 'warning'::public.cerne_alert_severity end,case when s.due_at<now() then 'overdue' else 'due_soon' end,case when s.due_at<now() then 'Evidência atrasada' else 'Prazo de evidência próximo' end,s.title||case when s.due_at<now() then ' está atrasada.' else ' vence nos próximos 30 dias.' end,s.practice_code,s.id,s.due_at from public.cerne_evidence_slots s join public.cerne_cycles c on c.organization_id=s.organization_id and c.id=s.cycle_id where c.organization_id=target_organization_id and c.incubator_id=target_incubator_id and c.status in('active','internal_review','external_review') and s.status in('pending','rejected') and s.due_at<=now()+interval '30 days'
 union all select c.organization_id,c.incubator_id,c.id,'evidence:'||e.id||':sync','critical','sync_failed','Falha na sincronização com o Drive',e.title||' precisa ser sincronizada novamente.',e.practice_code,e.slot_id,null from public.cerne_evidences e join public.cerne_cycles c on c.organization_id=e.organization_id and c.id=e.cycle_id where c.organization_id=target_organization_id and c.incubator_id=target_incubator_id and e.sync_status='failed'
 on conflict(cycle_id,alert_key) do update set severity=excluded.severity,title=excluded.title,message=excluded.message,due_at=excluded.due_at,status=case when public.cerne_alerts.status='acknowledged' then 'acknowledged'::public.cerne_alert_status else 'open'::public.cerne_alert_status end,updated_at=now(); get diagnostics affected=row_count; return affected;
end $$;

create or replace function public.acknowledge_cerne_alert(target_alert_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.cerne_alerts%rowtype; c public.cerne_cycles%rowtype; begin select * into a from public.cerne_alerts where id=target_alert_id; select * into c from public.cerne_cycles where id=a.cycle_id; if a.id is null or not private.cerne_may_submit(a.organization_id,c.incubator_id) then raise exception 'Alerta indisponível' using errcode='42501'; end if; update public.cerne_alerts set status='acknowledged',acknowledged_by=(select auth.uid()),acknowledged_at=now(),updated_at=now() where id=a.id; end $$;

create or replace function public.assign_cerne_practice_owner(target_cycle_id uuid,target_practice_code text,target_user_id uuid,implementation_status text default 'to_validate') returns void language plpgsql security definer set search_path='' as $$
declare c public.cerne_cycles%rowtype; actor uuid:=(select auth.uid());
begin
 select * into c from public.cerne_cycles where id=target_cycle_id;
 if not found or not private.cerne_may_manage(c.organization_id,c.incubator_id) then raise exception 'Ciclo indisponível' using errcode='42501'; end if;
 if target_user_id is not null and not exists(select 1 from public.organization_memberships m where m.organization_id=c.organization_id and m.user_id=target_user_id and m.status='active') then raise exception 'Responsável fora da organização' using errcode='23514'; end if;
 insert into public.cerne_practice_owners(organization_id,cycle_id,practice_code,responsible_user_id,implementation_status,updated_by)
 values(c.organization_id,c.id,target_practice_code,target_user_id,implementation_status,actor)
 on conflict(cycle_id,practice_code) do update set responsible_user_id=excluded.responsible_user_id,implementation_status=excluded.implementation_status,updated_by=actor,updated_at=now();
 update public.cerne_evidence_slots set responsible_user_id=target_user_id,updated_at=now() where cycle_id=c.id and practice_code=target_practice_code and status='pending';
end $$;

create or replace function public.assign_cerne_reviewer(target_cycle_id uuid,target_reviewer_user_id uuid,target_practice_code text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.cerne_cycles%rowtype; assignment_id uuid; actor uuid:=(select auth.uid());
begin
 select * into c from public.cerne_cycles where id=target_cycle_id;
 if not found or not private.cerne_may_manage(c.organization_id,c.incubator_id) then raise exception 'Ciclo indisponível' using errcode='42501'; end if;
 if not exists(select 1 from public.organization_memberships m where m.organization_id=c.organization_id and m.user_id=target_reviewer_user_id and m.status='active') then raise exception 'Avaliador fora da organização' using errcode='23514'; end if;
 insert into public.cerne_review_assignments(organization_id,cycle_id,reviewer_user_id,practice_code,status,created_by)
 values(c.organization_id,c.id,target_reviewer_user_id,target_practice_code,'invited',actor)
 on conflict(cycle_id,reviewer_user_id,practice_code) do update set status='invited',starts_at=now(),ends_at=null,confidentiality_accepted_at=null,updated_at=now()
 returning id into assignment_id;
 return assignment_id;
end $$;

create or replace function public.accept_cerne_confidentiality(target_assignment_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.cerne_review_assignments set status='active',confidentiality_accepted_at=now(),updated_at=now()
 where id=target_assignment_id and reviewer_user_id=(select auth.uid()) and status='invited';
 if not found then raise exception 'Convite indisponível' using errcode='42501'; end if;
end $$;

create or replace function public.get_cerne_workspace(target_organization_id uuid,target_incubator_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); can_manage boolean:=private.cerne_may_manage(target_organization_id,target_incubator_id); can_submit boolean:=private.cerne_may_submit(target_organization_id,target_incubator_id); can_review boolean:=private.cerne_may_review(target_organization_id,target_incubator_id);
begin if actor is null or not private.cerne_may_read(target_organization_id,target_incubator_id) then raise exception 'Permissão insuficiente' using errcode='42501'; end if;
 return jsonb_build_object('canManage',can_manage,'canSubmit',can_submit,'canReview',can_review,
 'practices',(select coalesce(jsonb_agg(to_jsonb(p) order by p.manual_order),'[]') from public.cerne_practices p where p.active),
 'requirements',(select coalesce(jsonb_agg(to_jsonb(r) order by p.manual_order,r.name),'[]') from public.cerne_evidence_requirements r join public.cerne_practices p on p.code=r.practice_code),
 'cycles',(select coalesce(jsonb_agg(to_jsonb(c) order by c.reference_year desc,c.created_at desc),'[]') from public.cerne_cycles c where c.organization_id=target_organization_id and c.incubator_id=target_incubator_id),
 'owners',(select coalesce(jsonb_agg(to_jsonb(o)),'[]') from public.cerne_practice_owners o join public.cerne_cycles c on c.organization_id=o.organization_id and c.id=o.cycle_id where c.organization_id=target_organization_id and c.incubator_id=target_incubator_id and (can_manage or can_submit or can_review)),
 'slots',(select coalesce(jsonb_agg(to_jsonb(s) order by s.due_at nulls last,s.created_at),'[]') from public.cerne_evidence_slots s join public.cerne_cycles c on c.organization_id=s.organization_id and c.id=s.cycle_id where c.organization_id=target_organization_id and c.incubator_id=target_incubator_id and (can_manage or can_submit or can_review)),
 'evidences',(select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc),'[]') from public.cerne_evidences e join public.cerne_cycles c on c.organization_id=e.organization_id and c.id=e.cycle_id where c.organization_id=target_organization_id and c.incubator_id=target_incubator_id and (can_manage or can_submit or private.has_permission(target_organization_id,'cerne.review',null,target_incubator_id) or exists(select 1 from public.cerne_review_assignments a where a.cycle_id=e.cycle_id and a.reviewer_user_id=actor and a.status='active' and a.confidentiality_accepted_at is not null and (a.practice_code is null or a.practice_code=e.practice_code)))),
 'folders',(select coalesce(jsonb_agg(to_jsonb(f) order by f.logical_path),'[]') from public.cerne_drive_folders f join public.cerne_cycles c on c.organization_id=f.organization_id and c.id=f.cycle_id where c.organization_id=target_organization_id and c.incubator_id=target_incubator_id and (can_manage or can_submit)),
 'alerts',(select coalesce(jsonb_agg(to_jsonb(a) order by case a.severity when 'critical' then 1 when 'warning' then 2 else 3 end,a.due_at nulls last),'[]') from public.cerne_alerts a where a.organization_id=target_organization_id and a.incubator_id=target_incubator_id and a.status<>'resolved' and (can_manage or can_submit)),
 'assignments',(select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc),'[]') from public.cerne_review_assignments a join public.cerne_cycles c on c.organization_id=a.organization_id and c.id=a.cycle_id where c.organization_id=target_organization_id and c.incubator_id=target_incubator_id and (can_manage or a.reviewer_user_id=actor)),
 'reviews',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]') from public.cerne_evidence_reviews r join public.cerne_evidences e on e.organization_id=r.organization_id and e.id=r.evidence_id join public.cerne_cycles c on c.organization_id=e.organization_id and c.id=e.cycle_id where c.organization_id=target_organization_id and c.incubator_id=target_incubator_id and (can_manage or r.reviewer_user_id=actor)),
 'programs',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name)),'[]') from public.programs p where p.organization_id=target_organization_id and p.incubator_id=target_incubator_id and p.deleted_at is null and (can_manage or can_submit or can_review)),
 'cohorts',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'programId',c.program_id)),'[]') from public.cohorts c join public.programs p on p.organization_id=c.organization_id and p.id=c.program_id where c.organization_id=target_organization_id and p.incubator_id=target_incubator_id and c.deleted_at is null and (can_manage or can_submit or can_review)),
 'startups',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name)),'[]') from public.startups s where s.organization_id=target_organization_id and s.incubator_id=target_incubator_id and s.deleted_at is null and (can_manage or can_submit or can_review)),
 'calls',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.title)),'[]') from public.selection_calls c where c.organization_id=target_organization_id and c.incubator_id=target_incubator_id and (can_manage or can_submit or can_review)),
 'people',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',coalesce(p.display_name,p.email),'email',p.email) order by coalesce(p.display_name,p.email)),'[]') from public.organization_memberships m join public.profiles p on p.id=m.user_id where m.organization_id=target_organization_id and m.status='active' and can_manage));
end $$;

do $$ declare t text; begin foreach t in array array['cerne_cycles','cerne_practice_owners','cerne_evidence_slots','cerne_drive_folders','cerne_evidences','cerne_review_assignments','cerne_evidence_reviews','cerne_alerts'] loop execute format('alter table public.%I enable row level security',t); execute format('revoke all on public.%I from public,anon,authenticated',t); end loop; end $$;
alter table public.cerne_practices enable row level security;
alter table public.cerne_evidence_requirements enable row level security;
revoke all on public.cerne_practices,public.cerne_evidence_requirements from public,anon,authenticated;
grant select on public.cerne_practices,public.cerne_evidence_requirements to authenticated;
do $$ begin create policy cerne_practices_read on public.cerne_practices for select to authenticated using(true); exception when duplicate_object then null; end $$;
do $$ begin create policy cerne_requirements_read on public.cerne_evidence_requirements for select to authenticated using(true); exception when duplicate_object then null; end $$;
do $$ begin create policy cerne_cycles_read on public.cerne_cycles for select to authenticated using(private.cerne_may_read(organization_id,incubator_id,id)); exception when duplicate_object then null; end $$;
do $$ begin create policy cerne_evidences_read on public.cerne_evidences for select to authenticated using(exists(select 1 from public.cerne_cycles c where c.organization_id=cerne_evidences.organization_id and c.id=cerne_evidences.cycle_id and private.cerne_may_read(c.organization_id,c.incubator_id,c.id))); exception when duplicate_object then null; end $$;

do $$ declare t text; begin foreach t in array array['cerne_cycles','cerne_practice_owners','cerne_evidence_slots','cerne_drive_folders','cerne_evidences','cerne_review_assignments','cerne_evidence_reviews','cerne_alerts'] loop begin execute format('create trigger %I_updated before update on public.%I for each row execute function private.set_updated_at()',t,t); exception when duplicate_object then null; end; end loop; end $$;
do $$ declare t text; begin foreach t in array array['cerne_cycles','cerne_practice_owners','cerne_evidence_slots','cerne_drive_folders','cerne_evidences','cerne_review_assignments','cerne_evidence_reviews','cerne_alerts'] loop begin execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.write_audit_log()',t,t); exception when duplicate_object then null; end; end loop; end $$;

revoke execute on function public.create_cerne_cycle(uuid,uuid,text,integer,integer,date,date),public.register_cerne_evidence(uuid,text,uuid,text,text,text,text,text,uuid,jsonb,text,uuid),public.review_cerne_evidence(uuid,public.cerne_review_result,text),public.refresh_cerne_alerts(uuid,uuid),public.acknowledge_cerne_alert(uuid),public.assign_cerne_practice_owner(uuid,text,uuid,text),public.assign_cerne_reviewer(uuid,uuid,text),public.accept_cerne_confidentiality(uuid),public.get_cerne_workspace(uuid,uuid) from public,anon;
grant execute on function public.create_cerne_cycle(uuid,uuid,text,integer,integer,date,date),public.register_cerne_evidence(uuid,text,uuid,text,text,text,text,text,uuid,jsonb,text,uuid),public.review_cerne_evidence(uuid,public.cerne_review_result,text),public.refresh_cerne_alerts(uuid,uuid),public.acknowledge_cerne_alert(uuid),public.assign_cerne_practice_owner(uuid,text,uuid,text),public.assign_cerne_reviewer(uuid,uuid,text),public.accept_cerne_confidentiality(uuid),public.get_cerne_workspace(uuid,uuid) to authenticated;
