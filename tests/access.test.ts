import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PNG_DATA_URL, SETUP_CODE, call, createProject, createUser, loginAs, logBody, setupCoordinator } from './helpers';
import { createEnv } from './d1-shim';

/** Cenário: duas obras (A e B), um engenheiro e um cliente só da obra A. */
async function scenario() {
  const env = createEnv({ setupCode: SETUP_CODE, withBucket: true });
  const coord = await setupCoordinator(env);
  await createProject(env, coord, 'obra-a');
  await createProject(env, coord, 'obra-b');
  await createUser(env, coord, { name: 'Eng A', email: 'eng@exemplo.test', role: 'engenheiro', projectIds: ['obra-a'] });
  await createUser(env, coord, { name: 'Cliente A', email: 'cliente@exemplo.test', role: 'cliente', projectIds: ['obra-a'] });
  const eng = await loginAs(env, 'eng@exemplo.test');
  const cliente = await loginAs(env, 'cliente@exemplo.test');
  return { env, coord, eng, cliente };
}

const photoRef = (id: string) => ({ id, caption: '', tag: 'Geral', timestamp: '', url: '' });
const uploadBody = (logId: string, projectId: string) => ({ logId, projectId, dataUrl: PNG_DATA_URL });

test('engenheiro: grava RDO na própria obra, mas não na obra alheia', async () => {
  const { env, eng } = await scenario();
  assert.equal((await call(env, 'PUT', '/api/logs/rdo-a1', { cookie: eng, body: logBody('obra-a') })).status, 200);
  assert.equal((await call(env, 'PUT', '/api/logs/rdo-b1', { cookie: eng, body: logBody('obra-b') })).status, 403);
});

test('engenheiro: não cria nem apaga obra, não gerencia acessos', async () => {
  const { env, eng } = await scenario();
  assert.equal((await call(env, 'PUT', '/api/projects/obra-nova', { cookie: eng, body: { name: 'Nova' } })).status, 403);
  assert.equal((await call(env, 'DELETE', '/api/projects/obra-a', { cookie: eng })).status, 403);
  assert.equal((await call(env, 'GET', '/api/users', { cookie: eng })).status, 403);
  const promote = { name: 'X', email: 'x@x.test', role: 'coordenador', password: '1234567890' };
  assert.equal((await call(env, 'POST', '/api/users', { cookie: eng, body: promote })).status, 403);
});

test('engenheiro: edita dados da obra liberada, não da alheia', async () => {
  const { env, eng } = await scenario();
  assert.equal((await call(env, 'PUT', '/api/projects/obra-a', { cookie: eng, body: { name: 'Obra A renomeada' } })).status, 200);
  assert.equal((await call(env, 'PUT', '/api/projects/obra-b', { cookie: eng, body: { name: 'Sequestrada' } })).status, 403);
});

test('sync: cada pessoa recebe só as obras e RDOs que pode ver', async () => {
  const { env, coord, eng, cliente } = await scenario();
  await call(env, 'PUT', '/api/logs/rdo-a1', { cookie: coord, body: logBody('obra-a') });
  await call(env, 'PUT', '/api/logs/rdo-b1', { cookie: coord, body: logBody('obra-b') });

  const all = (await call(env, 'GET', '/api/sync', { cookie: coord })).body;
  assert.deepEqual(all.projects.map((p: { id: string }) => p.id).sort(), ['obra-a', 'obra-b']);
  assert.equal(all.logs.length, 2);

  for (const cookie of [eng, cliente]) {
    const view = (await call(env, 'GET', '/api/sync', { cookie })).body;
    assert.deepEqual(view.projects.map((p: { id: string }) => p.id), ['obra-a']);
    assert.deepEqual(view.logs.map((l: { id: string }) => l.id), ['rdo-a1']);
    assert.deepEqual(view.projectIds, ['obra-a']);
  }
});

