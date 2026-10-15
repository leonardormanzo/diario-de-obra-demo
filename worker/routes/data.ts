import {
  canAccessProject,
  requireCoordinator,
  requireEditor,
  requireProjectAccess,
  requireUser,
} from '../auth';
import type { Env } from '../env';
import { HttpError, assertId, json, readJson } from '../http';
import { MAX_PHOTO_CHARS, assertPhotoDataUrl, sanitizeLog, sanitizeProject } from '../validate';
import { RequestContext } from './account';

const MAX_PROJECT_CHARS = 8_000;
const MAX_LOG_CHARS = 256_000;
const MAX_PHOTO_BODY_CHARS = MAX_PHOTO_CHARS + 2_000;
const SYNC_OVERLAP_MS = 10_000;

interface ProjectRow {
  id: string;
  data: string;
  updated_at: string;
  deleted_at: string | null;
}

interface LogRow {
  id: string;
  project_id: string;
  data: string;
  client_updated_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const parseSince = (value: string | null): string => {
  if (!value) return '';
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : '';
};

/* ---------------------------------- sync ---------------------------------- */

const placeholders = (count: number, offset = 1): string =>
  Array.from({ length: count }, (_, i) => `?${i + offset}`).join(',');

/** Everything the user may see that changed after `since` (plus deletions). */
export async function sync({ request, url, env }: RequestContext): Promise<Response> {
  const user = await requireUser(env, request);
  const since = parseSince(url.searchParams.get('since'));
  const isCoordinator = user.role === 'coordenador';

  // Non-coordinators only ever read rows of their own obras (filtered by the database, not in memory).
  const scope = user.projectIds;
  const hasScope = isCoordinator || scope.length > 0;

  const [projectRows, logRows, liveProjects] = hasScope
    ? await Promise.all([
        isCoordinator
          ? env.DB.prepare('SELECT id, data, updated_at, deleted_at FROM projects WHERE updated_at > ?1').bind(since).all<ProjectRow>()
          : env.DB.prepare(
              `SELECT id, data, updated_at, deleted_at FROM projects WHERE updated_at > ?1 AND id IN (${placeholders(scope.length, 2)})`
            )
              .bind(since, ...scope)
              .all<ProjectRow>(),
        isCoordinator
          ? env.DB.prepare(
              'SELECT id, project_id, data, client_updated_at, updated_at, deleted_at FROM logs WHERE updated_at > ?1'
            )
              .bind(since)
              .all<LogRow>()
          : env.DB.prepare(
              `SELECT id, project_id, data, client_updated_at, updated_at, deleted_at FROM logs
                WHERE updated_at > ?1 AND project_id IN (${placeholders(scope.length, 2)})`
            )
              .bind(since, ...scope)
              .all<LogRow>(),
        env.DB.prepare('SELECT id FROM projects WHERE deleted_at IS NULL').all<{ id: string }>(),
      ])
    : [{ results: [] as ProjectRow[] }, { results: [] as LogRow[] }, { results: [] as Array<{ id: string }> }];

  // Clients never receive drafts.
  const logs = logRows.results
    .filter((l) => !l.deleted_at)
    .map((l) => JSON.parse(l.data) as { photos?: Array<{ id: string }>; status?: string })
    .filter((l) => user.role !== 'cliente' || l.status !== 'rascunho');

  return json({
    cursor: new Date(Date.now() - SYNC_OVERLAP_MS).toISOString(),
    projectIds: liveProjects.results.map((p) => p.id).filter((id) => canAccessProject(user, id)),
    projects: projectRows.results.filter((p) => !p.deleted_at).map((p) => JSON.parse(p.data)),
    deletedProjectIds: projectRows.results.filter((p) => p.deleted_at).map((p) => p.id),
    logs,
    deletedLogIds: logRows.results.filter((l) => l.deleted_at).map((l) => l.id),
    photoIds: logs.flatMap((l) => (l.photos ?? []).map((p) => p.id)),
  });
}

/* -------------------------------- projects -------------------------------- */

export async function putProject({ request, env }: RequestContext, rawId: string): Promise<Response> {
  const user = await requireUser(env, request);
  requireEditor(user);
  const id = assertId(rawId, 'obra');

  const project = sanitizeProject(await readJson(request, MAX_PROJECT_CHARS), id);
  const existing = await env.DB.prepare('SELECT id, deleted_at FROM projects WHERE id = ?1')
    .bind(id)
    .first<{ id: string; deleted_at: string | null }>();

  if (!existing || existing.deleted_at) {
    requireCoordinator(user); // only the coordinator creates obras
  } else {
    requireProjectAccess(user, id);
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO projects (id, data, updated_at, deleted_at) VALUES (?1, ?2, ?3, NULL)
     ON CONFLICT(id) DO UPDATE SET data = ?2, updated_at = ?3, deleted_at = NULL`
  )
    .bind(id, JSON.stringify(project), now)
    .run();
  return json({ project });
}

export async function deleteProject({ request, env }: RequestContext, rawId: string): Promise<Response> {
  const user = await requireUser(env, request);
  requireCoordinator(user);
  const id = assertId(rawId, 'obra');

  const logs = await env.DB.prepare('SELECT COUNT(*) AS n FROM logs WHERE project_id = ?1 AND deleted_at IS NULL')
    .bind(id)
    .first<{ n: number }>();
  if ((logs?.n ?? 0) > 0) throw new HttpError(409, 'Esta obra tem RDOs. Apague os RDOs antes.');

  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare('UPDATE projects SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2').bind(now, id),
    env.DB.prepare('DELETE FROM user_projects WHERE project_id = ?1').bind(id),
  ]);
  return json({ ok: true });
}

/* ----------------------------------- RDOs --------------------------------- */

export async function putLog({ request, env }: RequestContext, rawId: string): Promise<Response> {
  const user = await requireUser(env, request);
  requireEditor(user);
  const id = assertId(rawId, 'RDO');

  const log = sanitizeLog(await readJson(request, MAX_LOG_CHARS), id, user.email);
  requireProjectAccess(user, log.projectId);

  const project = await env.DB.prepare('SELECT id FROM projects WHERE id = ?1 AND deleted_at IS NULL')
    .bind(log.projectId)
    .first();
  if (!project) throw new HttpError(404, 'A obra deste RDO não existe mais.');

  const existing = await env.DB.prepare('SELECT project_id, client_updated_at, data, deleted_at FROM logs WHERE id = ?1')
    .bind(id)
    .first<{ project_id: string; client_updated_at: string; data: string; deleted_at: string | null }>();

  if (existing) {
    requireProjectAccess(user, existing.project_id);
    if (existing.deleted_at) return json({ deleted: true });
    if (existing.client_updated_at > log.updatedAt) {
      return json({ conflict: true, log: JSON.parse(existing.data) }); // newer version already on the server
    }
    log.createdByEmail = (JSON.parse(existing.data) as { createdByEmail?: string }).createdByEmail || log.createdByEmail;
  }

  const now = new Date().toISOString();
  const photoIds = log.photos.map((p) => p.id);
  const keepPhotos = photoIds.length > 0 ? `AND id NOT IN (${photoIds.map((_, i) => `?${i + 2}`).join(',')})` : '';

  const removed = await env.DB.prepare(`SELECT id FROM photos WHERE log_id = ?1 ${keepPhotos}`)
    .bind(id, ...photoIds)
    .all<{ id: string }>();

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO logs (id, project_id, data, client_updated_at, updated_at, updated_by, deleted_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL)
       ON CONFLICT(id) DO UPDATE SET project_id = ?2, data = ?3, client_updated_at = ?4,
         updated_at = ?5, updated_by = ?6
       WHERE logs.deleted_at IS NULL`
    ).bind(id, log.projectId, JSON.stringify(log), log.updatedAt, now, user.id),
    env.DB.prepare(`DELETE FROM photos WHERE log_id = ?1 ${keepPhotos}`).bind(id, ...photoIds),
    env.DB.prepare('UPDATE photos SET project_id = ?1 WHERE log_id = ?2').bind(log.projectId, id),
  ]);
  await deleteStoredPhotos(env, removed.results.map((p) => p.id));
  return json({ log });
}

