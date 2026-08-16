-- Operação integrada: plano de evidências CERNE, rodadas de mentoria e
-- distribuição auditável de propostas com notificações transacionais.

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  kind text not null,
  recipient_user_id uuid references auth.users(id),
  recipient_email text not null,
  subject text not null,
  text_body text not null,
  action_path text,
  dedupe_key text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_outbox_kind_valid check (kind = btrim(kind) and char_length(kind) between 3 and 80),
  constraint notification_outbox_email_valid check (recipient_email = lower(btrim(recipient_email)) and recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint notification_outbox_content_valid check (char_length(btrim(subject)) between 3 and 200 and char_length(btrim(text_body)) between 5 and 5000),
  constraint notification_outbox_status_valid check (status in ('pending', 'sending', 'sent', 'failed')),
  constraint notification_outbox_attempts_valid check (attempts between 0 and 20),
  constraint notification_outbox_dedupe_unique unique (dedupe_key)
);

create index if not exists notification_outbox_dispatch_idx
  on public.notification_outbox(status, available_at, created_at)
  where status in ('pending', 'failed');

alter table public.notification_outbox enable row level security;
revoke all on public.notification_outbox from public, anon, authenticated;
grant select, insert, update, delete on public.notification_outbox to service_role;

do $$ begin
  create policy notification_outbox_no_direct_access
  on public.notification_outbox for all to authenticated
  using (false) with check (false);
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger notification_outbox_set_updated_at
  before update on public.notification_outbox
  for each row execute function private.set_updated_at();
exception when duplicate_object then null;
end $$;

create or replace function private.queue_notification(
  target_organization_id uuid,
  notification_kind text,
  target_user_id uuid,
  target_email text,
  notification_subject text,
  notification_body text,
  notification_action_path text,
  notification_dedupe_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare queued_id uuid;
begin
  if target_email is null or btrim(target_email) = '' then
    return null;
  end if;
  insert into public.notification_outbox(
    organization_id, kind, recipient_user_id, recipient_email, subject,
    text_body, action_path, dedupe_key
  ) values (
    target_organization_id, btrim(notification_kind), target_user_id,
    lower(btrim(target_email)), btrim(notification_subject),
    btrim(notification_body), nullif(btrim(notification_action_path), ''),
    btrim(notification_dedupe_key)
  )
  on conflict (dedupe_key) do update set
    recipient_email = excluded.recipient_email,
    subject = excluded.subject,
    text_body = excluded.text_body,
    action_path = excluded.action_path,
    status = case when public.notification_outbox.status = 'sent' then 'sent' else 'pending' end,
    available_at = case when public.notification_outbox.status = 'sent' then public.notification_outbox.available_at else now() end,
    last_error = case when public.notification_outbox.status = 'sent' then public.notification_outbox.last_error else null end
  returning id into queued_id;
  return queued_id;
end;
$$;

revoke all on function private.queue_notification(uuid,text,uuid,text,text,text,text,text)
  from public, anon, authenticated;

-- Corrige ambiguidades entre parâmetros PL/pgSQL e colunas de escopo.
-- A assinatura pública é preservada para manter compatibilidade com o app.
create or replace function public.register_cerne_evidence(
  target_cycle_id uuid,
  target_practice_code text,
  target_requirement_id uuid,
  evidence_title text,
  evidence_description text,
  external_url text,
  source_module text,
  source_entity_type text,
  source_entity_id uuid,
  source_snapshot jsonb,
  scope_type text,
  scope_entity_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  cycle_record public.cerne_cycles%rowtype;
  target_slot_id uuid;
  created_evidence_id uuid;
  target_folder_path text;
  target_scope_label text := 'Incubadora';
  resolved_scope_type text := scope_type;
  target_program_id uuid;
  target_cohort_id uuid;
  target_startup_id uuid;
  target_call_id uuid;
begin
  select * into cycle_record
  from public.cerne_cycles cycle
  where cycle.id = target_cycle_id;

  if not found or not private.cerne_may_submit(cycle_record.organization_id, cycle_record.incubator_id) then
    raise exception 'Ciclo indisponível' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.cerne_evidence_requirements requirement
    where requirement.id = target_requirement_id
      and requirement.practice_code = target_practice_code
  ) then
    raise exception 'Requisito incompatível' using errcode = '23514';
  end if;
  if nullif(btrim(external_url), '') is null and source_entity_id is null then
    raise exception 'Informe um link ou uma origem do sistema' using errcode = '22023';
  end if;

  case resolved_scope_type
    when 'program' then
      target_program_id := scope_entity_id;
      select program.name into target_scope_label
      from public.programs program
      where program.organization_id = cycle_record.organization_id
        and program.id = target_program_id
        and program.incubator_id = cycle_record.incubator_id;
    when 'cohort' then
      target_cohort_id := scope_entity_id;
      select cohort.name into target_scope_label
      from public.cohorts cohort
      join public.programs program
        on program.organization_id = cohort.organization_id
       and program.id = cohort.program_id
      where cohort.organization_id = cycle_record.organization_id
        and cohort.id = target_cohort_id
        and program.incubator_id = cycle_record.incubator_id;
    when 'startup' then
      target_startup_id := scope_entity_id;
      select startup.name into target_scope_label
      from public.startups startup
      where startup.organization_id = cycle_record.organization_id
        and startup.id = target_startup_id
        and startup.incubator_id = cycle_record.incubator_id;
    when 'selection_call' then
      target_call_id := scope_entity_id;
      select selection_call.title into target_scope_label
      from public.selection_calls selection_call
      where selection_call.organization_id = cycle_record.organization_id
        and selection_call.id = target_call_id
        and selection_call.incubator_id = cycle_record.incubator_id;
    else
      resolved_scope_type := 'incubator';
  end case;

  if resolved_scope_type <> 'incubator' and target_scope_label is null then
    raise exception 'Contexto fora da incubadora' using errcode = '23514';
  end if;

  select slot.id into target_slot_id
  from public.cerne_evidence_slots slot
  where slot.cycle_id = cycle_record.id
    and slot.requirement_id = target_requirement_id
    and slot.scope_type = resolved_scope_type
    and slot.program_id is not distinct from target_program_id
    and slot.cohort_id is not distinct from target_cohort_id
    and slot.startup_id is not distinct from target_startup_id
    and slot.selection_call_id is not distinct from target_call_id
  limit 1;

  if target_slot_id is null then
    insert into public.cerne_evidence_slots(
      organization_id, cycle_id, practice_code, requirement_id, scope_type,
      program_id, cohort_id, startup_id, selection_call_id, title, due_at, created_by
    )
    select
      cycle_record.organization_id, cycle_record.id, target_practice_code,
      target_requirement_id, resolved_scope_type, target_program_id,
      target_cohort_id, target_startup_id, target_call_id, requirement.name,
      cycle_record.ends_on::timestamptz, actor
    from public.cerne_evidence_requirements requirement
    where requirement.id = target_requirement_id
    returning id into target_slot_id;
  end if;

  select folder.logical_path into target_folder_path
  from public.cerne_drive_folders folder
  where folder.cycle_id = cycle_record.id
    and folder.practice_code = target_practice_code
    and folder.folder_kind = 'practice';

  target_folder_path := format(
    '%s/%s/%s',
    target_folder_path,
    case resolved_scope_type
      when 'incubator' then '00 - Incubadora'
      when 'program' then '01 - Programas'
      when 'cohort' then '02 - Turmas'
      when 'startup' then '03 - Startups'
      else '04 - Chamadas e Selecao'
    end,
    private.cerne_segment(target_scope_label)
  );

  insert into public.cerne_drive_folders(
    organization_id, cycle_id, practice_code, folder_kind, logical_path, created_by
  ) values (
    cycle_record.organization_id, cycle_record.id, target_practice_code,
    'context', target_folder_path, actor
  ) on conflict(cycle_id, logical_path) do nothing;

  insert into public.cerne_evidences(
    organization_id, cycle_id, slot_id, practice_code, title, description,
    external_url, source_module, source_entity_type, source_entity_id,
    source_snapshot, drive_path, sync_status, submitted_by
  ) values (
    cycle_record.organization_id, cycle_record.id, target_slot_id,
    target_practice_code, btrim(evidence_title),
    nullif(btrim(evidence_description), ''), nullif(btrim(external_url), ''),
    nullif(btrim(source_module), ''), source_entity_type, source_entity_id,
    coalesce(source_snapshot, '{}'), target_folder_path,
    case when nullif(btrim(external_url), '') is null
      then 'pending'::public.cerne_sync_status
      else 'not_required'::public.cerne_sync_status
    end,
    actor
  ) returning id into created_evidence_id;

  update public.cerne_evidence_slots
  set status = 'submitted', updated_at = now()
  where id = target_slot_id;

  return created_evidence_id;
end;
$$;

-- CERNE: catálogo consolidado da planilha e decisões por ciclo.
create table if not exists public.cerne_action_catalog (
  id uuid primary key default gen_random_uuid(),
  action_code text not null unique,
  practice_code text not null references public.cerne_practices(code),
  action_name text not null,
  target_audience text,
  original_periodicity text,
  periodicity_group text,
  simplification_suggestion text not null,
  minimum_evidence text not null,
  manual_order integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint cerne_action_catalog_code_valid check (action_code ~ '^[12]\.[1-5]\.[1-3]-A[0-9]{2}$'),
  constraint cerne_action_catalog_name_valid check (action_name = btrim(action_name) and char_length(action_name) between 3 and 500),
  constraint cerne_action_catalog_order_valid check (manual_order between 1 and 1000)
);

create index if not exists cerne_action_catalog_practice_idx
  on public.cerne_action_catalog(practice_code, manual_order) where active;

create table if not exists public.cerne_cycle_action_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  cycle_id uuid not null,
  action_id uuid not null references public.cerne_action_catalog(id),
  status text not null default 'to_review',
  decision text,
  notes text,
  minimum_evidence_override text,
  periodicity_override text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cerne_cycle_action_decisions_cycle_same_org foreign key (organization_id, cycle_id)
    references public.cerne_cycles(organization_id, id) on delete cascade,
  constraint cerne_cycle_action_decisions_unique unique (cycle_id, action_id),
  constraint cerne_cycle_action_decisions_status_valid check (status in ('to_review', 'accepted', 'adjusted', 'not_applicable')),
  constraint cerne_cycle_action_decisions_review_valid check (
    (status = 'to_review' and reviewed_at is null and reviewed_by is null)
    or (status <> 'to_review' and reviewed_at is not null and reviewed_by is not null)
  )
);

