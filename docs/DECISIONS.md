# Registro de decisões arquiteturais

## Convenções

- **Aceita:** exigida explicitamente pelo SDD ou pelo solicitante.
- **Proposta:** recomendação para validação antes da implementação correspondente.
- **Adiada:** deliberadamente fora da fundação.
- **Substituída:** mantida apenas para histórico.

## DEC-001 — Banco compartilhado e schema compartilhado

**Status:** Aceita  
**Decisão:** usar PostgreSQL compartilhado com `organization_id` obrigatório em entidades de negócio.  
**Motivo:** atende o SDD e simplifica operação para o volume inicial.  
**Consequências:** RLS e testes cross-tenant são requisitos de release; índices devem começar pelo tenant nas consultas principais.

## DEC-002 — Next.js App Router na Vercel

**Status:** Aceita  
**Decisão:** aplicação web em Next.js App Router, TypeScript strict, React e Tailwind CSS.  
**Consequências:** Server Components por padrão; fronteiras cliente/servidor explícitas; recursos dependentes de runtime devem declarar compatibilidade.

## DEC-003 — Supabase Auth com SSR

**Status:** Aceita  
**Decisão:** e-mail/senha e Google OAuth com sessão baseada em cookies via pacote SSR vigente do Supabase.  
**Consequências:** proteção de rota deve validar identidade no servidor; `getSession()` não será usado como prova de autorização.

## DEC-004 — RLS é a fronteira de dados

**Status:** Aceita  
**Decisão:** toda tabela de negócio exposta terá RLS e políticas CRUD específicas.  
**Consequências:** filtros no frontend são apenas UX; nenhuma história que cria tabela termina sem policies e testes de isolamento.

## DEC-005 — Organização ativa explícita na URL

**Status:** Aceita e implementada no Marco 3
**Decisão:** usar `/o/[organizationSlug]` como contexto de navegação. Uma preferência pode lembrar o último tenant, sem participar da autorização.  
**Motivo:** evita estado global oculto e torna links reproduzíveis.  
**Alternativa rejeitada:** confiar exclusivamente em `active_organization_id` no perfil ou localStorage.

## DEC-006 — RBAC com atribuição de escopo

**Status:** Aceita e implementada no Marco 3
**Decisão:** separar catálogo de permissões, papéis, composição papel-permissão e atribuições de papel por escopo.  
**Motivo:** um papel não concede acesso global e o mesmo usuário pode ter papéis diferentes.  
**Restrição:** não usar identificador polimórfico sem integridade referencial como solução permanente.

## DEC-007 — Perfil criado por trigger mínimo e endurecido

**Status:** Aceita e implementada no Marco 2
**Decisão:** criar `profiles` após inserção em `auth.users` por função privada idempotente.  
**Controles:** `search_path=''`, referências qualificadas, `EXECUTE` revogado, nenhum uso de metadata editável para autorização e teste de falha.  
**Risco:** erro no trigger pode bloquear signup; deve existir teste e procedimento de reparo.

## DEC-008 — Superadmin fora da autorização editável pelo usuário

**Status:** Aceita e implementada no Marco 3
**Decisão:** administrar superadmins em tabela privada e operações de plataforma somente por backend privilegiado.  
**Alternativas rejeitadas:** `user_metadata`, flag manipulável pelo cliente ou policy `TO authenticated` ampla.

O bootstrap inicial é uma inserção operacional manual pelo PostgreSQL na allowlist `private.platform_admins`, vinculada ao UUID confirmado em `auth.users`. A tabela não possui grants para clientes e não integra o schema exposto da Data API.

## DEC-009 — Google Drive armazena bytes; Supabase governa acesso

**Status:** Aceita  
**Decisão:** arquivos grandes ficam em Shared Drive; o banco mantém metadados, estado, relações, classificação, versões e auditoria.  
**Consequências:** URLs públicas permanentes são proibidas; acesso ocorre por ID interno após autorização.

## DEC-010 — Conta de serviço membro do Shared Drive

