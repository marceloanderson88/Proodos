# Marco 3 — Tenancy, RBAC, RLS e auditoria

## Resultado

O Marco 3 foi concluído em 02/08/2026 sem iniciar módulos de negócio. A aplicação resolve a organização ativa a partir de memberships reais, rejeita slugs não autorizados no servidor e mantém o dashboard fictício explicitamente rotulado.

## Modelo implementado

- `organizations`: tenant raiz, slug único entre registros não excluídos.
- `organization_units`: unidade administrativa opcional.
- `incubators`: incubadora vinculada à organização e opcionalmente à unidade por FK composta.
- `organization_memberships`: vínculo único usuário-organização com estados de convite, ativo, suspenso e removido.
- `permissions`, `roles`, `role_permissions`, `role_assignments`: RBAC com escopos tipados e FKs tenant-aware.
- `invitations`: e-mail normalizado, expiração, uso único e somente hash SHA-256 do token.
- `user_preferences`: organização lembrada para navegação; nunca usada para autorizar.
- `audit_logs`: eventos administrativos append-only e sem snapshots completos ou segredos.
- `private.platform_admins`: allowlist operacional fora do schema exposto e sem grants de cliente.

## Migrations

1. `20260802064441_m3_multi_tenant_rbac_audit.sql`: schema, catálogo de 13 permissões, papéis padrão, helpers, RPCs, RLS, grants, triggers e índices principais.
2. `20260802064541_m3_fix_invitation_acceptance.sql`: correção incremental da ambiguidade de `organization_id` encontrada pelo teste de convite.
3. `20260802064647_m3_advisor_fk_indexes.sql`: índices de cobertura das FKs apontadas pelo advisor.

As três migrations foram aplicadas ao projeto Supabase `Proodos`. A primeira também foi corrigida para que uma reconstrução do zero já nasça sem a ambiguidade; a migration incremental preserva o histórico real de produção.

## Políticas e grants

Todas as tabelas em `public` possuem RLS e ao menos uma policy. `anon` não possui grants nas tabelas de negócio. `authenticated` recebe privilégios mínimos por tabela e, quando necessário, por coluna:

- organizações somente para membro ativo; update requer `organization.manage`;
- unidades/incubadoras por capacidade e escopo;
- memberships: vínculo próprio ou `member.read`; mutação requer `member.manage`;
- roles, capacidades e atribuições exigem `role.read`/`role.manage`;
- convites exigem `invitation.read`/`invitation.manage`; `token_hash` não tem grant de leitura;
- preferência somente do próprio usuário e para organização de membership ativo;
- auditoria somente para `audit.read`; não há grant de insert/update/delete.

Os helpers `private.is_active_org_member` e `private.has_permission` consultam o usuário de `auth.uid()`, usam `search_path=''` e são os únicos helpers privados executáveis por `authenticated`. A service role não aparece no código ou no navegador.

## Fluxos privilegiados

`create_organization` é executável por usuário autenticado, mas valida `private.platform_admins` dentro da transação. Ele cria tenant, membership do administrador, dez papéis padrão, capacidades e preferência inicial.

`accept_invitation` exige usuário autenticado com e-mail confirmado e igual ao convite, trava o registro, valida o hash e a expiração, cria vínculo/atribuição uma única vez e audita a mudança. O token bruto nunca é persistido.

O único usuário confirmado existente foi inserido operacionalmente em `private.platform_admins`, sem versionar seu UUID. O tenant `Incubadora Sertão Maker` (`sertao-maker`) foi criado pelo RPC protegido e associado a essa identidade.

## Aplicação

- `/o` escolhe a preferência ainda acessível ou a primeira organização devolvida por RLS.
- `/o/[organizationSlug]` só renderiza quando a consulta RLS devolve o tenant.
- `/sem-organizacao` explica a necessidade de convite/vínculo sem simular acesso.
- a sidebar exibe a organização real e permite alternância; a preferência é gravada pelo cliente com RLS.
- o dashboard continua fictício e assim identificado.

## Testes executados

- `rls_coverage.sql`: passou.
- `profiles_rls.sql`: passou.
- `m3_tenant_isolation.sql`: passou; cobre A/B, mutação permitida, inserção cruzada bloqueada, suspensão e grants.
- `m3_invitation_and_platform_admin.sql`: encontrou a ambiguidade, motivou a migration corretiva e passou na repetição; cobre bootstrap negado/permitido, hash, aceite e idempotência.
- Vitest: 5 arquivos, 16 testes, todos passaram.
- TypeScript strict: passou.
- ESLint sem warnings: passou.
- Prettier check: passou.
- Build Next.js de produção: passou; 8 páginas estáticas geradas e rotas privadas dinâmicas compiladas.

## Advisors e riscos conhecidos

- Os warnings de `SECURITY DEFINER` para `create_organization` e `accept_invitation` são intencionais: são RPCs explicitamente concedidos, com autenticação interna, `search_path=''`, escopo mínimo e testes negativos.
- O advisor genérico de tabelas sinaliza RLS desabilitada em `private.platform_admins`. A tabela está em schema não exposto e todos os grants de `public`, `anon` e `authenticated` foram revogados. RLS sem policy seria defesa adicional, mas não foi aplicada automaticamente porque o próprio advisor exige decisão explícita.
- Proteção contra senhas vazadas está desabilitada no Supabase Auth e deve ser habilitada no painel antes do piloto.
- O advisor de performance foi repetido após a migration de cobertura: não restaram FKs sem índice. Avisos de índices não usados são esperados porque as tabelas acabaram de ser criadas e devem ser reavaliados com carga real.
- O seed sintético foi habilitado apenas para reset local e não foi aplicado em produção.

## Próximo marco

O Marco 4 deve implementar somente os contratos e metadados de arquivos grandes, executar o spike de autenticação/Shared Drive e adicionar feature flags/permissões correspondentes. Upload real permanece bloqueado pelas decisões B-03 e B-04.
