# Módulo de mentorias

## Objetivo

O módulo organiza a rede de mentores de cada incubadora sem criar uma segunda
identidade para a mesma pessoa. Um mentor é um membro ativo da organização com
o papel `mentor` atribuído no contexto da incubadora e um perfil profissional
complementar.

O domínio é independente de CERNE. Uma mentoria pode apoiar uma startup, uma
ação ou um diagnóstico sem exigir vínculo metodológico.

## Fundação implementada

- perfil profissional do mentor;
- especialidades e segmentos de atuação;
- vínculo temporal mentor–startup;
- pausa, retomada e encerramento do vínculo;
- edição e inativação segura do perfil;
- diretório e resumo operacional por incubadora;
- auditoria e isolamento por `organization_id` e `incubator_id`;
- acesso da startup somente ao mentor que lhe foi atribuído;
- acesso do mentor somente às startups vinculadas;
- permissões `mentoring.read`, `mentoring.manage` e `mentoring.conduct`.
- disponibilidade semanal com vigência;
- solicitação, confirmação, reagendamento e cancelamento de sessões;
- prevenção de conflito de horário por mentor;
- registros compartilhados e restritos por sessão;
- recomendações com prioridade, prazo, aceite e descarte;
- feedback pós-sessão com direção derivada do vínculo do autor;
- vínculo opcional da sessão com diagnóstico facilitado.

Um perfil não pode ser criado para uma pessoa sem o papel Mentor na mesma
incubadora. O perfil também não pode ser inativado enquanto existirem vínculos
ativos ou pausados.

## Papéis

| Papel | Acesso inicial |
| --- | --- |
| Administrador da organização | Diretório, perfis e vínculos |
| Gestor da incubadora | Diretório, perfis e vínculos |
| Coordenador de programa | Diretório, perfis e vínculos |
| Agente | Leitura e condução futura |
| Mentor | Próprio perfil e startups vinculadas |
| Membro da startup | Mentor vinculado à própria startup |

## Próximas entregas

1. exceções pontuais de agenda e bloqueios de disponibilidade;
2. participantes adicionais por sessão;
3. conversão de recomendações em ações, após a implementação do plano de ação;
4. sincronização opcional com Google Calendar;
5. indicadores consolidados e anexos no Google Drive.

## Segurança

As tabelas expostas usam RLS e privilégios explícitos. `anon` não recebe acesso.
As mudanças administrativas são registradas em `audit_logs`. A service role não
é utilizada no navegador e não participa dos fluxos normais do módulo.
