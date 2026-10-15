/**
 * Obra FICTÍCIA para demonstração. Nenhum nome, valor ou fato aqui vem de uma obra real.
 * Usada por scripts/seed-demo.mjs (carga via API) e por scripts/exportar-exemplo-ia.mjs.
 */

export const OBRA = {
  id: 'obra-aurora-a',
  code: 'DEMO-001',
  name: 'Residencial Aurora – Bloco A',
  address: 'Rua das Acácias, 100 – Cidade Exemplo',
  artRrt: 'ART 0000000-DEMO',
  engineerInCharge: 'Eng. Helena Duarte (fictícia)',
  engineerEmail: 'helena.duarte@exemplo.test',
  clientName: 'Incorporadora Horizonte (fictícia)',
  clientEmail: 'contato@horizonte.exemplo.test',
  startDate: '2026-03-02',
  expectedEndDate: '2027-02-26',
  progressPercent: 38,
  status: 'em_andamento',
};

const C = {
  estrutura: 'Concreto / Estrutura',
  alvenaria: 'Alvenaria & Vedação',
  hidraulica: 'Instalações Hidráulicas',
  eletrica: 'Instalações Elétricas',
  imper: 'Impermeabilização',
  revest: 'Revestimento & Pisos',
  sst: 'Segurança do Trabalho (SST)',
  outros: 'Outros / Geral',
};

// Atalhos: pessoas e máquinas por RDO.
const eq = (encarregado, pedreiro, servente, carpinteiro, armador, eletricista, encanador) =>
  [
    ['Encarregado', encarregado],
    ['Pedreiro', pedreiro],
    ['Servente', servente],
    ['Carpinteiro', carpinteiro],
    ['Armador', armador],
    ['Eletricista', eletricista],
    ['Encanador', encanador],
  ].filter(([, n]) => n > 0);

const t = (description, category, status, progress) => ({ description, category, status, progress });

