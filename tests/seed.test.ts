import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seed } from '../scripts/seed-lib.mjs';
import worker from '../worker/index';
import { PASSWORD, SETUP_CODE, call, loginAs, setupCoordinator } from './helpers';
import { createEnv } from './d1-shim';

test('seed: carrega a obra fictícia pela API real e é repetível', async () => {
  const env = createEnv({ setupCode: SETUP_CODE, withBucket: true });
  await setupCoordinator(env);
  const request = async (method: string, path: string, opts: { body?: unknown; cookie?: string } = {}) =>
    call(env, method, path, { body: opts.body, cookie: opts.cookie });

  const first = await seed(request, { email: 'coord@exemplo.test', password: PASSWORD, withUsers: true });
  assert.equal(first.rdos, 15);
  assert.equal(first.fotos, 9);
  assert.equal(first.usuarios.length, 2);

  const coord = await loginAs(env, 'coord@exemplo.test');
  const view = (await call(env, 'GET', '/api/sync', { cookie: coord })).body;
  assert.equal(view.projects[0].name, 'Residencial Aurora – Bloco A');
  assert.equal(view.logs.length, 15);
  assert.equal(view.photoIds.length, 9);

  // As fotos geradas são imagens que a API aceita e devolve.
  const photo = await call(env, 'GET', `/api/photos/${view.photoIds[0]}`, { cookie: coord });
  assert.match(photo.body.dataUrl, /^data:image\/png;base64,/);

  // O último RDO é rascunho: o cliente de demonstração não o vê; o engenheiro vê.
  const usuarios = first.usuarios as Array<{ email: string; role: string; senha: string }>;
  const cliente = usuarios.find((u) => u.role === 'cliente')!;
  const engenheiro = usuarios.find((u) => u.role === 'engenheiro')!;
  const asClient = await worker.fetch(
    new Request('https://diario.test/api/login', { method: 'POST', body: JSON.stringify({ email: cliente.email, password: cliente.senha }), headers: { 'cf-connecting-ip': '203.0.113.50' } }),
    env
  );
  const clientCookie = asClient.headers.get('set-cookie')!.split(';')[0];
  assert.equal((await call(env, 'GET', '/api/sync', { cookie: clientCookie })).body.logs.length, 14);
  const engCookie = await loginAs(env, engenheiro.email, engenheiro.senha, '203.0.113.51');
  assert.equal((await call(env, 'GET', '/api/sync', { cookie: engCookie })).body.logs.length, 15);

  // Rodar de novo não duplica nada.
  const second = await seed(request, { email: 'coord@exemplo.test', password: PASSWORD });
  assert.equal(second.rdos + second.ignorados, 15);
  assert.equal((await call(env, 'GET', '/api/sync', { cookie: coord })).body.logs.length, 15);
});

test('seed: sem conta de coordenador, falha com mensagem clara', async () => {
  const env = createEnv({ setupCode: SETUP_CODE });
  const request = async (method: string, path: string, opts: { body?: unknown; cookie?: string } = {}) =>
    call(env, method, path, { body: opts.body, cookie: opts.cookie });
  await assert.rejects(() => seed(request, { email: 'ninguem@exemplo.test', password: 'qualquer-senha-123' }), /Login falhou \(401\)/);
});
