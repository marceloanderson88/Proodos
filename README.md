# Proodos — Plataforma Sertão Maker

Fundação técnica da plataforma de gestão de incubadoras descrita em [`docs/SDD.md`](docs/SDD.md). O repositório está concluído até o **Marco 4**: autenticação, tenancy, RBAC/RLS e a fundação de metadados para arquivos grandes estão implementados. O adapter Google Drive e os módulos de negócio permanecem desativados até seus respectivos gates.

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

Preencha em `.env.local` a URL e a chave publicável do projeto Supabase. Abra `http://localhost:3000`; `/o` resolve a organização ativa por uma preferência sem valor de segurança e RLS valida o vínculo. O dashboard continua exibindo dados claramente demonstrativos.

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

## Variáveis até o Marco 4

| Variável                               | Obrigatória | Uso                                               |
| -------------------------------------- | ----------- | ------------------------------------------------- |
| `NEXT_PUBLIC_APP_NAME`                 | Não         | Nome público; possui valor padrão seguro.         |
| `NEXT_PUBLIC_APP_ENV`                  | Não         | `development`, `test`, `staging` ou `production`. |
| `NEXT_PUBLIC_SUPABASE_URL`             | Sim         | URL pública do projeto Supabase.                  |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sim         | Chave publicável; nunca usar secret/service role. |
| `APP_BASE_URL`                         | Recomendado | URL canônica por ambiente.                        |
| `GOOGLE_DRIVE_UPLOAD_ENABLED`          | Não         | Deve permanecer `false` até concluir B-03/B-04.   |

No Supabase Auth, registre `http://localhost:3000/auth/callback` e a URL equivalente da Vercel entre os redirects permitidos. Para Google, configure o provider no Supabase e o callback fornecido pelo Supabase no Google Cloud. Nenhuma service role ou secret key deve usar prefixo `NEXT_PUBLIC_`.

Não configure credenciais Google enquanto a flag estiver falsa. Consulte [`docs/MARCO_4_IMPLEMENTATION.md`](docs/MARCO_4_IMPLEMENTATION.md) para contratos, migrations, policies, testes e limitações.
