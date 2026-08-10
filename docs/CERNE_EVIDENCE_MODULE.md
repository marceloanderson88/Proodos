# Governança de evidências CERNE

O módulo organiza o acompanhamento das 20 práticas-chave descritas no Manual CERNE I e II 2026: 14 práticas do CERNE 1 e 6 do CERNE 2.

## Fluxo

1. A incubadora cria um ciclo anual e escolhe o nível-alvo.
2. O sistema gera a matriz de requisitos, responsáveis e a árvore lógica do Google Drive.
3. A equipe registra a evidência no momento em que a prática ocorre, podendo vincular programas, turmas, startups ou chamadas já existentes.
4. Alertas apontam itens sem responsável, vencimentos, atrasos e falhas de sincronização.
5. Gestores convidam avaliadores por ciclo ou prática. Acesso e pareceres dependem da aceitação do termo de confidencialidade.

## Estrutura do Drive

`CERNE/{incubadora}/{ano - ciclo}/CERNE {nível}/{processo}/{prática}/{contexto}/{entidade}`

Os metadados, caminhos e estados de sincronização estão implementados. A criação física das pastas e o envio de arquivos dependem da ativação do adaptador Google Drive e das credenciais OAuth da incubadora.

## Integrações da plataforma

- Programas e pré-incubação: atalho contextual para planejamento, agregação de valor e monitoramento.
- Startups: atalho contextual para diagnóstico, planejamento e acompanhamento.
- Chamadas, turmas e demais módulos: disponíveis como contexto no formulário de evidência; novos atalhos podem reutilizar os parâmetros `sourceType`, `sourceId`, `sourceName` e `practice`.
