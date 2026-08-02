# SDD — Software Design Document

## Plataforma de Gestão de Incubadoras e Desenvolvimento de Startups

**Arquitetura-alvo:** Vercel + Supabase + Google Drive  
**Versão:** 1.0  
**Data:** 02 de agosto de 2026  
**Status:** Especificação para implementação  
**Escopo:** MVP evolutivo, multi-incubadora  
**Documento-base:** Requisitos consolidados e Manual CERNE I e II da ISA

> Esta é a transcrição estruturada em Markdown do documento `SDD_Plataforma_Gestao_Incubadoras_Vercel_Supabase_Drive.docx`. O DOCX permanece a fonte histórica; este arquivo passa a ser a fonte de trabalho versionável no repositório.

## Sumário executivo

Este documento especifica uma plataforma web multi-incubadora para gerenciar programas, startups, diagnósticos, planos de desenvolvimento, atividades, conteúdos formativos, mentorias, indicadores, evidências, graduação e gestão institucional. A solução deve operar de forma independente de qualquer metodologia específica, mantendo o CERNE como uma camada opcional de mapeamento, conformidade e geração de evidências.

A aplicação será implantada na Vercel com Next.js, utilizará Supabase para autenticação, banco PostgreSQL, políticas de segurança e funções de backend, e usará Google Drive — preferencialmente um Drive Compartilhado institucional — para arquivos grandes. Metadados, permissões lógicas, versões e relacionamentos dos arquivos permanecerão no Supabase.

> **Decisão arquitetural principal:** programas, atividades, diagnósticos e conteúdos funcionam sem vínculo obrigatório com CERNE. Referências metodológicas são relacionamentos opcionais, muitos-para-muitos, criados manualmente, por regras ou por sugestão automática.

## 1. Visão do produto

### 1.1 Problema

Incubadoras frequentemente distribuem sua operação entre planilhas, formulários, agendas, aplicativos de mensagens, pastas no Drive e documentos isolados. Isso dificulta acompanhar a evolução das startups, demonstrar resultados, organizar evidências, planejar intervenções e preservar o histórico institucional.

### 1.2 Objetivos

- Centralizar a jornada das startups desde a seleção até a graduação e pós-incubação.
- Converter diagnósticos em prioridades, planos de ação, conteúdos, mentorias e entregas verificáveis.
- Permitir programas configuráveis de pré-incubação, incubação, aceleração e outras modalidades.
- Gerenciar conteúdos formativos integrados ao plano de ação individual.
- Consolidar indicadores, evidências e resultados da incubadora e dos empreendimentos.
- Oferecer uma camada metodológica opcional, incluindo CERNE, sem burocratizar a operação.
- Garantir segregação de dados e permissões em uma arquitetura multi-instituição.

### 1.3 Princípios de produto

| Princípio                      | Aplicação                                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Operação antes da conformidade | O usuário executa o trabalho cotidiano; o sistema mapeia metodologias e evidências sem exigir classificações desnecessárias. |
| Plano orientado a resultados   | Conteúdo assistido não encerra uma ação; aplicação, evidência e validação são etapas distintas.                              |
| Configuração sem código        | Metodologias, formulários, trilhas, tipos de programa, indicadores e rubricas devem ser configuráveis.                       |
| Histórico imutável             | Diagnósticos e metodologias aplicados preservam sua versão original.                                                         |
| Privacidade por padrão         | Informações financeiras, contratos, avaliações e feedbacks possuem acesso restrito.                                          |
| MVP evolutivo                  | Começar com o núcleo de acompanhamento; expandir para seleção, CERNE, infraestrutura e impacto.                              |

### 1.4 Premissas

- Cada organização pode possuir uma ou mais incubadoras/unidades.
- Um usuário pode participar de várias organizações com papéis diferentes.
- Arquivos grandes serão armazenados no Google Drive; o Supabase armazena metadados e arquivos pequenos opcionais.
- O sistema será responsivo, prioritariamente web, sem aplicativo nativo no MVP.
- O idioma inicial será português do Brasil, com arquitetura preparada para internacionalização.
- Google Workspace institucional e Drive Compartilhado são preferíveis a pastas pessoais.

## 2. Escopo funcional

### 2.1 Módulos do produto

| Módulo                      | Responsabilidade                                                 | Prioridade |
| --------------------------- | ---------------------------------------------------------------- | ---------- |
| Organizações e incubadoras  | Tenancy, identidade, unidades, equipe e configurações            | MVP        |
| Programas e turmas          | Modalidades, ciclos, critérios, cronograma e participantes       | MVP        |
| Startups e equipes          | Cadastro, histórico, membros, estágio e dados do negócio         | MVP        |
| Metodologias e diagnósticos | Editor de dimensões, critérios, rubricas, versões e avaliações   | MVP        |
| Plano de desenvolvimento    | Prioridades, objetivos, ações, responsáveis, prazos e resultados | MVP        |
| Atividades e entregas       | Atribuição, evidências, comentários, revisão e aprovação         | MVP        |
| Biblioteca formativa        | Conteúdos, coleções, competências e integração com ações         | MVP        |
| Mentorias                   | Mentores, competências, agenda, sessão, feedback e ações         | Fase 2     |
| Indicadores e metas         | KPIs de startup, programa e incubadora                           | MVP        |
| Notificações e alertas      | Prazos, riscos, pendências e atualizações                        | MVP básico |
| Gestão CERNE                | Práticas, evidências, efetividade e painel de conformidade       | Fase 2     |
| Seleção e contratação       | Editais, propostas, avaliações, documentos e contratos           | Fase 3     |
| Infraestrutura e benefícios | Ambientes, equipamentos, reservas, créditos e serviços           | Fase 3     |
| Graduação e alumni          | Prontidão, decisão, termo, acompanhamento pós-incubação          | Fase 2     |
| Relatórios e impacto        | Relatórios por startup, programa, instituição e território       | Fase 2/3   |

