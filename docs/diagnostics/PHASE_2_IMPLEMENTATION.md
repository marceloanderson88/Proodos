# Diagnósticos — implementação da Fase 2

## Escopo entregue

A Fase 2 estabeleceu o domínio executável do módulo de diagnósticos sem transformar CERNE em dependência. A fonte metodológica inicial é a planilha `ISA_Diagnostico_Maturidade_v2.1.xlsx`, preservada como modelo opcional e versionado por incubadora.

O modelo padrão v2.1 contém:

- 9 dimensões com pesos que somam 100%;
- 36 critérios;
- 180 rubricas, cinco níveis por critério;
- 5 faixas de classificação;
- 25 indicadores;
- 13 regras de gatilho.

Cada nova incubadora recebe uma cópia publicada e imutável do modelo padrão. O instalador é idempotente e também foi executado para as incubadoras existentes.

## Fluxos implementados

1. Biblioteca da incubadora com versões publicadas e rascunhos.
2. Visualização detalhada de dimensões, critérios, rubricas, indicadores, gatilhos e validações estruturais.
3. Criação transacional de campanha com período, modelo, programa/turma opcionais, startups e avaliador.
4. Criação automática dos participantes e de uma aplicação por startup.
5. Acompanhamento da campanha por status e pontuações.
6. Autoavaliação e validação oficial em campos separados.
7. Pontuação por dimensão e geral na escala 0–100.
8. Classificação, gap médio, cobertura de evidências e gatilhos calculados no banco.
9. Histórico inicial de convite da campanha.

## Segurança e isolamento

- Todas as tabelas do domínio usam RLS.
- Campanhas, aplicações, participantes e estruturas validam `organization_id` e `incubator_id` no banco.
- O respondente não pode gravar a validação oficial.
- O avaliador não pode reescrever a autoavaliação.
- Pontuações, classificação e gatilhos não possuem escrita direta pelo cliente.
- A criação de campanha usa uma função transacional `SECURITY DEFINER` com validação explícita de permissão e escopo.
- Helpers usados pelas políticas RLS retornam somente booleano, são executáveis apenas por `authenticated` e permanecem no schema `private`, não exposto pela API.

## Migrations

- `20260803071000_harden_diagnostic_response_authorization.sql`
- `20260803072000_diagnostics_phase2_domain_foundation.sql`
- `20260803072500_diagnostics_phase2_advisor_hardening.sql`
- `20260803073000_diagnostics_standard_v21_seed.sql`
- `20260803074000_diagnostics_phase2_scoring_engine.sql`
- `20260803075000_diagnostics_campaign_workflow.sql`
- `20260803075500_fix_diagnostic_campaign_scope.sql`
- `20260803075600_fix_diagnostic_campaign_enrollment_scope.sql`
- `20260803075700_fix_diagnostic_campaign_identifier.sql`
- `20260803075800_grant_diagnostic_rls_helpers.sql`
- `20260803075900_index_diagnostic_respondents_assessment.sql`
- `20260803080000_create_diagnostic_template_draft.sql`

As migrations corretivas 755–758 permanecem versionadas porque as versões anteriores já haviam sido aplicadas no projeto remoto; removê-las criaria divergência entre o histórico local e o Supabase.

## Evidências e Google Drive

A relação `diagnostic_response_evidence` armazena metadados, estado, autoria e referência ao arquivo gerenciado pelo módulo de arquivos. O upload binário continua no Google Drive. Nesta fase, a tela registra a referência textual legada; o seletor/upload resumível conectado ao Drive é uma pendência explícita e não foi simulado silenciosamente.

## Testes e verificações

- Teste de regressão pgTAP para separação entre resposta e validação.
- Teste pgTAP do seed, pesos, rubricas, indicadores, scores e gatilhos.
- Teste transacional remoto da criação de campanha, com rollback, comprovando 1 participante, 1 aplicação e 1 evento para uma startup.
- Testes unitários Zod para período e participantes da campanha.
- `lint`, `typecheck` e suíte Vitest são obrigatórios antes da conclusão.

O projeto remoto não possui a extensão pgTAP. Os arquivos SQL são destinados ao ambiente local de testes do Supabase. A execução remota equivalente foi feita em transação com rollback, sem persistir dados sintéticos.

O advisor de segurança mantém avisos para RPCs `SECURITY DEFINER` intencionais. Essas funções são pontos transacionais explícitos, verificam `auth.uid()` e permissão/escopo no corpo e concedem execução somente a `authenticated`. O advisor também sinaliza que a proteção contra senhas vazadas está desativada; essa opção deve ser habilitada manualmente no painel do Supabase Auth. Índices novos aparecem como “não utilizados” enquanto ainda não há tráfego de produção suficiente, portanto não foram removidos prematuramente.

## Pendências para a Fase 3

- editor completo de rascunhos e fluxo de duplicação/nova versão;
- atribuição e convite de respondentes por aplicação;
- submissão, reabertura e validação final com máquina de estados completa;
- upload resumível de evidências no Google Drive;
- indicadores editáveis e fórmulas derivadas na interface;
- comparação histórica entre ciclos e dashboards/gráficos;
- exportação e comunicação real das campanhas;
- testes E2E autenticados dos novos fluxos.
