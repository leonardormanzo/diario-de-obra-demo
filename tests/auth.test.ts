import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker from '../worker/index';
import { PASSWORD, SETUP_CODE, call, createUser, loginAs, setupCoordinator } from './helpers';
import { createEnv } from './d1-shim';

test('instalação: sem SETUP_CODE configurado ninguém cria o 1º acesso', async () => {
  const env = createEnv();
  const reply = await call(env, 'POST', '/api/setup', {
    body: { code: 'qualquer', name: 'Fulano', email: 'f@x.test', password: PASSWORD },
  });
  assert.equal(reply.status, 503);
});

test('instalação: código errado é recusado; o certo cria o coordenador com cookie seguro', async () => {
  const env = createEnv({ setupCode: SETUP_CODE });
  const wrong = await call(env, 'POST', '/api/setup', {
    body: { code: 'errado', name: 'Fulano', email: 'f@x.test', password: PASSWORD },
  });
  assert.equal(wrong.status, 403);
  assert.deepEqual((await call(env, 'GET', '/api/setup')).body, { needsSetup: true });

  const response = await worker.fetch(
    new Request('https://diario.test/api/setup', {
      method: 'POST',
      headers: { 'cf-connecting-ip': '203.0.113.9', 'content-type': 'application/json' },
      body: JSON.stringify({ code: SETUP_CODE, name: 'Fulano', email: 'f@x.test', password: PASSWORD }),
    }),
    env
  );
  assert.equal(response.status, 201);
  const cookie = response.headers.get('set-cookie') ?? '';
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
  assert.deepEqual((await call(env, 'GET', '/api/setup')).body, { needsSetup: false });
});

test('instalação: só acontece uma vez', async () => {
  const env = createEnv({ setupCode: SETUP_CODE });
  await setupCoordinator(env);
  const again = await call(env, 'POST', '/api/setup', {
    body: { code: SETUP_CODE, name: 'Intruso', email: 'i@x.test', password: PASSWORD },
  });
  assert.equal(again.status, 409);
});

test('login: senha errada e e-mail inexistente dão a mesma resposta', async () => {
  const env = createEnv({ setupCode: SETUP_CODE });
  await setupCoordinator(env);
  const wrongPassword = await call(env, 'POST', '/api/login', { body: { email: 'coord@exemplo.test', password: 'x'.repeat(12) } });
  const unknownEmail = await call(env, 'POST', '/api/login', { body: { email: 'ninguem@exemplo.test', password: 'x'.repeat(12) } });
  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  assert.deepEqual(wrongPassword.body, unknownEmail.body);
});

test('login: após 8 erros da mesma rede e conta, até a senha certa é barrada (429)', async () => {
  const env = createEnv({ setupCode: SETUP_CODE });
  await setupCoordinator(env);
  for (let i = 0; i < 8; i++) {
    const miss = await call(env, 'POST', '/api/login', { body: { email: 'coord@exemplo.test', password: 'errada-errada' }, ip: '198.51.100.7' });
    assert.equal(miss.status, 401);
  }
  const blocked = await call(env, 'POST', '/api/login', { body: { email: 'coord@exemplo.test', password: PASSWORD }, ip: '198.51.100.7' });
  assert.equal(blocked.status, 429);
});

test('login: o limite por rede considera o prefixo /64 do IPv6', async () => {
  const env = createEnv({ setupCode: SETUP_CODE });
  await setupCoordinator(env);
  for (let i = 0; i < 8; i++) {
    await call(env, 'POST', '/api/login', {
      body: { email: 'coord@exemplo.test', password: 'errada-errada' },
      ip: `2001:db8:1:2:${i}::${i}`, // endereços diferentes, mesma rede /64
    });
  }
  const blocked = await call(env, 'POST', '/api/login', {
    body: { email: 'coord@exemplo.test', password: PASSWORD },
    ip: '2001:db8:1:2:ffff::1',
  });
  assert.equal(blocked.status, 429);
});

test('sessão: sair invalida o cookie; sem cookie não há acesso', async () => {
  const env = createEnv({ setupCode: SETUP_CODE });
  const cookie = await setupCoordinator(env);
  assert.equal((await call(env, 'GET', '/api/me', { cookie })).status, 200);
  assert.equal((await call(env, 'GET', '/api/me')).status, 401);
  await call(env, 'POST', '/api/logout', { cookie });
  assert.equal((await call(env, 'GET', '/api/me', { cookie })).status, 401);
});

