import { DailyLog, Project } from '../types';
import { loadDailyLogs, loadProjects, saveDailyLogs, saveProjects } from './storageService';

const BACKUP_VERSION = 1;

interface BackupFile {
  app: 'diario-de-obra';
  version: number;
  exportedAt: string;
  projects: Project[];
  logs: DailyLog[];
}

export interface RestoreResult {
  addedProjects: number;
  addedLogs: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasStringId = (value: unknown): boolean => isRecord(value) && typeof value.id === 'string' && value.id !== '';

/** Downloads every obra and RDO (with photos) as a single JSON file. */
export function downloadBackup(): string {
  const backup: BackupFile = {
    app: 'diario-de-obra',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    projects: loadProjects(),
    logs: loadDailyLogs(),
  };
  const fileName = `RDO_copia_${backup.exportedAt.split('T')[0]}.json`;
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return fileName;
}

/** Adds the obras/RDOs of a backup file. Existing items are never overwritten. */
export async function restoreBackup(file: File): Promise<RestoreResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Este arquivo não é uma cópia de segurança válida.');
  }

  if (!isRecord(parsed) || parsed.app !== 'diario-de-obra' || !Array.isArray(parsed.projects) || !Array.isArray(parsed.logs)) {
    throw new Error('Este arquivo não é uma cópia de segurança do Diário de Obra.');
  }
  if (!parsed.projects.every(hasStringId) || !parsed.logs.every(hasStringId)) {
    throw new Error('A cópia de segurança está incompleta ou corrompida.');
  }

  const incomingProjects = parsed.projects as Project[];
  const incomingLogs = parsed.logs as DailyLog[];

  const projects = loadProjects();
  const logs = loadDailyLogs();
  const knownProjectIds = new Set(projects.map((p) => p.id));
  const knownLogIds = new Set(logs.map((l) => l.id));

  const newProjects = incomingProjects.filter((p) => !knownProjectIds.has(p.id));
  const newLogs = incomingLogs.filter((l) => !knownLogIds.has(l.id));

  // Restored items are marked to be sent to the cloud on the next sync.
  if (newProjects.length > 0) saveProjects([...projects, ...newProjects.map((p) => ({ ...p, needsSync: true }))]);
  if (newLogs.length > 0) {
    saveDailyLogs([...newLogs.map((l) => ({ ...l, syncStatus: 'pending' as const })), ...logs]);
  }

  return { addedProjects: newProjects.length, addedLogs: newLogs.length };
}
