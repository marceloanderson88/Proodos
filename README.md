# Proodos — Plataforma Sertão Maker

Fundação técnica da plataforma de gestão de incubadoras descrita em [`docs/SDD.md`](docs/SDD.md). O repositório está concluído até o **Marco 1**; autenticação, persistência multi-tenant e módulos de negócio ainda não estão implementados.

## Requisitos locais

- Node.js 22 ou superior;
- pnpm 11.9.0;
- Docker somente quando forem executados os testes Supabase locais.

## Executar

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
pnpm dev
```

Abra `http://localhost:3000`. O dashboard demonstrativo está em `http://localhost:3000/o/sertao-maker/dashboard`.

## Verificações

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Quando o Supabase CLI local estiver ligado:

```powershell
pnpm test:rls
```

Os testes E2E requerem os navegadores do Playwright instalados e uma aplicação em execução:

```powershell
pnpm exec playwright install chromium
pnpm test:e2e
```

## Variáveis do Marco 1

| Variável               | Obrigatória | Uso                                               |
| ---------------------- | ----------- | ------------------------------------------------- |
| `NEXT_PUBLIC_APP_NAME` | Não         | Nome público; possui valor padrão seguro.         |
| `NEXT_PUBLIC_APP_ENV`  | Não         | `development`, `test`, `staging` ou `production`. |
| `APP_BASE_URL`         | Não no M1   | URL base reservada para callbacks no M2.          |

`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` estão documentadas para o Marco 2, mas não são lidas pelo código atual. Nenhuma service role ou secret key deve usar prefixo `NEXT_PUBLIC_`.

Consulte [`docs/MARCO_1_IMPLEMENTATION.md`](docs/MARCO_1_IMPLEMENTATION.md) para escopo, migrations e limitações.
