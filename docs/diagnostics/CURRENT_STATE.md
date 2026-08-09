# Diagnósticos — estado atual

## Escopo da análise

Este inventário confronta o SDD, a especificação completa do módulo, o arquivo `ISA_Diagnostico_Maturidade_v2.1.xlsx`, as oito telas de referência e a implementação existente. Os números visíveis nas imagens são ilustrativos e não são requisitos de seed.

## O que já existe

### Banco

O Marco 7 criou uma fundação válida, porém reduzida:

- `diagnostic_templates`: família e versão ainda combinadas na mesma tabela;
- `diagnostic_dimensions`;
- `diagnostic_criteria`;
- `diagnostic_assessments`: aplicação vinculada obrigatoriamente a uma startup e a uma versão publicada;
- `diagnostic_responses`;
- enums de status, índices básicos, auditoria e proteção de estruturas publicadas;
- permissões `diagnostic.read`, `diagnostic.manage`, `diagnostic.respond` e `diagnostic.validate`;
- RLS por organização/incubadora/startup;
- dois testes pgTAP de isolamento entre tenants.

### Aplicação

- rota única `/o/[organizationSlug]/i/[incubatorSlug]/diagnosticos`;
- criação de modelo, dimensão, critério e aplicação;
- publicação simples de modelo;
- preenchimento e validação na mesma área;
- cálculo parcial de score;
- componentes visuais e shell da incubadora já reutilizáveis.

## Estado funcional após os incrementos

Já existem biblioteca e versionamento, editor estrutural, campanhas, seleção em
lote, respondentes e avaliadores, resposta e validação separadas, autosave com
`lock_version`, detecção explícita de conflito, evidências HTTPS, scores,
classificações, gatilhos, dashboard de campanha, resultado individual, histórico
ilimitado e exportação CSV autorizada.

Permanecem como lacunas:

- importação XLSX assistida e relatório de validação;
- autosave do editor de templates (o autosave de respostas está concluído);
- upload binário resumível para o Shared Drive institucional;
- convite contextual de respondente ainda sem membership;
- inclusão de novas fórmulas derivadas configuráveis; as fórmulas padrão de
  runway e ticket médio, além da edição dos indicadores manuais, metas, N/A e
  evidências, já estão implementadas;
- envio real de comunicações e lembretes por provedor transacional;
- criação de ação e recomendação de conteúdo, dependentes do domínio de Planos
  de Ação ainda não existente no banco.

## Lacunas de modelo

| Tema           | Atual                            | Necessário                                                  |
| -------------- | -------------------------------- | ----------------------------------------------------------- |
| Família/versão | mesma tabela, `family_id` sem FK | catálogo de famílias e versões imutáveis                    |
| Dimensão       | nome, peso e ordem               | código, essencialidade, estágios e regras                   |
| Critério       | opções/rubrica em JSONB          | código, níveis normalizados, estágio, N/A e gatilho         |
| Aplicação      | instância isolada                | campanha, participantes, respondentes, prazo e concorrência |
| Evidência      | texto livre                      | metadado, arquivo/link, estado, auditoria e permissão       |
| Validação      | colunas na resposta              | autoridade e histórico próprios                             |
| Score          | agregado na aplicação            | score por dimensão, classificação e snapshot reproduzível   |
| Histórico      | ciclos como aplicações           | séries ilimitadas por linhas, nunca T0–T5 como colunas      |

## Problemas críticos encontrados

### P0 — autorização por coluna

A política anterior autorizava a mesma linha para respondentes e avaliadores, enquanto os `GRANT UPDATE` abrangiam campos autodeclarados e validados. Assim, um respondente autorizado poderia tentar gravar `validated_value`, `validated_by` e `validated_at`; um avaliador também poderia tentar reescrever a autoavaliação.

Correção criada em `20260803071000_harden_diagnostic_response_authorization.sql`:

- trigger interno diferencia campos de resposta e validação;
- validação exige `diagnostic.validate`;
- autoavaliação exige `diagnostic.respond` ou gestão da startup;
- o `validated_by` precisa ser o usuário autenticado;
- testes de regressão exercitam as duas tentativas de escalada.

### P0 — totais derivados graváveis

`self_score` e `validated_score` eram recalculados por uma Server Action, mas também estavam liberados para atualização pelo papel `authenticated`. A correção revoga esses privilégios e recalcula no banco após mudanças nas respostas.

### P1 — publicação insuficientemente validada

A ação atual exige apenas um critério. Ela não verifica soma de pesos, códigos únicos, rubricas, faixas, dimensões essenciais ou coerência de estágios. A publicação da Fase 2 deve ser uma função transacional no banco.

### P1 — carregamento monolítico

A página atual consulta modelos, dimensões, critérios, aplicações e respostas em uma única renderização e usa um componente cliente extenso. Isso não escala para campanhas nem preserva a privacidade por função.

### P1 — evidência como texto

O campo atual não comprova existência, propriedade ou acesso ao arquivo. URLs nunca serão usadas como autorização.

## Divergências entre fontes

1. O XLSX define os rótulos 0–4 como **Inexistente, Iniciado, Estruturado, Validado e Sistematizado**. A seção 6.3 da especificação e a tela de resposta usam **Inexistente, Inicial, Em desenvolvimento, Consolidado e Otimizado**. Pela precedência declarada, o XLSX é a fonte inicial para o seed; a nomenclatura precisa ser confirmada antes de publicar a versão padrão.
2. O XLSX contém 9 dimensões e 36 critérios. As telas ilustram 86 ou 98 critérios; esses totais não devem ser copiados.
3. O XLSX usa T0–T5 em colunas por limitação da planilha. No sistema, cada ciclo será uma linha/instância e o histórico será ilimitado.
4. Algumas fórmulas renderizaram `#NAME?` fora do Excel por dependência de nomes definidos. As fórmulas serão reimplementadas e testadas, não copiadas como valores cacheados.

## Reuso seguro

Devem ser preservados:

- contexto de organização/incubadora e helpers de autorização;
- `files`, `file_versions` e `file_links` como base de metadados do Drive;
- auditoria existente;
- layout, sidebar, tipografia e tokens Sertão Maker;
- `Button`, `FormField`, `FileUpload`, `StatusBadge`, `PageHeader` e `EmptyState`;
- IDs das aplicações e respostas existentes, com migrations aditivas e backfill.

## Incrementos posteriores ao inventário

As lacunas deste documento orientaram as migrations da Fase 2 e o incremento
seguinte. Já foram entregues catálogo de famílias, versões imutáveis, rubricas
normalizadas, classificações, campanhas, respondentes, validações históricas,
indicadores, gatilhos, scores materializados, biblioteca navegável, editor
estrutural com edição/exclusão/reordenação, duplicação de versões, gestão de
respondentes e avaliador por aplicação, evidências externas HTTPS, indicadores
manuais com concorrência otimista e máquina de estados de envio e validação. A
lista original permanece acima como registro do
diagnóstico do código anterior, não como descrição do estado atual.

## Estado da validação

- lint: aprovado em 08/08/2026;
- typecheck: aprovado em 08/08/2026;
- testes unitários: consulte `PHASE_2_IMPLEMENTATION.md` para a contagem da execução mais recente;
- pgTAP/RLS local: o Postgres local em `127.0.0.1:54322` não estava ativo. Os testes SQL permanecem versionados e os cenários equivalentes de editor, duplicação e workflow foram executados no Supabase remoto dentro de transações com `rollback`.
