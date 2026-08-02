# Suposições, lacunas e perguntas

## 1. Uso deste registro

Perguntas classificadas como bloqueantes impedem uma migration ou integração concreta de alto custo de reversão. Lacunas não bloqueantes recebem uma suposição explícita para permitir planejamento, mas devem ser confirmadas antes do marco indicado.

## 2. Perguntas bloqueantes para a implementação da fundação

### B-01 — “Unidade” e “incubadora” são conceitos distintos? — Resolvida

O SDD afirma que uma organização pode possuir “incubadoras/unidades”, mas a solicitação lista organizações/incubadoras e unidades separadamente.

**Decisão confirmada em 02/08/2026:** organização → unidade administrativa opcional → incubadora. Uma incubadora sempre pertence à organização e pode não estar agrupada em unidade. Implementada no Marco 3 com FKs compostas tenant-aware.

### B-02 — Como será governado o superadministrador da plataforma? — Resolvida

**Decisão confirmada em 02/08/2026:** allowlist operacional em `private.platform_admins`, nunca `user_metadata`. Concessão/revogação ocorre somente pelo PostgreSQL operacional; o UUID inicial foi inserido fora do código após confirmação da identidade. O RPC `create_organization` exige essa allowlist.

### B-03 — Existe Google Workspace com Shared Drive para cada ambiente?

Precisamos dos ambientes disponíveis (dev/staging/prod), responsável institucional e possibilidade de adicionar uma conta de serviço como membro.

**Bloqueia:** autenticação real, criação de pastas e teste de upload.  
**Não bloqueia:** interface e contratos do serviço Drive.

### B-04 — Quais políticas institucionais de arquivo são obrigatórias?

Confirmar tamanho máximo por tipo, tipos proibidos, retenção, quarentena/antivírus, restauração, purge e portabilidade.

**Bloqueia:** constraints finais de arquivos e jobs de retenção.  
**Não bloqueia:** modelo inicial com políticas configuráveis.

## 3. Perguntas importantes, mas não bloqueantes para o shell

### G-01 — Identidade comercial

**Lacuna:** nome final, logos oficiais, tipografia e tokens de marca.  
**Suposição:** “Incubadora Sertão Maker” como tema inicial, usando paleta vinho, areia e neutros das referências visuais; ativos temporários claramente identificados.

### G-02 — Volume do piloto

**Lacuna:** número inicial de organizações, usuários, startups e arquivos.  
**Suposição:** dimensionar a arquitetura para as metas RNF do SDD, mas validar carga inicialmente com uma organização piloto e dados sintéticos.

### G-03 — Métodos de login

**Resolvido pela solicitação:** implementar e-mail/senha e Google.  
**Pendente:** restringir Google a domínios institucionais ou aceitar contas externas?  
**Suposição:** aceitar Google sem restrição de domínio; acesso aos tenants depende de convite/membership.

### G-04 — Convites e autoinscrição

**Lacuna:** qualquer pessoa pode criar organização ou somente usuários convidados?  
**Implementado no Marco 3:** não há criação pública de tenant. Organizações são criadas pelo RPC controlado por `platform_admins`; usuários entram por convite ou vínculo administrativo.

### G-05 — Personalização por organização

**Lacuna:** quais tokens de marca podem ser alterados e se haverá domínio customizado no MVP.  
**Suposição:** nome, logo, cores básicas, fuso e idioma são metadados; domínio customizado fica para marco posterior.

### G-06 — Matriz granular de permissões

**Lacuna:** o SDD descreve papéis, mas não enumera todas as capacidades CRUD por recurso.  
**Implementado no Marco 3:** catálogo mínimo de 13 permissões para tenancy/administração; permissões de módulos serão adicionadas junto às respectivas migrations, sem wildcard no cliente.

### G-07 — Escopo de mentorias

**Lacuna:** o SDD coloca mentorias na Fase 2, mas o menu da fundação deve estar preparado.  
**Suposição:** item e placeholder no shell; nenhuma persistência ou agenda nesta etapa.

### G-08 — Provedor de e-mail

