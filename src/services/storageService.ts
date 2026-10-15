import { Project, DailyLog, AppNotification } from '../types';
import { getPhotoUrl, isPhotoStoreReady, syncPhotos } from './photoStore';

const STORAGE_KEYS = {
  PROJECTS: 'diario_obra_projects',
  LOGS: 'diario_obra_logs',
  NOTIFICATIONS: 'diario_obra_notifications',
  CURRENT_USER: 'diario_obra_current_user',
  SYNC_QUEUE: 'diario_obra_sync_queue',
};

// Example data shipped in earlier versions. It is removed once from devices that still have it.
const DEMO_PROJECT_IDS = ['proj-1', 'proj-2', 'proj-3'];
const DEMO_LOG_IDS = ['log-101', 'log-102'];
const DEMO_NOTIFICATION_IDS = ['notif-1', 'notif-2', 'notif-3'];
const DEMO_PURGED_KEY = 'diario_obra_demo_purged_v1';

function readJsonArray<T>(key: string): T[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Removes the old example RDOs/obras/avisos but keeps everything the user created. */
function purgeDemoDataOnce(): void {
  if (localStorage.getItem(DEMO_PURGED_KEY)) return;

  const logs = readJsonArray<DailyLog>(STORAGE_KEYS.LOGS).filter((l) => !DEMO_LOG_IDS.includes(l.id));
  const allProjects = readJsonArray<Project>(STORAGE_KEYS.PROJECTS);
  const projects = allProjects.filter((p) => !DEMO_PROJECT_IDS.includes(p.id) || logs.some((l) => l.projectId === p.id));
  const removedProjectIds = allProjects.filter((p) => !projects.includes(p)).map((p) => p.id);
  const notifications = readJsonArray<AppNotification>(STORAGE_KEYS.NOTIFICATIONS).filter(
    (n) => !DEMO_NOTIFICATION_IDS.includes(n.id) && !(n.projectId && removedProjectIds.includes(n.projectId))
  );

  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  localStorage.setItem(DEMO_PURGED_KEY, '1');
}

// Local storage management helpers
export function loadProjects(): Project[] {
  purgeDemoDataOnce();
  return readJsonArray<Project>(STORAGE_KEYS.PROJECTS);
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
}

/** Fills photo URLs from the photo store (photos are not kept inline in localStorage). */
function withPhotoUrls(logs: DailyLog[]): DailyLog[] {
  return logs.map((log) => ({
    ...log,
    photos: (log.photos || []).map((p) => (p.url ? p : { ...p, url: getPhotoUrl(p.id) || '' })),
  }));
}

export function loadDailyLogs(): DailyLog[] {
  purgeDemoDataOnce();
  const logs = readJsonArray<DailyLog>(STORAGE_KEYS.LOGS);
  const hasInlinePhotos = logs.some((l) => (l.photos || []).some((p) => p.url));
  // Migrate older data (photos inline in localStorage) to the photo store.
  if (hasInlinePhotos && isPhotoStoreReady()) saveDailyLogs(logs);
  return withPhotoUrls(logs);
}

export function saveDailyLogs(logs: DailyLog[]): void {
  if (!isPhotoStoreReady()) {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
    return;
  }
  syncPhotos(logs.flatMap((l) => (l.photos || []).map((p) => ({ id: p.id, url: p.url }))));
  const withoutPhotoData = logs.map((l) => ({ ...l, photos: (l.photos || []).map((p) => ({ ...p, url: '' })) }));
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(withoutPhotoData));
}

export function saveOrUpdateLog(log: DailyLog): DailyLog[] {
  const logs = loadDailyLogs();
  const index = logs.findIndex(l => l.id === log.id);
  if (index >= 0) {
    logs[index] = { ...log, updatedAt: new Date().toISOString() };
  } else {
    logs.unshift({ ...log, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  saveDailyLogs(logs);
  return logs;
}

export function deleteLog(logId: string): DailyLog[] {
  const logs = loadDailyLogs().filter((l) => l.id !== logId);
  saveDailyLogs(logs);
  return logs;
}

export function loadNotifications(): AppNotification[] {
  purgeDemoDataOnce();
  return readJsonArray<AppNotification>(STORAGE_KEYS.NOTIFICATIONS);
}

export function saveNotifications(notifications: AppNotification[]): void {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
}

export function addNotification(notif: Omit<AppNotification, 'id' | 'date' | 'read'>): AppNotification {
  const list = loadNotifications();
  const item: AppNotification = {
    ...notif,
    id: `notif-${Date.now()}`,
    date: new Date().toISOString(),
    read: false,
  };
  list.unshift(item);
  saveNotifications(list);

  // Trigger web notification if supported
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(`Diário de Obra: ${item.title}`, {
        body: item.body,
        icon: 'icon.svg',
      });
    } catch (e) {
      // Ignore background notification failure
    }
  }

  return item;
}