### 2.2 Fora do escopo inicial

- ERP financeiro ou contábil completo.
- Videoconferência própria; serão usados links externos.
- LMS completo com SCORM/xAPI no MVP.
- Assinatura eletrônica proprietária; integração futura com fornecedor especializado.
- Chat instantâneo complexo; comentários e notificações serão suficientes inicialmente.
- Certificação automática CERNE; o sistema apenas apoia gestão e prontidão documental.

## 3. Usuários, papéis e permissões

| Papel                        | Escopo                        | Permissões principais                                                           |
| ---------------------------- | ----------------------------- | ------------------------------------------------------------------------------- |
| Superadministrador           | Plataforma                    | Gerenciar tenants, suporte, parâmetros globais e auditoria técnica.             |
| Administrador da organização | Organização                   | Gerenciar incubadoras, usuários, metodologias, integrações e permissões.        |
| Gestor da incubadora         | Incubadora                    | Gerenciar programas, startups, equipe, indicadores, planos e relatórios.        |
| Coordenador de programa      | Programa                      | Gerenciar turma, trilha, atividades, mentores e startups vinculadas.            |
| Agente de acompanhamento     | Startups atribuídas           | Validar diagnósticos, acompanhar planos, revisar entregas e registrar reuniões. |
| Avaliador                    | Processo/diagnóstico          | Avaliar propostas ou diagnósticos conforme atribuição.                          |
| Mentor                       | Sessões e startups vinculadas | Disponibilidade, sessões, feedbacks e recomendações.                            |
| Representante da startup     | Startup                       | Gerenciar equipe, responder diagnósticos, plano, atividades e indicadores.      |
| Membro da startup            | Startup                       | Executar atividades e acessar conteúdos autorizados.                            |
| Parceiro/patrocinador        | Relatórios específicos        | Acesso somente a informações autorizadas e agregadas.                           |
| Auditor/leitura              | Escopo atribuído              | Consulta sem alteração, inclusive evidências validadas.                         |

### 3.1 Modelo de autorização

A autorização combinará RBAC e escopo contextual. Um papel não concede acesso global automaticamente: cada vínculo deve indicar organização, incubadora, programa ou startup. Tabelas expostas ao cliente devem ter Row Level Security habilitada.

```text
organization_memberships
- user_id
- organization_id
- role_code
- status

resource_assignments
- user_id
- resource_type  // incubator, program, startup
- resource_id
- permission_set
```

## 4. Requisitos funcionais

### 4.1 Organizações e incubadoras

- **RF-001:** criar e configurar organizações, incubadoras e unidades.
- **RF-002:** personalizar nome, marca, domínio, fuso horário, idioma e contatos.
- **RF-003:** convidar usuários e atribuir papéis por escopo.
- **RF-004:** configurar recursos habilitados por incubadora.

### 4.2 Programas e turmas

- **RF-010:** criar tipos de programa configuráveis.
- **RF-011:** criar programa e múltiplas turmas/ciclos.
- **RF-012:** definir datas, equipe, critérios, trilha, diagnósticos, indicadores e documentos obrigatórios.
- **RF-013:** matricular startups manualmente, por convite ou por processo seletivo.
- **RF-014:** mover startup entre programas preservando histórico.

### 4.3 Startups

- **RF-020:** cadastrar startup, dados institucionais, modelo de negócio, setor, estágio e localização.
- **RF-021:** cadastrar membros, funções, dedicação, competências e vínculo societário.
- **RF-022:** manter linha do tempo de mudanças, programas, diagnósticos, mentorias e documentos.
- **RF-023:** permitir campos personalizados por incubadora ou programa.

### 4.4 Diagnósticos

- **RF-030:** criar metodologia versionada com dimensões, critérios, rubricas, pesos e aplicabilidade.
- **RF-031:** suportar respostas numéricas, texto, escolha, moeda, percentual, data, link e arquivo.
- **RF-032:** separar autodiagnóstico, nota validada, evidência e comentário do avaliador.
- **RF-033:** suportar N/A justificado e excluir o item do denominador.
- **RF-034:** exibir radar, evolução, mapa de calor e gap de percepção.
- **RF-035:** gerar prioridades e riscos, com revisão humana.

### 4.5 Plano de ação

- **RF-040:** criar plano a partir de diagnóstico, mentoria, reunião ou manualmente.
- **RF-041:** estruturar prioridade, objetivo, ação, responsável, prazo, KPI, meta, evidência e apoio.
- **RF-042:** limitar ou recomendar número de prioridades por ciclo.
- **RF-043:** permitir dependências, bloqueios, reprogramação e histórico.
- **RF-044:** calcular execução do plano e sinalizar atrasos.

### 4.6 Conteúdos formativos

