import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  Check,
  ClipboardCheck,
  CloudSun,
  Download,
  Hammer,
  LucideIcon,
  MessageSquareText,
  Save,
  Share2,
  Users,
  X,
} from 'lucide-react';
import { DailyLog, Project } from '../types';
import { AppLogo } from './AppLogo';
import { RdoDraft, SavedRdoDraft, createDraft, draftToLog } from './rdo/rdoDraft';
import { StepComentarios } from './rdo/RdoStepComentarios';
import { clearDraft, saveDraft } from '../services/photoStore';
import { StepClima, StepEquipe, StepObra } from './rdo/RdoStepsSetup';
import { StepFechar, StepFotos, StepServicos } from './rdo/RdoStepsWork';

interface DailyLogFormModalProps {
  initialLog?: DailyLog | null;
  projects: Project[];
  currentUserEmail: string;
  /** Next RDO number for an obra (numbers are per obra). */
  nextRdoNumberFor?: (projectId: string) => number;
  /** Draft restored after a page reload. */
  resume?: SavedRdoDraft | null;
  onSave: (log: DailyLog, shouldExportPdf: boolean, shouldSyncDrive: boolean, shouldShare?: boolean) => void;
  onClose: () => void;
}

const STEPS: { label: string; icon: LucideIcon }[] = [
  { label: 'Obra', icon: Building2 },
  { label: 'Tempo', icon: CloudSun },
  { label: 'Equipe', icon: Users },
  { label: 'Serviços', icon: Hammer },
  { label: 'Fotos', icon: Camera },
  { label: 'Notas', icon: MessageSquareText },
  { label: 'Fechar', icon: ClipboardCheck },
];
const LAST_STEP = STEPS.length - 1;
const DRAFT_SAVE_DELAY_MS = 400;

/**
 * Daily log (RDO) wizard: one simple question per screen, big icons,
 * voice input and audio help for site foremen.
 */
export const DailyLogFormModal: React.FC<DailyLogFormModalProps> = ({
  initialLog,
  projects,
  currentUserEmail,
  nextRdoNumberFor,
  resume,
  onSave,
  onClose,
}) => {
  const [step, setStep] = useState(resume?.step ?? 0);
  const [draft, setDraft] = useState<RdoDraft>(() => resume?.draft ?? createDraft(initialLog, projects, nextRdoNumberFor && projects[0] ? nextRdoNumberFor(projects[0].id) : 1));

  // Autosave the RDO being filled (Android may reload the page, e.g. when memory is low).
  useEffect(() => {
    const timer = setTimeout(() => saveDraft({ draft, step, initialLogId: initialLog?.id ?? null }), DRAFT_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, step, initialLog]);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const update = useCallback((patch: Partial<RdoDraft>) => setDraft((d) => ({ ...d, ...patch })), []);
  const project = projects.find((p) => p.id === draft.projectId);

  const goToStep = (next: number) => {
    setStep(Math.min(LAST_STEP, Math.max(0, next)));
    bodyRef.current?.scrollTo({ top: 0 });
  };

  const save = (shouldExportPdf: boolean, shouldSyncDrive: boolean, shouldShare = false) => {
    clearDraft();
    onSave(draftToLog(draft, initialLog, projects, currentUserEmail), shouldExportPdf, shouldSyncDrive, shouldShare);
  };

  const close = () => {
    clearDraft();
    onClose();
  };

  const stepProps = { draft, update };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs sm:p-4">
      <div className="flex flex-col w-full min-w-0 h-full sm:h-auto sm:max-h-[95vh] max-w-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#121214] text-white">
          <AppLogo size="sm" variant="icon" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#C5A059] uppercase tracking-wider">
              {initialLog ? 'Editar' : 'Novo'} RDO #{draft.rdoNumber}
            </p>
            <p className="text-sm font-semibold truncate">{project?.name || 'Escolha a obra'}</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition"
            aria-label="Fechar sem salvar"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        {/* Step progress */}
        <nav className="flex items-start justify-between gap-1 px-3 py-3 border-b border-slate-200 bg-slate-50" aria-label="Etapas do RDO">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isDone = i < step;
            const isCurrent = i === step;
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => goToStep(i)}
                aria-current={isCurrent ? 'step' : undefined}
                className="flex flex-1 flex-col items-center gap-1 min-w-0"
              >
                <span
                  className={`flex items-center justify-center w-11 h-11 rounded-full border-2 transition ${
                    isCurrent
                      ? 'bg-[#121214] border-[#121214] text-[#C5A059] scale-110'
                      : isDone
                        ? 'bg-[#C5A059] border-[#C5A059] text-white'
                        : 'bg-white border-slate-300 text-slate-400'
                  }`}
                >
                  {isDone ? <Check className="w-6 h-6" strokeWidth={3} /> : <Icon className="w-6 h-6" />}
                </span>
                <span className={`text-[11px] font-bold truncate ${isCurrent ? 'text-slate-900' : 'text-slate-500'}`}>{s.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Step body */}
        <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-5 bg-white">
          {step === 0 && <StepObra {...stepProps} projects={projects} nextRdoNumberFor={initialLog ? undefined : nextRdoNumberFor} />}
          {step === 1 && <StepClima {...stepProps} />}
          {step === 2 && <StepEquipe {...stepProps} />}
          {step === 3 && <StepServicos {...stepProps} />}
          {step === 4 && <StepFotos {...stepProps} />}
          {step === 5 && <StepComentarios {...stepProps} />}
          {step === LAST_STEP && <StepFechar {...stepProps} />}
        </div>

        {/* Footer navigation */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
          {step === LAST_STEP && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => save(true, false)}
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white py-3 text-sm font-bold text-slate-700 active:scale-95 transition"
              >
                <Download className="w-5 h-5 text-[#C5A059]" /> Salvar e baixar PDF
              </button>
              <button
                type="button"
                onClick={() => save(false, false, true)}
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white py-3 text-sm font-bold text-slate-700 active:scale-95 transition"
              >
                <Share2 className="w-5 h-5 text-[#C5A059]" /> Salvar e enviar
              </button>
            </div>
          )}
          <div className="flex gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => goToStep(step - 1)}
                className="flex items-center justify-center gap-2 w-32 rounded-2xl border-2 border-slate-300 bg-white py-4 text-lg font-black text-slate-700 active:scale-95 transition"
              >
                <ArrowLeft className="w-7 h-7" /> Voltar
              </button>
            )}
            {step < LAST_STEP ? (
              <button
                type="button"
                onClick={() => goToStep(step + 1)}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#C5A059] hover:bg-[#B89047] py-4 text-lg font-black text-white shadow-md active:scale-[0.98] transition"
              >
                Próximo <ArrowRight className="w-7 h-7" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => save(false, false)}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-4 text-lg font-black text-white shadow-md active:scale-[0.98] transition"
              >
                <Save className="w-7 h-7" /> SALVAR RDO
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
