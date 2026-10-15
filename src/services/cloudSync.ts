/**
 * Cloud sync. The phone keeps its own copy (so the app works with no signal);
 * this module sends local changes to the server and brings back everything the
 * user is allowed to see. Rules:
 *  - a local change is never lost: it stays pending until the server accepts it;
 *  - when both sides changed the same RDO, the most recently edited one wins;
 *  - deletions travel as their own list (so they also reach other devices).
 */
import { DailyLog, Project } from '../types';
import { ApiError, api } from './api';
import { clearPhotoStore, getPhotoUrl, hasPhoto, putPhoto } from './photoStore';
import { loadDailyLogs, loadProjects, saveDailyLogs, saveProjects } from './storageService';

const KEYS = {
  cursor: 'diario_obra_sync_cursor',
  deletes: 'diario_obra_pending_deletes',
  uploaded: 'diario_obra_photos_uploaded',
  owner: 'diario_obra_cache_owner',
};
// Keys that must survive a local data wipe.
const KEEP_ON_WIPE = new Set(['diario_obra_session_user', 'diario_obra_force_logout']);
const SYNC_INTERVAL_MS = 60_000;
const DEBOUNCE_MS = 600;
const PHOTO_DOWNLOAD_CONCURRENCY = 3;

/* ---------------------------------- state --------------------------------- */

export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'error' | 'signed-out';

export interface SyncSnapshot {
  phase: SyncPhase;
  pending: number;
  lastSyncAt: string | null;
  error: string | null;
}

let snapshot: SyncSnapshot = { phase: 'idle', pending: 0, lastSyncAt: null, error: null };
const listeners = new Set<() => void>();
let onDataChanged: (() => void) | null = null;

export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const getSnapshot = (): SyncSnapshot => snapshot;

function update(patch: Partial<SyncSnapshot>): void {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((listener) => listener());
}

export function setDataChangedHandler(handler: (() => void) | null): void {
  onDataChanged = handler;
}

/* ------------------------------ small storage ------------------------------ */

interface PendingDelete {
  kind: 'log' | 'project';
  id: string;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const writeJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Falha ao gravar controle de sincronização:', error);
  }
};

const readDeletes = (): PendingDelete[] => readJson<PendingDelete[]>(KEYS.deletes, []);
const readUploaded = (): Set<string> => new Set(readJson<string[]>(KEYS.uploaded, []));
const markUploaded = (ids: string[]): void => {
  const set = readUploaded();
  ids.forEach((id) => set.add(id));
  writeJson(KEYS.uploaded, [...set]);
};

const isPendingLog = (log: DailyLog): boolean => log.syncStatus !== 'synced';

export function countPending(): number {
  const logs = loadDailyLogs().filter(isPendingLog).length;
  const projects = loadProjects().filter((p) => p.needsSync).length;
  return logs + projects + readDeletes().length;
}

const refreshPending = (): void => update({ pending: countPending() });

/* ----------------------- queue (called by the screens) ---------------------- */

export function queueDelete(kind: PendingDelete['kind'], id: string): void {
  const list = readDeletes();
  if (!list.some((item) => item.kind === kind && item.id === id)) writeJson(KEYS.deletes, [...list, { kind, id }]);
  refreshPending();
  requestSync();
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Asks for a sync soon (several quick changes become one sync). */
export function requestSync(): void {
  refreshPending();
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => void syncNow(), DEBOUNCE_MS);
}

/* --------------------------------- push ----------------------------------- */

const enc = encodeURIComponent;

/** Photo pixels go in their own requests; the RDO itself is sent without them. */
const withoutPixels = (log: DailyLog): DailyLog => ({ ...log, photos: log.photos.map((p) => ({ ...p, url: '' })) });

const isRejection = (error: unknown): error is ApiError =>
  error instanceof ApiError && !error.isOffline && !error.isUnauthorized;

function patchLog(id: string, apply: (log: DailyLog) => DailyLog | null): void {
  const logs = loadDailyLogs();
  const index = logs.findIndex((l) => l.id === id);
  if (index < 0) return;
  const next = apply(logs[index]);
  if (next) logs[index] = next;
  else logs.splice(index, 1);
  saveDailyLogs(logs);
}

async function pushDeletes(): Promise<void> {
  for (const item of readDeletes()) {
    try {
      await api('DELETE', `/${item.kind === 'log' ? 'logs' : 'projects'}/${enc(item.id)}`);
    } catch (error) {
      if (!isRejection(error)) throw error;
      localStorage.removeItem(KEYS.cursor); // server said no: bring the real state back on next pull
    }
    writeJson(KEYS.deletes, readDeletes().filter((d) => !(d.kind === item.kind && d.id === item.id)));
  }
}

