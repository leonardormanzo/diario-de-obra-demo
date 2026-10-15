import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  Camera,
  CloudCheck,
  CloudUpload,
  FileDown,
  FileText,
  Hammer,
  MessageSquareText,
  PenLine,
  Pencil,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  Trash2,
  ShieldCheck,
  Users,
  X,
  ZoomIn,
} from 'lucide-react';
import { DailyLog, DigitalSignature, Project } from '../types';
import { downloadDailyLogPdf } from '../services/pdfGenerator';
import { DigitalSignaturePad } from './DigitalSignaturePad';
import { PhotoViewer } from './PhotoViewer';
import { availableCategories, filterLogs, periodEndingToday } from './rdo/logFilters';
import { WEATHER_OPTIONS, categoryOption } from './rdo/rdoOptions';

const QUICK_PERIODS = [
  { label: 'Hoje', days: 1 },
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
];

interface DailyLogsListProps {
  logs: DailyLog[];
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onOpenNewLog: () => void;
  onEditLog: (log: DailyLog) => void;
  onShareLog: (log: DailyLog) => void;
  onDeleteLog: (logId: string) => void;
  onSaveSignature: (logId: string, sig: DigitalSignature) => void;
}

const shortProjectName = (name: string) => name;

const dayParts = (iso: string) => {
  const date = new Date(`${iso}T12:00:00`);
  return {
    day: iso.split('-').reverse().slice(0, 2).join('/'),
    weekday: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
  };
};

const Stat: React.FC<{ icon: React.ElementType; value: React.ReactNode; tone?: string; label: string }> = ({ icon: Icon, value, tone = 'text-slate-500', label }) => (
  <span className="flex items-center gap-1.5 text-base font-bold text-slate-700" title={label}>
    <Icon className={`w-6 h-6 ${tone}`} aria-label={label} />
    {value}
  </span>
);

