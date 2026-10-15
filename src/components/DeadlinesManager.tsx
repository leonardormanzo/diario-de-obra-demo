import React from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, X } from 'lucide-react';
import { DailyLog, Project, SiteTask } from '../types';
import { getTaskDeadlineStatus, TaskDeadlineStatus } from '../services/deadlineAlertService';
import { categoryOption } from './rdo/rdoOptions';

interface DeadlinesManagerProps {
  logs: DailyLog[];
  projects: Project[];
  onUpdateTask: (logId: string, updatedTask: SiteTask) => void;
  onClose: () => void;
}

type TaskWithContext = {
  task: SiteTask;
  log: DailyLog;
  project?: Project;
  deadlineInfo: TaskDeadlineStatus | null;
};

const deadlineText = (daysRemaining: number) => {
  if (daysRemaining < 0) {
    const days = Math.abs(daysRemaining);
    return `Venceu há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  }
  if (daysRemaining === 0) return 'Vence hoje';
  return `Faltam ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}`;
};

const DeadlineCard: React.FC<{
  item: TaskWithContext;
  tone: 'red' | 'amber' | 'green';
  onUpdateTask: DeadlinesManagerProps['onUpdateTask'];
}> = ({ item, tone, onUpdateTask }) => {
  const { task, log, project, deadlineInfo } = item;
  const category = categoryOption(task.category);
  const CategoryIcon = category.icon;
  const tones = {
    red: 'border-red-300 bg-red-50 text-red-700',
    amber: 'border-amber-300 bg-amber-50 text-amber-800',
    green: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  };

  return (
    <article className={`min-w-0 rounded-2xl border-2 p-4 ${tones[tone]}`}>
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
          <CategoryIcon className={`h-8 w-8 ${category.tone}`} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-black leading-tight text-slate-900 break-words">{task.description}</p>
          <p className="mt-1 text-sm font-bold text-slate-600 break-words">
            {project?.name || log.projectName}
          </p>
          <p className="mt-2 text-lg font-black">{deadlineText(deadlineInfo?.daysRemaining ?? 0)}</p>
        </div>
      </div>

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="flex min-h-12 min-w-0 items-center gap-2 rounded-2xl border-2 border-white/80 bg-white px-3 text-sm font-bold text-slate-700">
          <CalendarDays className="h-6 w-6 shrink-0 text-slate-500" aria-hidden="true" />
          <span className="sr-only">Alterar prazo</span>
          <input
            type="date"
            value={task.deadline || ''}
            onChange={(event) => onUpdateTask(log.id, { ...task, deadline: event.target.value || undefined })}
            className="h-12 min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
            aria-label={`Prazo de ${task.description}`}
          />
        </label>
        <button
          type="button"
          onClick={() => onUpdateTask(log.id, { ...task, status: 'concluida', progress: 100 })}
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-emerald-700 bg-emerald-600 px-6 text-base font-black text-white transition active:scale-[0.98] hover:bg-emerald-700"
        >
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          Pronto
        </button>
      </div>
    </article>
  );
};

const DeadlineGroup: React.FC<{
  title: string;
  icon: React.ElementType;
  items: TaskWithContext[];
  tone: 'red' | 'amber' | 'green';
  onUpdateTask: DeadlinesManagerProps['onUpdateTask'];
}> = ({ title, icon: Icon, items, tone, onUpdateTask }) => {
  if (items.length === 0) return null;
  const headingTone = {
    red: 'text-red-700',
    amber: 'text-amber-700',
    green: 'text-emerald-700',
  }[tone];

  return (
    <section className="space-y-3">
      <h3 className={`flex items-center gap-2 text-lg font-black ${headingTone}`}>
        <Icon className="h-7 w-7" aria-hidden="true" />
        {title}
        <span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{items.length}</span>
      </h3>
      {items.map((item) => (
        <DeadlineCard
          key={`${item.log.id}-${item.task.id}`}
          item={item}
          tone={tone}
          onUpdateTask={onUpdateTask}
        />
      ))}
    </section>
  );
};

export const DeadlinesManager: React.FC<DeadlinesManagerProps> = ({ logs, projects, onUpdateTask, onClose }) => {
  const tasks: TaskWithContext[] = logs.flatMap((log) => {
    const project = projects.find((candidate) => candidate.id === log.projectId);
    return (log.tasks || []).map((task) => ({
      task,
      log,
      project,
      deadlineInfo: getTaskDeadlineStatus(task, log, project),
    }));
  });

  const activeTasks = tasks
    .filter(({ task, deadlineInfo }) => task.status !== 'concluida' && deadlineInfo)
    .sort((a, b) => (a.task.deadline || '').localeCompare(b.task.deadline || ''));

  const overdue = activeTasks.filter(({ deadlineInfo }) => (deadlineInfo?.daysRemaining ?? 0) < 0);
  const dueSoon = activeTasks.filter(({ deadlineInfo }) => {
    const days = deadlineInfo?.daysRemaining ?? 0;
    return days >= 0 && days <= 3;
  });
  const onTime = activeTasks.filter(({ deadlineInfo }) => (deadlineInfo?.daysRemaining ?? 0) > 3);
  const hiddenTasks = tasks.filter(({ task, deadlineInfo }) => task.status === 'concluida' || !deadlineInfo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4">
      <div className="flex max-h-[96vh] w-full max-w-3xl min-w-0 flex-col overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-2xl">
        <header className="flex min-w-0 items-center gap-3 bg-[#121214] p-4 text-white">
          <Clock3 className="h-9 w-9 shrink-0 text-[#C5A059]" aria-hidden="true" />
          <h2 className="min-w-0 flex-1 text-xl font-black">Prazos</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/10 transition active:scale-95 hover:bg-white/20"
            aria-label="Fechar prazos"
          >
            <X className="h-7 w-7" />
          </button>
        </header>

        <div className="min-w-0 flex-1 space-y-6 overflow-y-auto p-3 sm:p-5">
          {activeTasks.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-10 text-center">
              <CheckCircle2 className="h-14 w-14 text-emerald-600" aria-hidden="true" />
              <p className="mt-3 text-lg font-black text-slate-900">Tudo em dia</p>
              <p className="mt-1 text-sm font-bold text-slate-600">Nenhum prazo aberto.</p>
            </div>
          ) : (
            <>
              <DeadlineGroup title="Atrasados" icon={AlertTriangle} items={overdue} tone="red" onUpdateTask={onUpdateTask} />
              <DeadlineGroup title="Vencem em até 3 dias" icon={Clock3} items={dueSoon} tone="amber" onUpdateTask={onUpdateTask} />
              <DeadlineGroup title="No prazo" icon={CheckCircle2} items={onTime} tone="green" onUpdateTask={onUpdateTask} />
            </>
          )}

          {hiddenTasks.length > 0 && (
            <details className="rounded-2xl border-2 border-slate-200 bg-slate-50">
              <summary className="flex min-h-12 cursor-pointer items-center px-4 text-sm font-black text-slate-600">
                Concluídos ou sem prazo ({hiddenTasks.length})
              </summary>
              <div className="space-y-2 border-t-2 border-slate-200 p-3">
                {hiddenTasks.map(({ task, log, project }) => (
                  <div key={`${log.id}-${task.id}`} className="min-w-0 rounded-xl bg-white p-3">
                    <p className="text-sm font-black text-slate-700 break-words">{task.description}</p>
                    <p className="mt-1 text-sm text-slate-500 break-words">{project?.name || log.projectName}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};