- **RF-050:** cadastrar vídeos, textos, PDFs, templates, links, podcasts, questionários e atividades práticas.
- **RF-051:** classificar por eixo, competência, estágio, setor, formato, duração e nível.
- **RF-052:** vincular conteúdo a trilha, ação do plano, mentoria ou startup.
- **RF-053:** definir conteúdo como obrigatório, recomendado ou complementar.
- **RF-054:** registrar acessado, concluído, aplicado e validado.
- **RF-055:** exigir entrega prática e permitir avaliação do gestor.
- **RF-056:** criar coleções e kits de desenvolvimento.

### 4.7 Atividades e entregas

- **RF-060:** atribuir atividade a usuário, startup, grupo ou turma.
- **RF-061:** aceitar texto, link, formulário e arquivos como entrega.
- **RF-062:** revisar como aprovado, aprovado com ressalva, ajustes solicitados ou rejeitado.
- **RF-063:** manter versões, comentários, responsáveis e datas.
- **RF-064:** converter recomendações de mentoria em ações do plano.

### 4.8 Mentorias

- **RF-070:** cadastrar mentor, especialidades, segmentos, disponibilidade e conflitos.
- **RF-071:** solicitar, aprovar, agendar, reagendar e cancelar sessões.
- **RF-072:** integrar com Google Calendar em fase posterior.
- **RF-073:** registrar objetivo, resumo, decisões, ações e feedbacks.
- **RF-074:** separar feedback compartilhado de avaliação restrita.

### 4.9 Indicadores

- **RF-080:** definir indicador, fórmula, unidade, periodicidade, fonte, meta e responsável.
- **RF-081:** registrar medições históricas e anexar evidências.
- **RF-082:** exibir evolução, meta versus realizado e alertas.
- **RF-083:** consolidar dados por startup, turma, programa e incubadora.

### 4.10 Camada metodológica e CERNE

- **RF-090:** cadastrar metodologias e elementos hierárquicos.
- **RF-091:** relacionar qualquer objeto a zero, um ou vários elementos metodológicos.
- **RF-092:** diferenciar vínculo principal, secundário, sugerido e validado.
- **RF-093:** mapear evidências operacionais para evidências de conformidade.
- **RF-094:** gerar painel de cobertura por prática, indicador, evidência e efetividade.

**Figura 1 — Ciclo integrado:** diagnóstico → prioridades → plano de ação → conteúdo formativo → entrega e evidência → validação → novo ciclo. Mentorias podem alimentar diagnóstico, prioridades e plano; indicadores acompanham metas e evolução. A validação não encerra o aprendizado: seus resultados realimentam o ciclo.

## 5. Regras de negócio

| Código | Regra                                                                                  |
| ------ | -------------------------------------------------------------------------------------- |
| RN-001 | Nenhum programa, atividade ou conteúdo exige vínculo obrigatório com CERNE.            |
| RN-002 | Diagnósticos aplicados permanecem vinculados à versão vigente no momento da aplicação. |
| RN-003 | Notas 3 e 4 podem exigir evidência conforme configuração da metodologia.               |
| RN-004 | N/A exige justificativa e pode exigir validação do gestor.                             |
| RN-005 | O score oficial usa a avaliação validada; a autodeclaração é preservada.               |
| RN-006 | A conclusão de conteúdo não equivale à validação da competência.                       |
| RN-007 | Uma ação do plano pode ter vários conteúdos e um conteúdo pode apoiar várias ações.    |
| RN-008 | Uma evidência operacional só é evidência de conformidade após mapeamento e validação.  |
| RN-009 | Arquivos confidenciais nunca devem ser expostos por link público permanente.           |
| RN-010 | A exclusão lógica é padrão; exclusão física segue política de retenção.                |
| RN-011 | Cada startup deve ter ao menos um representante ativo.                                 |
| RN-012 | Feedback restrito de mentor não é visível à startup sem autorização explícita.         |
| RN-013 | Graduação ou desligamento exige decisão registrada, justificativa e evidências.        |
| RN-014 | Mudanças em metas, prazos e notas devem gerar entrada de auditoria.                    |
| RN-015 | Uma atividade pode ser reprogramada sem apagar prazo ou justificativa original.        |

## 6. Arquitetura da solução

**Figura 2 — Arquitetura lógica:** usuários acessam a aplicação Next.js/Vercel. A aplicação usa Supabase Auth, PostgreSQL e Realtime, e media o acesso a arquivos grandes no Google Drive. Vercel Functions operam como BFF e camada de integração; Supabase Edge Functions executam jobs privilegiados e integrações externas. Observabilidade, segurança e automação são preocupações transversais.

### 6.1 Stack recomendada

| Camada            | Tecnologia                                       | Uso                                                                        |
| ----------------- | ------------------------------------------------ | -------------------------------------------------------------------------- |
| Frontend          | Next.js + TypeScript                             | App Router, Server Components, formulários, dashboards e rotas protegidas. |
| UI                | Tailwind CSS + biblioteca acessível              | Design system, responsividade e consistência.                              |
| Deploy            | Vercel                                           | CI/CD, previews, Functions, domínio e variáveis de ambiente.               |
| Banco             | Supabase PostgreSQL                              | Dados transacionais, JSONB configurável, views e funções SQL.              |
| Autenticação      | Supabase Auth                                    | Login por e-mail e OAuth; MFA opcional.                                    |
| Autorização       | Postgres RLS + RBAC                              | Segregação multi-tenant e acesso por escopo.                               |
| Backend           | Next.js Route Handlers + Supabase Edge Functions | BFF, integrações, ações privilegiadas e jobs.                              |
| Arquivos grandes  | Google Drive API                                 | Vídeos, fotos, PDFs e anexos grandes.                                      |
| Arquivos pequenos | Supabase Storage opcional                        | Avatares, logos e pequenos anexos de baixa criticidade.                    |
| Notificações      | E-mail transacional + jobs                       | Convites, prazos, revisões e alertas.                                      |
| Analytics         | Views/materialized views                         | Dashboards e consolidações.                                                |
| Observabilidade   | Vercel logs + tabelas de auditoria               | Erros, eventos e rastreabilidade.                                          |

