# Plano de implementação

## 1. Objetivo

Construir a fundação técnica da Plataforma de Gestão de Incubadoras descrita no [SDD](./SDD.md), sem implementar prematuramente os módulos completos de diagnóstico, plano, conteúdos, atividades, mentorias ou indicadores.

Este plano nasceu na Fase A. O Marco 1 foi implementado em 02/08/2026; os marcos seguintes permanecem no estado indicado abaixo.

## 2. Marcos

| Marco | Resultado                                                          | Estado                                             |
| ----- | ------------------------------------------------------------------ | -------------------------------------------------- |
| M0    | Requisitos, arquitetura, decisões, lacunas e plano versionados     | Concluído nesta etapa                              |
| M1    | Scaffold Next.js, qualidade, design system e shell público/privado | Concluído em 02/08/2026                            |
| M2    | Autenticação completa e perfil seguro                              | Concluído em 02/08/2026                            |
| M3    | Fundação multi-tenant, RBAC, RLS e auditoria                       | Bloqueado por B-01/B-02                            |
| M4    | Contratos de arquivos/Drive e shell privado integrado              | Planejado; integração real bloqueada por B-03/B-04 |
| M5    | Segurança, testes cross-tenant, CI e readiness para deploy         | Planejado                                          |
| M6    | Primeiro módulo vertical do MVP                                    | Fora desta etapa; selecionar depois                |

## 3. Sequência de implementação

### M0 — Análise e arquitetura

**Entregas**

- SDD transcrito para Markdown.
- Arquitetura proposta.
- Decisões arquiteturais.
- Suposições, lacunas e perguntas bloqueantes.
- Plano de integração Google Drive.
- Backlog, dependências, riscos e critérios de aceite.

**Critérios de aceite**

- Todo RF, RN, RNF, critério de aceite e história do DOCX está preservado em `docs/SDD.md`.
- CERNE está documentado como opcional.
- Multi-tenancy, RLS e Drive têm estratégias explícitas.
- Ambiguidades não foram resolvidas silenciosamente.
- Nenhuma implementação ampla foi iniciada.

### M1 — Scaffold, qualidade e shell

**Objetivo:** aplicação executável, sem regras de negócio inventadas.

**Tarefas técnicas**

1. Inicializar Next.js App Router com TypeScript strict e pnpm.
2. Fixar versões e versionar lockfile.
3. Configurar aliases, `tsconfig`, ESLint, Prettier e ordenação de imports.
4. Instalar/configurar Tailwind CSS e tokens da Incubadora Sertão Maker.
5. Escolher primitivas acessíveis e documentar customizações.
6. Criar validação Zod de variáveis de ambiente.
7. Criar `.env.example` sem valores reais.
8. Configurar Vitest, Testing Library e Playwright; preparar testes SQL/RLS.
9. Criar layouts público, autenticação e privado.
10. Criar `error.tsx`, `global-error.tsx`, `loading.tsx` e `not-found.tsx`.
11. Criar sidebar, header e responsividade básica.
12. Criar itens de menu solicitados e placeholders claramente marcados.
13. Criar dashboard demonstrativo com rótulo “dados fictícios”.
14. Preparar scripts de `lint`, `format:check`, `typecheck`, `test`, `test:e2e`, `test:rls` e `build`.

**Critérios de aceite**

- Aplicação inicia e compila em modo strict sem `any` explícito injustificado.
- Rotas públicas/privadas e estados globais existem.
- Navegação por teclado, foco visível e landmarks semânticos funcionam.
- Dashboard não confunde dados fictícios com dados reais.
- `.env.example` contém somente nomes e descrições.
- Lint, formatter, typecheck, unitários e build passam.

### M2 — Autenticação e perfis

**Objetivo:** identidade verificada no servidor e sessão segura.

**Tarefas técnicas**

1. Instalar versões fixas de `@supabase/supabase-js` e `@supabase/ssr`.
2. Implementar clientes browser/server e renovação de cookie conforme docs vigentes.
3. Criar login por e-mail/senha com Zod + React Hook Form.
4. Criar Google OAuth e callback com validação de destino.
5. Criar recuperação e redefinição de senha.
6. Criar logout servidor/cliente conforme sessão.
7. Criar migration `profiles` e função/trigger mínima para novo usuário.
8. Revogar privilégios indevidos da função e testar falha/sucesso.
9. Proteger área privada no servidor.
10. Criar páginas de erro de autenticação sem vazamento de detalhes.
11. Adicionar testes de sessão, callback, recuperação, logout e profile provisioning.

