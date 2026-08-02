# Marco 6 — Programas, turmas e startups

## Resultado

O Marco 6 inicia o primeiro módulo vertical do MVP com persistência real. As rotas **Programas** e **Startups** deixam de ser placeholders e passam a consultar e alterar o Supabase usando sessão SSR, Server Actions, validação Zod, grants mínimos e RLS.

O corte entregue cobre:

- criação da primeira incubadora quando a organização ainda não possui uma;
- tipos de programa configuráveis por organização ou incubadora;
- programas e múltiplas turmas;
- cadastro institucional da startup, estágio, setor e localização;
- membros de equipe independentes de conta de acesso;
- representante vinculado a uma conta como acesso contextual à própria startup;
- matrícula manual em turma;
- transferência atômica entre turmas com preservação do vínculo anterior;
- linha do tempo append-only de cadastro, equipe e matrículas.

Nenhuma tabela ou formulário do marco possui dependência CERNE.

## Migration

`20260802193238_m6_programs_startups_vertical.sql` cria:

- `program_types`;
- `programs`;
- `cohorts`;
- `program_members`;
- `startups`;
- `startup_members`;
- `startup_enrollments`;
- `startup_history`.

Todas as relações de negócio carregam `organization_id`. FKs compostas impedem relações entre tenants; triggers adicionais validam escopo da incubadora, tipo de programa, conta vinculada e matrícula. Os agregados restauráveis usam `deleted_at`; relações e histórico não adotam soft delete indiscriminado.

`file_links` passa a aceitar `program_id` e `startup_id` com FKs compostas reais. Assim, documentos do programa e da startup continuam governados pelo Supabase e pelo escopo `file.manage`, sem recorrer a identificadores polimórficos ou usar o Drive como banco de metadados.

## RBAC e RLS

O catálogo recebe `program.read`, `program.manage`, `startup.read` e `startup.manage`. A migration distribui essas capacidades aos papéis de sistema existentes e também aos papéis criados em organizações futuras.

- gestores acessam o domínio conforme organização/unidade/incubadora atribuída;
- membros explícitos de programa leem somente o programa correspondente;
- membros vinculados a uma startup leem somente a própria startup;
- representantes ativos podem gerenciar a equipe da própria startup, sem ganhar acesso ao portfólio da incubadora;
- matrícula exige simultaneamente gestão da startup e do programa;
- `startup_history` é somente leitura para clientes;
- `anon` não recebe grants nas tabelas do domínio;
- colunas estruturais como `organization_id`, `incubator_id`, `program_id`, `startup_id` e `cohort_id` não podem ser trocadas por updates comuns do cliente.

`public.transfer_startup_enrollment` é a exceção transacional necessária ao RF-014. A RPC deriva tenant e incubadora dos registros, verifica as duas permissões, bloqueia a matrícula anterior, marca-a como transferida e cria a nova com `previous_enrollment_id`. O cliente nunca fornece `organization_id` para essa operação.

## Interface

As páginas mantêm a identidade Sertão Maker e distinguem claramente dados reais do dashboard demonstrativo. Formulários usam HTML semântico e feedback acessível. Estados vazios orientam a sequência correta sem criar mocks silenciosos.

Fluxo recomendado na interface:

1. criar ou selecionar uma incubadora;
2. criar um tipo de programa;
3. criar programa e turma;
4. cadastrar startup e equipe;
5. vincular ou mover a startup para uma turma.

## Testes

- schemas Zod: normalização, datas, URL/e-mail e ausência de CERNE;
- pgTAP/RLS: fluxo completo, linha do tempo, transferência, isolamento A/B, representante restrito e grants mínimos;
- suíte unitária atual: 13 arquivos e 38 testes aprovados;
- lint e TypeScript strict aprovados durante a implementação.

O reset Supabase local não pôde executar porque o Docker não está disponível nesta máquina (`LegacyDbBootstrapError: failed to inspect service`). Por isso, migration, seed e pgTAP permanecem como gate obrigatório do workflow antes de aplicar a migration ao projeto hospedado ou declarar o Marco 6 pronto para produção.

## Limitações deliberadas

- edição detalhada e arquivamento pela UI ainda não foram expostos; o schema e os grants já preparam essas operações;
- vincular uma conta a um membro depende do fluxo de convite/diretório de usuários; cadastrar o e-mail não cria acesso silenciosamente;
- equipe de coordenação do programa existe no banco, mas sua gestão visual depende do diretório de membros;
- critérios de admissão e campos personalizados possuem armazenamento estruturado, mas o editor configurável pertence à evolução do domínio;
- diagnósticos, planos, trilhas, indicadores e métricas do dashboard continuam fora deste marco.

## Próximo marco

O próximo corte recomendado é o Marco 7: templates metodológicos genéricos e versionados, aplicação de diagnóstico obrigatoriamente vinculada a uma startup e CERNE apenas como pacote opcional.
