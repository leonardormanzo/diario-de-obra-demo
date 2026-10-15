import { DailyLog, Project, SiteTask, AppNotification } from '../types';
import { addNotification, loadNotifications } from './storageService';

export interface TaskDeadlineStatus {
  task: SiteTask;
  logId: string;
  projectId: string;
  projectName: string;
  rdoNumber: number;
  daysRemaining: number;
  status: 'vencida' | 'urgente' | 'em_dia' | 'concluida';
  formattedDeadline: string;
}

/**
 * Calculates deadline status for a given task.
 */
export function getTaskDeadlineStatus(
  task: SiteTask,
  log: DailyLog,
  project?: Project
): TaskDeadlineStatus | null {
  if (!task.deadline) return null;

  if (task.status === 'concluida') {
    return {
      task,
      logId: log.id,
      projectId: log.projectId,
      projectName: project?.name || log.projectName,
      rdoNumber: log.rdoNumber,
      daysRemaining: 0,
      status: 'concluida',
      formattedDeadline: task.deadline.split('-').reverse().join('/'),
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = task.deadline.split('-').map(Number);
  const deadlineDate = new Date(year, month - 1, day);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let status: 'vencida' | 'urgente' | 'em_dia' = 'em_dia';
  if (diffDays < 0) {
    status = 'vencida';
  } else if (diffDays <= 2) {
    status = 'urgente';
  }

  return {
    task,
    logId: log.id,
    projectId: log.projectId,
    projectName: project?.name || log.projectName,
    rdoNumber: log.rdoNumber,
    daysRemaining: diffDays,
    status,
    formattedDeadline: task.deadline.split('-').reverse().join('/'),
  };
}

/**
 * Scans all logs and triggers push notifications for tasks approaching deadlines or overdue.
 */
export function checkDeadlinesAndNotify(
  logs: DailyLog[],
  projects: Project[]
): TaskDeadlineStatus[] {
  const existingNotifications = loadNotifications();
  const todayStr = new Date().toISOString().split('T')[0];
  const allAlerts: TaskDeadlineStatus[] = [];

  for (const log of logs) {
    const project = projects.find(p => p.id === log.projectId);
    for (const task of log.tasks || []) {
      const statusInfo = getTaskDeadlineStatus(task, log, project);
      if (!statusInfo || statusInfo.status === 'concluida' || statusInfo.status === 'em_dia') {
        continue;
      }

      allAlerts.push(statusInfo);

      // Check if we already alerted for this task today to prevent spam
      const notifKey = `deadline-${task.id}-${todayStr}`;
      const alreadyNotified = existingNotifications.some(n => n.id.includes(notifKey));

      if (!alreadyNotified) {
        let title = '';
        let body = '';

        if (statusInfo.status === 'vencida') {
          title = `⚠️ Prazo Excedido: "${task.description}"`;
          body = `A tarefa da categoria [${task.category}] em ${statusInfo.projectName} venceu em ${statusInfo.formattedDeadline}.`;
        } else {
          title = `⏳ Prazo Próximo: "${task.description}"`;
          body = `Faltam ${statusInfo.daysRemaining === 0 ? 'poucas horas (HOJE)' : `${statusInfo.daysRemaining} dia(s)`} para o prazo final (${statusInfo.formattedDeadline}) em ${statusInfo.projectName}.`;
        }

        addNotification({
          title,
          body,
          type: 'pendencia',
          projectId: log.projectId,
        });
      }
    }
  }

  return allAlerts;
}

/**
 * Standard construction disciplines / categories.
 */
export const PREDEFINED_CATEGORIES = [
  'Concreto / Estrutura',
  'Alvenaria & Vedação',
  'Instalações Hidráulicas',
  'Instalações Elétricas',
  'Impermeabilização',
  'Gesso & Drywall',
  'Revestimento & Pisos',
  'Pintura & Vernizes',
  'Esquadrias & Vidros',
  'Terraplenagem & Fundações',
  'Segurança do Trabalho (SST)',
  'Infraestrutura & Drenagem',
  'Limpeza & Entrega',
  'Outros / Geral',
];

/** Number of unfinished tasks whose deadline has passed. */
export function countLateTasks(logs: DailyLog[], projects: Project[]): number {
  return logs.reduce((count, log) => {
    const project = projects.find((p) => p.id === log.projectId);
    return count + log.tasks.filter((t) => getTaskDeadlineStatus(t, log, project)?.status === 'vencida').length;
  }, 0);
}
