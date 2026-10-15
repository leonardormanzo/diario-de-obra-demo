import { DailyLog, SiteTask } from '../../types';
import { categoryOption } from './rdoOptions';

export interface LogFilters {
  projectId: string; // 'all' = every obra
  query: string;
  from: string; // YYYY-MM-DD or ''
  to: string; // YYYY-MM-DD or ''
  category: string; // CATEGORY_OPTIONS value or '' (every service)
}

const GENERIC_CATEGORY = 'Outros / Geral';

/** Fallbacks for tasks saved as "Outro serviço": the description tells what it really is. */
const CATEGORY_HINTS: Array<[RegExp, string]> = [
  [/demoli|quebra de|retirada de (escada|piso|parede|pilar)/i, 'Demolição'],
  [/entulho|limpeza|caçamba|cacamba/i, 'Limpeza & Entrega'],
  [/gesso|forro|drywall/i, 'Gesso & Drywall'],
  [/imperme/i, 'Impermeabilização'],
  [/contrapiso|regulariza|piso|revestimento|azulejo/i, 'Revestimento & Pisos'],
  [/pintura|pintar|massa corrida/i, 'Pintura & Vernizes'],
  [/el[eé]tric|infra de|fia[cç][aã]o|quadro/i, 'Instalações Elétricas'],
  [/hidr[aá]ulic|encanament|esgoto/i, 'Instalações Hidráulicas'],
];

/** The service group of a task, as shown in the filter. */
export function effectiveCategory(task: Pick<SiteTask, 'category' | 'description'>): string {
  const known = categoryOption(task.category);
  if (known.value === task.category && task.category !== GENERIC_CATEGORY) return task.category;
  const hint = CATEGORY_HINTS.find(([pattern]) => pattern.test(task.description || ''));
  return hint ? hint[1] : GENERIC_CATEGORY;
}

/** Newest first: execution date, then RDO number, then last edit. */
export function sortNewestFirst<T extends Pick<DailyLog, 'executionDate' | 'rdoNumber' | 'updatedAt'>>(logs: T[]): T[] {
  return [...logs].sort(
    (a, b) =>
      b.executionDate.localeCompare(a.executionDate) ||
      b.rdoNumber - a.rdoNumber ||
      (b.updatedAt || '').localeCompare(a.updatedAt || '')
  );
}

const inProject = (log: DailyLog, projectId: string) => projectId === 'all' || log.projectId === projectId;

const matchesQuery = (log: DailyLog, query: string): boolean => {
  if (!query) return true;
  const haystack = [
    log.projectName,
    log.executionDate.split('-').reverse().join('/'),
    `rdo ${log.rdoNumber}`,
    String(log.rdoNumber),
    log.generalNotes,
    log.occurrences,
    ...log.tasks.map((t) => `${t.description} ${categoryOption(effectiveCategory(t)).label}`),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
};

export function filterLogs(logs: DailyLog[], filters: LogFilters): DailyLog[] {
  const query = filters.query.trim().toLowerCase();
  return sortNewestFirst(
    logs.filter((log) => {
      if (!inProject(log, filters.projectId)) return false;
      if (filters.from && log.executionDate < filters.from) return false;
      if (filters.to && log.executionDate > filters.to) return false;
      if (filters.category && !log.tasks.some((t) => effectiveCategory(t) === filters.category)) return false;
      return matchesQuery(log, query);
    })
  );
}

/** Services that appear in the obra's RDOs, with how many RDOs mention each (most used first). */
export function availableCategories(logs: DailyLog[], projectId: string): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();
  logs
    .filter((log) => inProject(log, projectId))
    .forEach((log) => {
      new Set(log.tasks.map(effectiveCategory)).forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));
    });
  return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
}

const toIsoDate = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** Quick periods ending today (local time). */
export function periodEndingToday(days: number, today = new Date()): { from: string; to: string } {
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  return { from: toIsoDate(start), to: toIsoDate(today) };
}