### 6.2 Padrão de aplicação

- Frontend jamais utiliza chaves secretas do Supabase ou credenciais do Google.
- Leituras simples podem ocorrer diretamente pelo cliente Supabase, protegidas por RLS.
- Operações sensíveis passam por Server Actions/Route Handlers ou Edge Functions.
- Integrações externas usam uma camada de serviço com idempotência e auditoria.
- Dashboards complexos usam views SQL ou RPCs para reduzir múltiplas consultas.

### 6.3 Multi-tenancy

O modelo será shared database/shared schema com `organization_id` em todas as entidades de negócio. Políticas RLS validam a participação do usuário e o escopo do recurso. Dados agregados da plataforma só são acessíveis ao superadministrador por backend privilegiado.

## 7. Modelo de dados

### 7.1 Domínios e entidades

| Domínio                | Entidades principais                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| Identidade             | profiles, organizations, organization_memberships, incubators, teams, invitations                 |
| Programas              | program_types, programs, cohorts, program_members, startup_enrollments                            |
| Startups               | startups, startup_members, startup_metrics_profile, startup_history                               |
| Metodologias           | methodologies, methodology_versions, dimensions, criteria, rubric_levels                          |
| Diagnósticos           | assessments, assessment_responses, response_evidence, assessment_reviews, risks                   |
| Planos                 | action_plans, plan_priorities, plan_objectives, action_items, action_dependencies                 |
| Conteúdos              | contents, content_versions, content_tags, competencies, learning_collections, content_assignments |
| Atividades             | tasks, submissions, submission_versions, comments, reviews                                        |
| Mentorias              | mentors, mentor_skills, availability_slots, mentoring_sessions, mentoring_feedback                |
| Indicadores            | indicators, indicator_targets, indicator_measurements                                             |
| Arquivos               | files, file_versions, file_links, file_access_logs, retention_policies                            |
| Metodologias opcionais | methodology_elements, methodological_links, compliance_evidence                                   |
| Operação               | notifications, audit_logs, jobs, webhooks, integration_accounts                                   |

### 7.2 Tabelas nucleares

| Tabela               | Campos essenciais                                                       | Observações                      |
| -------------------- | ----------------------------------------------------------------------- | -------------------------------- |
| organizations        | id, name, slug, settings, status                                        | Tenant raiz.                     |
| incubators           | id, organization_id, name, timezone                                     | Unidade gestora.                 |
| programs             | id, incubator_id, type_id, name, dates, settings                        | Programa configurável.           |
| cohorts              | id, program_id, name, dates, status                                     | Turma/ciclo.                     |
| startups             | id, organization_id, name, legal_name, stage, sector                    | Empreendimento.                  |
| startup_enrollments  | startup_id, cohort_id, status, entry_date, exit_date                    | Histórico de participação.       |
| methodology_versions | id, methodology_id, version, status, published_at                       | Versão imutável após publicação. |
| criteria             | id, dimension_id, code, question, response_type, weight, rules          | Critério configurável.           |
| assessments          | id, startup_id, version_id, type, cycle, status                         | Instância de avaliação.          |
| assessment_responses | assessment_id, criterion_id, self_value, validated_value, justification | Resposta e validação.            |
| action_plans         | id, startup_id, period, origin, status                                  | Plano vigente ou histórico.      |
| action_items         | id, plan_id, title, owner_id, due_at, status, expected_result           | Ação operacional.                |
| contents             | id, organization_id, title, format, visibility, status                  | Registro lógico do conteúdo.     |
| content_assignments  | content_id, action_item_id, startup_id, requirement, status             | Integra conteúdo ao plano.       |
| files                | id, drive_file_id, mime_type, size, checksum, classification            | Metadados no Supabase.           |
| methodological_links | object_type, object_id, element_id, link_type, status                   | Relação opcional e genérica.     |

### 7.3 Exemplo de DDL simplificado

```sql
create table action_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  action_plan_id uuid not null references action_plans(id),
  title text not null,
  description text,
  owner_user_id uuid references auth.users(id),
  owner_startup_member_id uuid references startup_members(id),
  due_at timestamptz,
  status text not null check (status in (
    'not_started','in_progress','blocked','waiting_startup',
    'waiting_incubator','in_review','completed','cancelled'
  )),
  expected_result text,
  indicator_id uuid references indicators(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table action_items enable row level security;
```

### 7.4 Estratégia de versionamento

- Metodologia publicada não é editada; nova alteração cria `methodology_version`.
- Conteúdo pode ter versões; atribuições preservam a versão indicada.
- Entregas mantêm `submission_versions` para rastrear correções.
- Arquivos substituídos mantêm relação `file_versions`.
- Planos encerrados tornam-se somente leitura, salvo correção administrativa auditada.

## 8. APIs e contratos

### 8.1 Padrões

- APIs internas em `/api/v1`, JSON, datas ISO 8601 e IDs UUID.
- Erros padronizados com `code`, `message`, `details` e `request_id`.
- Operações mutáveis críticas usam `idempotency_key`.
- Paginação cursor-based em listas extensas.
- Validação de entrada com schemas TypeScript compartilhados.

