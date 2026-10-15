import React, { useCallback, useRef, useState } from 'react';
import {
  Camera,
  CircleCheckBig,
  ClipboardCheck,
  Clock,
  Hammer,
  HardHat,
  Images,
  MessageSquareText,
  PenLine,
  Plus,
  Trash2,
  TriangleAlert,
  Users,
  ZoomIn,
  Truck,
  Loader2,
} from 'lucide-react';
import { DigitalSignature, PhotoRecord, SiteTask } from '../../types';
import { compressImageFile } from '../../utils/imageCompress';
import { PhotoViewer } from '../PhotoViewer';
import { CameraCapture, isInAppCameraSupported } from './CameraCapture';
import { DigitalSignaturePad } from '../DigitalSignaturePad';
import {
  CATEGORY_OPTIONS,
  PHOTO_TAG_OPTIONS,
  PROGRESS_STEPS,
  STATUS_OPTIONS,
  WEATHER_OPTIONS,
  categoryOption,
} from './rdoOptions';
import { BigTile, SectionLabel, StepHeader, NoteField, YesNo } from './rdoUi';
import { NO_OCCURRENCES_TEXT, hasRealOccurrence } from './rdoDraft';
import type { StepProps } from './RdoStepsSetup';

/* -------------------------------- 4. Serviços -------------------------------- */

const TaskCard: React.FC<{
  task: SiteTask;
  onChange: (patch: Partial<SiteTask>) => void;
  onRemove: () => void;
}> = ({ task, onChange, onRemove }) => {
  const category = categoryOption(task.category);
  const CategoryIcon = category.icon;

  const setStatus = (status: SiteTask['status']) => {
    const progress = status === 'concluida' ? 100 : status === 'pendente' ? 0 : task.progress || 50;
    onChange({ status, progress: status === 'em_andamento' && progress === 100 ? 75 : progress });
  };

  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100">
          <CategoryIcon className={`w-9 h-9 ${category.tone}`} />
        </div>
        <input
          type="text"
          value={task.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={category.label}
          aria-label="Nome do serviço"
          className="flex-1 min-w-0 rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-lg font-black text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#C5A059]"
        />
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-600 hover:bg-red-100 active:scale-90 transition"
          aria-label="Apagar serviço"
        >
          <Trash2 className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {STATUS_OPTIONS.map((o) => {
          const Icon = o.icon;
          const isActive = task.status === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setStatus(o.value)}
              aria-pressed={isActive}
              className={`flex flex-col items-center gap-1 rounded-2xl border-2 py-3 font-bold text-sm transition active:scale-95 ${
                isActive ? o.active : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              <Icon className={`w-8 h-8 ${isActive ? '' : o.tone}`} />
              {o.label}
            </button>
          );
        })}
      </div>

      {task.status === 'em_andamento' && (
        <div>
          <p className="text-sm font-bold text-slate-600 mb-2">Quanto já foi feito?</p>
          <div className="grid grid-cols-4 gap-2">
            {PROGRESS_STEPS.slice(0, 3).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onChange({ progress: p })}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition active:scale-95 ${
                  task.progress === p ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${p}%` }} />
                </div>
                <span className="text-sm font-black text-slate-800">{p}%</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setStatus('concluida')}
              className="flex flex-col items-center gap-1 rounded-xl border-2 border-slate-200 bg-white p-2 text-emerald-700 transition active:scale-95"
            >
              <CircleCheckBig className="w-6 h-6" />
              <span className="text-xs font-black">Acabou</span>
            </button>
          </div>
        </div>
      )}

      {task.status === 'bloqueada' && (
        <NoteField value={task.observations || ''} onChange={(observations) => onChange({ observations })} placeholder="Por que parou?" />
      )}

      <label className="flex items-center gap-2 text-sm font-semibold text-slate-500">
        <Clock className="w-5 h-5 text-red-500" />
        Prazo (opcional)
        <input
          type="date"
          value={task.deadline || ''}
          onChange={(e) => onChange({ deadline: e.target.value || undefined })}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-800 outline-none"
        />
      </label>
    </div>
  );
};

