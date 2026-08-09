# Consolidação dos fluxos operacionais

## Objetivo

Corrigir a distância entre o modelo de dados seguro já existente e a experiência necessária para uma incubadora ou aceleradora operar sem suporte técnico.

## Hierarquia aplicada

1. **Proodos:** tenant raiz e central de governança da rede.
2. **Incubadora ou aceleradora:** contexto operacional isolado pela URL, `organization_id`, `incubator_id` e RLS.
3. **Programa:** modelo permanente de intervenção da incubadora.
4. **Turma:** edição temporal de um programa.
5. **Startup:** empreendimento da incubadora, matriculado em uma turma quando participa de um ciclo.

Nenhum formulário dentro da incubadora pede que o usuário escolha a própria incubadora.

## Implantação de incubadora

O cadastro solicita nome, natureza da operação, descrição, instituição mantenedora opcional, logo, contato, território, fuso e responsável. O identificador técnico é automático. A central mostra uma lista de preparação com perfil, gestor e primeiro programa.

Logos são validadas como PNG, JPG ou WebP com até 2 MB e armazenadas em bucket privado. A interface usa um seletor de arquivo com pré-visualização, nunca um campo de caminho textual.

## Pessoas e papéis

Há dois fluxos distintos:

- **Pessoa ainda sem acesso:** gestor informa nome, e-mail e papel; o sistema cria convite expirável e envia autenticação por e-mail. O aceite cria ou ativa membership e atribuição de papel de forma transacional.
- **Pessoa já vinculada:** gestor seleciona a pessoa e adiciona um papel contextual à incubadora.

Convites pendentes podem ser reenviados ou revogados. Papéis são exibidos agrupados por pessoa e podem ser removidos individualmente. A secret key administrativa nunca chega ao navegador.

## Programa e turma

Programa contém nome, logo, tipo, descrição, objetivos, público-alvo, modalidade, duração e capacidade sugeridas, vigência opcional e estado. A listagem serve para localizar e acompanhar; edição detalhada ocorre na página do programa.

Turma contém nome, lançamento, inscrições opcionais, início e fim do ciclo e capacidade. Matrículas e indicadores de execução pertencem à turma. Um programa pode possuir várias turmas.

## Navegação

- Visão geral: Dashboard.
- Portfólio: Programas e turmas; Startups.
- Desenvolvimento: Diagnósticos; Planos de ação; Trilhas e conteúdos; Mentorias.
- Resultados: Indicadores.
- Administração: Pessoas e configurações; Integrações.

Itens fictícios de busca e notificações foram removidos. Estados vazios e chamadas para ação devem indicar a próxima tarefa real.

## Segurança e operação

- Todas as ações repetem o escopo da rota no servidor.
- Tabelas expostas continuam com RLS.
- Tokens de convite são armazenados somente como hash.
- `SUPABASE_SECRET_KEY` existe apenas no ambiente do servidor/Vercel.
- Arquivos grandes continuam destinados ao Google Drive; logos pequenas usam Storage privado.
