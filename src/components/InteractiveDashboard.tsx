import React, { useRef, useState } from 'react';
import {
  Building2,
  ChevronRight,
  CircleCheckBig,
  ClipboardPlus,
  Download,
  HardDriveDownload,
  HardDriveUpload,
  OctagonX,
  Pencil,
  Plus,
  Share,
  Smartphone,
  TriangleAlert,
} from 'lucide-react';
import { DailyLog, Project } from '../types';

interface InteractiveDashboardProps {
  projects: Project[];
  logs: DailyLog[];
  lateCount: number;
  canCreateObra: boolean;
  canInstall: boolean;
  showIosInstallHint: boolean;
  onInstall: () => void;
  onOpenDeadlines: () => void;
  onOpenNewLog: () => void;
  onNewObra: () => void;
  onEditObra: (project: Project) => void;
  onSelectProject: (projectId: string) => void;
  /** Saves the backup file and returns the message to show. */
  onBackup: () => string;
  /** Restores a backup file and returns the message to show (throws on invalid file). */
  onRestore: (file: File) => Promise<string>;
}

type Feedback = { tone: 'ok' | 'error'; text: string };

const formatDay = (iso: string) => iso.split('-').reverse().slice(0, 2).join('/');

/** Home screen: one big action (new RDO), late-work alert and the list of obras. */
export const InteractiveDashboard: React.FC<InteractiveDashboardProps> = ({
  projects,
  logs,
  lateCount,
  canCreateObra,
  canInstall,
  showIosInstallHint,
  onInstall,
  onOpenDeadlines,
  onOpenNewLog,
  onNewObra,
  onEditObra,
  onSelectProject,
  onBackup,
  onRestore,
}) => {
  const restoreInputRef = useRef<HTMLInputElement | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const hasProjects = projects.length > 0;

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setFeedback({ tone: 'ok', text: await onRestore(file) });
    } catch (error) {
      setFeedback({ tone: 'error', text: error instanceof Error ? error.message : 'Não foi possível restaurar.' });
    }
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <p className="text-sm font-semibold text-slate-500 capitalize">{today}</p>

      {hasProjects ? (
        <button
          type="button"
          onClick={onOpenNewLog}
          className="w-full flex items-center gap-4 rounded-3xl bg-[#C5A059] hover:bg-[#B89047] px-5 py-6 text-left text-white shadow-lg active:scale-[0.98] transition"
        >
          <span className="flex items-center justify-center w-16 h-16 shrink-0 rounded-2xl bg-white/20">
            <ClipboardPlus className="w-10 h-10" />
          </span>
          <span>
            <span className="block text-2xl font-black leading-tight">NOVO RDO</span>
            <span className="block text-base font-semibold text-white/85">Registrar o dia de hoje</span>
          </span>
        </button>
      ) : !canCreateObra ? (
        <div className="flex items-center gap-4 rounded-3xl border-2 border-slate-200 bg-white px-5 py-6">
          <span className="flex items-center justify-center w-16 h-16 shrink-0 rounded-2xl bg-slate-100">
            <Building2 className="w-10 h-10 text-slate-400" />
          </span>
          <span className="text-lg font-black leading-tight text-slate-700">
            Nenhuma obra liberada para você ainda. Fale com o coordenador.
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={onNewObra}
          className="w-full flex items-center gap-4 rounded-3xl bg-[#121214] px-5 py-6 text-left text-white shadow-lg active:scale-[0.98] transition"
        >
          <span className="flex items-center justify-center w-16 h-16 shrink-0 rounded-2xl bg-[#C5A059]/20">
            <Building2 className="w-10 h-10 text-[#C5A059]" />
          </span>
          <span>
            <span className="block text-2xl font-black leading-tight">CADASTRAR OBRA</span>
            <span className="block text-base font-semibold text-white/75">Comece criando a sua primeira obra</span>
          </span>
        </button>
      )}

      {hasProjects &&
        (lateCount > 0 ? (
          <button
            type="button"
            onClick={onOpenDeadlines}
            className="w-full flex items-center gap-3 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-4 text-left active:scale-[0.98] transition"
          >
            <OctagonX className="w-10 h-10 shrink-0 text-red-600" />
            <span className="flex-1 text-lg font-black text-red-700">
              {lateCount} {lateCount === 1 ? 'serviço atrasado' : 'serviços atrasados'}
            </span>
            <ChevronRight className="w-7 h-7 text-red-400" />
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-4">
            <CircleCheckBig className="w-10 h-10 shrink-0 text-emerald-600" />
            <span className="text-lg font-black text-emerald-700">Nenhum serviço atrasado</span>
          </div>
        ))}

      {canInstall && (
        <button
          type="button"
          onClick={onInstall}
          className="w-full flex items-center gap-3 rounded-2xl border-2 border-blue-200 bg-blue-50 px-4 py-3 text-left active:scale-[0.98] transition"
        >
          <Smartphone className="w-9 h-9 shrink-0 text-blue-600" />
          <span className="flex-1 text-base font-black text-blue-800">Instalar no celular</span>
          <Download className="w-6 h-6 text-blue-500" />
        </button>
      )}

      {showIosInstallHint && (
        <p className="flex items-start gap-3 rounded-2xl border-2 border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
          <Share className="w-7 h-7 shrink-0 text-blue-600" />
          Para instalar: toque em Compartilhar e depois em “Adicionar à Tela de Início”.
        </p>
      )}

      {hasProjects && (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
            <Building2 className="w-6 h-6 text-[#C5A059]" /> Obras
          </h2>
          {hasProjects && canCreateObra && (
            <button
              type="button"
              onClick={onNewObra}
              className="flex items-center gap-1.5 rounded-full border-2 border-[#C5A059] px-4 py-2 text-sm font-black text-[#B89047] active:scale-95 transition"
            >
              <Plus className="w-5 h-5" strokeWidth={3} /> Nova obra
            </button>
          )}
        </div>

        <div className="space-y-3">
          {projects.map((project) => {
            const projectLogs = logs.filter((l) => l.projectId === project.id);
            const lastLog = projectLogs.reduce<DailyLog | null>(
              (latest, l) => (!latest || l.executionDate > latest.executionDate ? l : latest),
              null
            );
            return (
              <div key={project.id} className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => onSelectProject(project.id)}
                  className="flex-1 min-w-0 flex items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-4 text-left hover:border-[#C5A059]/60 active:scale-[0.99] transition"
                >
                  <span className="flex items-center justify-center w-14 h-14 shrink-0 rounded-2xl bg-[#121214] text-[#C5A059]">
                    <Building2 className="w-8 h-8" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-base font-black leading-tight text-slate-900 line-clamp-2 break-words">{project.name}</span>
                    <span className="flex items-center gap-2 mt-2">
                      <span className="flex-1 h-3 rounded-full bg-slate-200 overflow-hidden">
                        <span className="block h-full rounded-full bg-[#C5A059]" style={{ width: `${project.progressPercent}%` }} />
                      </span>
                      <span className="text-base font-black text-slate-800 tabular-nums">{project.progressPercent}%</span>
                    </span>
                    <span className="block mt-1 text-sm text-slate-500">
                      {projectLogs.length} {projectLogs.length === 1 ? 'RDO' : 'RDOs'}
                      {lastLog ? ` • último ${formatDay(lastLog.executionDate)}` : ''}
                    </span>
                  </span>
                  <ChevronRight className="w-6 h-6 shrink-0 text-slate-300" />
                </button>
                <button
                  type="button"
                  onClick={() => onEditObra(project)}
                  className="flex items-center justify-center w-14 shrink-0 rounded-2xl border-2 border-slate-200 bg-white text-slate-500 hover:border-[#C5A059]/60 active:scale-95 transition"
                  aria-label={`Editar obra ${project.name}`}
                  title="Editar obra"
                >
                  <Pencil className="w-6 h-6" />
                </button>
              </div>
            );
          })}
        </div>
      </section>
      )}

      <details className="rounded-2xl border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-bold text-slate-600">Cópia de segurança</summary>
        <p className="mt-2 text-sm text-slate-500">
          Os RDOs ficam guardados neste aparelho. Salve uma cópia de vez em quando.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFeedback({ tone: 'ok', text: onBackup() })}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-700 active:scale-95 transition"
          >
            <HardDriveDownload className="w-5 h-5 text-[#C5A059]" /> Salvar cópia
          </button>
          <button
            type="button"
            onClick={() => restoreInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-700 active:scale-95 transition"
          >
            <HardDriveUpload className="w-5 h-5 text-[#C5A059]" /> Restaurar cópia
          </button>
        </div>
        <input ref={restoreInputRef} type="file" accept="application/json,.json" onChange={handleRestoreFile} className="hidden" />
        {feedback && (
          <p
            className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
              feedback.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {feedback.tone === 'ok' ? <CircleCheckBig className="w-5 h-5 shrink-0" /> : <TriangleAlert className="w-5 h-5 shrink-0" />}
            {feedback.text}
          </p>
        )}
      </details>
    </div>
  );
};