**Status:** Proposta  
**Decisão:** por ambiente, uma conta de serviço é adicionada diretamente ao Shared Drive com menor privilégio suficiente. Domain-wide delegation não será habilitada sem requisito específico.  
**Dependência:** confirmação de Google Workspace e Shared Drive institucional.

## DEC-011 — Upload resumível direto

**Status:** Aceita  
**Decisão:** backend autoriza e cria sessão; navegador envia partes diretamente ao Drive; backend valida conclusão.  
**Consequências:** estado `pending`, idempotência, expiração e reconciliação são obrigatórios; Cloud Run permanece contingência.

## DEC-012 — CERNE opcional e desacoplado

**Status:** Aceita  
**Decisão:** modelar metodologia genericamente; CERNE é pacote/configuração opcional.  
**Consequências:** objetos operacionais não terão FK CERNE obrigatória; relacionamentos são muitos-para-muitos e opcionais.

## DEC-013 — Inglês no código, português na experiência

**Status:** Proposta  
**Decisão:** tabelas, tipos, módulos e APIs em inglês; rotas e textos de interface em português do Brasil.  
**Motivo:** consistência técnica sem sacrificar linguagem do produto.

## DEC-014 — Repositório único na fundação

**Status:** Proposta  
**Decisão:** começar com um único projeto Next.js contendo app, migrations, testes e serviços desacoplados. Migrar para workspace/monorepo apenas quando houver segundo deployável real.  
**Motivo:** o repositório está vazio e a fundação não justifica complexidade adicional.

## DEC-015 — Soft delete seletivo

**Status:** Proposta  
**Decisão:** aplicar `deleted_at` a agregados sujeitos a restauração/retenção; não a todas as tabelas indiscriminadamente.  
**Consequências:** cada uso exige comportamento de unicidade, RLS, restore e purge documentados.

## DEC-016 — Dashboard inicial explicitamente demonstrativo

**Status:** Aceita  
**Decisão:** o shell pode usar dados fictícios, sempre rotulados como demonstração e isolados do banco real.  
**Consequências:** nenhuma métrica fictícia pode parecer dado operacional.

## DEC-017 — Módulos de negócio fora da primeira implementação

**Status:** Aceita  
**Decisão:** a primeira implementação termina na fundação técnica e shell. Diagnósticos, planos, conteúdos, atividades, mentorias e indicadores completos serão marcos posteriores.  
**Consequências:** páginas podem existir como placeholders acessíveis, sem regras ou persistência inventadas.

## DEC-018 — pnpm e versões fixas no Marco 1

**Status:** Aceita  
**Decisão:** usar pnpm 11 com lockfile versionado e versões exatas dos pacotes; Node.js 22 ou superior.  
**Motivo:** instalações reprodutíveis e menor variação entre desenvolvimento, CI e Vercel.

## DEC-019 — Primitivas acessíveis próprias no shell inicial

**Status:** Aceita para o Marco 1  
**Decisão:** o shell usa HTML semântico, foco visível e componentes próprios pequenos; nenhuma biblioteca de componentes foi adicionada sem necessidade concreta.  
**Consequências:** componentes interativos complexos de marcos futuros devem adotar primitivas acessíveis especializadas e testes de teclado antes de serem aceitos.

## DEC-020 — Baseline de RLS sem tabelas artificiais

**Status:** Aceita  
**Decisão:** o M1 não cria tabela de negócio apenas para satisfazer formalmente RLS. O schema exposto permanece vazio, grants padrão são endurecidos e um teste SQL bloqueia qualquer tabela pública futura sem RLS e policy.  
**Consequências:** policies tenant-aware e testes cross-tenant reais entram junto das tabelas no M3; a função preexistente `public.rls_auto_enable()` não é executável por clientes.

## DEC-021 — Sessão SSR renovada no proxy e revalidada no servidor

