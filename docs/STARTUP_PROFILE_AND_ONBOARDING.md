# Perfil, entrada e leitura diagnóstica de startups — etapas 1 a 5

## Escopo consolidado

Esta entrega corrige o fluxo operacional da startup sem avançar para a reformulação dos diagnósticos. A incubadora ativa é determinada pela rota e nunca é escolhida dentro dos formulários.

## Rotas

- `/o/:organization/i/:incubator/startups`: portfólio, solicitações pendentes e convites.
- `/o/:organization/i/:incubator/startups/nova`: cadastro administrativo direto.
- `/o/:organization/i/:incubator/startups/:startupId`: perfil operacional.
- `/o/:organization/i/:incubator/startups/:startupId/editar`: edição autorizada.
- `/cadastro/startup/:organization/:incubator`: autocadastro público com criação de conta.
- `/convites/aceitar`: aceite autenticado de convites.

## Perfil operacional

O perfil reúne identidade, equipe, programas e turmas, diagnósticos e histórico. A startup é acessível por gestores autorizados e pelos próprios membros ativos; somente gestores com `startup.manage` ou representantes ativos podem alterar seus dados.

## Fluxo A — autocadastro

1. O representante cria uma conta pelo formulário público.
2. O Supabase Auth envia a confirmação de e-mail.
3. O servidor valida a identidade criada no Auth e registra uma `startup_application` pendente.
4. Um gestor da incubadora aprova ou recusa.
5. A aprovação cria, na mesma transação, a startup, o membership ativo, o papel contextual de representante, o membro representante e a matrícula opcional.

Uma solicitação pendente não aparece no portfólio como startup ativa.

## Fluxo B — convite pela incubadora

1. O gestor informa startup, representante, e-mail e turma opcional.
2. O sistema cria um convite expirável cujo token bruto nunca é persistido.
3. O Supabase Auth envia o e-mail usando `SUPABASE_SECRET_KEY` somente no servidor.
4. Após autenticação e aceite, o vínculo é materializado transacionalmente.
5. Se a startup ainda não existia, ela é criada; caso contrário, o representante é ligado à startup existente.

## Segurança e isolamento

- As tabelas novas têm RLS e não concedem acesso a `anon`.
- O autocadastro público grava pela camada de servidor após validar o usuário no Supabase Auth.
- O solicitante lê apenas a própria solicitação.
- Gestores leem solicitações e convites somente na incubadora autorizada.
- Aprovação usa função transacional com verificação de `startup.manage`.
- `organization_id` e `incubator_id` são derivados da rota e validados novamente no banco.
- Convites usam hash SHA-256; a secret key nunca é enviada ao navegador.

## Estados

Solicitação: `pending → approved | rejected`; retirada futura: `pending → withdrawn`.

Convite: `pending → accepted | revoked | expired`.

## Critérios de aceite desta entrega

- Uma startup cadastrada administrativamente abre um perfil próprio e pode ser editada.
- Um visitante cria conta e envia solicitação sem receber acesso antecipado ao tenant.
- Um gestor aprova ou recusa a solicitação.
- A aprovação cria todos os vínculos obrigatórios sem estado parcial.
- Um gestor convida uma startup para a incubadora e, opcionalmente, para uma turma.
- O aceite ativa o representante e a matrícula no escopo correto.
- Usuários de outra organização não leem nem analisam solicitações ou convites.

## Etapa 4 — continuidade operacional do diagnóstico

O perfil da startup é agora a porta de entrada para seus diagnósticos. Cada
aplicação abre o resultado individual no contexto correto e o histórico compara
somente versões da mesma família de modelo. O modo de execução continua
explícito: autodiagnóstico é preenchido pela startup; aplicação facilitada é
preenchida por avaliador autorizado. Biblioteca, campanha, aplicação, resultado
e histórico permanecem objetos distintos, mas navegáveis como um único fluxo.

## Etapa 5 — resultados e evolução visual

O resultado individual apresenta radar de maturidade e barras comparando score
declarado e validado por dimensão. O histórico apresenta uma série temporal dos
ciclos e mantém as tabelas completas para auditoria. Todo gráfico possui título,
descrição e alternativa textual; ausência de dados produz estado vazio explícito.

Critérios adicionais:

- o usuário abre o diagnóstico diretamente no perfil da startup;
- declarado e validado nunca são fundidos silenciosamente;
- o histórico não mistura famílias de modelos incompatíveis;
- gráficos usam escala fixa de 0 a 100 e limitam valores fora da faixa;
- os mesmos valores permanecem disponíveis em texto e tabelas acessíveis.

## Etapas 6 e 7 — revisão e promoção controlada

A revisão final adiciona loading states, boundary de erro com referência de
suporte, E2E móvel do autocadastro, smoke autenticado do perfil e índices de
cobertura apontados pelo advisor Supabase. A promoção permanece manual e segue
[`RELEASE_READINESS_STAGES_6_7.md`](./RELEASE_READINESS_STAGES_6_7.md).