| Método | Rota                               | Descrição                             |
| ------ | ---------------------------------- | ------------------------------------- |
| POST   | /api/v1/programs                   | Criar programa.                       |
| POST   | /api/v1/startups                   | Criar startup.                        |
| POST   | /api/v1/assessments                | Iniciar diagnóstico.                  |
| PATCH  | /api/v1/assessments/{id}/responses | Salvar respostas em lote.             |
| POST   | /api/v1/assessments/{id}/publish   | Concluir e publicar avaliação.        |
| POST   | /api/v1/action-plans               | Criar plano.                          |
| POST   | /api/v1/action-items               | Criar ação.                           |
| POST   | /api/v1/content-assignments        | Vincular conteúdo a ação/startup.     |
| POST   | /api/v1/submissions                | Enviar entrega.                       |
| POST   | /api/v1/files/upload-session       | Criar sessão de upload no Drive.      |
| POST   | /api/v1/files/{id}/complete        | Confirmar e validar upload.           |
| GET    | /api/v1/files/{id}/access          | Obter acesso autorizado ao arquivo.   |
| POST   | /api/v1/mentoring-sessions         | Agendar mentoria.                     |
| POST   | /api/v1/methodological-links       | Relacionar objeto a metodologia.      |
| GET    | /api/v1/dashboards/startup/{id}    | Dados agregados do painel da startup. |

### 8.2 Exemplo de resposta de erro

```json
{
  "error": {
    "code": "FORBIDDEN_RESOURCE_SCOPE",
    "message": "Usuário não possui acesso à startup informada.",
    "details": { "startup_id": "..." },
    "request_id": "req_..."
  }
}
```

## 9. Integração com Google Drive

### 9.1 Estratégia recomendada

Utilizar um Drive Compartilhado institucional e uma conta de integração controlada pela organização. O banco armazena `drive_file_id`, pasta, MIME type, tamanho, checksum, classificação, proprietário lógico, versão e relacionamentos. O Drive é o armazenamento físico; o Supabase é a fonte de verdade para autorização e contexto.

> Evitar links públicos permanentes. A autorização do app não deve depender exclusivamente das permissões nativas do Drive, pois os papéis e escopos do sistema são mais granulares.

### 9.2 Estrutura de pastas

```text
/PLATAFORMA
  /ORG_<uuid>
    /INSTITUCIONAL
    /PROGRAMAS/<program_id>/<cohort_id>
    /STARTUPS/<startup_id>
      /DOCUMENTOS
      /ENTREGAS
      /DIAGNOSTICOS
      /MENTORIAS
    /CONTEUDOS
    /EVIDENCIAS_CERNE
    /RELATORIOS
```

A estrutura física serve à administração e recuperação de desastre. A navegação principal do usuário deve ocorrer por metadados e relações no sistema, não por pastas.

### 9.3 Fluxo de upload

1. O cliente solicita sessão informando nome, MIME type, tamanho, finalidade e recurso relacionado.
2. O backend verifica autorização e cria registro `files` com status `pending`.
3. O backend solicita ao Drive uma sessão de upload resumível e retorna apenas a URL temporária da sessão.
4. O navegador envia o arquivo em partes diretamente à sessão, exibindo progresso e permitindo retomada.
5. Após conclusão, o cliente chama `/complete`; o backend consulta metadados no Drive, valida tamanho/MIME e marca `available`.
6. O sistema cria `file_link` com o objeto de negócio e grava auditoria.

**Figura 3 — Upload resumível:** seleção do arquivo → autorização e criação da sessão → registro pendente no Supabase → envio em partes ao Drive → validação por webhook/polling → metadados e permissões lógicas → acesso mediado → auditoria → expiração/exclusão/retenção.

### 9.4 Download e visualização

- O cliente solicita acesso ao arquivo por ID interno.
- O backend valida RLS/escopo e registra o acesso.
- Para conteúdo visualizável, o backend pode retornar URL temporária/proxy controlado.
- Para arquivos altamente confidenciais, usar streaming pelo backend ou cópia temporária com expiração.
- Miniaturas e previews podem ser gerados de forma assíncrona.

### 9.5 Limites e contingências

- Implementar upload resumível, retry exponencial e reconciliação de uploads pendentes.
- Respeitar cotas de API e limites diários do Google Workspace.
- Configurar política para tamanho máximo por tipo e por organização.
- Caso upload direto à sessão resumível apresente restrições de CORS ou confiabilidade, mover o serviço de upload para Cloud Run sem alterar o restante da arquitetura.
- Arquivos não devem ser considerados disponíveis antes da validação de metadados.

## 10. Segurança e privacidade

### 10.1 Controles obrigatórios

| Área         | Controle                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| Autenticação | Supabase Auth, verificação de e-mail, MFA para administradores, proteção de sessão.                   |
| Autorização  | RLS em todas as tabelas expostas; funções `SECURITY DEFINER` mínimas e revisadas.                     |
| Segredos     | Somente em Vercel/Supabase secrets; nunca no cliente ou repositório.                                  |
| Google       | Credenciais com menor privilégio, rotação e acesso apenas ao Drive Compartilhado necessário.          |
| Arquivos     | Classificação, validação de MIME/tamanho, antivírus em fase posterior, sem links públicos padrão.     |
| Auditoria    | Registro de login, visualização de dados sensíveis, downloads, alterações de nota, prazo e permissão. |
| LGPD         | Base legal, consentimentos quando necessários, exportação, correção, anonimização e retenção.         |
| Backup       | Backups do Postgres e exportação periódica de metadados; política de recuperação do Drive.            |
| Aplicação    | CSP, CSRF, rate limiting, validação de entrada, proteção contra XSS e SSRF.                           |
| Privacidade  | Feedback restrito e dados financeiros com permissões explícitas.                                      |