**Critérios de aceite**

- E-mail/senha e Google funcionam em ambiente de teste.
- Rotas privadas rejeitam usuário não autenticado.
- Perfil é criado uma única vez e não usa metadata editável para autorização.
- Nenhuma secret key aparece no bundle do cliente.
- Sessão expirada é renovada ou redirecionada de forma previsível.
- Testes e build passam.

**Resultado:** implementado em 02/08/2026. Os fluxos e a proteção foram validados localmente; a conclusão real de Google OAuth e entrega de e-mail depende da configuração externa de provider, redirects e SMTP do ambiente. Evidências em [MARCO_2_IMPLEMENTATION.md](./MARCO_2_IMPLEMENTATION.md).

### M3 — Tenancy, RBAC, RLS e auditoria

**Objetivo:** isolamento comprovado antes de qualquer módulo de negócio.

**Pré-requisitos:** respostas B-01 e B-02.

**Tarefas técnicas**

1. Criar migration de enums estáveis e schemas privado/público.
2. Criar `organizations`.
3. Criar `organization_units` e/ou `incubators` conforme decisão B-01.
4. Criar `organization_memberships` com status e unicidade.
5. Criar `permissions`, `roles`, `role_permissions`, `role_assignments`.
6. Criar `invitations` com token hasheado, expiração, uso único e auditoria.
7. Criar `user_preferences` e seleção de tenant sem valor de segurança.
8. Criar `platform_admins` no schema apropriado e bootstrap controlado.
9. Criar helpers privados de associação/permissão, se necessários.
10. Habilitar RLS e policies CRUD em todas as tabelas expostas.
11. Revogar grants de schemas/tabelas não expostos.
12. Criar constraints contra relações cross-tenant.
13. Criar índices tenant-first e justificar cada índice adicional.
14. Criar `audit_logs` append-only e eventos mínimos.
15. Criar seed sintético com duas organizações, usuários e papéis.
16. Criar testes SQL/integração para toda a matriz cross-tenant.
17. Executar advisors de segurança/desempenho e corrigir achados.

**Critérios de aceite**

- Usuário A não consegue ler nem mutar dados de B por nenhuma operação testada.
- Usuário suspenso perde acesso.
- Mudança de `organization_id` é rejeitada.
- Policies têm `USING`/`WITH CHECK` adequados.
- `anon` não acessa tabelas de negócio.
- Superadmin funciona somente pelo caminho privilegiado definido.
- Toda policy está documentada junto à migration ou catálogo de políticas.
- Seed não contém dados reais.
- Migrations do zero, testes RLS e advisors passam.

### M4 — Contratos de arquivos e shell tenant-aware

**Objetivo:** preparar a integração sem implementar upload completo antes do spike.

**Tarefas técnicas**

1. Criar interface `LargeFileStorageService` e implementação fake.
2. Criar schemas Zod de sessão, conclusão e acesso.
3. Criar migrations de `files`, `file_versions`, `file_links`, `file_access_logs`, `upload_sessions`.
4. Implementar RLS e constraints tenant-aware para metadados.
5. Criar estados e máquina de transição de arquivo.
6. Criar rotas como stubs seguros ou behind feature flag, sem credenciais reais.
7. Criar testes de falha parcial usando fake.
8. Realizar spike Google Drive no ambiente de teste após B-03/B-04.
9. Registrar decisão sobre CORS, retomada, preview, streaming e Cloud Run.
10. Integrar organização ativa ao shell e dashboard.
11. Exibir placeholders por módulo, permissões e feature flags.

**Critérios de aceite**

- Domínio compila e testa sem SDK Google.
- Nenhum arquivo é marcado `available` sem validação final.
- Metadados cross-tenant são inacessíveis.
- Rotas não aceitam `provider_file_id`/URL como prova de acesso.
- Falhas parciais têm estado retentável.
- Spike está documentado antes de ativar upload real.

### M5 — Hardening, CI e deploy readiness

**Objetivo:** fundação segura e repetível.

**Tarefas técnicas**

