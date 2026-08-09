# Etapas 6 e 7 — revisão e prontidão operacional

## Escopo

Estas etapas fecham tecnicamente os fluxos entregues nas etapas 1 a 5. Não
adicionam regras de negócio novas e não promovem código automaticamente para a
Vercel.

## Etapa 6 — revisão e hardening

- loading específico para portfólio, perfil e autocadastro de startups;
- boundary de erro do módulo com referência segura para suporte;
- gráficos com alternativa textual e sem converter dado ausente em zero;
- cobertura E2E do autocadastro em viewport móvel;
- smoke autenticado de portfólio, perfil, edição e acesso ao diagnóstico;
- teste transacional de aprovação, isolamento RLS e aceite de convite;
- índices de cobertura para FKs operacionais apontadas pelo advisor;
- formatter, lint, TypeScript strict, unitários, build e scan de segredos.

## Etapa 7 — prontidão de promoção

O pipeline prepara Supabase local completo, incluindo a chave administrativa
efêmera necessária aos testes do autocadastro. A chave existe somente durante o
job, usa o nome interno `SUPABASE_LOCAL_ADMIN_KEY` e só é aceita quando o app
está em modo `test` apontando para `localhost` ou `127.0.0.1`. Ela nunca é
incorporada ao bundle. Ambientes reais continuam exigindo
`SUPABASE_SECRET_KEY` exclusivamente no servidor.

Checklist antes da promoção:

1. migrations locais e remotas possuem a mesma versão;
2. CI executa reset limpo, pgTAP, E2E e build;
3. preview usa Supabase de homologação separado;
4. `/api/health` e `/api/ready` retornam sucesso e `x-request-id`;
5. login, portfólio, perfil, edição, autocadastro e convite são verificados;
6. resultado diagnóstico apresenta radar, barras e evolução sem mocks;
7. logs são pesquisáveis pela referência exibida ao usuário;
8. promoção exige ação explícita no GitHub/Vercel.

## Advisors Supabase

Os advisors foram executados depois das migrations. As FKs do onboarding e das
estruturas recentes de diagnóstico receberam índices de cobertura. Avisos sobre
funções `SECURITY DEFINER` são esperados quando a RPC é a fronteira transacional;
essas funções mantêm `search_path` vazio, grants mínimos e validam `auth.uid()` e
permissão no próprio banco.

- [RLS habilitado sem política](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- [Funções SECURITY DEFINER executáveis por usuários autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Chaves estrangeiras sem índice](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)

`private.diagnostic_demo_install_context` permanece sem policy porque está no
schema privado, não é concedida a clientes e serve apenas como contexto interno
de instalação transacional dos exemplos.

## Pendências externas que não bloqueiam o código

- criar Supabase exclusivo de homologação para previews;
- configurar SMTP/remetente de produção;
- habilitar MFA para administradores;
- conectar monitoramento externo e alertas;
- executar smoke manual depois do próximo deploy Vercel.