alter table public.cerne_evidence_slots
  add column if not exists required boolean not null default true,
  add column if not exists adjustment_notes text,
  add column if not exists adjusted_by uuid references auth.users(id),
  add column if not exists adjusted_at timestamptz;

alter table public.cerne_action_catalog enable row level security;
alter table public.cerne_cycle_action_decisions enable row level security;
revoke all on public.cerne_action_catalog, public.cerne_cycle_action_decisions from public, anon, authenticated;
grant select on public.cerne_action_catalog to authenticated;

do $$ begin
  create policy cerne_action_catalog_read on public.cerne_action_catalog
  for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy cerne_cycle_action_decisions_read on public.cerne_cycle_action_decisions
  for select to authenticated using (
    exists (
      select 1 from public.cerne_cycles cycle
      where cycle.organization_id = cerne_cycle_action_decisions.organization_id
        and cycle.id = cerne_cycle_action_decisions.cycle_id
        and private.cerne_may_read(cycle.organization_id, cycle.incubator_id, cycle.id)
    )
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger cerne_cycle_action_decisions_set_updated_at
  before update on public.cerne_cycle_action_decisions
  for each row execute function private.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger cerne_cycle_action_decisions_audit
  after insert or update or delete on public.cerne_cycle_action_decisions
  for each row execute function private.write_audit_log();
exception when duplicate_object then null;
end $$;

create or replace function public.save_cerne_action_decision(
  target_cycle_id uuid,
  target_action_id uuid,
  requested_status text,
  requested_decision text default null,
  requested_notes text default null,
  requested_minimum_evidence text default null,
  requested_periodicity text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare cycle public.cerne_cycles%rowtype;
declare decision_id uuid;
begin
  select * into cycle from public.cerne_cycles where id = target_cycle_id;
  if not found or not private.cerne_may_manage(cycle.organization_id, cycle.incubator_id) then
    raise exception 'Ciclo CERNE indisponível' using errcode = '42501';
  end if;
  if requested_status not in ('accepted', 'adjusted', 'not_applicable') then
    raise exception 'Decisão CERNE inválida' using errcode = '23514';
  end if;
  if not exists (select 1 from public.cerne_action_catalog where id = target_action_id and active) then
    raise exception 'Ação CERNE indisponível' using errcode = '23514';
  end if;
  insert into public.cerne_cycle_action_decisions(
    organization_id, cycle_id, action_id, status, decision, notes,
    minimum_evidence_override, periodicity_override, reviewed_by, reviewed_at
  ) values (
    cycle.organization_id, cycle.id, target_action_id, requested_status,
    nullif(btrim(requested_decision), ''), nullif(btrim(requested_notes), ''),
    nullif(btrim(requested_minimum_evidence), ''), nullif(btrim(requested_periodicity), ''),
    (select auth.uid()), now()
  )
  on conflict (cycle_id, action_id) do update set
    status = excluded.status,
    decision = excluded.decision,
    notes = excluded.notes,
    minimum_evidence_override = excluded.minimum_evidence_override,
    periodicity_override = excluded.periodicity_override,
    reviewed_by = excluded.reviewed_by,
    reviewed_at = excluded.reviewed_at
  returning id into decision_id;
  return decision_id;
end;
$$;

create or replace function public.adjust_cerne_evidence_slot(
  target_slot_id uuid,
  requested_title text,
  requested_due_local timestamp,
  requested_timezone text,
  requested_required boolean,
  requested_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare slot public.cerne_evidence_slots%rowtype;
declare cycle public.cerne_cycles%rowtype;
begin
  select * into slot from public.cerne_evidence_slots where id = target_slot_id for update;
  if not found then raise exception 'Evidência planejada indisponível' using errcode = '42501'; end if;
  select * into cycle from public.cerne_cycles where organization_id = slot.organization_id and id = slot.cycle_id;
  if not private.cerne_may_manage(cycle.organization_id, cycle.incubator_id) then
    raise exception 'Permissão insuficiente' using errcode = '42501';
  end if;
  if char_length(btrim(requested_title)) not between 3 and 300 then
    raise exception 'O título deve ter entre 3 e 300 caracteres' using errcode = '23514';
  end if;
  update public.cerne_evidence_slots set
    title = btrim(requested_title),
    due_at = case when requested_due_local is null then null else requested_due_local at time zone requested_timezone end,
    required = requested_required,
    adjustment_notes = nullif(btrim(requested_notes), ''),
    adjusted_by = (select auth.uid()),
    adjusted_at = now(),
    updated_at = now()
  where id = slot.id;
end;
$$;

insert into public.cerne_action_catalog(
  action_code, practice_code, action_name, target_audience,
  original_periodicity, periodicity_group, simplification_suggestion,
  minimum_evidence, manual_order
)
values
('1.1.1-A01','1.1.1',$$Campanhas em Mídias Sociais$$,$$Público externo e interno$$,'Bimestral','Bimestral',$$Consolidar ações semelhantes em um plano único de comunicação/engajamento, com registros por campanha ou evento.$$,$$Plano de sensibilização + registro do evento/campanha + lista/relatório de alcance.$$ ,1),
('1.1.1-A02','1.1.1',$$Eventos de Inovação$$,$$Público externo e interno$$,'Anual','Anual',$$Consolidar ações semelhantes em um plano único de comunicação/engajamento, com registros por campanha ou evento.$$,$$Plano de sensibilização + registro do evento/campanha + lista/relatório de alcance.$$ ,2),
('1.1.1-A03','1.1.1',$$Lives e Webinars$$,$$Público interno$$,'Semestral','Semestral',$$Consolidar ações semelhantes em um plano único de comunicação/engajamento, com registros por campanha ou evento.$$,$$Plano de sensibilização + registro do evento/campanha + lista/relatório de alcance.$$ ,3),
('1.1.1-A04','1.1.1',$$Palestras no IFSERTÃOPE$$,$$Público interno$$,'Anual','Anual',$$Consolidar ações semelhantes em um plano único de comunicação/engajamento, com registros por campanha ou evento.$$,$$Plano de sensibilização + registro do evento/campanha + lista/relatório de alcance.$$ ,4),
('1.1.2-A01','1.1.2',$$Análise de projetos de pesquisa/extensão no âmbito do IFSertãoPE com potencial empreendedor$$,$$Docentes, pesquisadores e estudantes do IF Sertão-PE$$,'Semestral','Semestral',$$Unificar TCCs, projetos e demandas externas em um único fluxo de prospecção e Banco de Oportunidades.$$,$$Banco de Oportunidades atualizado + registro da fonte/prospecção + análise anual.$$ ,5),
('1.1.2-A02','1.1.2',$$Análise de trabalhos de conclusão de curso (TCC) no âmbito do IFSertãoPE com potencial inovador/empreendedor$$,$$Estudantes concluintes e orientadores do IF Sertão-PE$$,'Semestral','Semestral',$$Unificar TCCs, projetos e demandas externas em um único fluxo de prospecção e Banco de Oportunidades.$$,$$Banco de Oportunidades atualizado + registro da fonte/prospecção + análise anual.$$ ,6),
('1.1.2-A03','1.1.2',$$Reunião com empresas, governo e parceiros para identificação de demandas de acordo com o arranjo produtivo local$$,$$Empresas locais, órgãos governamentais e parceiros estratégicos$$,'Anual','Anual',$$Unificar TCCs, projetos e demandas externas em um único fluxo de prospecção e Banco de Oportunidades.$$,$$Banco de Oportunidades atualizado + registro da fonte/prospecção + análise anual.$$ ,7),
('1.1.3-A01','1.1.3',$$Capacitações através de oficinas e cursos$$,$$Estudantes, servidores, profissionais autônomos, startups em estágio inicial e potenciais empreendedores$$,'Anual','Anual',$$Consolidar ações semelhantes em um plano único de comunicação/engajamento, com registros por campanha ou evento.$$,$$Plano/trilha + lista de participantes/conclusão + avaliação da ação.$$ ,8),
('1.1.3-A02','1.1.3',$$Programa de Pré-Incubação$$,$$Potenciais empreendedores dos setores de tecnologia, agronegócio, economia criativa e saúde$$,'Anual','Anual',$$Consolidar ações semelhantes em um plano único de comunicação/engajamento, com registros por campanha ou evento.$$,$$Plano/trilha + lista de participantes/conclusão + avaliação da ação.$$ ,9),
('1.1.3-A03','1.1.3',$$Workshops dentro de Hackathons$$,$$Público externo e interno$$,'Anual','Anual',$$Consolidar ações semelhantes em um plano único de comunicação/engajamento, com registros por campanha ou evento.$$,$$Plano/trilha + lista de participantes/conclusão + avaliação da ação.$$ ,10),
('1.2.1-A01','1.2.1',$$Receber propostas$$,$$Empreendedores e representantes dos empreendimentos incubados$$,'Anual','Anual',$$Tratar recepção, avaliação e contratação como um único dossiê digital por edital/ciclo.$$,$$Dossiê digital do edital: edital/formulário, avaliação/ata e termo assinado, conforme a etapa.$$ ,11),
('1.2.2-A01','1.2.2',$$Avaliação de propostas$$,$$Empreendedores que submeteram propostas ao edital$$,'Anual','Anual',$$Tratar recepção, avaliação e contratação como um único dossiê digital por edital/ciclo.$$,$$Dossiê digital do edital: edital/formulário, avaliação/ata e termo assinado, conforme a etapa.$$ ,12),
('1.2.3-A01','1.2.3',$$Assinatura do contrato de incubação$$,$$Empreendedores e representantes dos empreendimentos incubados$$,'Anual','Anual',$$Tratar recepção, avaliação e contratação como um único dossiê digital por edital/ciclo.$$,$$Dossiê digital do edital: edital/formulário, avaliação/ata e termo assinado, conforme a etapa.$$ ,13),
('1.3.1-A01','1.3.1',$$Planejamento do desenvolvimento do empreendimento com instrumento próprio$$,$$Empreendimentos incubados$$,'Anual','Anual',$$Usar um único diagnóstico/plano de desenvolvimento, atualizado periodicamente e vinculado ao painel de indicadores.$$,$$Diagnóstico e plano de desenvolvimento atualizados + painel/ficha de acompanhamento.$$ ,14),
('1.3.1-A02','1.3.1',$$Realizar diagnóstico inicial do empreendimento$$,$$Empreendedores e equipes dos empreendimentos incubados$$,$$No início do período de incubação e/ou a cada renovação do contrato$$,$$Por ciclo/marco$$,$$Usar um único diagnóstico/plano de desenvolvimento, atualizado periodicamente e vinculado ao painel de indicadores.$$,$$Diagnóstico e plano de desenvolvimento atualizados + painel/ficha de acompanhamento.$$ ,15),
('1.3.2-A01','1.3.2',$$Apoio através de créditos em plataformas de nuvem, acesso a plataformas de apoio e facilitação de parcerias estratégicas com empresas e instituições$$,$$Empreendimentos incubados$$,'Continua',$$Prazo operacional$$,$$Registrar mentorias, consultorias, capacitações e benefícios em uma ficha única de agregação de valor.$$,$$Ficha única de atendimento/agregação de valor + comprovante do serviço ou benefício.$$ ,16),
('1.3.2-A02','1.3.2',$$Ações de agregação de valor como qualificações, consultorias, mentorias, eventos e uso de laboratórios$$,$$Empreendimentos incubados$$,'Continua',$$Prazo operacional$$,$$Registrar mentorias, consultorias, capacitações e benefícios em uma ficha única de agregação de valor.$$,$$Ficha única de atendimento/agregação de valor + comprovante do serviço ou benefício.$$ ,17),
('1.3.3-A01','1.3.3',$$Monitorar e avaliar a evolução dos empreendimentos incubados aplicando instrumentos de monitoramento próprio$$,$$Empreendimentos incubados$$,'Mensal','Mensal',$$Usar um único diagnóstico/plano de desenvolvimento, atualizado periodicamente e vinculado ao painel de indicadores.$$,$$Diagnóstico e plano de desenvolvimento atualizados + painel/ficha de acompanhamento.$$ ,18),
('1.4.1-A01','1.4.1',$$Evento de Graduação$$,$$Empreendimentos Incubados$$,$$Fluxo contínuo$$,$$Fluxo contínuo$$,$$Criar um dossiê de saída e pós-incubação, evitando atas e relatórios separados para cada contato.$$,$$Parecer/termo de saída + cadastro atualizado do graduado + pesquisa anual.$$ ,19),
('1.4.2-A01','1.4.2',$$Acompanhamento da evolução do desempenho dos graduados$$,$$Empreendimentos graduados$$,'Anual','Anual',$$Criar um dossiê de saída e pós-incubação, evitando atas e relatórios separados para cada contato.$$,$$Parecer/termo de saída + cadastro atualizado do graduado + pesquisa anual.$$ ,20),
('1.4.2-A02','1.4.2',$$Oferecimento de serviços especializados para graduados$$,$$Empreendimentos Graduados$$,$$Fluxo Contínuo$$,$$Fluxo contínuo$$,$$Criar um dossiê de saída e pós-incubação, evitando atas e relatórios separados para cada contato.$$,$$Parecer/termo de saída + cadastro atualizado do graduado + pesquisa anual.$$ ,21),
('1.5.1-A01','1.5.1',$$Definir, revisar e implementar instrumentos jurídicos e administrativos$$,$$Equipe de Gestão, incubados, graduados, mantenedores, parceiros$$,'Anual','Anual',$$Centralizar governança, planos, atas, orçamento e acompanhamento em um Plano Anual de Operação com anexos.$$,$$Plano Anual de Operação + documentos normativos/financeiros aplicáveis + ata de avaliação.$$ ,22),
('1.5.2-A01','1.5.2',$$Disponibilização de Serviços Operacionais$$,$$Equipe de Gestão, mantenedora, parceiros, incubados$$,'Contínua',$$Fluxo contínuo$$,$$Centralizar governança, planos, atas, orçamento e acompanhamento em um Plano Anual de Operação com anexos.$$,$$Plano Anual de Operação + documentos normativos/financeiros aplicáveis + ata de avaliação.$$ ,23),
('1.5.2-A02','1.5.2',$$Gestão Financeira da Incubadora$$,$$Equipe de Gestão, mantenedora, parceiros, incubados$$,'Mensal','Mensal',$$Centralizar governança, planos, atas, orçamento e acompanhamento em um Plano Anual de Operação com anexos.$$,$$Plano Anual de Operação + documentos normativos/financeiros aplicáveis + ata de avaliação.$$ ,24),
('1.5.2-A03','1.5.2',$$Gestão da Infraestrutura Física e Tecnológica$$,$$Equipe de Gestão, mantenedora, parceiros, incubados$$,'Anual','Anual',$$Centralizar governança, planos, atas, orçamento e acompanhamento em um Plano Anual de Operação com anexos.$$,$$Plano Anual de Operação + documentos normativos/financeiros aplicáveis + ata de avaliação.$$ ,25),
('1.5.3-A01','1.5.3',$$Estratégia de presença digital da incubadora$$,$$Público em geral$$,'Contínua',$$Fluxo contínuo$$,$$Consolidar ações semelhantes em um plano único de comunicação/engajamento, com registros por campanha ou evento.$$,$$Plano de comunicação + links/prints das publicações + relatório consolidado de métricas.$$ ,26),
('1.5.3-A02','1.5.3',$$Gestão de crises de comunicação$$,$$Público em geral$$,'Contínua',$$Fluxo contínuo$$,$$Consolidar ações semelhantes em um plano único de comunicação/engajamento, com registros por campanha ou evento.$$,$$Plano de comunicação + links/prints das publicações + relatório consolidado de métricas.$$ ,27),
('1.5.3-A03','1.5.3',$$Material de comunicação impresso e digital$$,$$Público em geral$$,'Contínua',$$Fluxo contínuo$$,$$Consolidar ações semelhantes em um plano único de comunicação/engajamento, com registros por campanha ou evento.$$,$$Plano de comunicação + links/prints das publicações + relatório consolidado de métricas.$$ ,28),
('2.1.1-A01','2.1.1',$$Elaboração/ atualização do Planejamento Estratégico$$,null,$$D-30; D0$$,$$Prazo operacional$$,$$Centralizar governança, planos, atas, orçamento e acompanhamento em um Plano Anual de Operação com anexos.$$,$$Plano Anual de Operação + documentos normativos/financeiros aplicáveis + ata de avaliação.$$ ,29),
('2.1.2-A01','2.1.2',$$Reuniões semanais com a equipe$$,$$Equipe de gestão da incubadora$$,'Semanal','Semanal',$$Centralizar governança, planos, atas, orçamento e acompanhamento em um Plano Anual de Operação com anexos.$$,$$Plano Anual de Operação + documentos normativos/financeiros aplicáveis + ata de avaliação.$$ ,30),
('2.1.2-A02','2.1.2',$$Reuniões semestrais com as Pró-reitoria de inovação - PROPIP$$,null,$$D-10; D0$$,$$Prazo operacional$$,$$Centralizar governança, planos, atas, orçamento e acompanhamento em um Plano Anual de Operação com anexos.$$,$$Plano Anual de Operação + documentos normativos/financeiros aplicáveis + ata de avaliação.$$ ,31),
('2.1.2-A03','2.1.2',$$Reuniões trimestrais com as células ISA$$,null,$$D-8; D0$$,$$Prazo operacional$$,$$Centralizar governança, planos, atas, orçamento e acompanhamento em um Plano Anual de Operação com anexos.$$,$$Plano Anual de Operação + documentos normativos/financeiros aplicáveis + ata de avaliação.$$ ,32),
('2.1.2-A04','2.1.2',$$Utilizar ferramenta de gestão de projetos/atividades$$,null,$$Anualmente; D-10; D0; Mensalmente; Contínuo$$,$$Fluxo contínuo$$,$$Centralizar governança, planos, atas, orçamento e acompanhamento em um Plano Anual de Operação com anexos.$$,$$Plano Anual de Operação + documentos normativos/financeiros aplicáveis + ata de avaliação.$$ ,33),
('2.1.2-A05','2.1.2',$$Utilizar repositório em nuvem$$,null,'Contínuo',$$Fluxo contínuo$$,$$Centralizar governança, planos, atas, orçamento e acompanhamento em um Plano Anual de Operação com anexos.$$,$$Plano Anual de Operação + documentos normativos/financeiros aplicáveis + ata de avaliação.$$ ,34),
('2.2.1-A01','2.2.1',$$Operação Ambiente de Ideação$$,null,$$D-30; D-15; D0; Contínuo$$,$$Fluxo contínuo$$,$$Consolidar regras, portfólio e registros de uso/atendimento em um catálogo único de serviços.$$,$$Catálogo/regras vigentes + registros de uso ou serviços prestados + avaliação anual.$$ ,35),
('2.2.2-A01','2.2.2',$$Criar/atualizar portfólio de serviços a organizações$$,null,$$Anualmente; D-10; D0; D+10; D+5; Contínuo; D+3$$,$$Fluxo contínuo$$,$$Consolidar regras, portfólio e registros de uso/atendimento em um catálogo único de serviços.$$,$$Catálogo/regras vigentes + registros de uso ou serviços prestados + avaliação anual.$$ ,36),
('2.3.1-A01','2.3.1',$$Aplicação de pesquisa de satisfação sobre mentorias, capacitações e atendimento$$,$$Empreendimentos pré-incubados e incubados$$,'Semestral','Semestral',$$Usar um único diagnóstico/plano de desenvolvimento, atualizado periodicamente e vinculado ao painel de indicadores.$$,$$Diagnóstico e plano de desenvolvimento atualizados + painel/ficha de acompanhamento.$$ ,37),
('2.3.1-A02','2.3.1',$$Avaliação da evolução dos empreendimentos nos cinco eixos, com registro no plano de desenvolvimento$$,$$Empreendimentos incubados$$,'Semestral','Semestral',$$Usar um único diagnóstico/plano de desenvolvimento, atualizado periodicamente e vinculado ao painel de indicadores.$$,$$Diagnóstico e plano de desenvolvimento atualizados + painel/ficha de acompanhamento.$$ ,38),
('2.3.1-A03','2.3.1',$$Divulgação institucional dos reconhecimentos e resultados obtidos$$,$$Público interno e externo$$,'Anual','Anual',$$Usar um único diagnóstico/plano de desenvolvimento, atualizado periodicamente e vinculado ao painel de indicadores.$$,$$Diagnóstico e plano de desenvolvimento atualizados + painel/ficha de acompanhamento.$$ ,39),
('2.3.1-A04','2.3.1',$$Estímulo e apoio à participação em prêmios, editais e chamadas públicas$$,$$Empreendimentos incubados e graduados$$,'Contínuo',$$Fluxo contínuo$$,$$Usar um único diagnóstico/plano de desenvolvimento, atualizado periodicamente e vinculado ao painel de indicadores.$$,$$Diagnóstico e plano de desenvolvimento atualizados + painel/ficha de acompanhamento.$$ ,40),
('2.3.1-A05','2.3.1',$$Reunião de análise crítica dos resultados de qualidade com a equipe de gestão$$,$$Equipe de gestão da incubadora$$,'Anual','Anual',$$Usar um único diagnóstico/plano de desenvolvimento, atualizado periodicamente e vinculado ao painel de indicadores.$$,$$Diagnóstico e plano de desenvolvimento atualizados + painel/ficha de acompanhamento.$$ ,41),
('2.3.2-A01','2.3.2',$$Elaborar, comparar, analisar e divulgar o relatório de avaliação dos impactos$$,$$Equipe de gestão, mantenedora, parceiros e sociedade$$,$$Anual, conforme o ciclo de avaliação$$,'Anual',$$Produzir um relatório anual único, alimentado automaticamente pelo painel de indicadores.$$,$$Relatório anual de impactos + base consolidada de indicadores + ata de análise.$$ ,42)
on conflict (action_code) do update set
  practice_code = excluded.practice_code,
  action_name = excluded.action_name,
  target_audience = excluded.target_audience,
  original_periodicity = excluded.original_periodicity,
  periodicity_group = excluded.periodicity_group,
  simplification_suggestion = excluded.simplification_suggestion,
  minimum_evidence = excluded.minimum_evidence,
  manual_order = excluded.manual_order,
  active = true;

-- Mentorias: equipe por turma e rodadas com janela de agendamento.
create table if not exists public.mentoring_cohort_mentors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  incubator_id uuid not null,
  cohort_id uuid not null,
  mentor_profile_id uuid not null,
  status text not null default 'invited',
  invited_by uuid not null references auth.users(id),
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mentoring_cohort_mentors_org_id_unique unique (organization_id, id),
  constraint mentoring_cohort_mentors_incubator_same_org foreign key (organization_id, incubator_id)
    references public.incubators(organization_id, id),
  constraint mentoring_cohort_mentors_cohort_same_org foreign key (organization_id, cohort_id)
    references public.cohorts(organization_id, id),
  constraint mentoring_cohort_mentors_profile_same_org foreign key (organization_id, mentor_profile_id)
    references public.mentor_profiles(organization_id, id),
  constraint mentoring_cohort_mentors_unique unique (cohort_id, mentor_profile_id),
  constraint mentoring_cohort_mentors_status_valid check (status in ('invited', 'active', 'declined', 'revoked')),
  constraint mentoring_cohort_mentors_response_valid check (
    (status = 'invited' and responded_at is null)
    or (status in ('active', 'declined') and responded_at is not null)
    or status = 'revoked'
  )
);

create index if not exists mentoring_cohort_mentors_profile_idx
  on public.mentoring_cohort_mentors(organization_id, mentor_profile_id, status);
create index if not exists mentoring_cohort_mentors_cohort_idx
  on public.mentoring_cohort_mentors(organization_id, cohort_id, status);

create table if not exists public.mentoring_rounds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  incubator_id uuid not null,
  cohort_id uuid not null,
  name text not null,
  description text,
  booking_opens_at timestamptz not null,
  booking_closes_at timestamptz not null,
  sessions_start_at timestamptz not null,
  sessions_end_at timestamptz not null,
  timezone text not null default 'America/Sao_Paulo',
  max_sessions_per_startup integer not null default 1,
  status text not null default 'draft',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mentoring_rounds_org_id_unique unique (organization_id, id),
  constraint mentoring_rounds_incubator_same_org foreign key (organization_id, incubator_id)
    references public.incubators(organization_id, id),
  constraint mentoring_rounds_cohort_same_org foreign key (organization_id, cohort_id)
    references public.cohorts(organization_id, id),
  constraint mentoring_rounds_name_valid check (name = btrim(name) and char_length(name) between 3 and 160),
  constraint mentoring_rounds_description_valid check (description is null or char_length(description) <= 2000),
  constraint mentoring_rounds_booking_valid check (booking_opens_at < booking_closes_at),
  constraint mentoring_rounds_sessions_valid check (sessions_start_at < sessions_end_at),
  constraint mentoring_rounds_window_valid check (booking_opens_at <= sessions_end_at and booking_closes_at <= sessions_end_at),
  constraint mentoring_rounds_limit_valid check (max_sessions_per_startup between 1 and 20),
  constraint mentoring_rounds_status_valid check (status in ('draft', 'open', 'closed', 'completed', 'cancelled'))
);

create index if not exists mentoring_rounds_cohort_status_idx
  on public.mentoring_rounds(organization_id, cohort_id, status, booking_opens_at desc);

create table if not exists public.mentoring_round_mentors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  round_id uuid not null,
  cohort_mentor_id uuid not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint mentoring_round_mentors_round_same_org foreign key (organization_id, round_id)
    references public.mentoring_rounds(organization_id, id) on delete cascade,
  constraint mentoring_round_mentors_cohort_mentor_same_org foreign key (organization_id, cohort_mentor_id)
    references public.mentoring_cohort_mentors(organization_id, id),
  constraint mentoring_round_mentors_unique unique (round_id, cohort_mentor_id)
);