1. Configurar CI para install frozen, lint, format, typecheck, unit, integration, RLS e build.
2. Validar migrations em banco limpo.
3. Criar smoke tests de login, seleção de tenant e dashboard.
4. Executar auditoria de acessibilidade do shell.
5. Revisar CSP, CSRF, rate limiting, headers e proteção de callbacks.
6. Revisar bundles e logs para segredos.
7. Criar health/readiness endpoints sem dados sensíveis.
8. Documentar variáveis por ambiente e runbook de deploy.
9. Configurar Vercel preview/staging sem acesso à produção.
10. Executar revisão final de segurança e registrar riscos aceitos.

**Critérios de aceite**

- Pipeline bloqueia qualquer falha.
- Deploy preview e staging funcionam com dados sintéticos.
- WCAG 2.2 AA básica é verificada nas jornadas de auth/shell.
- Nenhum segredo aparece em Git, bundle ou output de teste.
- Testes cross-tenant passam de forma reprodutível.
- Pendências conhecidas estão documentadas; nenhuma falha é declarada como sucesso.

## 4. Backlog por épico, histórias e tarefas

### ÉPICO E0 — Engenharia de plataforma

#### História E0-US1 — Scaffold reprodutível

Como equipe de engenharia, queremos instalar e executar o projeto de forma determinística.

**Tarefas**

- E0-T1: scaffold Next.js App Router strict.
- E0-T2: lockfile e engines.
- E0-T3: scripts de qualidade.
- E0-T4: `.env.example` e validação Zod.
- E0-T5: README de setup.

#### História E0-US2 — Pipeline de qualidade

Como mantenedor, quero impedir merge com falhas.

**Tarefas**

- E0-T6: lint/format/typecheck.
- E0-T7: unit/integration/build.
- E0-T8: validação de migrations.
- E0-T9: cache e artefatos de falha sem segredos.

### ÉPICO E1 — Design system e shell

#### História E1-US1 — Tema Sertão Maker

Como usuário, quero reconhecer a identidade visual institucional.

**Tarefas**

- E1-T1: tokens de cor/tipografia/spacing.
- E1-T2: contraste e foco.
- E1-T3: logo/ativos provisórios.
- E1-T4: documentação de componentes.

#### História E1-US2 — Navegação responsiva

Como usuário autenticado, quero navegar pelos módulos previstos.

**Tarefas**

- E1-T5: sidebar desktop/drawer mobile.
- E1-T6: header e seletor de organização.
- E1-T7: menu e permissões.
- E1-T8: 404/loading/error/empty.
- E1-T9: dashboard demo rotulado.

### ÉPICO E2 — Identidade e autenticação

#### História E2-US1 — Login e sessão

Como usuário, quero entrar com e-mail/senha ou Google e manter sessão segura.

**Tarefas**

- E2-T1: clientes Supabase SSR.
- E2-T2: formulário e-mail/senha.
- E2-T3: Google OAuth/callback.
- E2-T4: renovação/proteção.
- E2-T5: logout.

#### História E2-US2 — Recuperação

Como usuário, quero recuperar minha conta com segurança.

**Tarefas**

- E2-T6: solicitação de recuperação.
- E2-T7: callback e nova senha.
- E2-T8: estados de erro/expiração.

#### História E2-US3 — Perfil seguro

Como sistema, quero um perfil mínimo para cada identidade autenticada.

**Tarefas**

- E2-T9: tabela/policies.
- E2-T10: trigger endurecido.
- E2-T11: testes e reparo idempotente.

### ÉPICO E3 — Tenancy e autorização

#### História E3-US1 — Organizações e unidades

Como superadmin autorizado, quero criar a estrutura do tenant.

**Tarefas**

- E3-T1: resolver B-01.
- E3-T2: migrations e constraints.
- E3-T3: rotas/contexto por slug.
- E3-T4: seleção/preferência.

#### História E3-US2 — Memberships e convites

Como admin da organização, quero convidar usuários e controlar status.

**Tarefas**

- E3-T5: memberships.
- E3-T6: convite hasheado/expirável.
- E3-T7: aceite idempotente.
- E3-T8: suspensão/remoção auditada.

#### História E3-US3 — Papéis e permissões

Como admin, quero atribuir capacidades por escopo.

**Tarefas**

- E3-T9: catálogo de permissions.
- E3-T10: roles/role_permissions.
- E3-T11: role_assignments com FKs.
- E3-T12: helpers de autorização.

#### História E3-US4 — Isolamento comprovado

Como responsável de segurança, quero prova automatizada de tenant isolation.

**Tarefas**

- E3-T13: policies CRUD.
- E3-T14: grants/schemas.
- E3-T15: seed A/B.
- E3-T16: testes positivos/negativos.
- E3-T17: advisors e revisão manual.