export async function deleteLog({ request, env }: RequestContext, rawId: string): Promise<Response> {
  const user = await requireUser(env, request);
  requireEditor(user);
  const id = assertId(rawId, 'RDO');

  const existing = await env.DB.prepare('SELECT project_id FROM logs WHERE id = ?1')
    .bind(id)
    .first<{ project_id: string }>();
  if (!existing || !canAccessProject(user, existing.project_id)) throw new HttpError(404, 'RDO não encontrado.');

  const now = new Date().toISOString();
  const removed = await env.DB.prepare('SELECT id FROM photos WHERE log_id = ?1').bind(id).all<{ id: string }>();
  await env.DB.batch([
    env.DB.prepare('UPDATE logs SET deleted_at = ?1, updated_at = ?1, updated_by = ?2 WHERE id = ?3').bind(now, user.id, id),
    env.DB.prepare('DELETE FROM photos WHERE log_id = ?1').bind(id),
  ]);
  await deleteStoredPhotos(env, removed.results.map((p) => p.id));
  return json({ ok: true });
}

/* ---------------------------------- photos -------------------------------- */

export async function putPhoto({ request, env }: RequestContext, rawId: string): Promise<Response> {
  const user = await requireUser(env, request);
  requireEditor(user);
  const id = assertId(rawId, 'foto');

  const body = await readJson(request, MAX_PHOTO_BODY_CHARS);
  const logId = assertId(body.logId, 'RDO');
  const projectId = assertId(body.projectId, 'obra');
  const dataUrl = assertPhotoDataUrl(body.dataUrl);
  requireProjectAccess(user, projectId);

  // The picture must belong to a live RDO of this same obra that lists it (the app saves the RDO first).
  const log = await env.DB.prepare('SELECT project_id, data, deleted_at FROM logs WHERE id = ?1')
    .bind(logId)
    .first<{ project_id: string; data: string; deleted_at: string | null }>();
  const isListed =
    log !== null &&
    !log.deleted_at &&
    log.project_id === projectId &&
    ((JSON.parse(log.data) as { photos?: Array<{ id: string }> }).photos ?? []).some((p) => p.id === id);
  if (!isListed) throw new HttpError(404, 'RDO não encontrado para esta foto.');

  const existing = await env.DB.prepare('SELECT log_id, project_id FROM photos WHERE id = ?1')
    .bind(id)
    .first<{ log_id: string; project_id: string }>();
  if (existing && (existing.log_id !== logId || existing.project_id !== projectId)) {
    throw new HttpError(409, 'Esta foto já pertence a outro RDO.');
  }

  // With R2 the picture lives in the bucket and the D1 row only records ownership (data_url stays empty).
  if (env.PHOTOS) await env.PHOTOS.put(photoKey(id), dataUrl);
  await env.DB.prepare(
    `INSERT INTO photos (id, log_id, project_id, data_url, created_at) VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(id) DO UPDATE SET data_url = ?4`
  )
    .bind(id, logId, projectId, env.PHOTOS ? '' : dataUrl, new Date().toISOString())
    .run();
  return json({ ok: true });
}

