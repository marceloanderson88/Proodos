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
10. Editor funcional de rascunhos com códigos, pesos, essencialidade, critérios e rubricas 0–4.
11. Duplicação integral de versão publicada para um novo rascunho, incluindo estágios, indicadores e gatilhos.
12. Submissão, reabertura e validação final com histórico e snapshot imutável das validações.
13. Edição, exclusão e reordenação atômica de dimensões e critérios em rascunhos.
14. Gestão de responsável principal, colaboradores, leitores e avaliador oficial por aplicação.
15. Evidências externas HTTPS vinculadas à resposta, com autoria, estado e remoção lógica.
16. Autosave serializado com debounce, estado offline, `lock_version` e conflito explícito.
17. Dashboard individual com scores, dimensões e gatilhos, além de histórico ilimitado entre ciclos.
18. Exportação CSV da campanha, autorizada pelas mesmas políticas RLS das telas.

## Segurança e isolamento

- Todas as tabelas do domínio usam RLS.
- Campanhas, aplicações, participantes e estruturas validam `organization_id` e `incubator_id` no banco.
- O respondente não pode gravar a validação oficial.
- O avaliador não pode reescrever a autoavaliação.
- O respondente perde escrita após o envio e só recupera acesso por reabertura auditada.
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
- `20260803081000_diagnostics_editor_and_assessment_workflow.sql`
- `20260803081100_grant_diagnostic_assessment_writes.sql`
- `20260803081200_mark_diagnostic_assessment_in_progress.sql`
- `20260808090000_diagnostic_draft_editing.sql`
- `20260808093000_diagnostic_participant_management.sql`
- `20260808100000_seed_diagnostic_role_permissions.sql`
- `20260809100000_diagnostic_response_autosave.sql`
- `20260809101000_fix_diagnostic_autosave_criterion_scope.sql`

As migrations corretivas 755–758 permanecem versionadas porque as versões anteriores já haviam sido aplicadas no projeto remoto; removê-las criaria divergência entre o histórico local e o Supabase.

A migration `20260808100000` corrige também o bootstrap: papéis sistêmicos de
organizações novas passam a receber as permissões de diagnóstico previstas para
gestores, agentes, avaliadores e auditores, com backfill idempotente.

## Evidências e Google Drive

A relação `diagnostic_response_evidence` armazena metadados, estado, autoria e referência ao arquivo gerenciado pelo módulo de arquivos. A tela permite vincular e remover evidências externas HTTPS de forma estruturada. O upload binário continua destinado ao Google Drive, mas o adapter real permanece bloqueado por B-03/B-04 (Shared Drive/conta de serviço e política institucional de arquivos); a API existente continua falhando explicitamente, sem simular upload.

## Testes e verificações

- Teste de regressão pgTAP para separação entre resposta e validação.
- Teste pgTAP do seed, pesos, rubricas, indicadores, scores e gatilhos.
- Teste transacional remoto da criação de campanha, com rollback, comprovando 1 participante, 1 aplicação e 1 evento para uma startup.
- Teste transacional remoto do editor, publicando em rollback uma estrutura com 1 dimensão, 1 critério, 5 rubricas e 5 classificações.
- Teste transacional remoto da duplicação integral, preservando 9 dimensões, 36 critérios, 180 rubricas, 25 indicadores e 13 gatilhos.
- Teste transacional remoto do workflow completo, com 36 respostas, envio, validação final, 36 revisões imutáveis e eventos de histórico.
- Testes unitários Zod para período e participantes da campanha.
- Testes unitários Zod para edição, responsáveis e URL HTTPS de evidência.
- Verificação transacional remota, com rollback, de edição/reordenação e atribuição de respondente/avaliador.
- `lint`, `typecheck` e suíte Vitest são obrigatórios antes da conclusão.

O projeto remoto não possui a extensão pgTAP. Os arquivos SQL são destinados ao ambiente local de testes do Supabase. A execução remota equivalente foi feita em transação com rollback, sem persistir dados sintéticos.

O advisor de segurança mantém avisos para RPCs `SECURITY DEFINER` intencionais. Essas funções são pontos transacionais explícitos, verificam `auth.uid()` e permissão/escopo no corpo e concedem execução somente a `authenticated`. O advisor também sinaliza que a proteção contra senhas vazadas está desativada; essa opção deve ser habilitada manualmente no painel do Supabase Auth. Índices novos aparecem como “não utilizados” enquanto ainda não há tráfego de produção suficiente, portanto não foram removidos prematuramente.

## Pendências após este incremento

- convite por e-mail para pessoas ainda sem membership aceita;
- upload resumível de evidências no Google Drive;
- indicadores editáveis e fórmulas derivadas na interface;
- comunicação real das campanhas;
- importação XLSX assistida e autosave do editor;
- integração com Planos de Ação e conteúdos, cujo domínio ainda não existe;
- testes E2E autenticados dos novos fluxos.