### ÉPICO E4 — Arquivos grandes

#### História E4-US1 — Metadados e estados

Como sistema, quero rastrear arquivos sem usar Drive como banco de metadados.

**Tarefas**

- E4-T1: files/versions/links/access logs.
- E4-T2: upload sessions.
- E4-T3: state machine.
- E4-T4: RLS e auditoria.

#### História E4-US2 — Serviço desacoplado

Como engenheiro, quero trocar o provedor sem contaminar o domínio.

**Tarefas**

- E4-T5: interface.
- E4-T6: fake.
- E4-T7: adapter Drive.
- E4-T8: testes de contrato.

#### História E4-US3 — Falhas parciais

Como operador, quero recuperar uploads e exclusões incompletas.

**Tarefas**

- E4-T9: idempotência.
- E4-T10: reconciliação.
- E4-T11: trash/restore/purge.
- E4-T12: alertas operacionais.

### ÉPICO E5 — Auditoria e observabilidade

#### História E5-US1 — Eventos auditáveis

Como auditor, quero rastrear mudanças sensíveis.

**Tarefas**

- E5-T1: modelo append-only.
- E5-T2: catálogo de eventos.
- E5-T3: request correlation.
- E5-T4: retenção e acesso.

#### História E5-US2 — Erros operáveis

Como suporte, quero diagnosticar falhas sem expor dados sensíveis.

**Tarefas**

- E5-T5: erro padronizado.
- E5-T6: logging sanitizado.
- E5-T7: health/readiness.
- E5-T8: alertas de jobs/integrações.

## 5. Backlog posterior por domínio

Esses épicos preservam o roadmap, mas não serão iniciados na fundação:

- E6 Programas e turmas.
- E7 Startups e equipes.
- E8 Metodologias genéricas e diagnósticos versionados.
- E9 Planos de ação, prioridades e dependências.
- E10 Atividades, entregas, comentários e revisão.
- E11 Biblioteca formativa e ligação muitos-para-muitos com ações.
- E12 Indicadores e dashboards reais.
- E13 Notificações básicas.
- E14 Mentorias (Fase 2).
- E15 Graduação e alumni (Fase 2).
- E16 CERNE opcional e conformidade (Fase 2).
- E17 Seleção/contratação (Fase 3).
- E18 Infraestrutura/benefícios (Fase 3).

## 6. Dependências

### 6.1 Decisões de produto

- Hierarquia organização/unidade/incubadora.
- Governança do superadmin.
- Domínios aceitos no Google login.
- Política de convites e criação de tenant.
- Volume do piloto e papéis mínimos.

### 6.2 Infraestrutura

- Projeto Supabase por ambiente.
- Projeto Vercel e callbacks OAuth.
- Google Cloud project, Drive API, Shared Drive e conta de serviço.
- Domínio e remetente de e-mail.
- Gestão de secrets e responsáveis por rotação.

### 6.3 Governança

- Matriz de classificação e acesso.
- Política LGPD, retenção e portabilidade.
- Definição de dados restritos por papel.
- Aprovação da identidade visual.

## 7. Riscos técnicos

| Risco                             |       Prob. | Impacto | Mitigação                                              | Gate                  |
| --------------------------------- | ----------: | ------: | ------------------------------------------------------ | --------------------- |
| Vazamento cross-tenant            |       Média | Crítico | RLS, FKs tenant-aware, seed A/B, testes CRUD e revisão | Antes de piloto       |
| Recursão/performance em policies  |       Média |    Alto | Helpers mínimos, `EXPLAIN`, índices e advisors         | M3                    |
| Trigger de perfil bloquear signup | Baixa/Média |    Alto | Função mínima, teste e reparo idempotente              | M2                    |
| Service role no cliente           |       Baixa | Crítico | validação env, imports server-only, scan de bundle     | Todo marco            |
| URL do Drive virar autorização    |       Média | Crítico | ID interno, endpoint mediado e auditado                | M4                    |
| Falha parcial Drive/DB            |        Alta |    Alto | state machine, idempotência e reconciliação            | M4                    |
| CORS/retomada do upload           |       Média |    Alto | spike e contingência Cloud Run                         | Antes do adapter real |
| Quotas/limites externos           |       Média |    Alto | backoff, métricas e políticas por tenant               | M4/M5                 |
| Preview acessar produção          | Baixa/Média | Crítico | ambientes separados e CI                               | M5                    |
| Soft delete quebrar unicidade     |       Média |   Médio | índices parciais e política por agregado               | Cada migration        |
| Papéis genéricos demais           |       Média |    Alto | catálogo granular e escopo explícito                   | M3                    |
| CERNE contaminar núcleo           |       Média |    Alto | módulo opcional, zero FKs obrigatórias                 | Revisão por marco     |
| UI fictícia parecer real          |       Média |   Médio | rótulo demo e isolamento de mocks                      | M1                    |
| Mudança de APIs/pacotes           |       Média |   Médio | versões fixas, docs atuais e lockfile                  | M1+                   |
| Ausência de política LGPD         |       Média |    Alto | coletar mínimo e bloquear automações irreversíveis     | Antes do piloto       |

