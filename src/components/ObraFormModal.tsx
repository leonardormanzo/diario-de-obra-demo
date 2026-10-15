import React, { useState } from 'react';
import { Building2, Minus, Plus, Save, Trash2, X } from 'lucide-react';
import { Project } from '../types';

interface ObraFormModalProps {
  /** Obra being edited; null creates a new one. */
  project: Project | null;
  /** Number of RDOs of this obra (an obra with RDOs cannot be deleted). */
  logsCount: number;
  defaultEngineer: string;
  /** Only the coordinator can delete an obra. */
  canDelete: boolean;
  onSave: (data: Pick<Project, 'name' | 'address' | 'engineerInCharge' | 'artRrt' | 'clientName' | 'progressPercent'>) => void;
  onDelete: (projectId: string) => void;
  onClose: () => void;
}

const PROGRESS_STEP = 5;

const inputClass =
  'w-full min-w-0 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none focus:border-[#C5A059]';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-bold text-slate-600">{label}</span>
    {children}
  </label>
);

/** Create / edit an obra with the minimum of fields. */
export const ObraFormModal: React.FC<ObraFormModalProps> = ({
  project,
  logsCount,
  defaultEngineer,
  canDelete,
  onSave,
  onDelete,
  onClose,
}) => {
  const [name, setName] = useState(project?.name ?? '');
  const [address, setAddress] = useState(project?.address ?? '');
  const [engineer, setEngineer] = useState(project?.engineerInCharge ?? defaultEngineer);
  const [artRrt, setArtRrt] = useState(project?.artRrt ?? '');
  const [clientName, setClientName] = useState(project?.clientName ?? '');
  const [progress, setProgress] = useState(project?.progressPercent ?? 0);
  const [isNameMissing, setIsNameMissing] = useState(false);

  const changeProgress = (delta: number) => setProgress((p) => Math.min(100, Math.max(0, p + delta)));

  const submit = () => {
    if (!name.trim()) {
      setIsNameMissing(true);
      return;
    }
    onSave({
      name: name.trim(),
      address: address.trim(),
      engineerInCharge: engineer.trim(),
      artRrt: artRrt.trim(),
      clientName: clientName.trim(),
      progressPercent: progress,
    });
  };

  const confirmDelete = () => {
    if (project && window.confirm(`Apagar a obra "${project.name}"? Isso não pode ser desfeito.`)) {
      onDelete(project.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4">
      <div className="flex flex-col w-full max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-[#121214] text-white">
          <Building2 className="w-8 h-8 text-[#C5A059]" />
          <h2 className="flex-1 text-xl font-black">{project ? 'Editar obra' : 'Nova obra'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition"
            aria-label="Fechar"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          <Field label="Nome da obra *">
            <input
              type="text"
              value={name}
              autoFocus={!project}
              onChange={(e) => {
                setName(e.target.value);
                setIsNameMissing(false);
              }}
              placeholder="Ex.: Residencial Aurora – Bloco A"
              className={`${inputClass} ${isNameMissing ? 'border-red-500' : ''}`}
            />
            {isNameMissing && <span className="mt-1 block text-sm font-bold text-red-600">Escreva o nome da obra.</span>}
          </Field>

          <Field label="Endereço">
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, cidade" className={inputClass} />
          </Field>

          <Field label="Engenheiro responsável">
            <input type="text" value={engineer} onChange={(e) => setEngineer(e.target.value)} className={inputClass} />
          </Field>

          <div>
            <span className="mb-1.5 block text-sm font-bold text-slate-600">Quanto da obra já foi feito?</span>
            <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 p-3">
              <button
                type="button"
                onClick={() => changeProgress(-PROGRESS_STEP)}
                disabled={progress === 0}
                className="flex items-center justify-center w-12 h-12 shrink-0 rounded-full bg-slate-100 text-slate-700 disabled:opacity-30 active:scale-90 transition"
                aria-label="Diminuir avanço"
              >
                <Minus className="w-6 h-6" strokeWidth={3} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-[#C5A059]" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <span className="w-14 text-center text-2xl font-black text-slate-900 tabular-nums">{progress}%</span>
              <button
                type="button"
                onClick={() => changeProgress(PROGRESS_STEP)}
                disabled={progress === 100}
                className="flex items-center justify-center w-12 h-12 shrink-0 rounded-full bg-[#C5A059] text-white disabled:opacity-30 active:scale-90 transition"
                aria-label="Aumentar avanço"
              >
                <Plus className="w-6 h-6" strokeWidth={3} />
              </button>
            </div>
          </div>

          <details className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-bold text-slate-600">Mais dados (opcional)</summary>
            <div className="mt-3 space-y-3">
              <Field label="ART / RRT">
                <input type="text" value={artRrt} onChange={(e) => setArtRrt(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Cliente">
                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputClass} />
              </Field>
            </div>
          </details>

          {project && canDelete && logsCount === 0 && (
            <button
              type="button"
              onClick={confirmDelete}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-red-200 py-3 text-base font-bold text-red-600 active:scale-[0.98] transition"
            >
              <Trash2 className="w-5 h-5" /> Apagar obra
            </button>
          )}
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={submit}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-4 text-lg font-black text-white shadow-md active:scale-[0.98] transition"
          >
            <Save className="w-7 h-7" /> SALVAR OBRA
          </button>
        </div>
      </div>
    </div>
  );
};
