import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker from '../worker/index';
import { hashPassword, safeEqualText, verifyPassword } from '../worker/crypto';
import { networkKey } from '../worker/routes/account';
import { PNG_DATA_URL, SETUP_CODE, call, createProject, logBody, setupCoordinator } from './helpers';
import { createEnv } from './d1-shim';

async function ready() {
  const env = createEnv({ setupCode: SETUP_CODE });
  const coord = await setupCoordinator(env);
  await createProject(env, coord, 'obra-a');
  return { env, coord };
}

const rawRequest = (path: string, init: RequestInit = {}) =>
  new Request(`https://diario.test${path}`, { ...init, headers: { 'cf-connecting-ip': '203.0.113.1', ...(init.headers as object) } });

test('datas no futuro distante são reduzidas (senão o RDO nunca mais poderia ser editado)', async () => {
  const { env, coord } = await ready();
  const saved = await call(env, 'PUT', '/api/logs/rdo-1', { cookie: coord, body: logBody('obra-a', { updatedAt: '2999-01-01T00:00:00Z' }) });
  assert.equal(saved.status, 200);
  assert.ok(Date.parse(saved.body.log.updatedAt) < Date.now() + 10 * 60_000);
});

test('foto: só jpeg/png/webp em base64; SVG, HTML e javascript: são recusados', async () => {
  const { env, coord } = await ready();
  const photo = { id: 'f1', caption: '', tag: 'Geral', timestamp: '', url: '' };
  await call(env, 'PUT', '/api/logs/rdo-1', { cookie: coord, body: logBody('obra-a', { photos: [photo] }) });
  const svg = 'data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+';
  for (const dataUrl of [svg, 'data:text/html;base64,PGgxPmE8L2gxPg==', 'javascript:alert(1)', 'nao-e-url']) {
    const reply = await call(env, 'PUT', '/api/photos/f1', { cookie: coord, body: { logId: 'rdo-1', projectId: 'obra-a', dataUrl } });
    assert.equal(reply.status, 400, dataUrl.slice(0, 30));
  }
  const ok = await call(env, 'PUT', '/api/photos/f1', { cookie: coord, body: { logId: 'rdo-1', projectId: 'obra-a', dataUrl: PNG_DATA_URL } });
  assert.equal(ok.status, 200);
});

test('corpo grande demais é cortado antes de virar JSON (413)', async () => {
  const { env, coord } = await ready();
  const huge = logBody('obra-a', { generalNotes: 'x'.repeat(300_000) });
  assert.equal((await call(env, 'PUT', '/api/logs/rdo-1', { cookie: coord, body: huge })).status, 413);
});

test('texto acima do limite do campo é recusado', async () => {
  const { env, coord } = await ready();
  const reply = await call(env, 'PUT', '/api/logs/rdo-1', { cookie: coord, body: logBody('obra-a', { generalNotes: 'x'.repeat(4001) }) });
  assert.equal(reply.status, 400);
});

test('identificadores com caracteres perigosos são recusados', async () => {
  const { env, coord } = await ready();
  for (const id of ["a'b", 'a%20b', 'a%00b', '..%2Fx', 'x'.repeat(81)]) {
    const reply = await call(env, 'PUT', `/api/projects/${id}`, { cookie: coord, body: { name: 'X' } });
    assert.ok([400, 404].includes(reply.status), `${id} → ${reply.status}`);
  }
});

test('data do RDO inválida é recusada; clima desconhecido vira o padrão', async () => {
  const { env, coord } = await ready();
  assert.equal((await call(env, 'PUT', '/api/logs/rdo-1', { cookie: coord, body: logBody('obra-a', { executionDate: '15/09/2026' }) })).status, 400);
  const ok = await call(env, 'PUT', '/api/logs/rdo-2', { cookie: coord, body: logBody('obra-a', { weatherMorning: 'tornado' }) });
  assert.equal(ok.body.log.weatherMorning, 'ensolarado');
});

test('RDO de obra inexistente é recusado', async () => {
  const { env, coord } = await ready();
  assert.equal((await call(env, 'PUT', '/api/logs/rdo-1', { cookie: coord, body: logBody('obra-fantasma') })).status, 404);
});

test('rotas: método errado dá 405, caminho desconhecido 404, JSON quebrado 400', async () => {
  const { env, coord } = await ready();
  assert.equal((await call(env, 'PATCH', '/api/me', { cookie: coord })).status, 405);
  assert.equal((await call(env, 'GET', '/api/nao-existe', { cookie: coord })).status, 404);
  const broken = await worker.fetch(rawRequest('/api/login', { method: 'POST', body: '{nao-e-json' }), env);
  assert.equal(broken.status, 400);
});

test('respostas da API nunca são guardadas em cache', async () => {
  const { env } = await ready();
  const response = await worker.fetch(rawRequest('/api/setup'), env);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});

test('senha: PBKDF2 com sal próprio; só a senha certa passa', async () => {
  const a = await hashPassword('minha-senha-longa');
  const b = await hashPassword('minha-senha-longa');
  assert.notEqual(a, b);
  assert.match(a, /^pbkdf2\$100000\$/);
  assert.equal(await verifyPassword('minha-senha-longa', a), true);
  assert.equal(await verifyPassword('minha-senha-longa!', a), false);
  assert.equal(await verifyPassword('x', 'formato-invalido'), false);
});

test('comparação de texto em tempo constante: iguais, diferentes e de tamanhos distintos', async () => {
  assert.equal(await safeEqualText('abc', 'abc'), true);
  assert.equal(await safeEqualText('abc', 'abd'), false);
  assert.equal(await safeEqualText('abc', 'abcd'), false);
});

test('networkKey: IPv4 inteiro; IPv6 reduzido ao /64, inclusive com "::"', () => {
  const req = (ip?: string) => new Request('https://x.test', { headers: ip ? { 'cf-connecting-ip': ip } : {} });
  assert.equal(networkKey(req('203.0.113.7')), '203.0.113.7');
  assert.equal(networkKey(req('2001:db8:1:2:aaaa:bbbb:cccc:dddd')), '2001:db8:1:2');
  assert.equal(networkKey(req('2001:db8::1')), '2001:db8:0:0');
  assert.equal(networkKey(req()), 'local');
});