**Lacuna:** fornecedor transacional, remetente, domínio e templates.  
**Suposição:** abstrair `EmailService`; usar apenas e-mails nativos necessários do Supabase Auth até a decisão.

### G-09 — Calendário

**Lacuna:** Google Calendar é posterior e fornecedor não está confirmado.  
**Suposição:** nenhuma integração de calendário na fundação.

### G-10 — LGPD e portabilidade

**Lacuna:** bases legais, DPO/controlador, prazos por classe, procedimento de titular e formato de exportação.  
**Suposição:** coletar o mínimo, classificar dados, registrar auditoria e adiar automações de anonimização até validação jurídica.

### G-11 — Estratégia de ambientes Supabase

**Lacuna:** projetos separados, branching do Supabase ou banco staging compartilhado.  
**Suposição:** projetos separados para dev/staging/prod; previews nunca usam produção.

### G-12 — Gerenciador de pacotes

**Resolvido no Marco 1:** pnpm 11 com lockfile versionado e versões exatas.

### G-13 — Biblioteca de componentes

**Decisão do Marco 1:** o shell simples usa componentes próprios, HTML semântico, foco visível e testes de acessibilidade. Primitivas especializadas serão avaliadas quando surgirem diálogos, menus compostos ou seletores complexos.

### G-14 — Estratégia de testes

**Resolvido no Marco 1:** Vitest + Testing Library para unitários/componentes, Playwright para E2E e SQL executável para cobertura RLS. pgTAP poderá ser adicionado no M3 para a matriz cross-tenant.

### G-15 — Soft delete

**Conflito:** RN-010 diz que exclusão lógica é padrão, enquanto a solicitação pede soft delete apenas quando fizer sentido.  
**Interpretação:** a solicitação mais específica prevalece. Soft delete será aplicado a agregados sujeitos a restauração/retention; relações técnicas podem ser excluídas fisicamente com auditoria quando necessário.

### G-16 — Acesso direto do cliente ao Supabase

**Lacuna:** o SDD permite leituras simples diretas.  
**Suposição:** habilitar apenas onde RLS e contrato de exposição estiverem testados; tabelas administrativas, integrações, jobs e segredos ficam fora do schema exposto.

### G-17 — Metodologias e CERNE

**Resolvido:** CERNE é opcional e desabilitado por padrão.  
**Suposição:** seed CERNE não entra na fundação; apenas a arquitetura evita dependências obrigatórias.

## 4. Conflitos e observações do SDD

1. O SDD usa `incubators` como “unidade gestora”, mas também exige “unidades”; a hierarquia não está fechada.
2. O modelo conceitual usa `resource_type/resource_id`, porém esse padrão não fornece FKs nativas. A proposta troca por atribuições com escopos tipados e FKs verificáveis.
3. O exemplo de RLS cobre apenas `SELECT`; a implementação precisa de `INSERT`, `UPDATE` com `USING` + `WITH CHECK` e `DELETE`.
4. A variável histórica `SUPABASE_SECRET_KEY` deve ser validada contra o modelo de chaves vigente no momento do scaffold; nenhuma chave elevada será exposta.
5. Upload resumível direto depende de comportamento CORS, políticas do Workspace e duração da sessão; haverá spike antes da implementação completa.
6. O SDD pede histórico imutável, mas também soft delete padrão. Registros históricos/auditoria devem ser append-only; soft delete não pode permitir reescrita silenciosa.
7. O SDD menciona Realtime na figura, mas não há requisito que o torne obrigatório na fundação; não será habilitado sem caso de uso.

## 5. Evidências da Fase A

- O repositório estava vazio, exceto por `.mcp.json` e metadados Git.
- O documento de origem contém 374 parágrafos, 21 tabelas, quatro objetos inline e três figuras.
- Corpo, tabelas, cabeçalho, rodapé e as três figuras foram inspecionados.
- Não existem comentários, notas de rodapé ou notas de fim no DOCX.
- A renderização paginada não pôde ser executada porque LibreOffice/soffice não está instalado; a leitura estrutural OOXML foi concluída.
