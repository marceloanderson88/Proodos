# Diagnósticos — plano de implementação

## Estratégia

O trabalho será aditivo, com compatibilidade temporária. Nenhuma migration apaga dados e nenhuma tela nova depende de números ilustrativos das referências.

## Fase 1 — análise e correção emergencial

Entregas:

- cinco documentos de arquitetura e planejamento;
- inventário do XLSX e das telas;
- migration P0 de autorização por campo e cálculo protegido;
- teste pgTAP de separação respondente/avaliador.

Aceite:

- lint, typecheck e testes unitários aprovados;
- teste RLS executado em banco Supabase antes da promoção;
- escala 0–4 e política de compartilhamento decididas.

## Fase 2 — modelo, seed, cálculos e RLS

### Migration 2.1 — catálogo/versionamento

- famílias de template;
- backfill de `family_id` existente;
- códigos, essencialidade, estágios, rubricas e classificações;
- validação transacional de publicação;
- imutabilidade completa após publicação.

### Migration 2.2 — campanhas e instâncias

- campanhas, participantes, respondentes e atribuições;
- prazo, timezone, estados e concorrência;
- validação e evidências separadas;
- indicadores, scores, gatilhos e histórico.

### Migration 2.3 — seed XLSX v2.1

- 1 família padrão;
- 1 versão em rascunho até a decisão sobre a escala;
- 9 dimensões, 36 critérios e 180 níveis de rubrica;
- 5 faixas de classificação;
- 25 indicadores confirmados pelo importador da planilha oficial;
- 13 gatilhos críticos e parâmetros;
- relatório de importação reexecutável.

### Testes

- isolamento entre duas organizações e duas incubadoras;
- startup acessa somente a própria instância;
- avaliador somente instâncias atribuídas;
- mentor sem concessão não acessa;
- versão publicada não muda;
- pesos aplicáveis normalizam corretamente;
- N/A, evidência, classificação, alavancagem e gatilhos;
- concorrência otimista;
- índices de todas as FKs e colunas de RLS.

Aceite:

- schema e seed reproduzíveis do zero;
- advisor de segurança sem tabela pública sem RLS;
- cálculos comparados a casos de teste derivados do XLSX;
- nenhuma mudança manual necessária no Dashboard.

## Fase 3 — biblioteca, editor e importação

Estado: **em andamento**. Criação de rascunho, editor estrutural inicial,
rubricas, validação de publicação e duplicação integral de versão estão
concluídos. Permanecem edição/reordenação, autosave e importação XLSX.

Rotas:

- `/diagnosticos/modelos`;
- `/diagnosticos/modelos/novo`;
- `/diagnosticos/modelos/[templateId]/versoes/[versionId]`;
- `/diagnosticos/modelos/importar`.

Componentes:

- `DiagnosticLibrary`;
- `TemplateEditorShell`;
- `StructureTree`;
- `DimensionEditor`;
- `CriterionEditor`;
- `RubricEditor`;
- `TemplateValidationSummary`;
- `XlsxImportWizard` e `ImportReport`.

Aceite:

- fluxo por seleção progressiva, teclado e foco visível;
- autosave de rascunho do editor;
- publicação bloqueada até todas as regras passarem;
- duplicação cria nova versão editável;
- importação não duplica entidades nem publica silenciosamente.

## Fase 4 — campanhas e resposta

Estado: **em andamento**. Campanha, participantes, acompanhamento, resposta,
submissão, reabertura e validação final estão implementados. Permanecem convite
de respondentes, comunicação real, autosave concorrente e evidência binária.

Rotas:

- `/diagnosticos/campanhas/nova`;
- `/diagnosticos/campanhas/[campaignId]`;
- `/diagnosticos/responder/[assessmentId]`.

Entregas:

- wizard de cinco passos;
- seleção por programa/turma ou manual;
- responsáveis e respondentes identificados;
- comunicação registrada e reprocessável;
- painel operacional;
- resposta por dimensão, autosave, N/A e evidência;
- estados e transições auditados.

Aceite:

- campanha exige início e fim;
- participantes são snapshot da campanha;
- notificações falhas não revertem a transação do banco;
- reabertura é auditada;
- dois usuários não sobrescrevem respostas silenciosamente.

## Fase 5 — validação, dashboards e plano

Entregas:

- workspace de validação lado a lado;
- dashboard da campanha;
- dashboard individual;
- histórico ilimitado e comparação de ciclos;
- gatilhos e recomendações;
- criação de ações e vínculo a conteúdo/trilha;
- exportações com autorização.

Aceite:

- score oficial somente após validação;
- toda mudança oficial gera histórico;
- ação mantém rastreabilidade até critério/gatilho;
- conteúdo é associado à ação, sem CERNE obrigatório;
- indicadores sensíveis respeitam permissão própria.

## Fase 6 — revisão e promoção

- lint, formatter, typecheck, unitários, integração, pgTAP e E2E;
- acessibilidade automatizada e revisão por teclado;
- advisor Supabase de segurança e desempenho;
- revisão responsiva das oito telas;
- runbook, rollback e observabilidade;
- deploy preview, smoke autenticado e promoção.

## Dependências

- decisão da nomenclatura 0–4;
- decisão do compartilhamento entre Proodos e incubadoras;
- Google Drive operacional para evidências reais;
- provedor de e-mail/notificação para disparo de campanhas;
- dados de programa/turma e representantes de startup consistentes.

## Riscos e mitigação

| Risco                             | Mitigação                                           |
| --------------------------------- | --------------------------------------------------- |
| quebrar dados do M7               | migrations aditivas, backfill e compatibilidade     |
| score divergente do XLSX          | casos-ouro e cálculo único no banco                 |
| vazamento de validação/financeiro | RLS + atribuição + testes de coluna                 |
| template publicado mutável        | trigger e função de publicação transacional         |
| concorrência em autosave          | `lock_version` e conflito explícito                 |
| Drive e banco divergirem          | estados pendentes e reconciliação                   |
| tabelas/campanhas crescerem       | cursor, índices compostos e agregados por instância |

## Dúvidas realmente bloqueantes

1. Qual nomenclatura oficial será publicada para os níveis 1–4: a do XLSX ou a da tela/especificação?
2. Um modelo “Proodos” pode ser clonado por qualquer incubadora, ou a biblioteca compartilhada exige aprovação individual?
3. Avaliadores podem ver todos os indicadores financeiros da startup ou somente critérios/evidências atribuídos?

As demais lacunas podem avançar com suposições registradas e configuração posterior.
