begin;

create or replace function private.install_standard_diagnostic_v21(
  target_organization_id uuid,
  target_incubator_id uuid,
  target_created_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_family_id uuid;
  target_template_id uuid;
begin
  if not exists (
    select 1 from public.incubators i
    where i.organization_id = target_organization_id
      and i.id = target_incubator_id
      and i.deleted_at is null
  ) then
    raise exception 'Incubadora inválida para o diagnóstico padrão' using errcode = '23514';
  end if;

  select f.id into target_family_id
  from public.diagnostic_template_families f
  where f.organization_id = target_organization_id
    and f.incubator_id = target_incubator_id
    and f.code = 'diagnostico-maturidade'
    and f.archived_at is null;

  if target_family_id is null then
    insert into public.diagnostic_template_families (
      organization_id, incubator_id, code, name, description, scope,
      methodology_name, is_standard, created_by
    ) values (
      target_organization_id, target_incubator_id,
      'diagnostico-maturidade', 'Diagnóstico de Maturidade',
      'Avalia a maturidade da startup em nove dimensões sem tornar CERNE obrigatório.',
      'incubator', 'Instrumento de Suporte à Aceleração (ISA)', true, target_created_by
    ) returning id into target_family_id;
  end if;

  select t.id into target_template_id
  from public.diagnostic_templates t
  where t.organization_id = target_organization_id
    and t.family_id = target_family_id
    and t.version_label = '2.1';
  if target_template_id is not null then return target_template_id; end if;

  insert into public.diagnostic_templates (
    organization_id, incubator_id, family_id, version, version_label,
    name, description, instructions, status, changelog, created_by
  ) values (
    target_organization_id, target_incubator_id, target_family_id, 1, '2.1',
    'Diagnóstico de Maturidade',
    'Avaliação ponderada de maturidade, indicadores, evidências e gatilhos críticos.',
    'Responda com base na realidade atual da startup e registre evidências para notas 3 e 4.',
    'draft',
    'Versão padrão importada do ISA_Diagnostico_Maturidade_v2.1.xlsx.',
    target_created_by
  ) returning id into target_template_id;

  insert into public.diagnostic_dimensions (
    organization_id, incubator_id, template_id, code, name, weight, is_essential, position
  )
  select target_organization_id, target_incubator_id, target_template_id,
    v.code, v.name, v.weight, v.is_essential, v.position
  from (values
      ('D1', 'ESTRATÉGIA E MODELO DE NEGÓCIO', 14, true, 0),
      ('D2', 'MERCADO, CLIENTES E VENDAS', 17, true, 1),
      ('D3', 'PRODUTO, TECNOLOGIA E PRODUÇÃO', 13, false, 2),
      ('D4', 'TRAÇÃO E GESTÃO DO CRESCIMENTO', 10, false, 3),
      ('D5', 'FINANÇAS E SUSTENTABILIDADE', 11, true, 4),
      ('D6', 'EQUIPE E EXECUÇÃO', 13, true, 5),
      ('D7', 'GOVERNANÇA, JURÍDICO, PI E REGULAÇÃO', 11, false, 6),
      ('D8', 'OPERAÇÕES E ESCALA', 5, false, 7),
      ('D9', 'IMPACTO SOCIOAMBIENTAL', 6, false, 8)
  ) as v(code, name, weight, is_essential, position);

  insert into public.diagnostic_dimension_stages (organization_id, template_id, dimension_id, stage)
  select target_organization_id, target_template_id, d.id, s.stage
  from public.diagnostic_dimensions d
  cross join (values
    ('validation'::public.startup_stage), ('operation'::public.startup_stage),
    ('traction'::public.startup_stage), ('scale'::public.startup_stage)
  ) s(stage)
  where d.template_id = target_template_id;

  insert into public.diagnostic_criteria (
    organization_id, incubator_id, template_id, dimension_id, code,
    prompt, help_text, response_type, weight, maximum_score,
    allows_not_applicable, requires_not_applicable_justification,
    not_applicable_guidance, evidence_required_from, position
  )
  select target_organization_id, target_incubator_id, target_template_id, d.id,
    v.code, v.prompt, v.help_text, 'numeric', 1, 4,
    v.allows_na, true, v.na_guidance, 3, v.position
  from (values
      ('D1', 'EM1', 'O modelo de negócio está documentado e é usado nas decisões?', '', false, '', 0),
      ('D1', 'EM2', 'As hipóteses críticas estão priorizadas e sendo testadas?', '', false, '', 1),
      ('D1', 'EM3', 'A proposta de valor e a diferenciação estão claras e sustentadas?', '', false, '', 2),
      ('D1', 'EM4', 'A estratégia de entrada no mercado (GTM) tem experimentos com resultado?', '', false, '', 3),
      ('D2', 'MC1', 'O perfil de cliente ideal (ICP) está definido e é usado para focar esforços?', '', false, '', 0),
      ('D2', 'MC2', 'Existe processo de descoberta de clientes gerando aprendizado?', '', false, '', 1),
      ('D2', 'MC3', 'Há evidência de que o cliente valoriza e está disposto a pagar?', '', false, '', 2),
      ('D2', 'MC4', 'O processo comercial está estruturado e acompanhado?', '', false, '', 3),
      ('D2', 'MC5', 'O mercado que a startup consegue de fato atender está dimensionado?', '', false, '', 4),
      ('D2', 'MC6', 'A startup consegue conquistar clientes fora da rede pessoal dos fundadores?', '', false, '', 5),
      ('D3', 'PT1', 'Qual a maturidade da tecnologia e onde ela já foi comprovada?', '', false, '', 0),
      ('D3', 'PT2', 'A solução é usada por usuários reais fora da equipe?', '', false, '', 1),
      ('D3', 'PT3', 'O desenvolvimento é priorizado com base em aprendizado e não em intuição?', 'Vale para hardware e software: ''entrega'' pode ser versão de firmware, lote, protótipo ou release.', false, '', 2),
      ('D3', 'PT4', 'O custo de produzir e entregar cada unidade é conhecido e viável?', '', false, '', 3),
      ('D4', 'TR1', 'Existe métrica norteadora acompanhada pela equipe?', '', false, '', 0),
      ('D4', 'TR2', 'O funil (atração → ativação → conversão) é medido?', '', false, '', 1),
      ('D4', 'TR3', 'A retenção e o relacionamento pós-entrega são geridos?', '', true, 'Ainda não há clientes ou usuários recorrentes.', 2),
      ('D5', 'FN1', 'O caixa e o consumo mensal (burn) são controlados?', '', false, '', 0),
      ('D5', 'FN2', 'Há planejamento financeiro com projeção e cenários?', '', false, '', 1),
      ('D5', 'FN3', 'A precificação e a margem são conhecidas e revisadas?', '', false, '', 2),
      ('D5', 'FN4', 'A estratégia de captação está definida e em execução?', '', false, '', 3),
      ('D6', 'EQ1', 'Os papéis críticos (negócio, tecnologia, comercial) estão cobertos?', '', false, '', 0),
      ('D6', 'EQ2', 'A dedicação e os acordos entre sócios estão formalizados?', '', false, '', 1),
      ('D6', 'EQ3', 'Existe rotina de execução com metas acompanhadas?', '', false, '', 2),
      ('D6', 'EQ4', 'A mentoria e a rede de apoio geram resultado prático?', '', false, '', 3),
      ('D6', 'EQ5', 'O negócio sobrevive à saída de uma pessoa-chave?', 'Atenção especial quando a equipe depende de bolsistas ou estudantes com saída prevista.', false, '', 4),
      ('D7', 'GJ1', 'A empresa está formalizada com documentos em ordem?', '', false, '', 0),
      ('D7', 'GJ2', 'As relações com clientes, fornecedores e parceiros são contratualizadas?', '', false, '', 1),
      ('D7', 'GJ3', 'O tratamento de dados pessoais está adequado à LGPD?', '', true, 'Não há tratamento de dados pessoais (justificar).', 2),
      ('D7', 'GJ4', 'A propriedade intelectual está identificada e protegida?', 'Se a tecnologia nasceu em laboratório do IF, a titularidade institucional deve estar resolvida por escrito.', false, '', 3),
      ('D7', 'GJ5', 'As dependências críticas do negócio estão identificadas e sendo reduzidas?', 'Inclui dependência de recurso público não recorrente (editais e prêmios) como fonte principal de receita.', false, '', 4),
      ('D7', 'GJ6', 'As exigências regulatórias e o caminho de venda estão mapeados?', '', true, 'Solução sem exigência regulatória e sem venda ao setor público (justificar).', 5),
      ('D8', 'OP1', 'Os processos críticos de entrega e atendimento estão definidos?', '', false, '', 0),
      ('D8', 'OP2', 'A capacidade de crescer sem quebrar está planejada?', '', true, 'Startup no estágio 1 (Validação) — responder aqui seria especulação (justificar).', 1),
      ('D9', 'IM1', 'A lógica de impacto está definida e conectada ao negócio?', '', false, '', 0),
      ('D9', 'IM2', 'O impacto gerado é medido e comunicado?', '', true, 'Negócio sem tese de impacto declarada (justificar).', 1)
  ) as v(dimension_code, code, prompt, help_text, allows_na, na_guidance, position)
  join public.diagnostic_dimensions d
    on d.template_id = target_template_id and d.code = v.dimension_code;

  insert into public.diagnostic_criterion_levels (
    organization_id, incubator_id, template_id, criterion_id,
    score, label, description, position
  )
  select target_organization_id, target_incubator_id, target_template_id, c.id,
    v.score, v.label, v.description, v.position
  from (values
      ('EM1', 0, 'Inexistente', 'Não existe registro do modelo de negócio.', 0),
      ('EM1', 1, 'Iniciado', 'Existe rascunho ou versão informal, sem uso prático.', 1),
      ('EM1', 2, 'Estruturado', 'Canvas (ou equivalente) completo e documentado.', 2),
      ('EM1', 3, 'Validado', 'Revisado nos últimos 90 dias a partir de aprendizados reais.', 3),
      ('EM1', 4, 'Sistematizado', 'Revisão em cadência fixa, com números e histórico de versões.', 4),
      ('EM2', 0, 'Inexistente', 'Não há hipóteses formuladas.', 0),
      ('EM2', 1, 'Iniciado', 'Lista informal, sem priorização.', 1),
      ('EM2', 2, 'Estruturado', '3–10 hipóteses priorizadas, com critério de sucesso/falha definido.', 2),
      ('EM2', 3, 'Validado', 'Hipóteses testadas e resultados usados para decidir (manter/ajustar/pivotar).', 3),
      ('EM2', 4, 'Sistematizado', 'Backlog vivo de experimentos, com responsável e cadência.', 4),
      ('EM3', 0, 'Inexistente', 'Baseada apenas em opinião interna.', 0),
      ('EM3', 1, 'Iniciado', 'Feedbacks soltos, sem registro.', 1),
      ('EM3', 2, 'Estruturado', 'Proposta escrita + mapeamento de concorrentes e alternativas do cliente.', 2),
      ('EM3', 3, 'Validado', 'Diferenciação confirmada por clientes e usada no discurso comercial.', 3),
      ('EM3', 4, 'Sistematizado', 'Posicionamento defendido com análise de ganhos/perdas e barreiras.', 4),
      ('EM4', 0, 'Inexistente', 'Canais não definidos.', 0),
      ('EM4', 1, 'Iniciado', 'Canais definidos apenas no papel.', 1),
      ('EM4', 2, 'Estruturado', 'Pelo menos 1 experimento de canal executado e registrado.', 2),
      ('EM4', 3, 'Validado', '≥3 experimentos com custo e conversão; escolha de canal baseada nos dados.', 3),
      ('EM4', 4, 'Sistematizado', 'Canal principal com playbook replicável e otimização contínua.', 4),
      ('MC1', 0, 'Inexistente', 'Não definido.', 0),
      ('MC1', 1, 'Iniciado', 'Descrição vaga ou genérica.', 1),
      ('MC1', 2, 'Estruturado', 'Critérios objetivos de qualificação documentados.', 2),
      ('MC1', 3, 'Validado', 'ICP ajustado após contato real com clientes e usado para filtrar o pipeline.', 3),
      ('MC1', 4, 'Sistematizado', 'Segmentado, com abordagem específica por segmento.', 4),
      ('MC2', 0, 'Inexistente', 'Nenhum contato estruturado com clientes.', 0),
      ('MC2', 1, 'Iniciado', 'Conversas informais, sem registro.', 1),
      ('MC2', 2, 'Estruturado', 'Entrevistas com o perfil-alvo, com roteiro e aprendizados registrados.', 2),
      ('MC2', 3, 'Validado', 'Os aprendizados geraram mudanças documentadas em produto, preço ou estratégia.', 3),
      ('MC2', 4, 'Sistematizado', 'Descoberta contínua, com síntese periódica e decisões rastreáveis.', 4),
      ('MC3', 0, 'Inexistente', 'Nenhuma evidência.', 0),
      ('MC3', 1, 'Iniciado', 'Declaração verbal de interesse.', 1),
      ('MC3', 2, 'Estruturado', 'Carta de intenção, pré-cadastro ou compromisso formal sem pagamento.', 2),
      ('MC3', 3, 'Validado', 'Piloto pago, contrato assinado ou primeira venda concretizada.', 3),
      ('MC3', 4, 'Sistematizado', 'Vendas recorrentes ou repetidas em mais de um cliente/segmento.', 4),
      ('MC4', 0, 'Inexistente', 'Não há processo nem registro de oportunidades.', 0),
      ('MC4', 1, 'Iniciado', 'Contatos anotados de forma dispersa.', 1),
      ('MC4', 2, 'Estruturado', 'Pipeline com etapas definidas, atualizado ao menos mensalmente.', 2),
      ('MC4', 3, 'Validado', 'Conversão medida por etapa e usada para corrigir a abordagem.', 3),
      ('MC4', 4, 'Sistematizado', 'Previsibilidade de vendas com forecast e metas por etapa.', 4),
      ('MC5', 0, 'Inexistente', 'Nunca dimensionou.', 0),
      ('MC5', 1, 'Iniciado', 'Cita um número de mercado global ou setorial, sem relação com sua operação.', 1),
      ('MC5', 2, 'Estruturado', 'Estimou quantos clientes potenciais existem no raio que consegue atender, com fonte.', 2),
      ('MC5', 3, 'Validado', 'Base identificada nominalmente (municípios, cooperativas, associações) e conectada à meta de vendas.', 3),
      ('MC5', 4, 'Sistematizado', 'Base segmentada por potencial, revisada periodicamente e usada para planejar expansão.', 4),
      ('MC6', 0, 'Inexistente', 'Nenhum cliente ou usuário conquistado.', 0),
      ('MC6', 1, 'Iniciado', 'Todos vieram de rede pessoal, da universidade ou de indicação da incubadora.', 1),
      ('MC6', 2, 'Estruturado', 'Ao menos um canal fora da rede pessoal foi testado, com resultado registrado.', 2),
      ('MC6', 3, 'Validado', 'Canal externo já gerou cliente mais de uma vez, de forma repetida.', 3),
      ('MC6', 4, 'Sistematizado', 'Custo de aquisição e taxa de conversão do canal conhecidos e previsíveis.', 4),
      ('PT1', 0, 'Inexistente', 'TRL 1–2 · conceito, sem prova.', 0),
      ('PT1', 1, 'Iniciado', 'TRL 3 · prova de conceito isolada.', 1),
      ('PT1', 2, 'Estruturado', 'TRL 4–5 · protótipo validado em ambiente controlado.', 2),
      ('PT1', 3, 'Validado', 'TRL 6–7 · demonstração ou piloto em ambiente real de uso.', 3),
      ('PT1', 4, 'Sistematizado', 'TRL 8–9 · solução completa operando em condições reais.', 4),
      ('PT2', 0, 'Inexistente', 'Não há solução utilizável.', 0),
      ('PT2', 1, 'Iniciado', 'Uso apenas interno.', 1),
      ('PT2', 2, 'Estruturado', 'Pelo menos 1 usuário externo em teste, com registro de uso.', 2),
      ('PT2', 3, 'Validado', '≥5 usuários externos, com métricas de uso acompanhadas.', 3),
      ('PT2', 4, 'Sistematizado', 'Uso recorrente em produção, com nível de serviço definido.', 4),
      ('PT3', 0, 'Inexistente', 'Sem backlog, sem planejamento e sem medição.', 0),
      ('PT3', 1, 'Iniciado', 'Lista de tarefas solta; decisões por intuição.', 1),
      ('PT3', 2, 'Estruturado', 'Backlog priorizado e visível + ao menos 1 métrica de uso ou desempenho coletada.', 2),
      ('PT3', 3, 'Validado', 'Entregas em cadência previsível e prioridades revistas a partir dos dados coletados.', 3),
      ('PT3', 4, 'Sistematizado', 'Ciclo contínuo com experimentos, análise por segmento e decisões rastreáveis.', 4),
      ('PT4', 0, 'Inexistente', 'Nunca calculou o custo de produzir ou de servir um cliente.', 0),
      ('PT4', 1, 'Iniciado', 'Estimativa aproximada, sem memória de cálculo.', 1),
      ('PT4', 2, 'Estruturado', 'Custo unitário calculado com lista de materiais (hardware) ou custo de servir (software/serviço).', 2),
      ('PT4', 3, 'Validado', 'Custo comparado ao preço praticado, com margem conhecida e gargalos identificados (importação, fornecedor único, infraestrutura).', 3),
      ('PT4', 4, 'Sistematizado', 'Curva de custo em escala projetada, com plano para reduzi-lo e alternativas de fornecimento.', 4),
      ('TR1', 0, 'Inexistente', 'Não há métrica principal.', 0),
      ('TR1', 1, 'Iniciado', 'Definida, mas não coletada.', 1),
      ('TR1', 2, 'Estruturado', 'Coletada e registrada mensalmente.', 2),
      ('TR1', 3, 'Validado', 'Acompanhada em ritmo semanal e discutida pela equipe.', 3),
      ('TR1', 4, 'Sistematizado', 'Alavancas da métrica mapeadas e usadas no planejamento.', 4),
      ('TR2', 0, 'Inexistente', 'Não mede.', 0),
      ('TR2', 1, 'Iniciado', 'Mede apenas uma etapa.', 1),
      ('TR2', 2, 'Estruturado', 'Mede 2–3 etapas de forma consistente.', 2),
      ('TR2', 3, 'Validado', 'Funil completo com taxas por etapa usadas para decidir onde atuar.', 3),
      ('TR2', 4, 'Sistematizado', 'Otimização contínua com metas por etapa.', 4),
      ('TR3', 0, 'Inexistente', 'Não acompanha após a entrega.', 0),
      ('TR3', 1, 'Iniciado', 'Contato informal e reativo.', 1),
      ('TR3', 2, 'Estruturado', 'Acompanhamento periódico com registro de satisfação.', 2),
      ('TR3', 3, 'Validado', 'Causas de perda identificadas e ações de retenção implementadas.', 3),
      ('TR3', 4, 'Sistematizado', 'Retenção medida por coorte, com impacto das ações comprovado.', 4),
      ('FN1', 0, 'Inexistente', 'Desconhece os valores.', 0),
      ('FN1', 1, 'Iniciado', 'Estimativa de cabeça, sem registro.', 1),
      ('FN1', 2, 'Estruturado', 'Caixa e burn registrados mensalmente em planilha ou sistema.', 2),
      ('FN1', 3, 'Validado', 'Conciliado, com runway calculado e usado nas decisões.', 3),
      ('FN1', 4, 'Sistematizado', 'Previsto vs. realizado por categoria, com projeção rolante.', 4),
      ('FN2', 0, 'Inexistente', 'Inexistente.', 0),
      ('FN2', 1, 'Iniciado', 'Lista de despesas.', 1),
      ('FN2', 2, 'Estruturado', 'Fluxo de caixa projetado para os próximos meses.', 2),
      ('FN2', 3, 'Validado', 'Projeção usada para decidir contratação, investimento e captação.', 3),
      ('FN2', 4, 'Sistematizado', 'Cenários alternativos com gatilhos de decisão definidos.', 4),
      ('FN3', 0, 'Inexistente', 'Não sabe o custo nem a margem.', 0),
      ('FN3', 1, 'Iniciado', 'Preço definido por intuição.', 1),
      ('FN3', 2, 'Estruturado', 'Custo por unidade calculado e margem conhecida.', 2),
      ('FN3', 3, 'Validado', 'Preço testado com clientes e ajustado com base no resultado.', 3),
      ('FN3', 4, 'Sistematizado', 'Política de preço por segmento/canal, com controle de descontos.', 4),
      ('FN4', 0, 'Inexistente', 'Não há estratégia.', 0),
      ('FN4', 1, 'Iniciado', 'Intenção genérica de captar.', 1),
      ('FN4', 2, 'Estruturado', 'Mapa de fontes (editais, clientes, investidores) com valores e prazos.', 2),
      ('FN4', 3, 'Validado', 'Plano de 6–12 meses com marcos e submissões em andamento.', 3),
      ('FN4', 4, 'Sistematizado', 'Pipeline ativo de captação com histórico de resultados.', 4),
      ('EQ1', 0, 'Inexistente', 'Papéis indefinidos.', 0),
      ('EQ1', 1, 'Iniciado', 'Menos de 40% dos papéis cobertos.', 1),
      ('EQ1', 2, 'Estruturado', '40–60% cobertos, com lacunas identificadas.', 2),
      ('EQ1', 3, 'Validado', '61–80% cobertos, com plano para as lacunas restantes.', 3),
      ('EQ1', 4, 'Sistematizado', 'Acima de 80%, com plano de sucessão e desenvolvimento.', 4),
      ('EQ2', 0, 'Inexistente', 'Não definidos.', 0),
      ('EQ2', 1, 'Iniciado', 'Combinado verbal.', 1),
      ('EQ2', 2, 'Estruturado', 'Participação e dedicação registradas por escrito.', 2),
      ('EQ2', 3, 'Validado', 'Acordo de sócios assinado, com regras de saída.', 3),
      ('EQ2', 4, 'Sistematizado', 'Mecanismos formais (vesting, cliff) e governança societária ativa.', 4),
      ('EQ3', 0, 'Inexistente', 'Sem rotina nem metas.', 0),
      ('EQ3', 1, 'Iniciado', 'Reuniões esporádicas, sem registro.', 1),
      ('EQ3', 2, 'Estruturado', 'Ritual semanal ou quinzenal com decisões registradas.', 2),
      ('EQ3', 3, 'Validado', 'Metas do ciclo (OKR ou equivalente) revisadas periodicamente.', 3),
      ('EQ3', 4, 'Sistematizado', 'Retrospectivas com ajuste de rota comprovado entre ciclos.', 4),
      ('EQ4', 0, 'Inexistente', 'Sem mentores ou rede.', 0),
      ('EQ4', 1, 'Iniciado', 'Contatos pontuais e informais.', 1),
      ('EQ4', 2, 'Estruturado', 'Ao menos 1 mentor ativo com agenda definida.', 2),
      ('EQ4', 3, 'Validado', 'Recomendações de mentoria convertidas em ações executadas.', 3),
      ('EQ4', 4, 'Sistematizado', 'Rede com resultados documentados (parcerias, clientes, recursos).', 4),
      ('EQ5', 0, 'Inexistente', 'Todo o conhecimento crítico está com uma única pessoa, sem registro.', 0),
      ('EQ5', 1, 'Iniciado', 'Situação reconhecida, mas nada foi feito a respeito.', 1),
      ('EQ5', 2, 'Estruturado', 'Conhecimento crítico documentado (código, processos, senhas, contatos) em local acessível.', 2),
      ('EQ5', 3, 'Validado', 'Mais de uma pessoa capaz de operar a solução; acessos e credenciais compartilhados com segurança.', 3),
      ('EQ5', 4, 'Sistematizado', 'Plano de continuidade ativo, com transferência de conhecimento e sucessão prevista.', 4),
      ('GJ1', 0, 'Inexistente', 'Não formalizada.', 0),
      ('GJ1', 1, 'Iniciado', 'Processo de abertura em andamento.', 1),
      ('GJ1', 2, 'Estruturado', 'CNPJ ativo e documentos societários mínimos.', 2),
      ('GJ1', 3, 'Validado', 'Documentação organizada, atualizada e obrigações em dia.', 3),
      ('GJ1', 4, 'Sistematizado', 'Documentação pronta para auditoria ou investimento (data room).', 4),
      ('GJ2', 0, 'Inexistente', 'Nenhum contrato.', 0),
      ('GJ2', 1, 'Iniciado', 'Modelos existem, mas não são usados.', 1),
      ('GJ2', 2, 'Estruturado', 'Ao menos 1 contrato assinado em uso.', 2),
      ('GJ2', 3, 'Validado', 'Modelos padronizados aplicados às relações relevantes.', 3),
      ('GJ2', 4, 'Sistematizado', 'Revisão periódica com apoio jurídico e gestão de riscos contratuais.', 4),
      ('GJ3', 0, 'Inexistente', 'Não sabe se trata dados pessoais.', 0),
      ('GJ3', 1, 'Iniciado', 'Sabe que trata, mas não adotou nenhuma medida.', 1),
      ('GJ3', 2, 'Estruturado', 'Aviso de privacidade e checklist básico implantados.', 2),
      ('GJ3', 3, 'Validado', 'Bases legais definidas, consentimento e procedimentos em uso.', 3),
      ('GJ3', 4, 'Sistematizado', 'Registro de operações (ROPA) e plano de resposta a incidentes.', 4),
      ('GJ4', 0, 'Inexistente', 'Nunca avaliou.', 0),
      ('GJ4', 1, 'Iniciado', 'Avaliação superficial, sem providências.', 1),
      ('GJ4', 2, 'Estruturado', 'Ativos de PI mapeados e titularidade definida em contrato.', 2),
      ('GJ4', 3, 'Validado', 'Pedido de marca ou patente depositado no INPI.', 3),
      ('GJ4', 4, 'Sistematizado', 'Portfólio de PI gerido, com licenças de terceiros em conformidade.', 4),
      ('GJ5', 0, 'Inexistente', 'Nunca mapeou de quem ou do que o negócio depende.', 0),
      ('GJ5', 1, 'Iniciado', 'Percepção informal da dependência, sem registro.', 1),
      ('GJ5', 2, 'Estruturado', 'Dependências mapeadas (cliente, fornecedor, edital, plataforma, pessoa) com grau de risco.', 2),
      ('GJ5', 3, 'Validado', 'Plano de redução em execução para ao menos a dependência mais crítica.', 3),
      ('GJ5', 4, 'Sistematizado', 'Alternativas testadas e dependência efetivamente reduzida entre ciclos.', 4),
      ('GJ6', 0, 'Inexistente', 'Nunca verificou se a solução exige certificação, registro ou habilitação.', 0),
      ('GJ6', 1, 'Iniciado', 'Sabe que existe exigência, mas não identificou qual nem o custo.', 1),
      ('GJ6', 2, 'Estruturado', 'Exigências identificadas (Anatel, MAPA, Inmetro, ANVISA, órgão setorial) com prazo e custo estimados.', 2),
      ('GJ6', 3, 'Validado', 'Processo iniciado; para venda ao poder público, cadastros e habilitação em andamento.', 3),
      ('GJ6', 4, 'Sistematizado', 'Conformidade obtida ou caminho de contratação dominado (dispensa, pregão, encomenda tecnológica, chamada pública, PAA/PNAE).', 4),
      ('OP1', 0, 'Inexistente', 'Tudo é feito de forma improvisada.', 0),
      ('OP1', 1, 'Iniciado', 'Checklist informal na cabeça da equipe.', 1),
      ('OP1', 2, 'Estruturado', '1–2 processos documentados com responsável.', 2),
      ('OP1', 3, 'Validado', 'Processos padronizados e seguidos por toda a equipe.', 3),
      ('OP1', 4, 'Sistematizado', 'Indicadores operacionais usados para melhoria contínua.', 4),
      ('OP2', 0, 'Inexistente', 'Não pensou no assunto.', 0),
      ('OP2', 1, 'Iniciado', 'Percepção informal dos limites.', 1),
      ('OP2', 2, 'Estruturado', 'Gargalos identificados e documentados.', 2),
      ('OP2', 3, 'Validado', 'Plano de escala com gatilhos e fornecedores críticos mapeados.', 3),
      ('OP2', 4, 'Sistematizado', 'Capacidade testada em situação de pico ou volume elevado.', 4),
      ('IM1', 0, 'Inexistente', 'Não há reflexão sobre impacto.', 0),
      ('IM1', 1, 'Iniciado', 'Intenção genérica de gerar impacto.', 1),
      ('IM1', 2, 'Estruturado', 'Teoria de mudança escrita e ODS-alvo justificados.', 2),
      ('IM1', 3, 'Validado', 'Indicadores de impacto definidos e conectados ao produto.', 3),
      ('IM1', 4, 'Sistematizado', 'Impacto integrado ao planejamento e à proposta de valor.', 4),
      ('IM2', 0, 'Inexistente', 'Não mede.', 0),
      ('IM2', 1, 'Iniciado', 'Relatos pontuais sem dado.', 1),
      ('IM2', 2, 'Estruturado', 'Linha de base definida e primeira coleta realizada.', 2),
      ('IM2', 3, 'Validado', 'Coleta periódica com comparação ao longo do tempo.', 3),
      ('IM2', 4, 'Sistematizado', 'Reporte estruturado a financiadores ou sociedade.', 4)
  ) as v(criterion_code, score, label, description, position)
  join public.diagnostic_criteria c
    on c.template_id = target_template_id and c.code = v.criterion_code;

  insert into public.diagnostic_classification_ranges (
    organization_id, incubator_id, template_id, code, label,
    minimum_score, maximum_score, color_token, position
  ) values
    (target_organization_id, target_incubator_id, target_template_id, 'fundacional', 'Fundacional', 0, 24, 'danger', 0),
    (target_organization_id, target_incubator_id, target_template_id, 'iniciado', 'Iniciado', 25, 44, 'warning', 1),
    (target_organization_id, target_incubator_id, target_template_id, 'estruturado', 'Estruturado', 45, 64, 'attention', 2),
    (target_organization_id, target_incubator_id, target_template_id, 'validado', 'Validado', 65, 84, 'success', 3),
    (target_organization_id, target_incubator_id, target_template_id, 'sistematizado', 'Sistematizado', 85, 100, 'positive', 4);

  insert into public.diagnostic_indicator_definitions (
    organization_id, incubator_id, template_id, code, category, name,
    unit, value_type, evidence_hint, is_derived, formula_key, position
  ) values
    (target_organization_id,target_incubator_id,target_template_id,'cash_available','Financeiros','Caixa disponível hoje','R$','currency','Extrato / conciliação',false,null,0),
    (target_organization_id,target_incubator_id,target_template_id,'monthly_burn','Financeiros','Consumo mensal de caixa (burn)','R$/mês','currency','Planilha de fluxo',false,null,1),
    (target_organization_id,target_incubator_id,target_template_id,'runway_months','Financeiros','Runway','meses','numeric','Calculado automaticamente',true,'cash_divided_by_burn',2),
    (target_organization_id,target_incubator_id,target_template_id,'last_month_revenue','Financeiros','Receita do último mês','R$','currency','Notas fiscais / recibos',false,null,3),
    (target_organization_id,target_incubator_id,target_template_id,'revenue_last_12_months','Financeiros','Receita acumulada nos últimos 12 meses','R$','currency','Notas fiscais / recibos',false,null,4),
    (target_organization_id,target_incubator_id,target_template_id,'funding_in_cycle','Financeiros','Recursos captados no ciclo','R$','currency','Termo / contrato',false,null,5),
    (target_organization_id,target_incubator_id,target_template_id,'gross_margin','Financeiros','Margem bruta média','%','percentage','Custo por unidade',false,null,6),
    (target_organization_id,target_incubator_id,target_template_id,'customer_interviews_90d','Mercado e tração','Entrevistas com clientes nos últimos 90 dias','nº','integer','Roteiro + registros',false,null,7),
    (target_organization_id,target_incubator_id,target_template_id,'active_paying_customers','Mercado e tração','Clientes pagantes ativos','nº','integer','Contratos / faturamento',false,null,8),
    (target_organization_id,target_incubator_id,target_template_id,'active_users','Mercado e tração','Usuários ativos','nº','integer','Painel do produto',false,null,9),
    (target_organization_id,target_incubator_id,target_template_id,'active_pilots','Mercado e tração','Pilotos ou provas de conceito em andamento','nº','integer','Termo de piloto',false,null,10),
    (target_organization_id,target_incubator_id,target_template_id,'signed_contracts_or_lois','Mercado e tração','Contratos ou cartas de intenção assinados','nº','integer','Documento assinado',false,null,11),
    (target_organization_id,target_incubator_id,target_template_id,'average_ticket','Mercado e tração','Ticket médio','R$','currency','Faturamento ÷ clientes',true,'revenue_divided_by_customers',12),
    (target_organization_id,target_incubator_id,target_template_id,'largest_customer_revenue_share','Mercado e tração','Receita concentrada no maior cliente','%','percentage','Faturamento',false,null,13),
    (target_organization_id,target_incubator_id,target_template_id,'non_recurring_grant_revenue_share','Mercado e tração','Receita vinda de editais e prêmios','%','percentage','Termos de outorga',false,null,14),
    (target_organization_id,target_incubator_id,target_template_id,'customers_outside_founder_network','Mercado e tração','Clientes fora da rede pessoal dos fundadores','nº','integer','Registro de origem',false,null,15),
    (target_organization_id,target_incubator_id,target_template_id,'unit_delivery_cost','Produção e custo','Custo unitário de produção ou de servir','R$','currency','Lista de materiais / rateio',false,null,16),
    (target_organization_id,target_incubator_id,target_template_id,'unit_price','Produção e custo','Preço praticado por unidade','R$','currency','Proposta / nota fiscal',false,null,17),
    (target_organization_id,target_incubator_id,target_template_id,'critical_input_lead_time','Produção e custo','Prazo de reposição do insumo crítico','dias','numeric','Cotação com fornecedor',false,null,18),
    (target_organization_id,target_incubator_id,target_template_id,'team_size','Equipe e operação','Pessoas na equipe','nº','integer','Folha / termos',false,null,19),
    (target_organization_id,target_incubator_id,target_template_id,'lead_founder_weekly_hours','Equipe e operação','Dedicação semanal do fundador principal','h/sem','numeric','Declaração',false,null,20),
    (target_organization_id,target_incubator_id,target_template_id,'formal_jobs_created','Equipe e operação','Empregos formais gerados','nº','integer','eSocial / CTPS',false,null,21),
    (target_organization_id,target_incubator_id,target_template_id,'declared_trl','Tecnologia, PI e impacto','TRL declarado','1–9','integer','Parecer técnico',false,null,22),
    (target_organization_id,target_incubator_id,target_template_id,'ip_registrations','Tecnologia, PI e impacto','Registros de PI depositados','nº','integer','Protocolo INPI',false,null,23),
    (target_organization_id,target_incubator_id,target_template_id,'direct_beneficiaries','Tecnologia, PI e impacto','Beneficiários diretos alcançados no ciclo','nº','integer','Registro de campo',false,null,24);

  insert into public.diagnostic_trigger_rules (
    organization_id, incubator_id, template_id, code, name, source_type,
    criterion_id, indicator_definition_id, aggregate_key, operator, threshold,
    severity, message, recommended_action, position
  )
  select target_organization_id, target_incubator_id, target_template_id,
    v.code, v.name, v.source_type::public.diagnostic_trigger_source,
    c.id, i.id, v.aggregate_key, v.operator::public.diagnostic_trigger_operator,
    v.threshold, v.severity::public.diagnostic_trigger_severity,
    v.message, v.action, v.position
  from (values
    ('short_runway','Caixa curto','indicator',null,'runway_months',null,'lt',3,'critical','Runway inferior a 3 meses.','Mentoria financeira em até 15 dias.',0),
    ('cash_not_controlled','Sem controle de caixa','criterion','FN1',null,null,'lte',1,'critical','Controle de caixa insuficiente.','Implantar fluxo de caixa antes do próximo encontro.',1),
    ('few_customer_interviews','Sem escuta de clientes','indicator',null,'customer_interviews_90d',null,'lt',5,'high','Poucas entrevistas com clientes nos últimos 90 dias.','Criar ação obrigatória de descoberta.',2),
    ('customer_concentration','Concentração de receita','indicator',null,'largest_customer_revenue_share',null,'gt',50,'high','Receita concentrada acima de 50% em um cliente.','Diversificar carteira antes de escalar.',3),
    ('low_founder_dedication','Dedicação insuficiente','indicator',null,'lead_founder_weekly_hours',null,'lt',20,'high','Dedicação do fundador abaixo de 20 horas semanais.','Revisar compromisso e plano de dedicação.',4),
    ('lgpd_risk','Risco de LGPD','criterion','GJ3',null,null,'lte',1,'critical','Adequação à LGPD insuficiente.','Acionar apoio jurídico e plano de adequação.',5),
    ('ip_undefined','Titularidade de PI indefinida','criterion','GJ4',null,null,'lte',1,'high','Propriedade intelectual sem proteção suficiente.','Mapear ativos e formalizar titularidade.',6),
    ('regulatory_barrier','Barreira regulatória não mapeada','criterion','GJ6',null,null,'lte',1,'critical','Exigências regulatórias não mapeadas.','Levantar certificações, prazo e custo.',7),
    ('knowledge_concentration','Conhecimento concentrado','criterion','EQ5',null,null,'lte',1,'high','Negócio dependente de uma pessoa-chave.','Documentar conhecimento e compartilhar acessos.',8),
    ('unknown_unit_cost','Custo unitário desconhecido','criterion','PT4',null,null,'lte',1,'high','Custo de produzir ou servir não conhecido.','Construir memória de cálculo antes de precificar.',9),
    ('grant_dependency','Dependência de edital','indicator',null,'non_recurring_grant_revenue_share',null,'gt',70,'high','Mais de 70% da receita vem de fonte não recorrente.','Trabalhar receita recorrente de mercado.',10),
    ('low_evidence_coverage','Cobertura de evidência baixa','aggregate',null,null,'evidence_coverage','lt',70,'warning','Menos de 70% das notas altas possuem evidência.','Não confirmar notas altas sem evidência.',11),
    ('high_perception_gap','Gap de percepção alto','aggregate',null,null,'average_gap','gt',1.5,'warning','Gap médio entre autodeclaração e validação acima de 1,5.','Realizar sessão de calibração.',12)
  ) as v(code,name,source_type,criterion_code,indicator_code,aggregate_key,operator,threshold,severity,message,action,position)
  left join public.diagnostic_criteria c
    on c.template_id = target_template_id and c.code = v.criterion_code
  left join public.diagnostic_indicator_definitions i
    on i.template_id = target_template_id and i.code = v.indicator_code;

  if (select count(*) from public.diagnostic_dimensions where template_id = target_template_id) <> 9
    or (select count(*) from public.diagnostic_criteria where template_id = target_template_id) <> 36
    or (select count(*) from public.diagnostic_criterion_levels where template_id = target_template_id) <> 180
    or (select sum(weight) from public.diagnostic_dimensions where template_id = target_template_id) <> 100 then
    raise exception 'Seed padrão de diagnóstico incompleto' using errcode = '23514';
  end if;

  update public.diagnostic_templates
  set status = 'published', published_at = now()
  where id = target_template_id;
  return target_template_id;
end;
$$;

create or replace function private.install_standard_diagnostic_v21_on_incubator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.install_standard_diagnostic_v21(new.organization_id, new.id, new.created_by);
  return new;
end;
$$;

drop trigger if exists incubators_install_standard_diagnostic_v21 on public.incubators;
create trigger incubators_install_standard_diagnostic_v21
after insert on public.incubators
for each row execute function private.install_standard_diagnostic_v21_on_incubator();

select private.install_standard_diagnostic_v21(i.organization_id, i.id, i.created_by)
from public.incubators i
where i.deleted_at is null;

revoke execute on function private.install_standard_diagnostic_v21(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke execute on function private.install_standard_diagnostic_v21_on_incubator()
  from public, anon, authenticated;

comment on function private.install_standard_diagnostic_v21(uuid, uuid, uuid) is
  'Instala de forma idempotente o modelo padrão v2.1 em uma incubadora, preservando o XLSX como fonte.';

commit;