export const DailyLogsList: React.FC<DailyLogsListProps> = ({
  logs,
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenNewLog,
  onEditLog,
  onShareLog,
  onDeleteLog,
  onSaveSignature,
}) => {
  const [search, setSearch] = useState('');
  const [signingLog, setSigningLog] = useState<DailyLog | null>(null);
  const [viewer, setViewer] = useState<{ log: DailyLog; index: number } | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [category, setCategory] = useState('');

  const filtered = useMemo(
    () => filterLogs(logs, { projectId: selectedProjectId, query: search, from, to, category }),
    [logs, selectedProjectId, search, from, to, category]
  );
  const categories = useMemo(() => availableCategories(logs, selectedProjectId), [logs, selectedProjectId]);
  const activeFilters = (from || to ? 1 : 0) + (category ? 1 : 0);

  const clearFilters = () => {
    setFrom('');
    setTo('');
    setCategory('');
  };
  const applyPeriod = (days: number) => {
    const period = periodEndingToday(days);
    setFrom(period.from);
    setTo(period.to);
  };

  const confirmDelete = (log: DailyLog) => {
    if (window.confirm(`Apagar o RDO nº ${log.rdoNumber} de ${log.executionDate.split('-').reverse().join('/')}? Isso não pode ser desfeito.`)) {
      onDeleteLog(log.id);
    }
  };

  const handleDownload = (log: DailyLog) =>
    downloadDailyLogPdf(log, projects.find((p) => p.id === log.projectId));

  const chip = (isActive: boolean) =>
    `shrink-0 px-4 py-2.5 rounded-full border-2 text-sm font-bold transition active:scale-95 ${
      isActive ? 'border-[#121214] bg-[#121214] text-white' : 'border-slate-200 bg-white text-slate-600'
    }`;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <button
        type="button"
        onClick={onOpenNewLog}
        className="w-full flex items-center justify-center gap-3 rounded-2xl bg-[#C5A059] hover:bg-[#B89047] py-4 text-lg font-black text-white shadow-md active:scale-[0.98] transition"
      >
        <Plus className="w-7 h-7" strokeWidth={3} /> NOVO RDO
      </button>

      <div className="relative">
        <Search className="w-6 h-6 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          placeholder="Buscar RDO, data ou palavra"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border-2 border-slate-200 bg-white pl-13 pr-4 py-3.5 text-base text-slate-900 outline-none focus:border-[#C5A059]"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3">
        <button type="button" onClick={() => onSelectProject('all')} className={chip(selectedProjectId === 'all')}>
          Todas
        </button>
        {[...projects]
          .sort((a, b) => Number(b.id === selectedProjectId) - Number(a.id === selectedProjectId))
          .map((p) => (
          <button key={p.id} type="button" onClick={() => onSelectProject(p.id)} className={chip(selectedProjectId === p.id)}>
            {shortProjectName(p.name)}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className={`flex items-center gap-2 rounded-full border-2 px-4 py-2.5 text-sm font-bold active:scale-95 transition ${
            activeFilters > 0 ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#8A6A28]' : 'border-slate-200 bg-white text-slate-600'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          Filtrar
          {activeFilters > 0 && (
            <span className="min-w-6 rounded-full bg-[#C5A059] px-1.5 text-center text-xs font-black text-white">{activeFilters}</span>
          )}
        </button>
        <p className="text-sm font-bold text-slate-500" aria-live="polite">
          {filtered.length} RDO{filtered.length === 1 ? '' : 's'} · mais novo primeiro
        </p>
      </div>

      {showFilters && (
        <section aria-label="Filtros" className="rounded-2xl border-2 border-slate-200 bg-white p-4 space-y-5">
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-black text-slate-700">
              <CalendarDays className="w-5 h-5 text-[#C5A059]" /> Data
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PERIODS.map((p) => (
                <button key={p.days} type="button" onClick={() => applyPeriod(p.days)} className={chip(false)}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-xs font-bold text-slate-500">
                De
                <input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-3 text-base text-slate-900 outline-none focus:border-[#C5A059]"
                />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-500">
                Até
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-3 text-base text-slate-900 outline-none focus:border-[#C5A059]"
                />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-black text-slate-700">
              <Hammer className="w-5 h-5 text-[#C5A059]" /> Serviço
            </p>
            {categories.length === 0 ? (
              <p className="text-sm text-slate-500">Ainda não há serviços nos RDOs.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setCategory('')} className={chip(category === '')}>
                  Todos
                </button>
                {categories.map((c) => {
                  const option = categoryOption(c.value);
                  const Icon = option.icon;
                  return (
                    <button key={c.value} type="button" onClick={() => setCategory(c.value)} className={`${chip(category === c.value)} flex items-center gap-2`}>
                      <Icon className={`w-5 h-5 ${category === c.value ? 'text-white' : option.tone}`} />
                      {option.label}
                      <span className="text-xs opacity-70">{c.count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {activeFilters > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-600 active:scale-95 transition"
            >
              <X className="w-5 h-5" /> Limpar filtros
            </button>
          )}
        </section>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white py-12 text-slate-400">
          <FileText className="w-14 h-14" />
          <p className="text-lg font-bold text-slate-600">Nenhum RDO aqui</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((log) => {
            const { day, weekday } = dayParts(log.executionDate);
            const weather = WEATHER_OPTIONS.find((w) => w.value === log.weatherMorning) || WEATHER_OPTIONS[0];
            const people = log.workforce.reduce((s, w) => s + w.count, 0);
            const isSigned = !!log.digitalSignature;
            const isSynced = log.syncStatus === 'synced';

            return (
              <article key={log.id} className="rounded-2xl border-2 border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center justify-center w-16 h-16 shrink-0 rounded-2xl bg-[#121214] text-white">
                    <span className="text-lg font-black leading-none">{day}</span>
                    <span className="text-xs font-bold uppercase text-[#C5A059]">{weekday}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-[#B89047]">RDO #{log.rdoNumber}</p>
                    <h3 className="text-base font-black text-slate-900 leading-tight">{shortProjectName(log.projectName)}</h3>
                  </div>
                  <div className="flex gap-1.5">
                    {isSigned && <ShieldCheck className="w-7 h-7 text-emerald-600" aria-label="Assinado" />}
                    {isSynced ? (
                      <CloudCheck className="w-7 h-7 text-emerald-600" aria-label="Na nuvem" />
                    ) : (
                      <CloudUpload className="w-7 h-7 text-amber-500" aria-label="Ainda não enviado" />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <Stat icon={weather.icon} tone={weather.tone} value="" label={`Tempo: ${weather.label}`} />
                  <Stat icon={Users} value={people} label="Pessoas" />
                  <Stat icon={Hammer} value={log.tasks.length} label="Serviços" />
                  <Stat icon={Camera} value={log.photos.length} label="Fotos" />
                </div>

                {log.generalNotes.trim() && (
                  <p className="flex gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <MessageSquareText className="w-5 h-5 shrink-0 text-slate-400" />
                    <span className="line-clamp-2 whitespace-pre-line">{log.generalNotes}</span>
                  </p>
                )}

                {log.photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {log.photos.map((photo, idx) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setViewer({ log, index: idx })}
                        className="relative shrink-0 w-24 h-20 rounded-xl overflow-hidden bg-slate-900"
                        aria-label={`Ver foto ${idx + 1} de perto`}
                      >
                        <img src={photo.url} alt={photo.caption || `Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 right-1 p-1 rounded-full bg-black/60 text-white">
                          <ZoomIn className="w-4 h-4" />
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onEditLog(log)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#121214] py-3.5 text-base font-black text-white active:scale-95 transition"
                  >
                    <Pencil className="w-5 h-5 text-[#C5A059]" /> Abrir
                  </button>
                  <button
                    type="button"
                    onClick={() => onShareLog(log)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#C5A059] py-3.5 text-base font-black text-white active:scale-95 transition"
                  >
                    <Share2 className="w-5 h-5" /> Enviar
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(log)}
                    className="flex flex-col items-center gap-0.5 rounded-xl border-2 border-slate-200 py-2 text-xs font-bold text-slate-600 active:scale-95 transition"
                  >
                    <FileDown className="w-6 h-6 text-[#C5A059]" /> PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setSigningLog(log)}
                    disabled={isSigned}
                    className="flex flex-col items-center gap-0.5 rounded-xl border-2 border-slate-200 py-2 text-xs font-bold text-slate-600 active:scale-95 transition disabled:opacity-40"
                  >
                    <PenLine className={`w-6 h-6 ${isSigned ? 'text-emerald-600' : 'text-slate-500'}`} />
                    {isSigned ? 'Assinado' : 'Assinar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(log)}
                    className="flex flex-col items-center gap-0.5 rounded-xl border-2 border-slate-200 py-2 text-xs font-bold text-red-600 active:scale-95 transition"
                  >
                    <Trash2 className="w-6 h-6" /> Apagar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {viewer && <PhotoViewer photos={viewer.log.photos} startIndex={viewer.index} onClose={() => setViewer(null)} />}

      {signingLog && (
        <DigitalSignaturePad
          initialSignerName={signingLog.engineerInCharge}
          initialRole="Responsável pela obra"
          creaArt={signingLog.creaArt}
          onSaveSignature={(sig) => {
            onSaveSignature(signingLog.id, sig);
            setSigningLog(null);
          }}
          onClose={() => setSigningLog(null)}
        />
      )}
    </div>
  );
};
