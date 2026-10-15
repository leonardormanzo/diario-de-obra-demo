import { Env, Role, SessionUser } from './env';
import { randomToken, sha256Hex } from './crypto';
import { HttpError, SESSION_COOKIE, SESSION_DAYS, getCookie } from './http';

const DAY_MS = 86_400_000;
const ATTEMPT_WINDOW_MS = 15 * 60_000;

interface SessionRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  expires_at: string;
}

/* -------------------------------- sessions -------------------------------- */

export async function createSession(env: Env, userId: string): Promise<string> {
  const token = randomToken();
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?1').bind(new Date(now).toISOString()),
    env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?1, ?2, ?3)').bind(
      await sha256Hex(token),
      userId,
      new Date(now + SESSION_DAYS * DAY_MS).toISOString()
    ),
  ]);
  return token;
}

export async function destroySession(env: Env, request: Request): Promise<void> {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return;
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(await sha256Hex(token)).run();
}

export async function destroyUserSessions(env: Env, userId: string, exceptRequest?: Request): Promise<void> {
  const keep = exceptRequest ? getCookie(exceptRequest, SESSION_COOKIE) : null;
  if (keep) {
    await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1 AND token_hash != ?2')
      .bind(userId, await sha256Hex(keep))
      .run();
    return;
  }
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(userId).run();
}

export async function loadAssignedProjectIds(env: Env, userId: string): Promise<string[]> {
  const rows = await env.DB.prepare('SELECT project_id FROM user_projects WHERE user_id = ?1')
    .bind(userId)
    .all<{ project_id: string }>();
  return rows.results.map((r) => r.project_id);
}

export async function loadSessionUser(env: Env, request: Request): Promise<SessionUser | null> {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;

  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.role, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?1 AND u.active = 1`
  )
    .bind(tokenHash)
    .first<SessionRow>();
  if (!row) return null;

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(tokenHash).run();
    return null;
  }

  const projectIds = row.role === 'coordenador' ? [] : await loadAssignedProjectIds(env, row.id);
  return { id: row.id, name: row.name, email: row.email, role: row.role, projectIds };
}

export async function requireUser(env: Env, request: Request): Promise<SessionUser> {
  const user = await loadSessionUser(env, request);
  if (!user) throw new HttpError(401, 'Entre para continuar.');
  return user;
}

/* ------------------------------- permissions ------------------------------ */

export function requireCoordinator(user: SessionUser): void {
  if (user.role !== 'coordenador') throw new HttpError(403, 'Só o coordenador pode fazer isso.');
}

/** Coordenador and Eng. responsável can write; Cliente is read-only. */
export function requireEditor(user: SessionUser): void {
  if (user.role === 'cliente') throw new HttpError(403, 'Seu acesso é só para consulta.');
}

export function canAccessProject(user: SessionUser, projectId: string): boolean {
  return user.role === 'coordenador' || user.projectIds.includes(projectId);
}

export function requireProjectAccess(user: SessionUser, projectId: string): void {
  if (!canAccessProject(user, projectId)) throw new HttpError(403, 'Você não tem acesso a esta obra.');
}

/* ------------------------------ rate limiting ----------------------------- */

export interface AttemptLimit {
  key: string;
  max: number;
}

export interface AttemptReservation {
  keys: string[];
  at: number;
}

async function countAttempts(env: Env, key: string): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE key = ?1 AND at > ?2')
    .bind(key, Date.now() - ATTEMPT_WINDOW_MS)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/**
 * Counts the attempt BEFORE it is verified (so parallel guesses cannot all slip through) and
 * refuses when any of the keys is over its limit. Call `releaseAttempt` when the attempt succeeds.
 */
export async function reserveAttempt(env: Env, limits: AttemptLimit[]): Promise<AttemptReservation> {
  const at = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM login_attempts WHERE at < ?1').bind(at - ATTEMPT_WINDOW_MS),
    ...limits.map((limit) => env.DB.prepare('INSERT INTO login_attempts (key, at) VALUES (?1, ?2)').bind(limit.key, at)),
  ]);

  const counts = await Promise.all(limits.map((limit) => countAttempts(env, limit.key)));
  if (counts.some((count, index) => count > limits[index].max)) {
    throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos e tente de novo.');
  }
  return { keys: limits.map((limit) => limit.key), at };
}

/** A successful attempt does not count against the limits. */
export async function releaseAttempt(env: Env, reservation: AttemptReservation): Promise<void> {
  const placeholders = reservation.keys.map((_, index) => `?${index + 2}`).join(',');
  await env.DB.prepare(`DELETE FROM login_attempts WHERE at = ?1 AND key IN (${placeholders})`)
    .bind(reservation.at, ...reservation.keys)
    .run();
}
