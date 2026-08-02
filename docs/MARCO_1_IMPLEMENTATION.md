# Marco 1 — Registro da implementação

**Concluído em:** 02/08/2026  
**Escopo:** scaffold, qualidade, tema visual, shell e baseline de segurança. O Marco 2 não foi iniciado.

## Funcionalidades entregues

- Next.js App Router, React, TypeScript strict e Tailwind CSS com versões fixas.
- Layout público, landing page e página institucional.
- Layout visual de autenticação; formulário e provedores estão intencionalmente desabilitados e identificados como futuros.
- Shell demonstrativo responsivo com sidebar, header, menu completo e placeholders dos módulos previstos.
- Dashboard inspirado nas referências Sertão Maker, com todos os dados fictícios centralizados e explicitamente rotulados.
- Estados globais de loading, erro, erro global e 404.
- Validação Zod das variáveis públicas atuais.
- Formatter, lint, typecheck, testes unitários/componentes, estrutura E2E e teste SQL de cobertura RLS.

## Migrations

1. `20260802030000_m1_security_baseline.sql`
   - revoga `CREATE` no schema `public` de `public`, `anon` e `authenticated`;
   - revoga privilégios padrão sobre futuras tabelas, sequências e funções de clientes.
2. `20260802050000_m1_harden_rls_event_trigger.sql`
   - revoga `EXECUTE` público da função preexistente `public.rls_auto_enable()`.

As duas migrations foram aplicadas ao projeto Supabase `Proodos`. O schema `public` permanece vazio: o Marco 1 não cria tabelas de negócio e, por isso, não cria policies artificiais. `supabase/tests/rls_coverage.sql` rejeita qualquer tabela pública futura sem RLS ou sem policy e também valida os grants do schema.

## Verificações executadas

| Verificação                            | Resultado                            |
| -------------------------------------- | ------------------------------------ |
| Prettier `format:check`                | Passou                               |
| ESLint, zero warnings                  | Passou                               |
| TypeScript `tsc --noEmit`              | Passou                               |
| Vitest + Testing Library               | 3 arquivos, 5 testes, todos passaram |
| Next.js build de produção              | Passou; 6 rotas compiladas           |
| Teste SQL de cobertura RLS no Supabase | Passou                               |
| Supabase Security Advisor              | Zero alertas após hardening          |
| Supabase Performance Advisor           | Zero alertas                         |
| Playwright E2E                         | 1 teste, passou em Chromium          |
| QA visual desktop e móvel              | Passou; sem erros de console         |

## Limitações e riscos remanescentes

- Não há autenticação, sessão SSR, recuperação ou logout; todos pertencem ao M2.
- Rotas do shell demonstrativo ainda são públicas e não constituem fronteira de autorização.
- Não existem tabelas de negócio, organizações, memberships, RBAC ou isolamento cross-tenant real; pertencem ao M3 e dependem de B-01/B-02.
- Não há persistência: métricas, nomes e atividades são dados sintéticos de preview.
- Google Drive permanece somente documentado; nenhum upload ou segredo foi implementado.
- A matriz E2E completa e o CI serão aprofundados no M5; neste marco existe somente um smoke test do shell.

## Próximo marco proposto

O M2 deve implementar apenas identidade: clientes Supabase browser/server, e-mail/senha, Google OAuth, recuperação, logout, renovação de sessão, proteção de rotas no servidor e criação mínima segura de `profiles`, com migration, policies e testes. Nenhuma tabela multi-tenant ou módulo de negócio deve ser antecipado.