async function pushProjects(): Promise<void> {
  for (const project of loadProjects().filter((p) => p.needsSync)) {
    const { needsSync: _flag, ...payload } = project;
    const sentSnapshot = JSON.stringify(payload);
    try {
      await api('PUT', `/projects/${enc(project.id)}`, payload);
    } catch (error) {
      if (!isRejection(error)) throw error;
      localStorage.removeItem(KEYS.cursor);
    }
    // Clear the flag unless the user edited the obra while it was being sent.
    const projects = loadProjects();
    const current = projects.find((p) => p.id === project.id);
    if (current) {
      const { needsSync: _f, ...currentPayload } = current;
      if (JSON.stringify(currentPayload) === sentSnapshot) {
        saveProjects(projects.map((p) => (p.id === project.id ? { ...p, needsSync: false } : p)));
      }
    }
  }
}

async function uploadPhotos(log: DailyLog): Promise<void> {
  const uploaded = readUploaded();
  for (const photo of log.photos) {
    if (!photo.url || uploaded.has(photo.id)) continue;
    try {
      await api('PUT', `/photos/${enc(photo.id)}`, { logId: log.id, projectId: log.projectId, dataUrl: photo.url });
    } catch (error) {
      if (!isRejection(error) || error.status !== 400) throw error;
      // The server refuses this particular picture: do not block the whole RDO because of it.
    }
    markUploaded([photo.id]);
  }
}

interface PutLogResponse {
  log?: DailyLog;
  conflict?: boolean;
  deleted?: boolean;
}

async function pushLogs(): Promise<void> {
  for (const log of loadDailyLogs().filter(isPendingLog)) {
    try {
      // The server only accepts pictures of an RDO it already has, so the RDO goes first.
      const result = await api<PutLogResponse>('PUT', `/logs/${enc(log.id)}`, withoutPixels(log));

      if (result.deleted) {
        patchLog(log.id, () => null);
      } else if (result.conflict && result.log) {
        const serverLog = result.log;
        patchLog(log.id, () => ({
          ...serverLog,
          photos: serverLog.photos.map((p) => ({ ...p, url: getPhotoUrl(p.id) || '' })),
          syncStatus: 'synced',
        }));
      } else {
        await uploadPhotos(log);
        // Only mark as sent if the RDO was not edited again while the request was running.
        patchLog(log.id, (current) => (current.updatedAt === log.updatedAt ? { ...current, syncStatus: 'synced' } : current));
      }
    } catch (error) {
      if (!isRejection(error)) throw error;
      patchLog(log.id, (current) => ({ ...current, syncStatus: 'failed', syncError: error.message }));
    }
  }
}

/* --------------------------------- pull ----------------------------------- */

interface SyncResponse {
  cursor: string;
  projectIds: string[];
  projects: Project[];
  deletedProjectIds: string[];
  logs: DailyLog[];
  deletedLogIds: string[];
  photoIds: string[];
}

function mergeProjects(res: SyncResponse): void {
  const visible = new Set(res.projectIds);
  const deleted = new Set(res.deletedProjectIds);
  const local = loadProjects();

  res.projects.forEach((incoming) => {
    const index = local.findIndex((p) => p.id === incoming.id);
    if (index < 0) local.push({ ...incoming, needsSync: false });
    else if (!local[index].needsSync) local[index] = { ...incoming, needsSync: false };
  });

  saveProjects(local.filter((p) => p.needsSync || (!deleted.has(p.id) && visible.has(p.id))));
}

function mergeLogs(res: SyncResponse): void {
  const visibleProjects = new Set(res.projectIds);
  const deleted = new Set(res.deletedLogIds);
  const local = loadDailyLogs();

  res.logs.forEach((incoming) => {
    const merged: DailyLog = {
      ...incoming,
      photos: (incoming.photos ?? []).map((p) => ({ ...p, url: getPhotoUrl(p.id) || '' })),
      syncStatus: 'synced',
    };
    const index = local.findIndex((l) => l.id === incoming.id);
    if (index < 0) local.push(merged);
    else if (local[index].syncStatus === 'synced' || incoming.updatedAt > local[index].updatedAt) local[index] = merged;
  });

  saveDailyLogs(
    local.filter((l) => !deleted.has(l.id) && (visibleProjects.has(l.projectId) || isPendingLog(l)))
  );
}