export const StepServicos: React.FC<StepProps> = ({ draft, update }) => {
  const [isPicking, setIsPicking] = useState(draft.tasks.length === 0);

  const addTask = (category: string) => {
    const task: SiteTask = {
      id: `t-${Date.now()}`,
      description: '',
      category,
      status: 'em_andamento',
      progress: 50,
    };
    update({ tasks: [...draft.tasks, task] });
    setIsPicking(false);
  };

  const patchTask = (id: string, patch: Partial<SiteTask>) =>
    update({ tasks: draft.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });

  return (
    <div className="space-y-5">
      <StepHeader icon={Hammer} title="O que foi feito hoje?" hint="Toque no desenho do serviço. Depois diga como ele está." />

      {draft.tasks.map((t) => (
        <TaskCard key={t.id} task={t} onChange={(patch) => patchTask(t.id, patch)} onRemove={() => update({ tasks: draft.tasks.filter((x) => x.id !== t.id) })} />
      ))}

      {isPicking ? (
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-base font-bold text-slate-700 mb-3">Escolha o serviço:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORY_OPTIONS.map((o) => (
              <BigTile key={o.value} icon={o.icon} tone={o.tone} label={o.label} isSelected={false} onClick={() => addTask(o.value)} />
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsPicking(true)}
          className="w-full flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#C5A059] py-5 text-lg font-black text-[#B89047] hover:bg-amber-50 transition active:scale-[0.98]"
        >
          <Plus className="w-8 h-8" /> Mais um serviço
        </button>
      )}
    </div>
  );
};

/* --------------------------------- 5. Fotos ---------------------------------- */