## 8. Qualidade e Definition of Done por etapa

Uma etapa só é concluída quando:

- requisitos e critérios correspondentes estão rastreados;
- lint, format check, typecheck, testes e build passam;
- migration sobe em banco limpo e policies são testadas;
- nenhum `any`, secret ou autorização exclusivamente de frontend foi introduzido;
- acessibilidade e estados de UI foram verificados;
- decisões e riscos novos foram documentados;
- resultado real dos testes foi registrado;
- falhas conhecidas não foram escondidas.

## 9. Registro de verificação

### Fase A — 02/08/2026

- Repositório inspecionado: vazio, exceto `.mcp.json`.
- SDD lido integralmente: 374 parágrafos, 21 tabelas e três figuras inspecionadas.
- DOCX sem comentários, notas de rodapé ou notas de fim.
- Renderização visual por página: **não executada**, pois LibreOffice/soffice não está instalado.
- Testes de aplicação: **não aplicável**, pois nenhuma aplicação foi criada.
- Banco Supabase: projeto `Proodos` saudável e schema `public` vazio antes desta fase; nenhuma alteração realizada.
- Implementação ampla: **não iniciada**, conforme instrução de interromper após a Fase A.

### Marco 1 — 02/08/2026

- Next.js 16.2.12, React 19.2.8, TypeScript 5.9.3 strict, Tailwind CSS 4.3.3 e pnpm 11.9.0 configurados com versões fixas e lockfile.
- Shell público, autenticação visual não funcional e shell privado demonstrativo implementados; autenticação e proteção de rotas continuam no M2.
- Tema responsivo Sertão Maker validado em desktop e viewport móvel; navegação, landmarks, skip link e gráfico acessível conferidos no navegador.
- Dados demonstrativos centralizados em `lib/demo-dashboard-data.ts` e rotulados na interface.
- Migrations `m1_security_baseline` e `m1_harden_rls_event_trigger` aplicadas ao projeto Supabase conectado.
- Schema `public` permanece sem tabelas de negócio; portanto, nenhuma policy de negócio foi criada neste marco.
- Teste SQL de cobertura passou: falha automaticamente se surgir tabela pública sem RLS/policy ou se `anon`/`authenticated` recuperar `CREATE` no schema.
- Supabase Advisors: zero alertas de segurança e zero alertas de desempenho após o hardening.
- `format:check`, `lint`, `typecheck`, 5 testes unitários/componentes e build de produção passaram.
- Detalhes e comandos estão em `docs/MARCO_1_IMPLEMENTATION.md` e `README.md`.

### Marco 2 — 02/08/2026

- Supabase Auth SSR implementado com clientes por requisição, cookies PKCE e `getClaims()` no proxy do Next.js 16.
- Login por e-mail/senha e Google, callback com destino validado, recuperação, redefinição e logout por POST implementados.
- Área `/o/*` protegida no proxy e revalidada no layout servidor com `getUser()`; rotas autenticadas são dinâmicas.
- `public.profiles` criada por migration versionada, com RLS, grants por coluna e trigger idempotente no schema `private`.
- Teste SQL transacional de provisioning/RLS passou no projeto conectado; Advisors retornaram zero alertas de segurança e desempenho.
- Format, lint, typecheck, 15 testes unitários/componentes, E2E e build de produção passaram.
- Fluxos externos de Google e e-mail ainda exigem provider, redirects, templates/SMTP e credenciais de teste configurados por ambiente.

## 10. Próxima ação recomendada

Antes de iniciar o M3, resolver B-01 e B-02. O próximo marco deve criar organizações, memberships, RBAC, auditoria e a matriz de testes cross-tenant sem antecipar módulos de negócio.
