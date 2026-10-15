import worker from '../worker/index';
import type { Env } from '../worker/env';

export const ORIGIN = 'https://diario.test';
export const SETUP_CODE = 'frase-de-instalacao-bem-longa-para-testes';
export const PASSWORD = 'senha-de-teste-123';

// 1x1 PNG válido (a API só aceita data URL de jpeg/png/webp em base64).
export const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export interface Reply {
  status: number;
  body: any;
  cookie: string | null;
}

export interface CallOptions {
  body?: unknown;
  cookie?: string | null;
  ip?: string;
  headers?: Record<string, string>;
}

export async function call(env: Env, method: string, path: string, options: CallOptions = {}): Promise<Reply> {
  const headers: Record<string, string> = {
    'cf-connecting-ip': options.ip ?? '203.0.113.10',
    ...options.headers,
  };
  if (options.cookie) headers.cookie = options.cookie;
  const init: RequestInit = { method, headers };
  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
    headers['content-type'] = 'application/json';
  }
  const response = await worker.fetch(new Request(`${ORIGIN}${path}`, init), env);
  const setCookie = response.headers.get('set-cookie');
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null, cookie: setCookie ? setCookie.split(';')[0] : null };
}

/** Cria o 1º coordenador pelo fluxo real de instalação e devolve o cookie de sessão. */
export async function setupCoordinator(env: Env): Promise<string> {
  const reply = await call(env, 'POST', '/api/setup', {
    body: { code: SETUP_CODE, name: 'Coordenadora Teste', email: 'coord@exemplo.test', password: PASSWORD },
  });
  if (reply.status !== 201 || !reply.cookie) throw new Error(`setup falhou: ${reply.status} ${JSON.stringify(reply.body)}`);
  return reply.cookie;
}

export async function loginAs(env: Env, email: string, password = PASSWORD, ip = '203.0.113.20'): Promise<string> {
  const reply = await call(env, 'POST', '/api/login', { body: { email, password }, ip });
  if (reply.status !== 200 || !reply.cookie) throw new Error(`login falhou: ${reply.status}`);
  return reply.cookie;
}

export async function createProject(env: Env, cookie: string, id: string, name = `Obra ${id}`): Promise<void> {
  const reply = await call(env, 'PUT', `/api/projects/${id}`, { cookie, body: { name, status: 'em_andamento' } });
  if (reply.status !== 200) throw new Error(`obra falhou: ${reply.status} ${JSON.stringify(reply.body)}`);
}

export async function createUser(
  env: Env,
  cookie: string,
  user: { name: string; email: string; role: 'coordenador' | 'engenheiro' | 'cliente'; projectIds?: string[] }
): Promise<string> {
  const reply = await call(env, 'POST', '/api/users', { cookie, body: { ...user, password: PASSWORD } });
  if (reply.status !== 201) throw new Error(`usuário falhou: ${reply.status} ${JSON.stringify(reply.body)}`);
  return reply.body.user.id;
}

export function logBody(projectId: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    projectId,
    executionDate: '2026-09-15',
    rdoNumber: 1,
    status: 'aprovado',
    generalNotes: 'Concretagem da laje do 2º pavimento.',
    workforce: [{ id: 'w1', role: 'Pedreiro', count: 4 }],
    photos: [],
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