export const StepFotos: React.FC<StepProps> = ({ draft, update }) => {
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const photosRef = useRef(draft.photos);
  photosRef.current = draft.photos;

  const newPhoto = (url: string): PhotoRecord => {
    const now = new Date();
    return {
      id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url,
      caption: '',
      tag: 'Geral',
      timestamp: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    };
  };

  const addPhotoUrls = (urls: string[]) => {
    const next = [...photosRef.current, ...urls.map(newPhoto)];
    photosRef.current = next;
    update({ photos: next });
  };

  const handleCameraCapture = useCallback((url: string) => addPhotoUrls([url]), []);
  // Fallback: if the in-app camera can't start, use the phone's camera app.
  const handleCameraUnavailable = useCallback(() => {
    setIsCameraOpen(false);
    cameraRef.current?.click();
  }, []);

  const openCamera = () => {
    if (isInAppCameraSupported()) setIsCameraOpen(true);
    else cameraRef.current?.click();
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setIsProcessing(true);
    try {
      const urls: string[] = [];
      for (const file of files) urls.push(await compressImageFile(file));
      addPhotoUrls(urls);
    } finally {
      setIsProcessing(false);
    }
  };

  const patchPhoto = (id: string, patch: Partial<PhotoRecord>) =>
    update({ photos: draft.photos.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  return (
    <div className="space-y-5">
      <StepHeader icon={Camera} title="Fotos da obra" hint="Tire fotos do serviço. Toque na foto para ver de perto." />

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFiles} className="hidden" />
      <input ref={galleryRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={openCamera}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#C5A059] text-white py-6 font-black text-lg shadow-md hover:bg-[#B89047] active:scale-95 transition"
        >
          <Camera className="w-12 h-12" /> Tirar foto
        </button>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#121214] text-white py-6 font-black text-lg shadow-md hover:bg-slate-800 active:scale-95 transition"
        >
          <Images className="w-12 h-12 text-[#C5A059]" /> Da galeria
        </button>
      </div>

      {isProcessing && (
        <p className="flex items-center justify-center gap-2 text-base font-bold text-slate-600">
          <Loader2 className="w-6 h-6 animate-spin" /> Preparando fotos...
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {draft.photos.map((p, idx) => (
          <div key={p.id} className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
            <button type="button" onClick={() => setViewerIndex(idx)} className="relative block w-full h-52 bg-slate-900" aria-label="Ver foto de perto">
              <img src={p.url} alt={p.caption || `Foto ${idx + 1}`} className="w-full h-full object-cover" />
              <span className="absolute bottom-2 right-2 flex items-center gap-1 px-3 py-2 rounded-full bg-black/70 text-white text-sm font-bold">
                <ZoomIn className="w-5 h-5" /> Ver de perto
              </span>
              <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/70 text-white text-xs font-mono">{p.timestamp}</span>
            </button>
            <div className="p-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {PHOTO_TAG_OPTIONS.map((o) => {
                  const Icon = o.icon;
                  const isActive = p.tag === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => patchPhoto(p.id, { tag: o.value })}
                      aria-pressed={isActive}
                      title={o.label}
                      className={`flex items-center gap-1 px-2.5 py-2 rounded-xl border-2 text-xs font-bold transition active:scale-95 ${
                        isActive ? 'border-[#C5A059] bg-[#C5A059]/15 text-slate-900' : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${o.tone}`} />
                      {o.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <NoteField value={p.caption} onChange={(caption) => patchPhoto(p.id, { caption })} placeholder="O que aparece na foto?" rows={1} />
                </div>
                <button
                  type="button"
                  onClick={() => update({ photos: draft.photos.filter((x) => x.id !== p.id) })}
                  className="flex items-center justify-center w-12 h-12 shrink-0 rounded-full bg-red-50 text-red-600 hover:bg-red-100 active:scale-90 transition"
                  aria-label="Apagar foto"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {viewerIndex !== null && (
        <PhotoViewer photos={draft.photos} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}

      {isCameraOpen && (
        <CameraCapture onCapture={handleCameraCapture} onClose={() => setIsCameraOpen(false)} onUnavailable={handleCameraUnavailable} />
      )}
    </div>
  );
};

/* ------------------------------ 6. Fechar o dia ------------------------------ */

const SummaryChip: React.FC<{ icon: React.ElementType; value: React.ReactNode; tone?: string }> = ({ icon: Icon, value, tone = 'text-[#C5A059]' }) => (
  <div className="flex flex-col items-center gap-1 rounded-2xl bg-white border border-slate-200 p-3">
    <Icon className={`w-8 h-8 ${tone}`} />
    <span className="text-sm font-black text-slate-800 text-center leading-tight">{value}</span>
  </div>
);

export const StepFechar: React.FC<StepProps> = ({ draft, update }) => {
  const [hasProblem, setHasProblem] = useState(hasRealOccurrence(draft.occurrences));
  const [isSigning, setIsSigning] = useState(false);

  const morning = WEATHER_OPTIONS.find((w) => w.value === draft.weatherMorning) || WEATHER_OPTIONS[0];
  const afternoon = WEATHER_OPTIONS.find((w) => w.value === draft.weatherAfternoon) || WEATHER_OPTIONS[0];
  const people = draft.workforce.reduce((s, w) => s + w.count, 0);
  const machines = draft.equipment.reduce((s, e) => s + e.count, 0);

  const toggleProblem = (value: boolean) => {
    setHasProblem(value);
    update({ occurrences: value ? '' : NO_OCCURRENCES_TEXT });
  };

  return (
    <div className="space-y-6">
      <StepHeader icon={ClipboardCheck} title="Fechar o dia" hint="Responda sim ou não. Depois assine e salve." />

      <div className="rounded-2xl border-2 border-slate-200 p-4 space-y-3">
        <SectionLabel icon={HardHat} tone="text-red-600">Teve acidente hoje?</SectionLabel>
        <YesNo value={draft.safetyAccidents} onChange={(v) => update({ safetyAccidents: v })} />
        {draft.safetyAccidents && (
          <NoteField value={draft.safetyNotes || ''} onChange={(safetyNotes) => update({ safetyNotes })} placeholder="O que aconteceu?" />
        )}
      </div>

      <div className="rounded-2xl border-2 border-slate-200 p-4 space-y-3">
        <SectionLabel icon={TriangleAlert} tone="text-amber-500">Teve algum problema? (falta de material, atraso...)</SectionLabel>
        <YesNo value={hasProblem} onChange={toggleProblem} />
        {hasProblem && (
          <NoteField value={draft.occurrences} onChange={(occurrences) => update({ occurrences })} placeholder="Qual foi o problema?" />
        )}
      </div>


      <div className="rounded-2xl border-2 border-slate-200 p-4">
        <SectionLabel icon={PenLine}>Assinatura</SectionLabel>
        {draft.digitalSignature ? (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-300 p-3">
            <img src={draft.digitalSignature.signatureDataUrl} alt="Assinatura" className="h-14 w-28 object-contain bg-white rounded" />
            <div className="flex-1 text-sm">
              <p className="font-black text-emerald-700 flex items-center gap-1">
                <CircleCheckBig className="w-5 h-5" /> Assinado
              </p>
              <p className="text-slate-600">{draft.digitalSignature.signerName}</p>
            </div>
            <button type="button" onClick={() => setIsSigning(true)} className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-700">
              Refazer
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsSigning(true)}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-[#121214] text-white py-5 text-lg font-black active:scale-[0.98] transition"
          >
            <PenLine className="w-8 h-8 text-[#C5A059]" /> Assinar com o dedo
          </button>
        )}
      </div>

      <div>
        <p className="text-sm font-bold text-slate-500 mb-2">Resumo do dia</p>
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
          <SummaryChip icon={morning.icon} tone={morning.tone} value={`Manhã: ${morning.label}`} />
          <SummaryChip icon={afternoon.icon} tone={afternoon.tone} value={`Tarde: ${afternoon.label}`} />
          <SummaryChip icon={Users} value={`${people} pessoas`} />
          <SummaryChip icon={Truck} value={`${machines} máquinas`} />
          <SummaryChip icon={Hammer} value={`${draft.tasks.length} serviços`} />
          <SummaryChip icon={Camera} value={`${draft.photos.length} fotos`} />
          <SummaryChip icon={MessageSquareText} value={draft.generalNotes.trim() ? 'Com comentário' : 'Sem comentário'} />
        </div>
      </div>

      {isSigning && (
        <DigitalSignaturePad
          initialSignerName={draft.engineerInCharge}
          initialRole="Responsável pela obra"
          creaArt={draft.creaArt}
          onSaveSignature={(sig: DigitalSignature) => update({ digitalSignature: sig })}
          onClose={() => setIsSigning(false)}
        />
      )}
    </div>
  );
};
