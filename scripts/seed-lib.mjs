import { OBRA, gerarRdos, pngPlaceholder } from '../demo/obra-ficticia.mjs';

/**
 * Carrega a obra fictícia pela API real (a mesma que o app usa), respeitando login e permissões.
 * `request(method, path, { body, cookie })` devolve { status, body, cookie }: a CLI usa fetch,
 * os testes usam o worker em memória.
 */
export async function seed(request, { email, password, withUsers = false, log = () => {} }) {
  const login = await request('POST', '/api/login', { body: { email, password } });
  if (login.status !== 200 || !login.cookie) {
    throw new Error(`Login falhou (${login.status}): ${login.body?.error ?? 'sem detalhes'}. Crie o 1º coordenador pelo app (Primeiro acesso) e tente de novo.`);
  }
  const cookie = login.cookie;
  const put = (path, body) => request('PUT', path, { body, cookie });

  const obra = await put(`/api/projects/${OBRA.id}`, OBRA);
  if (obra.status !== 200) throw new Error(`Obra recusada (${obra.status}): ${obra.body?.error}`);
  log(`Obra: ${OBRA.name}`);

  const resultado = { rdos: 0, ignorados: 0, fotos: 0, usuarios: [] };
  for (const rdo of gerarRdos()) {
    const reply = await put(`/api/logs/${rdo.id}`, rdo);
    if (reply.status !== 200) throw new Error(`RDO ${rdo.rdoNumber} recusado (${reply.status}): ${reply.body?.error}`);
    if (reply.body.conflict || reply.body.deleted) { resultado.ignorados++; continue; } // alguém já editou/apagou no app
    resultado.rdos++;
    for (const foto of rdo.photos) {
      const up = await put(`/api/photos/${foto.id}`, { logId: rdo.id, projectId: OBRA.id, dataUrl: await pngPlaceholder(foto.tag) });
      if (up.status !== 200) throw new Error(`Foto ${foto.id} recusada (${up.status}): ${up.body?.error}`);
      resultado.fotos++;
    }
  }
  log(`RDOs: ${resultado.rdos} gravados, ${resultado.ignorados} já editados no app (mantidos); fotos: ${resultado.fotos}`);

  if (withUsers) {
    for (const [name, emailUser, role] of [
      ['Helena Duarte (demo)', 'engenheira@exemplo.test', 'engenheiro'],
      ['Cliente Horizonte (demo)', 'cliente@exemplo.test', 'cliente'],
    ]) {
      const senha = `${crypto.randomUUID()}`.slice(0, 18);
      const reply = await request('POST', '/api/users', { cookie, body: { name, email: emailUser, role, password: senha, projectIds: [OBRA.id] } });
      if (reply.status === 201) resultado.usuarios.push({ email: emailUser, role, senha });
      else if (reply.status !== 409) throw new Error(`Acesso ${emailUser} recusado (${reply.status}): ${reply.body?.error}`);
    }
  }
  return resultado;
}
