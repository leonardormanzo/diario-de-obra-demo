import { destroyUserSessions, requireCoordinator, requireUser } from '../auth';
import { hashPassword } from '../crypto';
import { Env, Role } from '../env';
import { HttpError, assertId, json, readJson, text } from '../http';
import { RequestContext, parseEmail, parsePassword } from './account';

const MAX_BODY_CHARS = 8_000;
const MAX_ASSIGNED_PROJECTS = 90; // D1 allows at most 100 bound parameters per statement
const ROLES: Role[] = ['coordenador', 'engenheiro', 'cliente'];

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: number;
  created_at: string;
}

function parseRole(value: unknown): Role {
  if (typeof value !== 'string' || !ROLES.includes(value as Role)) throw new HttpError(400, 'Função inválida.');
  return value as Role;
}

async function parseProjectIds(env: Env, value: unknown, role: Role): Promise<string[]> {
  if (role === 'coordenador') return []; // coordinators see every obra
  if (!Array.isArray(value)) return [];
  if (value.length > MAX_ASSIGNED_PROJECTS) throw new HttpError(400, 'Obras demais para um acesso.');
  const ids = Array.from(new Set(value.map((v) => assertId(v, 'obra'))));
  if (ids.length === 0) return [];

  const placeholders = ids.map((_, i) => `?${i + 1}`).join(',');
  const found = await env.DB.prepare(`SELECT id FROM projects WHERE deleted_at IS NULL AND id IN (${placeholders})`)
    .bind(...ids)
    .all<{ id: string }>();
  if (found.results.length !== ids.length) throw new HttpError(400, 'Alguma obra escolhida não existe mais.');
  return ids;
}

async function replaceAssignments(env: Env, userId: string, projectIds: string[]): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM user_projects WHERE user_id = ?1').bind(userId),
    ...projectIds.map((projectId) =>
      env.DB.prepare('INSERT INTO user_projects (user_id, project_id) VALUES (?1, ?2)').bind(userId, projectId)
    ),
  ]);
}

export async function listUsers({ request, env }: RequestContext): Promise<Response> {
  const actor = await requireUser(env, request);
  requireCoordinator(actor);

  const users = await env.DB.prepare('SELECT id, name, email, role, active, created_at FROM users ORDER BY name COLLATE NOCASE')
    .all<UserRow>();
  const assignments = await env.DB.prepare('SELECT user_id, project_id FROM user_projects')
    .all<{ user_id: string; project_id: string }>();

  const byUser = new Map<string, string[]>();
  assignments.results.forEach((a) => byUser.set(a.user_id, [...(byUser.get(a.user_id) ?? []), a.project_id]));

  return json({
    users: users.results.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active === 1,
      projectIds: u.role === 'coordenador' ? [] : (byUser.get(u.id) ?? []),
    })),
  });
}

export async function createUser({ request, env }: RequestContext): Promise<Response> {
  const actor = await requireUser(env, request);
  requireCoordinator(actor);

  const body = await readJson(request, MAX_BODY_CHARS);
  const name = text(body.name, 'Nome', 2, 80);
  const email = parseEmail(body.email);
  const role = parseRole(body.role);
  const password = parsePassword(body.password);
  const projectIds = await parseProjectIds(env, body.projectIds, role);

  const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?1').bind(email).first();
  if (exists) throw new HttpError(409, 'Já existe um acesso com este e-mail.');

  const id = `user-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, role, password_hash, active, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?6)`
  )
    .bind(id, name, email, role, await hashPassword(password), now)
    .run();
  await replaceAssignments(env, id, projectIds);

  return json({ user: { id, name, email, role, active: true, projectIds } }, 201);
}

export async function updateUser({ request, env }: RequestContext, rawId: string): Promise<Response> {
  const actor = await requireUser(env, request);
  requireCoordinator(actor);
  const userId = assertId(rawId, 'acesso');

  const current = await env.DB.prepare('SELECT id, name, email, role, active, created_at FROM users WHERE id = ?1')
    .bind(userId)
    .first<UserRow>();
  if (!current) throw new HttpError(404, 'Acesso não encontrado.');

  const body = await readJson(request, MAX_BODY_CHARS);
  if (body.active !== undefined && typeof body.active !== 'boolean') throw new HttpError(400, 'Valor inválido para "ativo".');

  const name = body.name !== undefined ? text(body.name, 'Nome', 2, 80) : current.name;
  const role = body.role !== undefined ? parseRole(body.role) : current.role;
  const active = body.active !== undefined ? (body.active as boolean) : current.active === 1;
  const newPassword = body.password !== undefined && body.password !== '' ? parsePassword(body.password, 'Nova senha') : null;

  if (userId === actor.id && !active) throw new HttpError(409, 'Você não pode desativar o seu próprio acesso.');

  // Validate everything BEFORE writing, so a rejected request changes nothing.
  const changesAssignments = body.projectIds !== undefined || role !== current.role;
  const projectIds = changesAssignments ? await parseProjectIds(env, body.projectIds, role) : null;

  // Atomic guard: the change only applies if another active coordinator remains.
  const losesCoordinatorPower = current.role === 'coordenador' && (role !== 'coordenador' || !active);
  const updated = await env.DB.prepare(
    `UPDATE users SET name = ?1, role = ?2, active = ?3, updated_at = ?4
      WHERE id = ?5
        AND (?6 = 0 OR EXISTS (SELECT 1 FROM users WHERE role = 'coordenador' AND active = 1 AND id != ?5))`
  )
    .bind(name, role, active ? 1 : 0, new Date().toISOString(), userId, losesCoordinatorPower ? 1 : 0)
    .run();
  if (updated.meta?.changes !== 1) throw new HttpError(409, 'Precisa existir pelo menos um coordenador ativo.');

  if (newPassword) {
    await env.DB.prepare('UPDATE users SET password_hash = ?1 WHERE id = ?2')
      .bind(await hashPassword(newPassword), userId)
      .run();
  }
  if (projectIds) await replaceAssignments(env, userId, projectIds);

  const mustEndSessions = role !== current.role || !active || newPassword !== null;
  if (mustEndSessions) await destroyUserSessions(env, userId, userId === actor.id ? request : undefined);

  const assigned = await env.DB.prepare('SELECT project_id FROM user_projects WHERE user_id = ?1')
    .bind(userId)
    .all<{ project_id: string }>();
  return json({
    user: {
      id: userId,
      name,
      email: current.email,
      role,
      active,
      projectIds: role === 'coordenador' ? [] : assigned.results.map((r) => r.project_id),
    },
  });
}