const photoKey = (id: string): string => `photos/${id}`;

/** Removes pictures from R2 after their rows are gone (rows are what grant access, so leftovers are unreachable). */
async function deleteStoredPhotos(env: Env, ids: string[]): Promise<void> {
  if (!env.PHOTOS || ids.length === 0) return;
  try {
    await env.PHOTOS.delete(ids.map(photoKey));
  } catch {
    /* orphaned objects are harmless: nothing references them any more */
  }
}

export async function getPhoto({ request, env }: RequestContext, rawId: string): Promise<Response> {
  const user = await requireUser(env, request);
  const id = assertId(rawId, 'foto');

  const row = await env.DB.prepare(
    `SELECT p.project_id, p.data_url, l.data AS log_data
       FROM photos p LEFT JOIN logs l ON l.id = p.log_id AND l.deleted_at IS NULL
      WHERE p.id = ?1`
  )
    .bind(id)
    .first<{ project_id: string; data_url: string; log_data: string | null }>();
  if (!row || !canAccessProject(user, row.project_id)) throw new HttpError(404, 'Foto não encontrada.');
  // O cliente nunca vê rascunhos (o /api/sync já os esconde); aqui vale o mesmo para as fotos, mesmo que ele adivinhe o id.
  if (user.role === 'cliente' && (row.log_data === null || (JSON.parse(row.log_data) as { status?: string }).status === 'rascunho')) {
    throw new HttpError(404, 'Foto não encontrada.');
  }
  if (row.data_url) return json({ id, dataUrl: row.data_url }); // stored in D1 (before R2 or without it)

  const object = env.PHOTOS ? await env.PHOTOS.get(photoKey(id)) : null;
  if (!object) throw new HttpError(404, 'Foto não encontrada.');
  return json({ id, dataUrl: await object.text() });
}