### 10.2 Exemplo conceitual de RLS

```sql
create policy "members can read startups in their organization"
on startups for select
using (
  exists (
    select 1
    from organization_memberships om
    where om.organization_id = startups.organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  )
);
```

### 10.3 Classificação da informação

| Classe       | Exemplos                                                | Acesso                                     |
| ------------ | ------------------------------------------------------- | ------------------------------------------ |
| Pública      | Portfólio autorizado, notícias, casos divulgados        | Sem autenticação.                          |
| Interna      | Materiais de programa, cronogramas, conteúdos           | Usuários do escopo.                        |
| Confidencial | Diagnósticos, planos, entregas e feedbacks              | Startup e equipe autorizada.               |
| Restrita     | Caixa, cap table, contratos, pareceres e dados pessoais | Permissão explícita e auditoria reforçada. |

## 11. Requisitos não funcionais

| Código  | Requisito        | Meta inicial                                                                         |
| ------- | ---------------- | ------------------------------------------------------------------------------------ |
| RNF-001 | Disponibilidade  | 99,5% mensal, excluindo dependências externas.                                       |
| RNF-002 | Desempenho       | P95 < 2,5 s para páginas comuns; dashboards < 5 s.                                   |
| RNF-003 | Escalabilidade   | Suportar 100 organizações, 10 mil startups e 100 mil atividades sem redesenho.       |
| RNF-004 | Acessibilidade   | WCAG 2.2 AA nas jornadas principais.                                                 |
| RNF-005 | Responsividade   | Uso completo em desktop e jornadas essenciais em celular.                            |
| RNF-006 | Consistência     | Operações críticas transacionais; jobs idempotentes.                                 |
| RNF-007 | Recuperação      | RPO 24h e RTO 8h no MVP; melhorar conforme criticidade.                              |
| RNF-008 | Auditoria        | Retenção mínima de logs de negócio por 24 meses, configurável.                       |
| RNF-009 | Segurança        | Nenhuma tabela sensível acessível sem RLS e teste automatizado.                      |
| RNF-010 | Manutenibilidade | TypeScript estrito, migrations versionadas e cobertura de testes do domínio crítico. |

## 12. Experiência do usuário

### 12.1 Navegação principal

- Painel: agenda, alertas, pendências e visão resumida.
- Programas: programas, turmas, trilhas e participantes.
- Startups: perfil, equipe, diagnóstico, plano, indicadores e documentos.
- Desenvolvimento: biblioteca, atividades, entregas e mentorias.
- Gestão: metodologias, CERNE opcional, evidências, indicadores e relatórios.
- Administração: usuários, permissões, integrações e configurações.

### 12.2 Painel da startup

| Bloco         | Conteúdo                                                         |
| ------------- | ---------------------------------------------------------------- |
| Situação      | Programa, estágio, agente responsável, riscos e próxima reunião. |
| Evolução      | Radar, linha histórica, gap de percepção e progresso do ciclo.   |
| Plano         | Prioridades, ações, prazos, bloqueios e progresso.               |
| Minha jornada | Conteúdos, atividades e mentorias recomendados.                  |
| Indicadores   | KPIs, metas e última atualização.                                |
| Pendências    | Entregas, documentos e feedbacks aguardando ação.                |

### 12.3 Estados de conteúdo no plano

`Acessado → Concluído → Aplicado → Entregue → Validado`

O sistema deve deixar visualmente claro que “concluído” não significa que a ação de negócio foi concluída.

## 13. Observabilidade e operação

- Logs estruturados com `request_id`, `user_id`, `organization_id` e `action`.
- Tabela `audit_logs` para eventos de negócio relevantes.
- Monitoramento de erros do frontend e backend.
- Painel de jobs: pendente, executando, concluído, falhou e retentativas.
- Alertas para uploads órfãos, notificações falhas, integrações expiradas e jobs atrasados.
- Reconciliação diária entre `files` no Supabase e arquivos no Drive.
- Métricas de produto: usuários ativos, diagnósticos concluídos, ações concluídas e conteúdos aplicados.

### 13.1 Jobs programados

| Job                    | Periodicidade  | Função                                                       |
| ---------------------- | -------------- | ------------------------------------------------------------ |
| Lembretes de prazo     | Diário         | Notificar ações e entregas próximas do vencimento.           |
| Alertas de inatividade | Semanal        | Identificar startup sem atualização ou acesso.               |
| Reconciliar Drive      | Diário         | Validar uploads pendentes e arquivos removidos externamente. |
| Atualizar visões       | Horário/diário | Atualizar materialized views de dashboards.                  |
| Retenção               | Diário         | Processar exclusões e arquivamentos aprovados.               |
| Relatório de gestão    | Mensal         | Consolidar execução, indicadores e riscos.                   |

## 14. Estratégia de testes

