# Marco 2 — autenticação e perfil seguro

## Resultado

O Marco 2 implementa identidade e sessão, sem antecipar tenancy ou módulos de negócio. A aplicação possui login por e-mail/senha, Google OAuth, recuperação e redefinição de senha, logout por POST, renovação SSR e proteção da área privada. O dashboard permanece demonstrativo.

## Aplicação

- clientes Supabase browser, server, route handler e proxy tipados;
- cookies PKCE via `@supabase/ssr` 0.12.4 e `@supabase/supabase-js` 2.111.0;
- `getClaims()` no proxy para renovação/verificação e `getUser()` no layout privado;
- destinos pós-login restritos a `/o/*`; callback de recuperação aceita somente `/redefinir-senha` como exceção explícita;
- formulários React Hook Form + Zod, feedback acessível e erros sem detalhes internos;
- Google OAuth com callback `/auth/callback`;
- recuperação sem revelar se o e-mail existe;
- logout somente por `POST /auth/logout`;
- identidade real no header; dados operacionais ainda rotulados como demonstração.

## Migration e RLS

Migration: `supabase/migrations/20260802055042_m2_profiles_and_auth_security.sql`.

Ela cria `public.profiles`, FK para `auth.users`, constraints, timestamps e duas policies:

- `profiles_select_own`: `authenticated` lê apenas `id = auth.uid()`;
- `profiles_update_own`: `authenticated` atualiza somente o próprio registro.

Os grants de atualização são limitados a `display_name`, `avatar_url`, `locale` e `timezone`. Não há grant de insert/delete para clientes. A função `private.handle_new_user()` é `SECURITY DEFINER`, possui `search_path = ''`, é idempotente e teve `EXECUTE` revogado de `PUBLIC`, `anon` e `authenticated`. Metadata de nome/avatar é usada somente para apresentação, nunca para autorização.

## Verificações executadas

| Verificação                                  | Resultado                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| SQL `profiles_rls.sql` no Supabase conectado | passou; rollback preservou o banco                                                           |
| Supabase Security Advisor                    | zero alertas                                                                                 |
| Supabase Performance Advisor                 | zero alertas                                                                                 |
| `pnpm lint`                                  | passou                                                                                       |
| `pnpm typecheck`                             | passou                                                                                       |
| `pnpm test`                                  | 5 arquivos, 15 testes passaram                                                               |
| `pnpm test:e2e`                              | 4 testes passaram                                                                            |
| `pnpm build`                                 | passou                                                                                       |
| validação visual local                       | login, mensagens acessíveis, recuperação e redirect privado validados; zero erros no console |

## Executar localmente

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
pnpm dev
```

Variáveis necessárias:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
- `NEXT_PUBLIC_APP_NAME` e `NEXT_PUBLIC_APP_ENV` opcionais;
- `APP_BASE_URL` recomendada por ambiente.

Não existe secret/service role na aplicação do Marco 2.

## Configuração externa necessária

1. adicionar `http://localhost:3000/auth/callback` e `https://proodos.vercel.app/auth/callback` aos redirects permitidos do Supabase Auth;
2. habilitar Google no Supabase e configurar no Google Cloud o callback informado pelo Supabase;
3. configurar Site URL por ambiente;
4. antes do piloto, configurar SMTP/remetente e revisar templates de recuperação.

## Limitações e riscos remanescentes

- não há autoinscrição pública nem tela administrativa de criação de usuários;
- conclusão real do OAuth e entrega de e-mail não foram automatizadas por falta de credenciais/contas de teste e configuração externa verificável;
- a URL `sertao-maker` ainda é contexto visual, não tenant autorizado;
- organização, membership, RBAC, convites, superadmin e isolamento cross-tenant pertencem ao Marco 3;
- rate limiting, CSP/CSRF ampliado, CI e observabilidade são hardening do Marco 5;
- templates de e-mail nativos podem ter limitações conforme o plano do Supabase.

## Próximo marco objetivo

O Marco 3 deve começar somente após decidir B-01 (hierarquia organização/unidade/incubadora) e B-02 (governança do superadmin). Então criaremos organizações, memberships, papéis/permissões, convites, auditoria, RLS tenant-aware e testes positivos/negativos com duas organizações sintéticas.
