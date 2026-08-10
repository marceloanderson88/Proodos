# Módulo de chamadas e seleção

## Modelo

Cada chamada pertence a uma incubadora, a um programa e obrigatoriamente a uma turma. O programa representa a iniciativa; a turma, sua execução; e a chamada, uma rodada de ingresso. Uma turma pode receber várias chamadas.

## Fluxo

1. Gestor cria a chamada com cronograma, formulário, rubrica, vagas e política territorial.
2. A publicação congela a versão do formulário.
3. O portal público recebe propostas e devolve um protocolo único.
4. A incubadora habilita ou inabilita cada inscrição.
5. Avaliadores com `selection.review` são adicionados à banca e recebem propostas manual ou automaticamente.
6. O avaliador aceita confidencialidade, pode declarar impedimento e envia uma nota por critério.
7. Divergência acima do limite exige uma avaliação adicional antes do ranking.
8. O ranking gera snapshots incrementais, aplica ajustes deferidos e a política territorial configurada.
9. Resultados preliminar e final são publicados; o proponente pode recorrer e responder à convocação com protocolo e e-mail.
10. A conversão cria/reaproveita a startup, registra representante e matrícula na turma com origem `selection_process`.

## Segurança

- As tabelas não têm grants diretos para `anon` ou `authenticated`; os fluxos passam por funções validadas.
- Gestores operam no escopo da incubadora por `selection.manage` e `selection.publish`.
- Avaliadores recebem somente propostas explicitamente atribuídas, sem identidade pessoal do proponente.
- Atribuições e avaliações não são apagadas durante redistribuições ou impedimentos.
- Formulários, rankings, recursos e conversões mantêm histórico e auditoria.

## Instalação

Aplicar a migration:

`supabase/migrations/20260810120000_selection_calls_full_module.sql`

Depois, regenerar os tipos do Supabase se o schema remoto tiver outras alterações posteriores. Os contratos das novas RPCs já estão registrados em `lib/supabase/database.types.ts`.