alter table public.mentoring_sessions add column if not exists round_id uuid;
do $$ begin
  alter table public.mentoring_sessions
    add constraint mentoring_sessions_round_same_org
    foreign key (organization_id, round_id)
    references public.mentoring_rounds(organization_id, id);
exception when duplicate_object then null;
end $$;
create index if not exists mentoring_sessions_round_idx
  on public.mentoring_sessions(organization_id, round_id, scheduled_start_at)
  where round_id is not null;

create or replace function private.validate_mentoring_session_round_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.round_id is null then return new; end if;
  if not exists (
    select 1
    from public.mentoring_rounds round_record
    join public.mentor_startup_assignments assignment
      on assignment.organization_id = new.organization_id and assignment.id = new.assignment_id
    join public.startup_enrollments enrollment
      on enrollment.organization_id = assignment.organization_id
     and enrollment.startup_id = assignment.startup_id
     and enrollment.cohort_id = round_record.cohort_id
     and enrollment.status in ('active', 'suspended')
    join public.mentoring_cohort_mentors team
      on team.organization_id = assignment.organization_id
     and team.cohort_id = round_record.cohort_id
     and team.mentor_profile_id = assignment.mentor_profile_id
     and team.status = 'active'
    join public.mentoring_round_mentors round_mentor
      on round_mentor.organization_id = round_record.organization_id
     and round_mentor.round_id = round_record.id
     and round_mentor.cohort_mentor_id = team.id
    where round_record.organization_id = new.organization_id
      and round_record.incubator_id = new.incubator_id
      and round_record.id = new.round_id
      and new.scheduled_start_at is not null
      and new.scheduled_end_at is not null
      and new.scheduled_start_at >= round_record.sessions_start_at
      and new.scheduled_end_at <= round_record.sessions_end_at
  ) then raise exception 'Sessão incompatível com a rodada de mentoria' using errcode = '23514'; end if;
  return new;
