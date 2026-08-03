# Diagnósticos — mapeamento do XLSX v2.1

## Fonte

Arquivo analisado: `ISA_Diagnostico_Maturidade_v2.1.xlsx`, localizado fora do repositório em `Downloads`. Antes do seed definitivo, uma cópia imutável deve ser adicionada a `docs/referencias/diagnosticos/` com checksum registrado.

## Abas

| Aba            | Conteúdo                                           | Destino                                   |
| -------------- | -------------------------------------------------- | ----------------------------------------- |
| Instruções     | método, operação, evidência e mudanças v2.1        | metadados/changelog da versão             |
| Parâmetros     | pesos, essenciais, faixas e limiares               | dimensões, classificações e gatilhos      |
| Caracterização | startup, estágio, perfil e responsável             | snapshot da instância + perfil da startup |
| Diagnóstico    | 9 dimensões, 36 critérios e rubricas 0–4           | estrutura normalizada da versão           |
| Indicadores    | indicadores, unidade, meta, fonte e aplicabilidade | definições e valores por instância        |
| Painel         | scores, gatilhos e prioridades                     | funções oficiais e dashboard              |
| Histórico      | T0–T5 e regra de recuperação                       | instâncias/ciclos em linhas ilimitadas    |

## Dimensões

| Código | Nome                                 | Peso | Essencial | Critérios |
| ------ | ------------------------------------ | ---: | :-------: | --------: |
| D1     | Estratégia e modelo de negócio       |  14% |    sim    |         4 |
| D2     | Mercado, clientes e vendas           |  17% |    sim    |         6 |
| D3     | Produto, tecnologia e produção       |  13% |    não    |         4 |
| D4     | Tração e gestão do crescimento       |  10% |    não    |         3 |
| D5     | Finanças e sustentabilidade          |  11% |    sim    |         4 |
| D6     | Equipe e execução                    |  13% |    sim    |         5 |
| D7     | Governança, jurídico, PI e regulação |  11% |    não    |         6 |
| D8     | Operações e escala                   |   5% |    não    |         2 |
| D9     | Impacto socioambiental               |   6% |    não    |         2 |

Total: 100% e 36 critérios.

## Códigos dos critérios

- D1: EM1–EM4;
- D2: MC1–MC6;
- D3: PT1–PT4;
- D4: TR1–TR3;
- D5: FN1–FN4;
- D6: EQ1–EQ5;
- D7: GJ1–GJ6;
- D8: OP1–OP2;
- D9: IM1–IM2.

Cada critério possui pergunta e cinco rubricas textuais. Rubricas não serão mantidas em uma coluna JSONB: cada nível será uma linha em `diagnostic_criterion_levels` com `score`, `label` e `description`.

## Classificação

| Intervalo | Classe        |
| --------: | ------------- |
|      0–24 | Fundacional   |
|     25–44 | Iniciado      |
|     45–64 | Estruturado   |
|     65–84 | Validado      |
|    85–100 | Sistematizado |

## Parâmetros e gatilhos

- runway mínimo: 3 meses;
- entrevistas em 90 dias: 5;
- concentração máxima no maior cliente: 50%;
- dedicação mínima do fundador: 20 h/semana;
- cobertura mínima de evidência: 70%;
- tolerância de gap: 1,5 ponto;
- dependência de editais: acima de 70%;
- critérios críticos: FN1, GJ3, GJ4, GJ6, EQ5 e PT4;
- prioridade: peso da dimensão × distância até o máximo.

## Indicadores

Grupos identificados:

- financeiros: caixa, burn, runway, receita, captação e margem;
- mercado e tração: entrevistas, clientes, usuários, pilotos, contratos, ticket, concentração e origem;
- produção e custo: custo unitário, preço e prazo de reposição;
- equipe e operação: pessoas, dedicação e empregos;
- tecnologia, PI e impacto: TRL, registros de PI e beneficiários.

Indicadores têm unidade, valor atual, meta do ciclo, fonte/evidência, observação e aplicabilidade. Runway e ticket podem ser derivados; valores informados e derivados devem registrar a origem.

## Regras de transformação

1. Linhas de cabeçalho viram dimensões; linhas com código de critério viram critérios.
2. Rubricas são divididas por nível 0–4 sem alterar o texto.
3. N/A é uma regra do critério/estágio, não um sexto nível.
4. fórmulas da planilha viram funções SQL testadas; células `#NAME?` não são importadas como valor;
5. T0–T5 viram `diagnostic_assessments` ordenadas por data;
6. campos de caracterização estáveis atualizam o perfil da startup; campos contextuais ficam como snapshot da instância;
7. o importador gera relatório de avisos, erros, duplicidades, pesos e códigos;
8. importação é idempotente por `source_checksum + version_label`;
9. a versão importada permanece em rascunho até validação e publicação explícita.

## Conflito de nomenclatura

O XLSX nomeia os níveis 1–4 como **Iniciado, Estruturado, Validado e Sistematizado**. A referência visual usa **Inicial, Em desenvolvimento, Consolidado e Otimizado**. O seed pode importar as descrições e notas, mas não deve publicar a versão até essa decisão ser resolvida.