| Tipo           | Escopo                                                                          |
| -------------- | ------------------------------------------------------------------------------- |
| Unitário       | Regras de pontuação, status, permissões, cálculos de progresso e recomendações. |
| Integração     | Banco, RLS, APIs, Supabase Auth e Drive API.                                    |
| Contrato       | Schemas das APIs e webhooks.                                                    |
| E2E            | Login, cadastro, diagnóstico, plano, conteúdo, entrega, revisão e relatório.    |
| Segurança      | Testes de tenant isolation, escalonamento de privilégio e acesso a arquivo.     |
| Carga          | Listas, dashboards, importações e múltiplos uploads.                            |
| Acessibilidade | Navegação por teclado, contraste, labels e leitores de tela.                    |
| Recuperação    | Falha durante upload, job duplicado, retry e restauração.                       |

### 14.1 Cenários críticos

1. Usuário de uma organização tenta acessar startup de outra organização.
2. Membro da startup tenta ver feedback restrito do mentor.
3. Upload é interrompido e retomado.
4. Metodologia é atualizada após diagnóstico aplicado.
5. Conteúdo é substituído após ser atribuído a uma ação.
6. Ação é reprogramada e o histórico precisa permanecer.
7. Arquivo é removido no Drive fora do sistema.
8. Job de notificação é executado duas vezes.

## 15. Implantação e ambientes

### 15.1 Ambientes

| Ambiente        | Vercel          | Supabase             | Google Drive                        |
| --------------- | --------------- | -------------------- | ----------------------------------- |
| Desenvolvimento | Local/branch    | Projeto local ou dev | Pasta/Drive de testes.              |
| Homologação     | Preview/staging | Projeto staging      | Drive Compartilhado de homologação. |
| Produção        | Production      | Projeto production   | Drive Compartilhado institucional.  |