end;
$$;
revoke all on function private.validate_mentoring_session_round_scope() from public, anon, authenticated;

do $$ begin
  create trigger mentoring_sessions_validate_round_scope
  before insert or update of organization_id, incubator_id, assignment_id, round_id, scheduled_start_at, scheduled_end_at
  on public.mentoring_sessions for each row execute function private.validate_mentoring_session_round_scope();
exception when duplicate_object then null;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['mentoring_cohort_mentors', 'mentoring_rounds', 'mentoring_round_mentors'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    begin
      execute format(
        'create policy %I_no_direct_access on public.%I for all to authenticated using (false) with check (false)',
        table_name,
        table_name
      );
    exception when duplicate_object then null;
    end;
    begin
      execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.write_audit_log()', table_name, table_name);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['mentoring_cohort_mentors', 'mentoring_rounds'] loop
    begin
      execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

create or replace function private.mentoring_may_access_cohort(
  target_organization_id uuid,
  target_incubator_id uuid,
  target_cohort_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_permission(target_organization_id, 'mentoring.read', null, target_incubator_id)
    or private.has_permission(target_organization_id, 'mentoring.manage', null, target_incubator_id)
    or exists (
      select 1
      from public.mentoring_cohort_mentors team
      join public.mentor_profiles profile
        on profile.organization_id = team.organization_id
       and profile.id = team.mentor_profile_id
      where team.organization_id = target_organization_id
        and team.incubator_id = target_incubator_id
        and team.cohort_id = target_cohort_id
        and team.status in ('invited', 'active')
        and profile.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.startup_enrollments enrollment
      join public.startup_members member
        on member.organization_id = enrollment.organization_id
       and member.startup_id = enrollment.startup_id
      where enrollment.organization_id = target_organization_id
        and enrollment.cohort_id = target_cohort_id
        and enrollment.status in ('invited', 'active', 'suspended')
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    );
$$;
revoke all on function private.mentoring_may_access_cohort(uuid,uuid,uuid) from public, anon, authenticated;

create or replace function public.create_mentoring_round(
  target_organization_id uuid,
  target_incubator_id uuid,
  target_cohort_id uuid,
  round_name text,
  round_description text,
  booking_opens_local timestamp,
  booking_closes_local timestamp,
  sessions_start_local timestamp,
  sessions_end_local timestamp,
  round_timezone text,
  max_sessions integer,
  open_now boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare round_id uuid;
begin
  if not private.has_permission(target_organization_id, 'mentoring.manage', null, target_incubator_id) then
    raise exception 'Permissão insuficiente' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.cohorts cohort
    join public.programs program on program.organization_id = cohort.organization_id and program.id = cohort.program_id
    where cohort.organization_id = target_organization_id and cohort.id = target_cohort_id
      and cohort.deleted_at is null and program.incubator_id = target_incubator_id and program.deleted_at is null
  ) then raise exception 'Turma indisponível' using errcode = '23514'; end if;
  insert into public.mentoring_rounds(
    organization_id, incubator_id, cohort_id, name, description,
    booking_opens_at, booking_closes_at, sessions_start_at, sessions_end_at,
    timezone, max_sessions_per_startup, status, created_by
  ) values (
    target_organization_id, target_incubator_id, target_cohort_id, btrim(round_name),
    nullif(btrim(round_description), ''), booking_opens_local at time zone round_timezone,
    booking_closes_local at time zone round_timezone,
    sessions_start_local at time zone round_timezone,
    sessions_end_local at time zone round_timezone, btrim(round_timezone), max_sessions,
    case when open_now then 'open' else 'draft' end, (select auth.uid())
  ) returning id into round_id;
  if open_now then
    insert into public.mentoring_round_mentors(organization_id, round_id, cohort_mentor_id, created_by)
    select target_organization_id, round_id, team.id, (select auth.uid())
    from public.mentoring_cohort_mentors team
    where team.organization_id = target_organization_id
      and team.cohort_id = target_cohort_id and team.status = 'active';
    if not found then
      raise exception 'Associe ao menos um mentor à turma antes de abrir a rodada' using errcode = '23514';
    end if;
  end if;
  return round_id;
end;
$$;

create or replace function public.set_mentoring_round_status(target_round_id uuid, requested_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare round_record public.mentoring_rounds%rowtype;
begin
  select * into round_record from public.mentoring_rounds where id = target_round_id for update;
  if not found or not private.has_permission(round_record.organization_id, 'mentoring.manage', null, round_record.incubator_id) then
    raise exception 'Rodada indisponível' using errcode = '42501';
  end if;
  if requested_status not in ('draft', 'open', 'closed', 'completed', 'cancelled') then
    raise exception 'Status inválido' using errcode = '23514';
  end if;
  if requested_status = 'open' and not exists (
    select 1 from public.mentoring_round_mentors where organization_id = round_record.organization_id and round_id = round_record.id
  ) then raise exception 'Associe ao menos um mentor antes de abrir a rodada' using errcode = '23514'; end if;
  update public.mentoring_rounds set status = requested_status, updated_at = now() where id = round_record.id;
end;
$$;

create or replace function public.invite_mentor_to_cohort(
  target_cohort_id uuid,
  target_mentor_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare cohort_record record;
declare mentor_record record;
declare team_id uuid;
declare invitation_timestamp timestamptz;
declare organization_slug text;
declare incubator_slug text;
begin
  select cohort.id, cohort.organization_id, cohort.name, program.incubator_id
    into cohort_record
  from public.cohorts cohort
  join public.programs program on program.organization_id = cohort.organization_id and program.id = cohort.program_id
  where cohort.id = target_cohort_id and cohort.deleted_at is null and program.deleted_at is null;
  if not found or not private.has_permission(cohort_record.organization_id, 'mentoring.manage', null, cohort_record.incubator_id) then
    raise exception 'Turma indisponível' using errcode = '42501';
  end if;
  select profile.id, profile.user_id, person.email, coalesce(person.display_name, person.email) as display_name
    into mentor_record
  from public.mentor_profiles profile
  join public.profiles person on person.id = profile.user_id
  where profile.organization_id = cohort_record.organization_id
    and profile.incubator_id = cohort_record.incubator_id
    and profile.id = target_mentor_profile_id and profile.status = 'active';
  if not found then raise exception 'Mentor indisponível' using errcode = '23514'; end if;
  insert into public.mentoring_cohort_mentors(
    organization_id, incubator_id, cohort_id, mentor_profile_id, status, invited_by
  ) values (
    cohort_record.organization_id, cohort_record.incubator_id, cohort_record.id,
    mentor_record.id, 'invited', (select auth.uid())
  )
  on conflict (cohort_id, mentor_profile_id) do update set
    status = 'invited', invited_by = excluded.invited_by, invited_at = now(),
    responded_at = null, updated_at = now()
  returning id, invited_at into team_id, invitation_timestamp;
  select organization.slug, incubator.slug into organization_slug, incubator_slug
  from public.organizations organization
  join public.incubators incubator on incubator.organization_id = organization.id
  where organization.id = cohort_record.organization_id and incubator.id = cohort_record.incubator_id;
  perform private.queue_notification(
    cohort_record.organization_id, 'mentoring.cohort_invitation', mentor_record.user_id,
    mentor_record.email, format('Convite para a equipe de mentores — %s', cohort_record.name),
    format('Você foi convidado(a) para integrar a equipe de mentores da turma %s. Acesse a plataforma para aceitar ou recusar o convite.', cohort_record.name),
    format('/o/%s/i/%s/mentorias?view=equipe', organization_slug, incubator_slug),
    format('mentoring.cohort_invitation:%s:%s', team_id, extract(epoch from invitation_timestamp)::bigint)
  );
  return team_id;
end;
$$;

create or replace function public.respond_mentor_cohort_invitation(
  target_team_id uuid,
  accept_invitation boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.mentoring_cohort_mentors team set
    status = case when accept_invitation then 'active' else 'declined' end,
    responded_at = now(), updated_at = now()
  from public.mentor_profiles profile
  where team.id = target_team_id and team.status = 'invited'
    and profile.organization_id = team.organization_id
    and profile.id = team.mentor_profile_id
    and profile.user_id = (select auth.uid());
  if not found then raise exception 'Convite indisponível' using errcode = '42501'; end if;
end;
$$;

create or replace function public.set_mentoring_round_mentor(
  target_round_id uuid,
  target_cohort_mentor_id uuid,
  enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare round_record public.mentoring_rounds%rowtype;
begin
  select * into round_record from public.mentoring_rounds where id = target_round_id for update;
  if not found or not private.has_permission(round_record.organization_id, 'mentoring.manage', null, round_record.incubator_id) then
    raise exception 'Rodada indisponível' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.mentoring_cohort_mentors team
    where team.organization_id = round_record.organization_id and team.id = target_cohort_mentor_id
      and team.cohort_id = round_record.cohort_id and team.status = 'active'
  ) then raise exception 'Mentor não está ativo na equipe desta turma' using errcode = '23514'; end if;
  if enabled then
    insert into public.mentoring_round_mentors(organization_id, round_id, cohort_mentor_id, created_by)
    values(round_record.organization_id, round_record.id, target_cohort_mentor_id, (select auth.uid()))
    on conflict (round_id, cohort_mentor_id) do nothing;
  else
    if exists (
      select 1 from public.mentoring_sessions session
      join public.mentor_startup_assignments assignment
        on assignment.organization_id = session.organization_id and assignment.id = session.assignment_id
      join public.mentoring_cohort_mentors team
        on team.organization_id = assignment.organization_id and team.mentor_profile_id = assignment.mentor_profile_id
      where session.organization_id = round_record.organization_id and session.round_id = round_record.id
        and team.id = target_cohort_mentor_id and session.status <> 'cancelled'
    ) then raise exception 'O mentor possui sessões nesta rodada' using errcode = '23514'; end if;
    delete from public.mentoring_round_mentors
    where organization_id = round_record.organization_id and round_id = round_record.id
      and cohort_mentor_id = target_cohort_mentor_id;
  end if;
end;
$$;

create or replace function public.book_mentoring_round_session(
  target_round_id uuid,
  target_assignment_id uuid,
  session_objective text,
  session_mode public.mentoring_session_mode,
  session_timezone text,
  scheduled_start_local timestamp,
  scheduled_end_local timestamp,
  session_meeting_url text default null,
  session_location text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare round_record public.mentoring_rounds%rowtype;
declare assignment public.mentor_startup_assignments%rowtype;
declare start_at timestamptz;
declare end_at timestamptz;
declare created_session_id uuid;
declare startup_session_count integer;
begin
  select * into round_record from public.mentoring_rounds where id = target_round_id for update;
  if not found or not private.mentoring_may_access_cohort(round_record.organization_id, round_record.incubator_id, round_record.cohort_id) then
    raise exception 'Rodada indisponível' using errcode = '42501';
  end if;
  if round_record.status <> 'open' or now() < round_record.booking_opens_at or now() > round_record.booking_closes_at then
    raise exception 'A janela de agendamento não está aberta' using errcode = '23514';
  end if;
  select * into assignment from public.mentor_startup_assignments
  where id = target_assignment_id and organization_id = round_record.organization_id
    and incubator_id = round_record.incubator_id and status = 'active';
  if not found or not private.can_access_mentoring_assignment(assignment.organization_id, assignment.id) then
    raise exception 'Vínculo de mentoria indisponível' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.startup_enrollments enrollment
    where enrollment.organization_id = round_record.organization_id
      and enrollment.startup_id = assignment.startup_id
      and enrollment.cohort_id = round_record.cohort_id
      and enrollment.status in ('active', 'suspended')
  ) then raise exception 'A startup não pertence à turma desta rodada' using errcode = '23514'; end if;
  if not exists (
    select 1
    from public.mentoring_round_mentors round_mentor
    join public.mentoring_cohort_mentors team
      on team.organization_id = round_mentor.organization_id and team.id = round_mentor.cohort_mentor_id
    where round_mentor.organization_id = round_record.organization_id
      and round_mentor.round_id = round_record.id
      and team.mentor_profile_id = assignment.mentor_profile_id
      and team.status = 'active'
  ) then raise exception 'O mentor não participa desta rodada' using errcode = '23514'; end if;
  start_at := scheduled_start_local at time zone session_timezone;
  end_at := scheduled_end_local at time zone session_timezone;
  if start_at >= end_at or start_at < round_record.sessions_start_at or end_at > round_record.sessions_end_at then
    raise exception 'Horário fora do período de atendimento da rodada' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.mentor_availability_slots availability
    where availability.organization_id = round_record.organization_id
      and availability.mentor_profile_id = assignment.mentor_profile_id
      and availability.is_active
      and extract(dow from (start_at at time zone availability.timezone))::integer = availability.weekday
      and (start_at at time zone availability.timezone)::date >= availability.effective_from
      and (availability.effective_until is null or (start_at at time zone availability.timezone)::date <= availability.effective_until)
      and (start_at at time zone availability.timezone)::time >= availability.starts_at
      and (end_at at time zone availability.timezone)::time <= availability.ends_at
  ) then raise exception 'Horário fora da disponibilidade declarada pelo mentor' using errcode = '23514'; end if;
  select count(*) into startup_session_count
  from public.mentoring_sessions session
  join public.mentor_startup_assignments existing_assignment
    on existing_assignment.organization_id = session.organization_id and existing_assignment.id = session.assignment_id
  where session.organization_id = round_record.organization_id
    and session.round_id = round_record.id
    and existing_assignment.startup_id = assignment.startup_id
    and session.status <> 'cancelled';
  if startup_session_count >= round_record.max_sessions_per_startup then
    raise exception 'A startup atingiu o limite de sessões desta rodada' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.mentoring_sessions session
    join public.mentor_startup_assignments existing_assignment
      on existing_assignment.organization_id = session.organization_id and existing_assignment.id = session.assignment_id
    where session.organization_id = round_record.organization_id
      and session.status in ('requested', 'scheduled')
      and (existing_assignment.mentor_profile_id = assignment.mentor_profile_id
        or existing_assignment.startup_id = assignment.startup_id)
      and tstzrange(session.scheduled_start_at, session.scheduled_end_at, '[)') && tstzrange(start_at, end_at, '[)')
  ) then raise exception 'Mentor ou startup já possui sessão nesse horário' using errcode = '23P01'; end if;
  insert into public.mentoring_sessions(
    organization_id, incubator_id, assignment_id, round_id, requested_by,
    objective, mode, timezone, scheduled_start_at, scheduled_end_at,
    meeting_url, location, status, created_by
  ) values (
    round_record.organization_id, round_record.incubator_id, assignment.id,
    round_record.id, (select auth.uid()), btrim(session_objective), session_mode,
    btrim(session_timezone), start_at, end_at, nullif(btrim(session_meeting_url), ''),
    nullif(btrim(session_location), ''), 'scheduled', (select auth.uid())
  ) returning id into created_session_id;
  return created_session_id;
end;
$$;

create or replace function public.get_mentoring_operations(
  target_organization_id uuid,
  target_incubator_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare can_manage boolean := private.has_permission(target_organization_id, 'mentoring.manage', null, target_incubator_id);
declare can_read_all boolean := private.has_permission(target_organization_id, 'mentoring.read', null, target_incubator_id);
begin
  if (select auth.uid()) is null or not (
    can_manage or can_read_all
    or exists (
      select 1 from public.mentor_profiles profile
      where profile.organization_id = target_organization_id and profile.incubator_id = target_incubator_id
        and profile.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.startup_members member
      join public.startups startup on startup.organization_id = member.organization_id and startup.id = member.startup_id
      where member.organization_id = target_organization_id and startup.incubator_id = target_incubator_id
        and member.user_id = (select auth.uid()) and member.status = 'active'
    )
  ) then raise exception 'Permissão insuficiente' using errcode = '42501'; end if;
  return jsonb_build_object(
    'rounds', (
      select coalesce(jsonb_agg(to_jsonb(round_record) order by round_record.sessions_start_at desc), '[]'::jsonb)
      from public.mentoring_rounds round_record
      where round_record.organization_id = target_organization_id
        and round_record.incubator_id = target_incubator_id
        and private.mentoring_may_access_cohort(round_record.organization_id, round_record.incubator_id, round_record.cohort_id)
    ),
    'cohortMentors', (
      select coalesce(jsonb_agg(to_jsonb(team) order by team.invited_at desc), '[]'::jsonb)
      from public.mentoring_cohort_mentors team
      where team.organization_id = target_organization_id and team.incubator_id = target_incubator_id
        and private.mentoring_may_access_cohort(team.organization_id, team.incubator_id, team.cohort_id)
    ),
    'roundMentors', (
      select coalesce(jsonb_agg(to_jsonb(round_mentor)), '[]'::jsonb)
      from public.mentoring_round_mentors round_mentor
      join public.mentoring_rounds round_record
        on round_record.organization_id = round_mentor.organization_id and round_record.id = round_mentor.round_id
      where round_record.organization_id = target_organization_id and round_record.incubator_id = target_incubator_id
        and private.mentoring_may_access_cohort(round_record.organization_id, round_record.incubator_id, round_record.cohort_id)
    ),
    'cohorts', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', cohort.id, 'name', cohort.name, 'status', cohort.status,
        'programId', program.id, 'programName', program.name
      ) order by program.name, cohort.name), '[]'::jsonb)
      from public.cohorts cohort
      join public.programs program on program.organization_id = cohort.organization_id and program.id = cohort.program_id
      where cohort.organization_id = target_organization_id and program.incubator_id = target_incubator_id
        and cohort.deleted_at is null and program.deleted_at is null
        and private.mentoring_may_access_cohort(cohort.organization_id, program.incubator_id, cohort.id)
    )
  );