**Status:** Aceita e implementada no Marco 2
**Decisão:** o `proxy.ts` do Next.js 16 chama `getClaims()` imediatamente após criar o cliente SSR, propaga cookies e headers privados; o layout privado usa `getUser()` antes de carregar o perfil.
**Consequências:** rotas privadas são dinâmicas, o proxy melhora a jornada mas não substitui RLS, e nenhum objeto de `getSession()` é usado como prova de identidade.

## DEC-022 — Hierarquia organização, unidade opcional e incubadora

**Status:** Aceita e implementada no Marco 3
**Decisão:** `organizations` é o tenant raiz; `organization_units` representa unidade administrativa; `incubators` pertence à organização e pode pertencer a uma unidade.
**Consequências:** FKs compostas validam o mesmo `organization_id`; papéis usam escopos tipados `organization`, `unit` ou `incubator` sem identificador polimórfico.

## DEC-023 — Convite hasheado e RPCs privilegiados mínimos

**Status:** Aceita e implementada no Marco 3
**Decisão:** armazenar somente SHA-256 do token de convite; aceite e criação de tenant são transações `SECURITY DEFINER` pequenas, com `search_path=''`, autenticação interna e grants explícitos.
**Consequências:** os warnings do advisor para essas duas RPCs são intencionais e revisados; token bruto nunca entra no banco, auditoria ou bundle.

## DEC-024 — Ciclo de vida de arquivos explícito e fail-closed

**Status:** Aceita e implementada no Marco 4
**Decisão:** arquivos percorrem uma máquina de estados validada no TypeScript e no PostgreSQL. Somente `available` é visível com `file.read`; estados internos exigem `file.manage`.
**Consequências:** o cliente não recebe grant para alterar `status`, IDs do provedor, versões, sessões ou logs. As rotas autenticam e validam o tenant, mas respondem `503` enquanto a feature flag estiver desativada e `501` se for ativada sem adapter.

## DEC-025 — Escopo tipado de arquivo antes dos módulos de negócio

**Status:** Aceita e implementada no Marco 4
**Decisão:** `files` e `file_links` possuem FKs explícitas para organização, unidade ou incubadora. Não foi criado `resource_type/resource_id` genérico.
**Consequências:** programas, startups, conteúdos, planos e entregas acrescentarão colunas/FKs próprias quando seus agregados existirem. Conteúdo continuará relacionado a trilhas e ações sem dependência obrigatória de CERNE.

## DEC-026 — Preview falha fechado contra produção

**Status:** Aceita e implementada no Marco 5
**Decisão:** builds Vercel Preview exigem `NEXT_PUBLIC_APP_ENV=staging`, um project ref de produção declarado e um Supabase diferente do projeto produtivo.
**Consequências:** previews existentes que reutilizem variáveis de produção deixam de publicar até receberem um ambiente de homologação seguro.

## DEC-027 — Health separado de readiness

**Status:** Aceita e implementada no Marco 5
**Decisão:** `/api/health` comprova apenas o processo Next.js; `/api/ready` chama uma RPC `security invoker` sem dados para comprovar Data API/Postgres.
**Consequências:** monitores distinguem processo vivo de dependência pronta sem expor schema, contagens ou dados de tenant.

## DEC-028 — CSP compatível antes de nonce estrito

**Status:** Risco aceito no Marco 5
**Decisão:** aplicar CSP restritiva para origem, frames, objetos e conexões, mantendo `unsafe-inline` necessário ao runtime atual do Next.js. `unsafe-eval` existe somente em desenvolvimento.
**Consequências:** framing e fontes externas ficam bloqueados por padrão, mas nonce/strict-dynamic permanece um hardening posterior mensurado.

## DEC-029 — Rate limiting em duas camadas

**Status:** Parcialmente implementada no Marco 5
**Decisão:** limitar rajadas por instância nas rotas próprias e manter os limites nativos do Supabase Auth; exigir armazenamento distribuído antes do piloto para garantias globais.
**Consequências:** a proteção atual reduz abuso casual, mas não é apresentada como limite global em ambiente serverless.
