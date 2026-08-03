# Marco 7 — Gestão da Incubadora e Diagnósticos

## Entregas

- gestão de identidade, contato, fuso e módulos habilitados da incubadora;
- atribuição e remoção de papéis locais para membros ativos do Proodos;
- modelos de diagnóstico privados por incubadora, com família e versão;
- dimensões ponderadas e critérios com nota, texto, escolha, moeda, percentual, data, link ou referência de arquivo;
- publicação imutável de versões;
- aplicação obrigatoriamente vinculada a uma startup da mesma incubadora;
- autoavaliação preservada separadamente da nota e do parecer validados;
- opção “não se aplica” somente com justificativa;
- notas consolidadas de autoavaliação e validação em escala de 0 a 5;
- RLS, grants explícitos, auditoria e testes de isolamento entre organizações.

## Decisões de domínio

- CERNE permanece opcional: um modelo pode representá-lo, mas nenhuma tabela ou fluxo exige CERNE.
- O modelo publicado é imutável. Alterações metodológicas devem gerar outra versão da mesma família.
- Uma aplicação conserva o `template_id` publicado usado no início e o `startup_id`; assim mudanças futuras não alteram o histórico.
- Evidências grandes continuam no Google Drive. O diagnóstico armazena observações e, em evolução posterior, relacionará metadados de `files`/`file_links`.
- A gestão acontece sempre no contexto da incubadora da URL; não há seletor redundante de incubadora nos formulários.

## Segurança

As tabelas `diagnostic_templates`, `diagnostic_dimensions`, `diagnostic_criteria`, `diagnostic_assessments` e `diagnostic_responses` têm RLS habilitada e privilégios de coluna explícitos. Gestores usam permissões `diagnostic.*`; membros de startup só podem alcançar aplicações ligadas à própria startup pelas funções de escopo já auditadas.

## Pendências posteriores

- interface dedicada para duplicar uma versão publicada como novo rascunho;
- associação visual de evidências do Google Drive a respostas;
- gráficos radar/evolução e comparação entre ciclos;
- submissão e encerramento em lote do diagnóstico;
- convites por e-mail para novas pessoas (o Marco 7 gerencia papéis de membros já ativos).