end;
$$;

-- Seleção: distribuição aleatória com balanceamento de carga e aviso por e-mail.
create or replace function public.assign_selection_reviewer(
  target_application_id uuid,
  target_reviewer_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare application public.selection_applications%rowtype;
declare reviewer public.selection_reviewers%rowtype;
declare selected_call public.selection_calls%rowtype;
declare sequence_number integer;
declare assignment_id uuid;
declare reviewer_email text;
declare organization_slug text;
declare incubator_slug text;
begin
  select * into application from public.selection_applications where id = target_application_id for update;
  select * into reviewer from public.selection_reviewers where id = target_reviewer_id and active;
  if reviewer.id is null or application.id is null or reviewer.call_id <> application.call_id
    or not private.selection_may_manage(application.organization_id, application.incubator_id) then
    raise exception 'Atribuição inválida' using errcode = '42501';
  end if;
  if application.status not in ('eligible', 'under_review') then
    raise exception 'A proposta precisa estar habilitada para avaliação' using errcode = '23514';
  end if;
  select * into selected_call from public.selection_calls where id = application.call_id;
  select coalesce(max(existing.sequence), 0) + 1 into sequence_number
  from public.selection_assignments existing where existing.application_id = application.id;
  insert into public.selection_assignments(
    organization_id, call_id, application_id, reviewer_id, sequence, created_by
  ) values (
    application.organization_id, application.call_id, application.id,
    reviewer.id, sequence_number, (select auth.uid())
  ) returning id into assignment_id;
  update public.selection_applications set status = 'under_review', updated_at = now()
  where id = application.id and status = 'eligible';
  select profile.email, organization.slug, incubator.slug
    into reviewer_email, organization_slug, incubator_slug
  from public.profiles profile
  join public.organizations organization on organization.id = application.organization_id
  join public.incubators incubator
    on incubator.organization_id = application.organization_id and incubator.id = application.incubator_id
  where profile.id = reviewer.user_id;
  perform private.queue_notification(
    application.organization_id, 'selection.assignment', reviewer.user_id,
    reviewer_email, format('Nova proposta para avaliar — %s', selected_call.title),
    format('A proposta %s (%s) foi atribuída a você. Acesse a plataforma para aceitar a confidencialidade, verificar impedimentos e registrar a avaliação.', application.startup_name, application.protocol),
    format('/o/%s/i/%s/chamadas?view=reviews', organization_slug, incubator_slug),
    format('selection.assignment:%s', assignment_id)
  );
  return assignment_id;
end;
$$;

create or replace function public.auto_assign_selection_reviewers(target_call_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare selected_call public.selection_calls%rowtype;
declare application record;
declare reviewer record;
declare needed integer;
declare sequence_number integer;
declare created integer := 0;
declare assignment_id uuid;
declare reviewer_count integer;
declare organization_slug text;
declare incubator_slug text;
declare assigned_count integer;
begin
  select * into selected_call from public.selection_calls where id = target_call_id for update;
  if not found or not private.selection_may_manage(selected_call.organization_id, selected_call.incubator_id) then
    raise exception 'Chamada indisponível' using errcode = '42501';
  end if;
  select count(*) into reviewer_count from public.selection_reviewers
  where call_id = selected_call.id and active;
  if reviewer_count < selected_call.reviewers_per_application then
    raise exception 'A banca precisa de ao menos % avaliadores ativos', selected_call.reviewers_per_application using errcode = '23514';
  end if;
  select organization.slug, incubator.slug into organization_slug, incubator_slug
  from public.organizations organization
  join public.incubators incubator on incubator.organization_id = organization.id
  where organization.id = selected_call.organization_id and incubator.id = selected_call.incubator_id;
  for application in
    select candidate.id, candidate.startup_name, candidate.protocol
    from public.selection_applications candidate
    where candidate.call_id = selected_call.id and candidate.status in ('eligible', 'under_review')
    order by random()
  loop
    select greatest(0, selected_call.reviewers_per_application - count(*)) into needed
    from public.selection_assignments existing
    where existing.application_id = application.id and existing.status not in ('replaced', 'conflict');
    select coalesce(max(existing.sequence), 0) into sequence_number
    from public.selection_assignments existing where existing.application_id = application.id;
    for reviewer in
      select candidate.id, candidate.user_id, profile.email
      from public.selection_reviewers candidate
      join public.profiles profile on profile.id = candidate.user_id
      where candidate.call_id = selected_call.id and candidate.active
        and not exists (
          select 1 from public.selection_assignments previous
          where previous.application_id = application.id and previous.reviewer_id = candidate.id
        )
      order by (
        select count(*) from public.selection_assignments load
        where load.reviewer_id = candidate.id and load.status in ('assigned', 'in_progress')
      ), random()
      limit needed
    loop
      sequence_number := sequence_number + 1;
      insert into public.selection_assignments(
        organization_id, call_id, application_id, reviewer_id, sequence, created_by
      ) values (
        selected_call.organization_id, selected_call.id, application.id,
        reviewer.id, sequence_number, (select auth.uid())
      ) returning id into assignment_id;
      perform private.queue_notification(
        selected_call.organization_id, 'selection.assignment', reviewer.user_id,
        reviewer.email, format('Nova proposta para avaliar — %s', selected_call.title),
        format('A proposta %s (%s) foi atribuída a você por distribuição aleatória e balanceada. Acesse a plataforma para aceitar a confidencialidade, verificar impedimentos e registrar a avaliação.', application.startup_name, application.protocol),
        format('/o/%s/i/%s/chamadas?view=reviews', organization_slug, incubator_slug),
        format('selection.assignment:%s', assignment_id)
      );
      created := created + 1;
    end loop;
    if needed > 0 then
      update public.selection_applications set status = 'under_review', updated_at = now()
      where id = application.id;
    end if;
    select count(*) into assigned_count
    from public.selection_assignments current_assignment
    where current_assignment.application_id = application.id
      and current_assignment.status not in ('replaced', 'conflict');
    if assigned_count < selected_call.reviewers_per_application then
      raise exception 'Não há avaliadores disponíveis suficientes para a proposta %', application.protocol using errcode = '23514';
    end if;
  end loop;
  return created;
end;
$$;

create or replace function public.get_cerne_plan(
  target_organization_id uuid,
  target_incubator_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.cerne_may_read(target_organization_id, target_incubator_id) then
    raise exception 'Permissão insuficiente' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'actions', (
      select coalesce(jsonb_agg(to_jsonb(action) order by action.manual_order), '[]'::jsonb)
      from public.cerne_action_catalog action where action.active
    ),
    'decisions', (
      select coalesce(jsonb_agg(to_jsonb(decision) order by decision.updated_at desc), '[]'::jsonb)
      from public.cerne_cycle_action_decisions decision
      join public.cerne_cycles cycle
        on cycle.organization_id = decision.organization_id and cycle.id = decision.cycle_id
      where cycle.organization_id = target_organization_id and cycle.incubator_id = target_incubator_id
        and private.cerne_may_read(cycle.organization_id, cycle.incubator_id, cycle.id)
    )
  );
end;
$$;

revoke all on function public.save_cerne_action_decision(uuid,uuid,text,text,text,text,text),
  public.adjust_cerne_evidence_slot(uuid,text,timestamp,text,boolean,text),
  public.create_mentoring_round(uuid,uuid,uuid,text,text,timestamp,timestamp,timestamp,timestamp,text,integer,boolean),
  public.set_mentoring_round_status(uuid,text),
  public.invite_mentor_to_cohort(uuid,uuid),
  public.respond_mentor_cohort_invitation(uuid,boolean),
  public.set_mentoring_round_mentor(uuid,uuid,boolean),
  public.book_mentoring_round_session(uuid,uuid,text,public.mentoring_session_mode,text,timestamp,timestamp,text,text),
  public.get_mentoring_operations(uuid,uuid),
  public.get_cerne_plan(uuid,uuid)
from public, anon;

grant execute on function public.save_cerne_action_decision(uuid,uuid,text,text,text,text,text),
  public.adjust_cerne_evidence_slot(uuid,text,timestamp,text,boolean,text),
  public.create_mentoring_round(uuid,uuid,uuid,text,text,timestamp,timestamp,timestamp,timestamp,text,integer,boolean),
  public.set_mentoring_round_status(uuid,text),
  public.invite_mentor_to_cohort(uuid,uuid),
  public.respond_mentor_cohort_invitation(uuid,boolean),
  public.set_mentoring_round_mentor(uuid,uuid,boolean),
  public.book_mentoring_round_session(uuid,uuid,text,public.mentoring_session_mode,text,timestamp,timestamp,text,text),
  public.get_mentoring_operations(uuid,uuid),
  public.get_cerne_plan(uuid,uuid)
to authenticated;

comment on table public.cerne_action_catalog is
  '42 ações operacionais consolidadas da planilha CERNE, preservando a recomendação mínima sem duplicar dossiês.';
comment on table public.cerne_cycle_action_decisions is
  'Decisões da equipe sobre aceitar, ajustar ou dispensar cada ação em um ciclo CERNE.';
comment on table public.mentoring_rounds is
  'Rodadas de mentoria vinculadas a uma turma, com janela de reserva e período de atendimento.';
comment on table public.mentoring_cohort_mentors is
  'Convites e aceite de mentores para a equipe de uma turma.';
comment on table public.notification_outbox is
  'Fila transacional idempotente processada exclusivamente pelo servidor com credencial administrativa.';
