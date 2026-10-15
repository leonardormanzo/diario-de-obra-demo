#!/usr/bin/env node
/**
 * Carrega a obra fictícia "Residencial Aurora – Bloco A" no app.
 *
 *   node scripts/seed-demo.mjs --url http://127.0.0.1:8787 --email voce@exemplo.com --password '***' [--users]
 *
 * Também aceita SEED_URL, SEED_EMAIL e SEED_PASSWORD no ambiente (evita a senha no histórico do terminal).
 * Pode rodar mais de uma vez: RDOs já editados no app não são sobrescritos.
 */
import { parseArgs } from 'node:util';
import { seed } from './seed-lib.mjs';

const { values } = parseArgs({
  options: { url: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' }, users: { type: 'boolean', default: false } },
});
const url = (values.url ?? process.env.SEED_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
const email = values.email ?? process.env.SEED_EMAIL;
const password = values.password ?? process.env.SEED_PASSWORD;
if (!email || !password) {
  console.error('Informe --email e --password (ou SEED_EMAIL e SEED_PASSWORD). É o coordenador criado em "Primeiro acesso".');
  process.exit(1);
}

async function request(method, path, { body, cookie } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${url}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const setCookie = response.headers.get('set-cookie');
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null, cookie: setCookie ? setCookie.split(';')[0] : null };
}

try {
  const result = await seed(request, { email, password, withUsers: values.users, log: (line) => console.log(line) });
  for (const u of result.usuarios) console.log(`Acesso de demonstração (${u.role}): ${u.email}  senha: ${u.senha}`);
  console.log('Pronto. Abra o app e entre com o coordenador.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