test('sync: quem não tem nenhuma obra liberada não recebe nada', async () => {
  const { env, coord } = await scenario();
  await createUser(env, coord, { name: 'Sem obra', email: 'sem@exemplo.test', role: 'engenheiro', projectIds: [] });
  const cookie = await loginAs(env, 'sem@exemplo.test');
  const view = (await call(env, 'GET', '/api/sync', { cookie })).body;
  assert.deepEqual([view.projects, view.logs, view.projectIds], [[], [], []]);
});

test('cliente: só consulta; não grava RDO, obra nem foto, não apaga', async () => {
  const { env, cliente } = await scenario();
  assert.equal((await call(env, 'PUT', '/api/logs/rdo-c1', { cookie: cliente, body: logBody('obra-a') })).status, 403);
  assert.equal((await call(env, 'PUT', '/api/projects/obra-a', { cookie: cliente, body: { name: 'X' } })).status, 403);
  assert.equal((await call(env, 'PUT', '/api/photos/foto-1', { cookie: cliente, body: uploadBody('rdo-a1', 'obra-a') })).status, 403);
  assert.equal((await call(env, 'DELETE', '/api/logs/rdo-a1', { cookie: cliente })).status, 403);
});

test('cliente: não vê rascunho no sync nem a foto de um rascunho, mesmo sabendo o id', async () => {
  const { env, eng, cliente } = await scenario();
  const photo = { ...photoRef('foto-rasc'), caption: 'Laje', tag: 'Estrutura' };
  await call(env, 'PUT', '/api/logs/rdo-rasc', { cookie: eng, body: logBody('obra-a', { status: 'rascunho', photos: [photo] }) });
  assert.equal((await call(env, 'PUT', '/api/photos/foto-rasc', { cookie: eng, body: uploadBody('rdo-rasc', 'obra-a') })).status, 200);

  const view = (await call(env, 'GET', '/api/sync', { cookie: cliente })).body;
  assert.deepEqual(view.logs, []);
  assert.deepEqual(view.photoIds, []);
  assert.equal((await call(env, 'GET', '/api/photos/foto-rasc', { cookie: cliente })).status, 404);
  assert.equal((await call(env, 'GET', '/api/photos/foto-rasc', { cookie: eng })).status, 200);

  // Aprovado o RDO, o cliente passa a ver a foto.
  const later = new Date(Date.now() + 1000).toISOString();
  await call(env, 'PUT', '/api/logs/rdo-rasc', { cookie: eng, body: logBody('obra-a', { status: 'aprovado', photos: [photo], updatedAt: later }) });
  assert.equal((await call(env, 'GET', '/api/photos/foto-rasc', { cookie: cliente })).status, 200);
});

test('fotos: engenheiro de outra obra não lê foto alheia (404)', async () => {
  const { env, coord, eng } = await scenario();
  await call(env, 'PUT', '/api/logs/rdo-b1', { cookie: coord, body: logBody('obra-b', { photos: [photoRef('foto-b')] }) });
  await call(env, 'PUT', '/api/photos/foto-b', { cookie: coord, body: uploadBody('rdo-b1', 'obra-b') });
  assert.equal((await call(env, 'GET', '/api/photos/foto-b', { cookie: eng })).status, 404);
  assert.equal((await call(env, 'GET', '/api/photos/foto-b', { cookie: coord })).status, 200);
});

test('fotos: não anexa a RDO de obra alheia nem a RDO que não a lista', async () => {
  const { env, coord, eng } = await scenario();
  await call(env, 'PUT', '/api/logs/rdo-b1', { cookie: coord, body: logBody('obra-b', { photos: [photoRef('foto-b')] }) });
  assert.equal((await call(env, 'PUT', '/api/photos/foto-b', { cookie: eng, body: uploadBody('rdo-b1', 'obra-b') })).status, 403);

  await call(env, 'PUT', '/api/logs/rdo-a1', { cookie: eng, body: logBody('obra-a') });
  assert.equal((await call(env, 'PUT', '/api/photos/foto-x', { cookie: eng, body: uploadBody('rdo-a1', 'obra-a') })).status, 404);
});