/** Dias úteis de 14/09 a 02/10/2026 (RDO 1 a 15). */
const DIAS = [
  {
    data: '2026-09-14', clima: ['ensolarado', 'ensolarado'], equipe: eq(1, 0, 3, 6, 0, 0, 0), maquinas: [['Andaime', 1], ['Gerador', 1]],
    tarefas: [t('Montagem de fôrmas da laje do 3º pavimento', C.estrutura, 'em_andamento', 30), t('Limpeza e organização do canteiro', C.outros, 'concluida', 100)],
    notas: 'Início da montagem das fôrmas da laje do 3º pavimento.', ocorrencias: '', fotos: [['Fôrmas da laje do 3º pavimento', 'Estrutura']],
  },
  {
    data: '2026-09-15', clima: ['ensolarado', 'nublado'], equipe: eq(1, 0, 3, 6, 4, 0, 0), maquinas: [['Andaime', 1], ['Gerador', 1]],
    tarefas: [t('Montagem de fôrmas da laje do 3º pavimento', C.estrutura, 'em_andamento', 60), t('Armação das vigas V301 a V308', C.estrutura, 'em_andamento', 40)],
    notas: 'Armação das vigas iniciada em paralelo às fôrmas.', ocorrencias: '', fotos: [],
  },
  {
    data: '2026-09-16', clima: ['nublado', 'nublado'], equipe: eq(1, 0, 3, 5, 4, 2, 0), maquinas: [['Andaime', 1], ['Gerador', 1]],
    tarefas: [t('Montagem de fôrmas da laje do 3º pavimento', C.estrutura, 'concluida', 100), t('Armação das vigas V301 a V308', C.estrutura, 'em_andamento', 80), t('Lançamento de eletrodutos na laje do 3º pavimento', C.eletrica, 'em_andamento', 50)],
    notas: 'Fôrmas concluídas. Eletrodutos sendo posicionados antes da concretagem.', ocorrencias: '', fotos: [['Eletrodutos posicionados sobre a armação', 'Instalações']],
  },
  {
    data: '2026-09-17', clima: ['impraticavel', 'nublado'], equipe: eq(1, 0, 2, 3, 3, 0, 0), maquinas: [['Gerador', 1]],
    tarefas: [t('Armação das vigas V301 a V308', C.estrutura, 'em_andamento', 90)],
    notas: 'Trabalho retomado à tarde após a chuva.', ocorrencias: 'Paralisação das 7h às 11h por chuva forte. Armação retomada à tarde com equipe reduzida.', fotos: [],
  },
  {
    data: '2026-09-18', clima: ['ensolarado', 'ensolarado'], equipe: eq(1, 2, 4, 2, 4, 0, 0), maquinas: [['Andaime', 2], ['Gerador', 1]],
    tarefas: [t('Armação das vigas V301 a V308', C.estrutura, 'concluida', 100), t('Elevação da alvenaria do 1º pavimento', C.alvenaria, 'em_andamento', 20)],
    notas: 'Armação conferida e liberada pela fiscalização. Concretagem agendada para segunda-feira.', ocorrencias: '', fotos: [['Armação liberada para concretagem', 'Estrutura']],
  },
  {
    data: '2026-09-21', clima: ['ensolarado', 'ensolarado'], equipe: eq(1, 5, 6, 2, 0, 0, 0), maquinas: [['Vibrador de Concreto', 2], ['Gerador', 1], ['Caminhão', 1]],
    tarefas: [t('Concretagem da laje do 3º pavimento (38 m³)', C.estrutura, 'concluida', 100)],
    notas: 'Concretagem concluída às 17h30. Corpos de prova moldados.', ocorrencias: 'Entrega do concreto atrasou 1h30 (usina). Sem prejuízo à qualidade; término adiado em 1h30.', fotos: [['Concretagem em andamento', 'Estrutura'], ['Acabamento da laje', 'Estrutura']],
  },
  {
    data: '2026-09-22', clima: ['nublado', 'ensolarado'], equipe: eq(1, 3, 4, 0, 0, 0, 2), maquinas: [['Andaime', 2], ['Betoneira', 1]],
    tarefas: [t('Cura úmida da laje do 3º pavimento', C.estrutura, 'em_andamento', 20), t('Elevação da alvenaria do 1º pavimento', C.alvenaria, 'em_andamento', 35), t('Prumadas de água fria', C.hidraulica, 'em_andamento', 25)],
    notas: 'Molhagem da laje 3 vezes ao dia.', ocorrencias: '', fotos: [],
  },
  {
    data: '2026-09-23', clima: ['ensolarado', 'ensolarado'], equipe: eq(1, 3, 4, 0, 0, 0, 2), maquinas: [['Andaime', 2], ['Betoneira', 1]],
    tarefas: [t('Elevação da alvenaria do 1º pavimento', C.alvenaria, 'em_andamento', 50), t('Prumadas de água fria', C.hidraulica, 'em_andamento', 50)],
    notas: 'Materiais recebidos: 8 mil blocos cerâmicos e 60 sacos de cimento.', ocorrencias: '', fotos: [['Recebimento dos blocos cerâmicos', 'Geral']],
  },
  {
    data: '2026-09-24', clima: ['ensolarado', 'nublado'], equipe: eq(1, 3, 4, 0, 0, 0, 2), maquinas: [['Andaime', 2], ['Betoneira', 1]],
    tarefas: [t('Elevação da alvenaria do 1º pavimento', C.alvenaria, 'em_andamento', 65), t('Impermeabilização das jardineiras do térreo', C.imper, 'em_andamento', 40), t('Prumadas de água fria', C.hidraulica, 'concluida', 100)],
    notas: '', ocorrencias: '', fotos: [],
  },
  {
    data: '2026-09-25', clima: ['ensolarado', 'ensolarado'], equipe: eq(1, 3, 4, 0, 0, 0, 0), maquinas: [['Andaime', 2], ['Betoneira', 1]],
    tarefas: [t('Elevação da alvenaria do 1º pavimento', C.alvenaria, 'em_andamento', 75), t('Impermeabilização das jardineiras do térreo', C.imper, 'concluida', 100), t('Diálogo de segurança sobre trabalho em altura', C.sst, 'concluida', 100)],
    notas: 'DDS com toda a equipe às 7h30.', ocorrencias: '', fotos: [['Diálogo de segurança com a equipe', 'Segurança']],
  },
  {
    data: '2026-09-28', clima: ['nublado', 'ensolarado'], equipe: eq(1, 3, 4, 0, 0, 2, 0), maquinas: [['Andaime', 2], ['Betoneira', 1]],
    tarefas: [t('Elevação da alvenaria do 1º pavimento', C.alvenaria, 'concluida', 100), t('Elevação da alvenaria do 2º pavimento', C.alvenaria, 'em_andamento', 15), t('Caixas de passagem elétricas do 2º pavimento', C.eletrica, 'em_andamento', 30)],
    notas: '', ocorrencias: 'Falta de energia provisória por 2h (concessionária). Serviços manuais mantidos.', fotos: [],
  },
  {
    data: '2026-09-29', clima: ['ensolarado', 'ensolarado'], equipe: eq(1, 3, 4, 0, 0, 0, 2), maquinas: [['Andaime', 2], ['Betoneira', 1]],
    tarefas: [t('Elevação da alvenaria do 2º pavimento', C.alvenaria, 'em_andamento', 35), t('Ramais hidráulicos do 2º pavimento', C.hidraulica, 'em_andamento', 20), t('Fechamento do shaft do 2º pavimento', C.alvenaria, 'bloqueada', 0)],
    notas: '', ocorrencias: 'Divergência entre os projetos estrutural e arquitetônico na posição do shaft do 2º pavimento. Consulta enviada ao projetista; serviço do shaft parado até a resposta.', fotos: [['Posição do shaft em questão', 'Geral']],
  },
  {
    data: '2026-09-30', clima: ['ensolarado', 'ensolarado'], equipe: eq(1, 3, 4, 2, 0, 0, 2), maquinas: [['Andaime', 2], ['Betoneira', 1]],
    tarefas: [t('Elevação da alvenaria do 2º pavimento', C.alvenaria, 'em_andamento', 55), t('Desforma parcial das laterais das vigas do 3º pavimento', C.estrutura, 'em_andamento', 50), t('Fechamento do shaft do 2º pavimento', C.alvenaria, 'bloqueada', 0)],
    notas: 'Aguardando resposta do projetista sobre o shaft.', ocorrencias: '', fotos: [],
  },
  {
    data: '2026-10-01', clima: ['ensolarado', 'nublado'], equipe: eq(1, 4, 5, 0, 0, 0, 0), maquinas: [['Andaime', 3], ['Betoneira', 1]],
    tarefas: [t('Elevação da alvenaria do 2º pavimento', C.alvenaria, 'em_andamento', 70), t('Chapisco da fachada norte', C.revest, 'em_andamento', 20)],
    notas: '', ocorrencias: '', fotos: [], seguranca: 'Quase-acidente sem lesão: um bloco caiu do andaime. Área isolada e plataforma reforçada.',
  },
  {
    data: '2026-10-02', clima: ['ensolarado', 'ensolarado'], equipe: eq(1, 4, 5, 0, 0, 0, 0), maquinas: [['Andaime', 3], ['Betoneira', 1]],
    tarefas: [t('Elevação da alvenaria do 2º pavimento', C.alvenaria, 'em_andamento', 85), t('Chapisco da fachada norte', C.revest, 'em_andamento', 45), t('Fechamento do shaft do 2º pavimento', C.alvenaria, 'em_andamento', 10)],
    notas: 'Projetista confirmou a posição do shaft conforme o projeto arquitetônico; serviço retomado.', ocorrencias: '', fotos: [['Início do fechamento do shaft', 'Alvenaria']], rascunho: true,
  },
];

