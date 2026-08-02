# Marco 5 — Hardening, CI e deploy readiness

## Resultado

O Marco 5 implementa no código a fundação operacional: pipeline bloqueante, isolamento de Preview, headers/CSP, proteção de mutações, limitação de rajadas, correlação, health/readiness, scans de segredos e smokes autenticados/acessíveis. Nenhum módulo de negócio ou adapter Google Drive foi iniciado.

## Segurança da aplicação

- CSP, HSTS, framing, MIME sniffing, referrer e Permissions Policy centralizados.
- `poweredByHeader` continua desativado.
- mutações por cookie exigem `Origin` idêntico ao host da aplicação;
- callback PKCE mantém destino restrito e resposta `no-store`;
- APIs retornam erro sanitizado com `x-request-id`;
- endpoints de arquivo têm limite de rajada por instância e continuam fail-closed;
- Preview falha no build se apontar para o project ref de produção.

## Operação e CI

- GitHub Actions fixadas por SHA e permissão mínima `contents: read`;
- instalação `--frozen-lockfile`;
- banco Supabase reconstruído do zero antes dos testes;
- formatter, lint, typecheck, unitários, pgTAP/RLS e build bloqueantes;
- scan de fonte e bundle para chaves privadas, secrets e JWT service role;
- Chromium executa login real com seed sintético, resolução de tenant, bloqueio cruzado, dashboard, logout, headers, readiness e acessibilidade básica.

## Readiness e migration

`20260802165541_m5_system_readiness.sql` cria `public.system_readiness()` como `security invoker`, sem argumentos, dados ou acesso privilegiado. Somente `anon` e `authenticated` recebem `EXECUTE` explícito. `/api/health` verifica o processo; `/api/ready` verifica configuração, Data API e banco com timeout e resposta sanitizada.

As versões locais das migrations M1–M5 foram alinhadas ao histórico remoto sem mudança funcional do SQL. Depois de autorização explícita, a migration M5 foi aplicada com payload verificado; a RPC retornou `true`, confirmou `security_definer=false` e os grants esperados. Nenhum alerta novo surgiu nos advisors.

## Verificações executadas

- ESLint: passou.
- TypeScript strict: passou.
- Vitest: 12 arquivos, 32 testes passaram.
- Build Next.js de produção: passou.
- Scan de fonte: 122 arquivos, sem segredo elevado.
- Scan de bundle: 576 arquivos, sem segredo elevado.
- Playwright: 9 testes passaram, incluindo readiness, headers, CSRF, auth público e acessibilidade; o smoke autenticado com seed local foi corretamente ignorado sem credenciais E2E.

Não executados localmente:

- reset Supabase/pgTAP, porque Docker não está instalado nesta máquina;
- smoke autenticado do seed, porque depende do Supabase local no CI.

Esses itens permanecem gates obrigatórios no workflow e não são declarados como aprovados antes da primeira execução do CI.

### Primeira execução no GitHub Actions

A primeira reconstrução limpa identificou uma dependência histórica na migration `20260802045847_m1_harden_rls_event_trigger.sql`: ela revogava privilégios de `public.rls_auto_enable()`, função criada diretamente no projeto hospedado antes do histórico versionado e, por isso, ausente em um banco novo. A migration agora consulta `to_regprocedure()` e somente executa os `REVOKE` quando a função existe. O comportamento de segurança no ambiente remoto permanece o mesmo e a reconstrução limpa deixa de depender de estado externo ao repositório.

Depois que a reconstrução passou, o runner apontou que os scripts transacionais de RLS não emitiam um plano TAP. A suíte agora prepara a extensão `pgtap` em `000_pgtap_setup.sql`; cada arquivo declara seu plano, mantém as verificações por exceção e somente emite `pass()` depois que todas elas terminam. Os dados sintéticos continuam revertidos ao final de cada teste.

O smoke autenticado seguinte demonstrou que inserir um hash manual em `auth.users` não é um contrato confiável para criar credenciais de login. O seed mantém somente identidades sintéticas; depois do reset, `provision-e2e-auth.mjs` define suas senhas pela Auth Admin API usando a `SERVICE_ROLE_KEY` efêmera gerada pelo Supabase CLI. A chave permanece no ambiente do único processo de provisionamento, e o script rejeita qualquer URL que não seja `localhost` ou `127.0.0.1`.

Os registros determinísticos usados pelas FKs dos testes preenchem explicitamente os campos internos de token com strings vazias e as flags de tipo de usuário com `false`. Isso permite que o Auth carregue o registro antes da atualização administrativa sem persistir tokens ou hashes conhecidos no repositório.

O CI usa o par legado `ANON_KEY`/`SERVICE_ROLE_KEY` gerado pelo Supabase CLI somente no stack local. Após provisionar as senhas, o script executa `signInWithPassword` com a chave anônima e exige uma sessão do usuário esperado antes de iniciar o Playwright. Produção continua usando `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no modelo atual de chaves.

O CSP inclui a origem exata do Supabase somente quando a URL configurada usa HTTP em `localhost` ou `127.0.0.1`, permitindo o Auth no navegador do CI. URLs externas arbitrárias não são incorporadas, e o conjunto hospedado continua limitado aos domínios HTTPS/WSS do Supabase.

## Pendências externas

- criar um projeto Supabase de homologação e separar variáveis Vercel Preview;
- ativar proteção contra senhas vazadas no Supabase Auth;
- definir rate limiting distribuído, SMTP e MFA antes do piloto;
- manter `GOOGLE_DRIVE_UPLOAD_ENABLED=false` até B-03/B-04.

## Próximo marco proposto

O Marco 6 deve selecionar o primeiro módulo vertical do MVP. A recomendação é Programas + Startups como cadastros estruturantes, antes de templates de diagnóstico, planos de ação e trilhas de conteúdo.