test('fotos: com R2 ligado o D1 guarda só quem é dono e a imagem volta íntegra', async () => {
  const { env, eng } = await scenario();
  await call(env, 'PUT', '/api/logs/rdo-a1', { cookie: eng, body: logBody('obra-a', { photos: [photoRef('foto-r2')] }) });
  await call(env, 'PUT', '/api/photos/foto-r2', { cookie: eng, body: uploadBody('rdo-a1', 'obra-a') });
  const row = await env.DB.prepare('SELECT data_url FROM photos WHERE id = ?1').bind('foto-r2').first<{ data_url: string }>();
  assert.equal(row?.data_url, '');
  assert.equal((await call(env, 'GET', '/api/photos/foto-r2', { cookie: eng })).body.dataUrl, PNG_DATA_URL);
});

test('apagar RDO: aparece em deletedLogIds, leva as fotos e não ressuscita com PUT atrasado', async () => {
  const { env, eng } = await scenario();
  await call(env, 'PUT', '/api/logs/rdo-a1', { cookie: eng, body: logBody('obra-a', { photos: [photoRef('foto-del')] }) });
  await call(env, 'PUT', '/api/photos/foto-del', { cookie: eng, body: uploadBody('rdo-a1', 'obra-a') });
  assert.equal((await call(env, 'DELETE', '/api/logs/rdo-a1', { cookie: eng })).status, 200);

  const view = (await call(env, 'GET', '/api/sync', { cookie: eng })).body;
  assert.deepEqual(view.deletedLogIds, ['rdo-a1']);
  assert.equal((await call(env, 'GET', '/api/photos/foto-del', { cookie: eng })).status, 404);
  const late = await call(env, 'PUT', '/api/logs/rdo-a1', { cookie: eng, body: logBody('obra-a') });
  assert.deepEqual(late.body, { deleted: true });
});

test('conflito: edição mais antiga não sobrescreve a mais nova', async () => {
  const { env, eng } = await scenario();
  const newer = new Date().toISOString();
  const older = new Date(Date.now() - 60_000).toISOString();
  await call(env, 'PUT', '/api/logs/rdo-a1', { cookie: eng, body: logBody('obra-a', { generalNotes: 'versão nova', updatedAt: newer }) });
  const stale = await call(env, 'PUT', '/api/logs/rdo-a1', { cookie: eng, body: logBody('obra-a', { generalNotes: 'versão velha', updatedAt: older }) });
  assert.equal(stale.body.conflict, true);
  assert.equal(stale.body.log.generalNotes, 'versão nova');
});

test('obra com RDOs ativos não é apagada; sem RDOs, apagar funciona e aparece no sync', async () => {
  const { env, coord, eng } = await scenario();
  await call(env, 'PUT', '/api/logs/rdo-a1', { cookie: eng, body: logBody('obra-a') });
  assert.equal((await call(env, 'DELETE', '/api/projects/obra-a', { cookie: coord })).status, 409);
  assert.equal((await call(env, 'DELETE', '/api/projects/obra-b', { cookie: coord })).status, 200);
  const sync = (await call(env, 'GET', '/api/sync', { cookie: coord })).body;
  assert.deepEqual(sync.deletedProjectIds, ['obra-b']);
});

test('autor do RDO é sempre quem gravou, nunca o que o cliente HTTP afirma', async () => {
  const { env, eng } = await scenario();
  const saved = await call(env, 'PUT', '/api/logs/rdo-a1', { cookie: eng, body: logBody('obra-a', { createdByEmail: 'outra.pessoa@exemplo.test' }) });
  assert.equal(saved.body.log.createdByEmail, 'eng@exemplo.test');
});