/** RDOs no formato que a API do app aceita (sem os pixels das fotos, que vão por /api/photos). */
export function gerarRdos() {
  return DIAS.map((d, i) => {
    const n = i + 1;
    const id = `rdo-aurora-${String(n).padStart(3, '0')}`;
    const stamp = `${d.data}T18:00:00.000Z`;
    return {
      id,
      projectId: OBRA.id,
      projectName: OBRA.name,
      rdoNumber: n,
      date: d.data,
      executionDate: d.data,
      engineerInCharge: OBRA.engineerInCharge,
      creaArt: OBRA.artRrt,
      weatherMorning: d.clima[0],
      weatherAfternoon: d.clima[1],
      workforce: d.equipe.map(([role, count], k) => ({ id: `${id}-w${k}`, role, count, company: role === 'Encarregado' ? 'Construtora Exemplo' : 'Empreiteira Exemplo' })),
      equipment: d.maquinas.map(([name, count], k) => ({ id: `${id}-e${k}`, name, count, operational: true })),
      tasks: d.tarefas.map((task, k) => ({ id: `${id}-t${k}`, ...task })),
      generalNotes: d.notas,
      occurrences: d.ocorrencias,
      safetyAccidents: false,
      safetyNotes: d.seguranca ?? '',
      photos: d.fotos.map(([caption, tag], k) => ({ id: `${id}-f${k}`, caption, tag, timestamp: '10:00', url: '' })),
      status: d.rascunho ? 'rascunho' : 'aprovado',
      syncStatus: 'synced',
      createdAt: stamp,
      updatedAt: stamp,
    };
  });
}

/** Mesma obra no formato do exemplo de relatório com IA (relatorio-ia/exemplo/rdos.json). */
export function paraFormatoIA(rdos = gerarRdos()) {
  return rdos.map((r) => ({
    rdo: r.rdoNumber,
    data: r.executionDate,
    clima: r.weatherMorning,
    equipe: r.workforce.map((w) => ({ funcao: w.role, quantidade: w.count })),
    servicos: r.tasks.map((task) => ({ descricao: task.description })),
    descritivo: r.generalNotes,
    ocorrencias: r.occurrences || 'Sem ocorrências no dia.',
    fotos: r.photos.length,
  }));
}

/** PNG sólido 320x240 por tipo de foto (só para a demonstração ter imagens; sem dependências). */
export async function pngPlaceholder(tag) {
  const { deflateSync } = await import('node:zlib');
  const cores = { Estrutura: [96, 108, 122], Alvenaria: [176, 104, 72], Instalações: [196, 160, 64], Acabamento: [176, 120, 150], Segurança: [64, 140, 100], Geral: [110, 120, 130] };
  const [r, g, b] = cores[tag] ?? cores.Geral;
  const w = 320, h = 240;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const listra = ((x + y) >> 4) & 1 ? 18 : 0;
      raw[row + 1 + x * 3] = Math.min(255, r + listra);
      raw[row + 2 + x * 3] = Math.min(255, g + listra);
      raw[row + 3 + x * 3] = Math.min(255, b + listra);
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(crc(body), body.length + 4);
    return out;
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  return `data:image/png;base64,${png.toString('base64')}`;
}