test('sessão: desativar a conta derruba a sessão na hora', async () => {
  const env = createEnv({ setupCode: SETUP_CODE });
  const coord = await setupCoordinator(env);
  const userId = await createUser(env, coord, { name: 'Eng Um', email: 'eng@exemplo.test', role: 'engenheiro' });
  const engCookie = await loginAs(env, 'eng@exemplo.test');
  assert.equal((await call(env, 'GET', '/api/me', { cookie: engCookie })).status, 200);

  const off = await call(env, 'PUT', `/api/users/${userId}`, { cookie: coord, body: { active: false } });
  assert.equal(off.status, 200);
  assert.equal((await call(env, 'GET', '/api/me', { cookie: engCookie })).status, 401);
});

test('sessão: trocar a função encerra as sessões antigas da pessoa', async () => {
  const env = createEnv({ setupCode: SETUP_CODE });
  const coord = await setupCoordinator(env);
  const userId = await createUser(env, coord, { name: 'Eng Um', email: 'eng@exemplo.test', role: 'engenheiro' });
  const engCookie = await loginAs(env, 'eng@exemplo.test');
  await call(env, 'PUT', `/api/users/${userId}`, { cookie: coord, body: { role: 'cliente' } });
  assert.equal((await call(env, 'GET', '/api/me', { cookie: engCookie })).status, 401);
});

test('coordenador: não dá para ficar sem nenhum coordenador ativo', async () => {
  const env = createEnv({ setupCode: SETUP_CODE });
  const coord = await setupCoordinator(env);
  const me = (await call(env, 'GET', '/api/me', { cookie: coord })).body.user;
  assert.equal((await call(env, 'PUT', `/api/users/${me.id}`, { cookie: coord, body: { role: 'engenheiro' } })).status, 409);
  assert.equal((await call(env, 'PUT', `/api/users/${me.id}`, { cookie: coord, body: { active: false } })).status, 409);
});

test('senha: mínimo de 10 caracteres; a troca exige a senha atual', async () => {
  const env = createEnv({ setupCode: SETUP_CODE });
  const coord = await setupCoordinator(env);
  const short = await call(env, 'POST', '/api/users', {
    cookie: coord,
    body: { name: 'Curta', email: 'curta@exemplo.test', role: 'cliente', password: '123456789' },
  });
  assert.equal(short.status, 400);

  const wrongCurrent = await call(env, 'POST', '/api/me/password', {
    cookie: coord,
    body: { currentPassword: 'nao-e-essa-senha', newPassword: 'nova-senha-1234' },
  });
  assert.equal(wrongCurrent.status, 403);
  const ok = await call(env, 'POST', '/api/me/password', {
    cookie: coord,
    body: { currentPassword: PASSWORD, newPassword: 'nova-senha-1234' },
  });
  assert.equal(ok.status, 200);
  assert.equal((await call(env, 'POST', '/api/login', { body: { email: 'coord@exemplo.test', password: PASSWORD } })).status, 401);
  assert.equal((await call(env, 'POST', '/api/login', { body: { email: 'coord@exemplo.test', password: 'nova-senha-1234' } })).status, 200);
});

test('CSRF: escrita vinda de outro site é recusada', async () => {
  const env = createEnv({ setupCode: SETUP_CODE });
  const coord = await setupCoordinator(env);
  const body = { name: 'Obra X' };
  const viaOrigin = await call(env, 'PUT', '/api/projects/obra-x', { cookie: coord, body, headers: { origin: 'https://site-malicioso.test' } });
  assert.equal(viaOrigin.status, 403);
  const viaFetchSite = await call(env, 'PUT', '/api/projects/obra-x', { cookie: coord, body, headers: { 'sec-fetch-site': 'cross-site' } });
  assert.equal(viaFetchSite.status, 403);
  const sameOrigin = await call(env, 'PUT', '/api/projects/obra-x', { cookie: coord, body, headers: { origin: 'https://diario.test' } });
  assert.equal(sameOrigin.status, 200);
});
