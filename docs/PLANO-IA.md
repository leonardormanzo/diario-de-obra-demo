# Plano: Relatório Gerencial Quinzenal assistido por IA

**Estado:** a régua de avaliação (Fase 1) está pronta e roda no exemplo fictício. A IA em si **ainda não está ligada**
ao app: não existe endpoint de geração nem tela (Fases 2 e 3).

Objetivo: a partir dos RDOs de um período, o app monta o **rascunho** do relatório quinzenal. O engenheiro revisa,
edita e só então exporta. A IA nunca envia nada sozinha.

## Por que começar por aqui

- Dor real: o relatório quinzenal é montado à mão a partir de RDOs que já estão no app.
- Dados estruturados e verificáveis: cada frase do rascunho pode apontar para o RDO de origem.
- Risco baixo: o resultado é rascunho revisado por pessoa.
- Ensina o que importa em engenharia de IA: dar contexto, exigir fonte, **medir** antes de confiar e controlar custo.

## O que o relatório tem

| Bloco | De onde vem | Precisa de IA? |
|---|---|---|
| Ficha técnica (obra, cliente, prazo, equipe) | Cadastro da obra | Não (formulário) |
| Efetivo por dia | RDOs | Não (determinístico) |
| Serviços executados por data e RDO | RDOs | Pouco: agrupar e redigir |
| Intercorrências e pendências | RDOs (campo de ocorrências e notas) | Sim: resumir e detectar |
| Programação dos próximos 15 dias | Cronograma | Sim, mas fora do escopo inicial |
| Valores, % físico, decisões de fornecedor | Não estão nos RDOs | Não: o engenheiro preenche |

## Fases

| Fase | Entrega | Pronto quando | Estado |
|---|---|---|---|
| 0 — Decisões | Que dados podem sair da empresa, qual modelo, qual formato final | Decisão **autorizada pelo dono dos dados** | A fazer (depende de cada empresa) |
| 1 — Gabarito e régua, antes da IA | Relatórios já escritos por humanos viram gabarito; versão sem IA (`relatorio-ia/baseline.mjs`) e avaliador (`relatorio-ia/avaliar.mjs`) | O piso sem IA está medido e o gabarito foi revisado por um engenheiro | **Feito** (exemplo fictício em `relatorio-ia/exemplo/`) |
| 2 — Servidor e prompt | `POST /api/obras/:id/relatorio-quinzenal` `{de, ate}`; chave do modelo como secret do Worker; saída JSON de esquema fixo com o nº do RDO em cada item | Devolve JSON válido para os períodos do gabarito | A fazer |
| 3 — Tela no app | Escolher período, gerar, revisar e editar cada linha, exportar PDF | O engenheiro gera, edita e exporta no celular | A fazer |
| 4 — Medir e melhorar | Rodar a avaliação a cada mudança de prompt ou modelo | Zero invenções e cobertura acima da meta combinada | A fazer |
| 5 — Opcional | Legendas de fotos (visão), perguntas em linguagem natural sobre os RDOs | — | — |

## Como medir

1. **Cobertura:** de cada item que o humano escreveu, quantos aparecem no rascunho.
2. **Invenção:** itens sem RDO de origem, ou com data, número ou nome que não existem nos RDOs. Meta: zero.
3. **Efetivo:** dias com a contagem de pessoas correta (deve ser 100%: é determinístico).
4. **Estilo:** nota de 1 a 5 de um engenheiro em trechos sorteados.
5. **Custo e tempo** por relatório.
6. **Separação de dados:** ajuste o prompt com um relatório; reserve outro **só para teste**. Quando o baseline
   é ajustado depois de ver o erro, aquele período deixa de ser teste limpo.

Exemplo, baseline sem IA no gabarito fictício (`node relatorio-ia/avaliar.mjs`): efetivo 12/12; serviços 5/8;
intercorrências de RDO 2/2; itens sem fonte 0. Os 3 serviços não cobertos são justamente os que dependem de ler as
**notas do dia**, não só a lista de serviços, que é o ganho esperado de um modelo de linguagem. Estes números
valem para o exemplo fictício e **não medem** nenhuma obra real.

## Aprendizados do método (rodado antes com dados privados)

- Efetivo e "serviços executados" saem dos RDOs de forma determinística: não precisam de IA.
- Parte do relatório **não está nos RDOs** (valores, % físico, decisões de fornecedor). A IA só pode escrever o que
  está nos RDOs; o resto o engenheiro preenche, e o rascunho deve marcar isso como lacuna.
- Quando o texto do relatório nasce da **foto** e não do RDO, só um modelo com visão chega lá (Fase 5).
- RDO copiado de outro dia pode carregar equipe errada ("Sem atividade" com 4 pessoas): vale validar no app.

## Riscos e respostas

| Risco | Resposta |
|---|---|
| O modelo inventa algo e vai ao cliente | Rascunho obrigatório, fonte por linha, checagem automática de invenção |
| Vazamento da chave do modelo | Só no servidor (secret do Worker), nunca no navegador |
| Custo por abuso | Limite por usuário e por dia; só funções com permissão de edição |
| Dados do cliente saindo da empresa | Enviar só texto, sem fotos; **obter autorização formal** antes (Fase 0) |
| Layout do PDF difícil de igualar | Começar simples; se preciso, preencher o modelo em planilha |

## Fora do escopo agora

Treinar modelo, agentes autônomos, envio automático ao cliente, valores financeiros da medição.
