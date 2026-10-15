// Versão SEM IA do relatório quinzenal: regras fixas sobre os RDOs. É o piso que a IA precisa superar.
// Entrada: lista de RDOs (dados/rdos.json) e período. Saída: mesmo formato do gabarito.

/** Funções que não entram no efetivo do relatório (confirme com o engenheiro; ver docs/PLANO-IA.md). Ex.: ['ajudante da contratante']. */
export const FUNCOES_FORA_DO_EFETIVO = [];

const norm = (s) => String(s ?? '').trim().toLowerCase();

function datasDoPeriodo(de, ate) {
  const dias = [];
  for (let d = new Date(`${de}T12:00:00Z`); d <= new Date(`${ate}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    dias.push(d.toISOString().slice(0, 10));
  }
  return dias;
}

const SEM_OCORRENCIA = /^sem ocorr/i;
const EVENTO_NO_DESCRITIVO = /sem expediente|dificuldade|sem atividade/i;

/**
 * @param {Array<{rdo:number,data:string,equipe:Array<{funcao:string,quantidade:number}>,servicos:Array<{descricao:string}>,descritivo:string,ocorrencias:string}>} rdos
 * @param {{de:string, ate:string}} periodo
 */
export function gerarBaseline(rdos, periodo) {
  const doPeriodo = rdos.filter((r) => r.data >= periodo.de && r.data <= periodo.ate).sort((a, b) => a.data.localeCompare(b.data));

  // Materiais recebidos também são serviço do dia ("Materiais recebidos: Areia e cimento." no descritivo).
  const materiais = (r) =>
    String(r.descritivo ?? '')
      .split('\n')
      .filter((l) => /^materiais recebidos/i.test(l.trim()))
      .map((l) => 'Recebimento de materiais (' + l.replace(/^materiais recebidos:\s*/i, '').replace(/\.$/, '').toLowerCase() + ')');

  const servicosExecutados = doPeriodo
    .map((r) => ({ r, partes: [...r.servicos.map((s) => s.descricao.replace(/\.$/, '')), ...materiais(r)] }))
    .filter(({ partes }) => partes.length > 0)
    .map(({ r, partes }) => ({ data: r.data, rdo: r.rdo, servico: partes.join('; ') + '.' }));

  const efetivoPorDia = {};
  for (const data of datasDoPeriodo(periodo.de, periodo.ate)) {
    const rdo = doPeriodo.find((r) => r.data === data);
    const funcoes = {};
    let total = 0;
    for (const p of rdo?.equipe ?? []) {
      if (FUNCOES_FORA_DO_EFETIVO.includes(norm(p.funcao)) || p.quantidade <= 0) continue;
      funcoes[p.funcao] = (funcoes[p.funcao] ?? 0) + p.quantidade;
      total += p.quantidade;
    }
    efetivoPorDia[data] = { total, funcoes };
  }

  const intercorrencias = [];
  for (const r of doPeriodo) {
    if (r.ocorrencias && !SEM_OCORRENCIA.test(r.ocorrencias)) {
      intercorrencias.push({ data: r.data, rdo: r.rdo, texto: r.ocorrencias });
    }
    for (const linha of String(r.descritivo ?? '').split('\n')) {
      if (EVENTO_NO_DESCRITIVO.test(linha) && !intercorrencias.some((i) => i.rdo === r.rdo && i.texto === linha.trim())) {
        intercorrencias.push({ data: r.data, rdo: r.rdo, texto: linha.trim() });
      }
    }
  }

  return { periodo, servicosExecutados, efetivoPorDia, intercorrencias };
}
