import { createSession, destroySession, destroyUserSessions, releaseAttempt, requireUser, reserveAttempt } from '../auth';
import { hashPassword, randomToken, safeEqualText, verifyPassword } from '../crypto';
import { Env, Role, SessionUser } from '../env';
import { HttpError, clearSessionCookie, json, readJson, sessionCookie, text } from '../http';

const MAX_BODY_CHARS = 4_000;
export const PASSWORD_MIN = 10;
const PASSWORD_MAX = 128;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_KEY_MAX_CHARS = 120;

// Failed-attempt limits (per 15 minutes).
const MAX_PER_ACCOUNT_AND_NETWORK = 8;
const MAX_PER_ACCOUNT = 20;
const MAX_PER_NETWORK = 30;
const MAX_SETUP = 10;
const MAX_PASSWORD_CHECKS = 8;

// Verified when the e-mail does not exist, so the response time does not reveal which e-mails are registered.
let dummyHash: string | null = null;
async function getDummyHash(): Promise<string> {
  dummyHash ??= await hashPassword(randomToken());
  return dummyHash;
}

export interface RequestContext {
  request: Request;
  url: URL;
  env: Env;
}

export const publicUser = (user: SessionUser) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  projectIds: user.projectIds,
});

export function parseEmail(value: unknown): string {
  const email = text(value, 'E-mail', 3, 120).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw new HttpError(400, 'E-mail inválido.');
  return email;
}

export function parsePassword(value: unknown, label = 'Senha'): string {
  if (typeof value !== 'string' || value.length < PASSWORD_MIN || value.length > PASSWORD_MAX) {
    throw new HttpError(400, `${label} precisa ter de ${PASSWORD_MIN} a ${PASSWORD_MAX} caracteres.`);
  }
  return value;
}

/**
 * Network identity used for throttling. An IPv6 user owns a whole /64, so only that prefix is used
 * (otherwise one machine could rotate through billions of addresses).
 */
export function networkKey(request: Request): string {
  const ip = (request.headers.get('cf-connecting-ip') || 'local').toLowerCase();
  if (!ip.includes(':')) return ip;

  const [head, tail = ''] = ip.split('::');
  const headGroups = head ? head.split(':') : [];
  const tailGroups = tail ? tail.split(':') : [];
  const missing = ip.includes('::') ? Math.max(0, 8 - headGroups.length - tailGroups.length) : 0;
  const groups = [...headGroups, ...Array(missing).fill('0'), ...tailGroups];
  return groups.slice(0, 4).join(':');
}

async function userCount(env: Env): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>();
  return row?.n ?? 0;
}

export async function getSetupStatus({ env }: RequestContext): Promise<Response> {
  return json({ needsSetup: (await userCount(env)) === 0 });
}

/** Creates the first coordinator. Allowed only while there are no users and with the setup code. */
export async function setup({ request, url, env }: RequestContext): Promise<Response> {
  const network = networkKey(request);
  const attempt = await reserveAttempt(env, [
    { key: 'setup:all', max: MAX_SETUP },
    { key: `net:${network}`, max: MAX_PER_NETWORK },
  ]);

  if ((await userCount(env)) > 0) throw new HttpError(409, 'A instalação já foi concluída.');
  if (!env.SETUP_CODE) throw new HttpError(503, 'A instalação ainda não foi liberada.');

  const body = await readJson(request, MAX_BODY_CHARS);
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!(await safeEqualText(code, env.SETUP_CODE))) throw new HttpError(403, 'Código de instalação incorreto.');

  const name = text(body.name, 'Nome', 2, 80);
  const email = parseEmail(body.email);
  const password = parsePassword(body.password);
  const now = new Date().toISOString();
  const id = `user-${crypto.randomUUID()}`;

  // Atomic: only inserts while the table is still empty (two simultaneous setups cannot both win).
  const inserted = await env.DB.prepare(
    `INSERT INTO users (id, name, email, role, password_hash, active, created_at, updated_at)
     SELECT ?1, ?2, ?3, 'coordenador', ?4, 1, ?5, ?5 WHERE NOT EXISTS (SELECT 1 FROM users)`
  )
    .bind(id, name, email, await hashPassword(password), now)
    .run();
  if (inserted.meta?.changes !== 1) throw new HttpError(409, 'A instalação já foi concluída.');

  await releaseAttempt(env, attempt);
  const token = await createSession(env, id);
  const user: SessionUser = { id, name, email, role: 'coordenador', projectIds: [] };
  return json({ user: publicUser(user) }, 201, { 'set-cookie': sessionCookie(token, url.protocol === 'https:') });
}

export async function login({ request, url, env }: RequestContext): Promise<Response> {
  const body = await readJson(request, MAX_BODY_CHARS);
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, EMAIL_KEY_MAX_CHARS) : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const network = networkKey(request);

  const attempt = await reserveAttempt(env, [
    { key: `login:${network}|${email}`, max: MAX_PER_ACCOUNT_AND_NETWORK },
    { key: `acct:${email}`, max: MAX_PER_ACCOUNT },
    { key: `net:${network}`, max: MAX_PER_NETWORK },
  ]);

  const row = await env.DB.prepare(
    'SELECT id, name, email, role, password_hash, active FROM users WHERE email = ?1'
  )
    .bind(email)
    .first<{ id: string; name: string; email: string; role: Role; password_hash: string; active: number }>();

  const isValid = await verifyPassword(password, row?.password_hash ?? (await getDummyHash()));
  if (!row || !isValid || row.active !== 1) throw new HttpError(401, 'E-mail ou senha incorretos.');

  await releaseAttempt(env, attempt);
  const token = await createSession(env, row.id);
  const projectIds =
    row.role === 'coordenador'
      ? []
      : (
          await env.DB.prepare('SELECT project_id FROM user_projects WHERE user_id = ?1')
            .bind(row.id)
            .all<{ project_id: string }>()
        ).results.map((r) => r.project_id);

  const user: SessionUser = { id: row.id, name: row.name, email: row.email, role: row.role, projectIds };
  return json({ user: publicUser(user) }, 200, { 'set-cookie': sessionCookie(token, url.protocol === 'https:') });
}

export async function logout({ request, url, env }: RequestContext): Promise<Response> {
  await destroySession(env, request);
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie(url.protocol === 'https:') });
}

export async function me({ request, env }: RequestContext): Promise<Response> {
  const user = await requireUser(env, request);
  return json({ user: publicUser(user) });
}

export async function changeOwnPassword({ request, env }: RequestContext): Promise<Response> {
  const user = await requireUser(env, request);
  const attempt = await reserveAttempt(env, [{ key: `pw:${user.id}`, max: MAX_PASSWORD_CHECKS }]);

  const body = await readJson(request, MAX_BODY_CHARS);
  const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const next = parsePassword(body.newPassword, 'Nova senha');

  const row = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?1')
    .bind(user.id)
    .first<{ password_hash: string }>();
  if (!row || !(await verifyPassword(current, row.password_hash))) {
    throw new HttpError(403, 'A senha atual está incorreta.');
  }

  await releaseAttempt(env, attempt);
  await env.DB.prepare('UPDATE users SET password_hash = ?1, updated_at = ?2 WHERE id = ?3')
    .bind(await hashPassword(next), new Date().toISOString(), user.id)
    .run();
  await destroyUserSessions(env, user.id, request);
  return json({ ok: true });
}