### 15.2 Variáveis de ambiente

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
GOOGLE_PROJECT_ID=
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHARED_DRIVE_ID=
GOOGLE_ROOT_FOLDER_ID=
APP_BASE_URL=
CRON_SECRET=
EMAIL_PROVIDER_API_KEY=
ENCRYPTION_KEY= # quando aplicável
```

As chaves elevadas e credenciais Google devem existir somente em componentes de backend. Variáveis sensíveis devem usar o mecanismo de segredos do ambiente.

### 15.3 CI/CD

1. Pull request executa lint, type-check, testes unitários e valida migrations.
2. Preview deployment usa banco de homologação ou dados isolados.
3. Merge na branch principal executa migrations controladas e deploy de produção.
4. Após deploy, smoke tests validam login, dashboard e API de saúde.
5. Rollback da aplicação não deve depender de rollback destrutivo do banco.

## 16. Migração e dados iniciais

- Importar startups e equipes por CSV com validação e relatório de erros.
- Converter a planilha de diagnóstico atual em uma metodologia versionada inicial.
- Importar diagnósticos históricos quando houver correspondência confiável de critérios.
- Criar biblioteca inicial de conteúdos e templates.
- Carregar estrutura CERNE como pacote opcional, desabilitado por padrão.
- Migrar arquivos existentes para Drive Compartilhado e registrar metadados no Supabase.
- Preservar origem, data e responsável de todos os registros importados.

### 16.1 Seed inicial recomendado

- Tipos de programa: pré-incubação, incubação, aceleração, pós-incubação e inovação aberta.
- Status padronizados para ações, entregas, conteúdos, mentorias e arquivos.
- Eixos: estratégia, produto, mercado, tração, finanças, equipe, jurídico/PI, operações/impacto.
- Competências iniciais: ICP, validação, vendas B2B, precificação, fluxo de caixa, LGPD e pitch.
- Papéis e conjuntos de permissões.

## 17. Backlog e roadmap

### 17.1 Fase 0 — Fundação técnica

- Monorepo/repositório, ambientes, design system, Auth, tenancy, RLS, auditoria e CI/CD.

### 17.2 MVP — Acompanhamento do incubado

- Organizações, incubadoras, programas, turmas, startups e equipes.
- Metodologia configurável, autodiagnóstico e diagnóstico validado.
- Plano de ação, atividades, entregas e comentários.
- Biblioteca formativa integrada ao plano.
- Indicadores básicos, dashboard e notificações.
- Google Drive para arquivos grandes.

### 17.3 Fase 2 — Mentorias e gestão metodológica

- Mentores, agenda, sessões, feedback e recomendações.
- Graduação e alumni.
- Camada CERNE, evidências, efetividade e aprendizados.
- Relatórios consolidados e alertas avançados.

### 17.4 Fase 3 — Operação ampliada

- Processo seletivo, contratação e documentos.
- Infraestrutura, reservas, benefícios e serviços.
- Banco de oportunidades, parceiros e serviços externos.
- Avaliação de impacto e portfólio público.

### 17.5 Fase 4 — Inteligência e escala

- Recomendação automática de conteúdos, mentores e ações.
- Busca semântica em conteúdos e evidências.
- Resumos de mentorias e relatórios assistidos por IA.
- Benchmarking anonimizado entre carteiras, condicionado a governança de dados.
- Modelo SaaS com planos, quotas e faturamento.

## 18. Critérios de aceite do MVP

| Código | Critério                                                                                       |
| ------ | ---------------------------------------------------------------------------------------------- |
| CA-001 | Administrador cria incubadora, programa e turma sem intervenção técnica.                       |
| CA-002 | Startup é cadastrada, vinculada à turma e acessada apenas por usuários autorizados.            |
| CA-003 | Gestor publica metodologia e startup conclui autodiagnóstico.                                  |
| CA-004 | Avaliador valida notas e o sistema exibe comparação e radar.                                   |
| CA-005 | Plano de ação é criado com ações, responsáveis, prazos e indicadores.                          |
| CA-006 | Conteúdo formativo é atribuído a uma ação como obrigatório/recomendado.                        |
| CA-007 | Startup conclui conteúdo, envia entrega e gestor aprova ou solicita ajustes.                   |
| CA-008 | Arquivo grande é enviado ao Drive, vinculado ao registro e acessível apenas no escopo correto. |
| CA-009 | Dashboard mostra progresso, atrasos, riscos e evolução histórica.                              |
| CA-010 | Auditoria registra mudanças de nota, prazo, permissão e acesso a arquivo restrito.             |
| CA-011 | Teste automatizado comprova isolamento entre duas organizações.                                |
| CA-012 | Vínculo CERNE é opcional e sua ausência não bloqueia nenhuma jornada operacional.              |

## 19. Riscos e decisões em aberto

| Risco/decisão                      | Impacto                                              | Tratamento recomendado                                                      |
| ---------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| Drive como armazenamento primário  | Permissões e quotas podem divergir da lógica do app. | Drive Compartilhado, metadados no Supabase, reconciliação e acesso mediado. |
| Upload grande via Vercel           | Funções têm limites de duração/corpo.                | Upload resumível direto; Cloud Run como contingência.                       |
| Excesso de configuração            | Gestores podem se perder em muitas opções.           | Templates, defaults, assistentes e permissões por maturidade.               |
| Diagnóstico excessivamente extenso | Baixa adesão e dados ruins.                          | Instrumentos por estágio e monitoramento leve entre diagnósticos completos. |
| CERNE virar burocracia             | Rejeição do sistema.                                 | Camada opcional, mapeamento automático e validação posterior.               |
| Dados financeiros sensíveis        | Risco reputacional e LGPD.                           | Permissão explícita, logs e classificação restrita.                         |
| Conteúdo sem aplicação             | Métrica de vaidade.                                  | Estados aplicado/validado e entregável obrigatório quando necessário.       |
| Dependência de serviços externos   | Indisponibilidade ou mudanças de API.                | Abstrações, retries, filas e monitoramento.                                 |
| Modelo multi-tenant complexo       | Vazamento entre organizações.                        | RLS, testes de isolamento e revisão de segurança antes do piloto.           |

### 19.1 Decisões a confirmar antes da sprint 1

1. Nome comercial e identidade da plataforma.
2. Primeira organização piloto e número estimado de usuários/startups.
3. Método de login: e-mail, Google institucional ou ambos.
4. Tamanho máximo de arquivo e política de retenção.
5. Google Workspace/Drive Compartilhado disponível para produção.
6. Periodicidade padrão de diagnóstico e acompanhamento.
7. Dados que startups poderão ocultar de mentores e patrocinadores.
8. Escopo exato do MVP: mentorias entram ou ficam para a fase 2.
9. Integrações de e-mail e calendário escolhidas.
10. Política de propriedade e portabilidade dos dados.

## 20. Referências

- Manual CERNE Consolidado I e II — Incubadora do Semiárido/IFSertãoPE, 2026.
- Vercel Documentation — Next.js deployment, environment variables and Cron Jobs.
- Supabase Documentation — Architecture, Auth, Postgres, Row Level Security, API keys and Edge Functions.
- Google Drive API Documentation — uploads, shared drives, permissions, file management and usage limits.

> Limites, planos e recursos de serviços externos devem ser conferidos novamente no início da implementação e antes do lançamento em produção.

## Apêndice A — Histórias de usuário prioritárias

| ID    | História                                                                                             |
| ----- | ---------------------------------------------------------------------------------------------------- |
| US-01 | Como gestor, quero criar um programa e uma turma para organizar uma edição sem suporte técnico.      |
| US-02 | Como startup, quero responder ao autodiagnóstico e anexar evidências para demonstrar minha situação. |
| US-03 | Como agente, quero validar notas e definir prioridades para orientar a intervenção.                  |
| US-04 | Como gestor, quero converter prioridades em plano de ação com responsáveis, prazos e KPIs.           |
| US-05 | Como startup, quero acessar conteúdos diretamente na ação que preciso executar.                      |
| US-06 | Como startup, quero enviar a aplicação prática e receber feedback.                                   |
| US-07 | Como gestor, quero visualizar startups em risco e ações atrasadas.                                   |
| US-08 | Como mentor, quero registrar recomendações e transformá-las em ações.                                |
| US-09 | Como administrador, quero mapear registros a práticas CERNE sem tornar isso obrigatório.             |
| US-10 | Como auditor, quero localizar evidências por prática, período e status.                              |
| US-11 | Como gestor, quero acompanhar indicadores agregados do programa.                                     |
| US-12 | Como usuário autorizado, quero enviar e acessar arquivos grandes com segurança.                      |

## Apêndice B — Definition of Done

- Requisito implementado e revisado por pares.
- Testes unitários e de integração aprovados.
- RLS criada e testada para operações de leitura e escrita.
- Eventos de auditoria definidos quando aplicável.
- Estados vazio, carregando, erro e sucesso tratados.
- Interface acessível por teclado e responsiva.
- Documentação da API e migration atualizadas.
- Critérios de aceite validados em homologação.
- Sem segredos expostos no cliente ou repositório.
- Monitoramento e tratamento de falha definidos.
