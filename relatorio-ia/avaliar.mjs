// Avalia um relatório gerado contra o gabarito. Uso: node relatorio-ia/avaliar.mjs [--dir=exemplo]
// Cada pasta tem rdos.json (entrada) e gabarito*.json (o que o engenheiro escreveu). `exemplo/` é fictícia;
// para dados reais use uma pasta local `dados-reais/` (fica fora do git).
// A mesma régua vale para a versão com IA: troque o gerador e rode de novo.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gerarBaseline } from './baseline.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const ler = (...p) => JSON.parse(readFileSync(join(aqui, ...p), 'utf8'));

const PARADAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o', 'as', 'os', 'com', 'para', 'por', 'na', 'no', 'nas', 'nos', 'um', 'uma']);
const tokens = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !PARADAS.has(t))
    .map((t) => t.slice(0, 5)); // raiz grosseira: "entulho"/"entulhos" contam como igual

const recall = (gold, gerado) => {
  const alvo = new Set(tokens(gold));
  if (alvo.size === 0) return 1;
  const tem = new Set(tokens(gerado));
  return [...alvo].filter((t) => tem.has(t)).length / alvo.size;
};

const pct = (n, d) => (d === 0 ? 'n/d' : `${Math.round((100 * n) / d)}%`);

/** Itens sem fonte: RDO inexistente, data diferente da do RDO ou palavras que não estão no RDO citado. */
function invencoes(gerado, rdos) {
  const problemas = [];
  for (const item of gerado.servicosExecutados) {
    const rdo = rdos.find((r) => r.rdo === item.rdo);
    if (!rdo) { problemas.push(`RDO ${item.rdo} não existe`); continue; }
    if (rdo.data !== item.data) problemas.push(`RDO ${item.rdo}: data ${item.data} ≠ ${rdo.data}`);
    const fonte = [rdo.descritivo, rdo.ocorrencias, ...rdo.servicos.map((s) => s.descricao)].join(' ');
    const novos = [...new Set(tokens(item.servico))].filter((t) => !new Set(tokens(fonte)).has(t));
    if (novos.length / Math.max(1, new Set(tokens(item.servico)).size) > 0.3) {
      problemas.push(`RDO ${item.rdo}: termos fora do RDO (${novos.join(', ')})`);
    }
  }
  return problemas;
}

export function avaliar(gold, gerado, rdos) {
  // 1) efetivo por dia (total)
  const ressalvas = gold.ressalvas?.efetivo ?? {}; // dias em que o próprio RDO está errado (ver gabarito)
  const dias = Object.keys(gold.efetivoPorDia).filter((d) => !(d in ressalvas));
  const diasCertos = dias.filter((d) => gerado.efetivoPorDia[d]?.total === gold.efetivoPorDia[d].total);
  const erradosEfetivo = dias.filter((d) => !diasCertos.includes(d)).map((d) => `${d}: gabarito ${gold.efetivoPorDia[d].total}, gerado ${gerado.efetivoPorDia[d]?.total ?? '—'}`);

  // 2) serviços executados: cobertura do que o engenheiro escreveu
  const cobertura = gold.servicosExecutados.map((g) => {
    const candidatos = g.rdo ? gerado.servicosExecutados.filter((s) => s.rdo === g.rdo) : gerado.servicosExecutados;
    const melhor = Math.max(0, ...candidatos.map((c) => recall(g.servico, c.servico)));
    return { gold: g.servico, rdo: g.rdo, recall: melhor };
  });
  const cobertos = cobertura.filter((c) => c.recall >= 0.6).length;

  // 3) intercorrências que nascem nos RDOs
  // Itens repetidos de relatórios anteriores (datas fora do período) não contam contra este relatório.
  const datasDe = (texto) => [...texto.matchAll(/(\d\d)\/(\d\d)/g)].map((m) => `2026-${m[2]}-${m[1]}`);
  const noPeriodo = (d) => d >= gold.periodo.de && d <= gold.periodo.ate;
  const deRdo = gold.intercorrencias.filter((i) => i.origem === 'rdo' && datasDe(i.resposta).some(noPeriodo));
  const achadas = deRdo.filter((i) => gerado.intercorrencias.some((g) => datasDe(i.resposta).includes(g.data)));

  const falhas = invencoes(gerado, rdos);
  return {
    efetivo: { certos: diasCertos.length, total: dias.length, pct: pct(diasCertos.length, dias.length), errados: erradosEfetivo, ressalvas },
    servicos: { cobertos, total: cobertura.length, pct: pct(cobertos, cobertura.length), detalhe: cobertura },
    intercorrenciasDeRdo: { achadas: achadas.length, total: deRdo.length, pct: pct(achadas.length, deRdo.length) },
    invencoes: { quantidade: falhas.length, itens: falhas },
  };
}

// ---- execução direta: baseline sem IA em cada gabarito da pasta ----
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dirArg = process.argv.find((a) => a.startsWith('--dir='));
  const pasta = dirArg ? dirArg.slice('--dir='.length) : 'exemplo';
  const rdos = ler(pasta, 'rdos.json');
  const gabaritos = readdirSync(join(aqui, pasta)).filter((f) => /^gabarito(-\d+)?\.json$/.test(f)).sort();
  for (const arquivo of gabaritos) {
    const gold = ler(pasta, arquivo);
    const gerado = gerarBaseline(rdos, gold.periodo);
    const r = avaliar(gold, gerado, rdos);
    console.log(`\n=== ${arquivo}: ${gold.periodo.de} a ${gold.periodo.ate} (sem IA) ===`);
    if (gold._aviso) console.log(`(${gold._aviso})`);
    console.log(`Efetivo por dia certo:        ${r.efetivo.certos}/${r.efetivo.total} (${r.efetivo.pct})`);
    r.efetivo.errados.forEach((e) => console.log(`   ✗ ${e}`));
    Object.entries(r.efetivo.ressalvas).forEach(([d, t]) => console.log(`   ⚠ ${d} fora da conta: ${t}`));
    console.log(`Serviços cobertos:            ${r.servicos.cobertos}/${r.servicos.total} (${r.servicos.pct})`);
    r.servicos.detalhe.filter((c) => c.recall < 0.6).forEach((c) => console.log(`   ✗ [RDO ${c.rdo ?? '?'}] "${c.gold}" (${Math.round(c.recall * 100)}%)`));
    console.log(`Intercorrências de RDO:       ${r.intercorrenciasDeRdo.achadas}/${r.intercorrenciasDeRdo.total} (${r.intercorrenciasDeRdo.pct})`);
    console.log(`Itens sem fonte (invenção):   ${r.invencoes.quantidade}`);
    r.invencoes.itens.forEach((i) => console.log(`   ✗ ${i}`));
  }
}