async function downloadPhotos(ids: string[]): Promise<void> {
  const queue = [...ids];
  let sinceNotify = 0;

  const worker = async () => {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      try {
        const { dataUrl } = await api<{ dataUrl: string }>('GET', `/photos/${enc(id)}`);
        await putPhoto(id, dataUrl);
        markUploaded([id]);
        if (++sinceNotify >= 4) {
          sinceNotify = 0;
          onDataChanged?.();
        }
      } catch (error) {
        if (error instanceof ApiError && (error.isOffline || error.isUnauthorized)) throw error;
        // 404/403: picture not available; try again on a later sync.
      }
    }
  };
  await Promise.all(Array.from({ length: PHOTO_DOWNLOAD_CONCURRENCY }, worker));
}

async function pull(isRetry = false): Promise<void> {
  const since = localStorage.getItem(KEYS.cursor) ?? '';
  const res = await api<SyncResponse>('GET', `/sync?since=${enc(since)}`);

  // An obra that was just given to this user is old data: an incremental sync would not bring it.
  const knownIds = new Set(loadProjects().map((p) => p.id));
  const returnedIds = new Set(res.projects.map((p) => p.id));
  const hasNewObra = res.projectIds.some((id) => !knownIds.has(id) && !returnedIds.has(id));
  if (hasNewObra && since !== '' && !isRetry) {
    localStorage.removeItem(KEYS.cursor);
    return pull(true);
  }

  mergeProjects(res);
  mergeLogs(res);
  localStorage.setItem(KEYS.cursor, res.cursor);
  onDataChanged?.();

  const missing = new Set<string>();
  loadDailyLogs().forEach((l) => l.photos.forEach((p) => !p.url && !hasPhoto(p.id) && missing.add(p.id)));
  if (missing.size > 0) {
    await downloadPhotos([...missing]);
    onDataChanged?.();
  }
}

/* ---------------------------------- run ----------------------------------- */

let running: Promise<void> | null = null;

export function syncNow(): Promise<void> {
  if (running) return running;
  running = runSync().finally(() => {
    running = null;
    refreshPending();
  });
  return running;
}

async function runSync(): Promise<void> {
  if (!navigator.onLine) {
    update({ phase: 'offline' });
    return;
  }
  update({ phase: 'syncing', error: null });
  try {
    await pushDeletes();
    await pushProjects();
    await pushLogs();
    await pull();
    update({ phase: 'idle', lastSyncAt: new Date().toISOString(), error: null });
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) update({ phase: 'signed-out' });
    else if (error instanceof ApiError && error.isOffline) update({ phase: 'offline' });
    else update({ phase: 'error', error: error instanceof Error ? error.message : 'Falha ao sincronizar.' });
  }
}

/* ----------------------------- lifecycle / owner --------------------------- */

let stopListeners: (() => void) | null = null;

export function startCloudSync(): void {
  if (stopListeners) return;
  const onOnline = () => void syncNow();
  const onVisible = () => document.visibilityState === 'visible' && void syncNow();
  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisible);
  const timer = setInterval(() => void syncNow(), SYNC_INTERVAL_MS);
  stopListeners = () => {
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onVisible);
    clearInterval(timer);
    stopListeners = null;
  };
  refreshPending();
  void syncNow();
}

export function stopCloudSync(): void {
  stopListeners?.();
  if (debounceTimer) clearTimeout(debounceTimer);
  update({ phase: 'idle', pending: 0, lastSyncAt: null, error: null });
}

/** Removes everything this app stored on the device (obras, RDOs, photos, queues). */
export async function wipeLocalData(): Promise<void> {
  Object.keys(localStorage)
    .filter((key) => key.startsWith('diario_obra_') && !KEEP_ON_WIPE.has(key))
    .forEach((key) => localStorage.removeItem(key));
  await clearPhotoStore();
}

/**
 * Called after sign-in, before the app reads local data: if this device was used by
 * another account, the other account's data is removed first.
 */
export async function adoptLocalCache(userId: string): Promise<void> {
  const owner = localStorage.getItem(KEYS.owner);
  if (owner && owner !== userId) await wipeLocalData();
  localStorage.setItem(KEYS.owner, userId);
}

/** True when this device holds unsent work from a different account than `userId`. */
export function hasForeignPending(userId: string): boolean {
  const owner = localStorage.getItem(KEYS.owner);
  return !!owner && owner !== userId && countPending() > 0;
}
