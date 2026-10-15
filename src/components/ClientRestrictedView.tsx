import React, { useState } from 'react';
import { Camera, Download, FileText, HardHat, TrendingUp, ZoomIn } from 'lucide-react';
import { DailyLog, Project } from '../types';
import { downloadDailyLogPdf } from '../services/pdfGenerator';
import { PhotoViewer } from './PhotoViewer';

interface ClientRestrictedViewProps {
  project: Project;
  logs: DailyLog[];
  clientEmail: string;
}

const formatDate = (date: string) => date.split('-').reverse().join('/');

const SummaryCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  tone: string;
}> = ({ icon: Icon, label, value, tone }) => (
  <div className="flex min-w-0 items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4">
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
      <Icon className={`h-8 w-8 ${tone}`} aria-hidden="true" />
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-sm font-bold text-slate-600">{label}</p>
    </div>
  </div>
);

export const ClientRestrictedView: React.FC<ClientRestrictedViewProps> = ({ project, logs }) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const approvedLogs = logs
    .filter((log) => log.projectId === project.id && log.status === 'aprovado')
    .sort((a, b) => b.executionDate.localeCompare(a.executionDate));
  const allPhotos = approvedLogs.flatMap((log) =>
    (log.photos || []).map((photo) => ({ ...photo, date: log.executionDate, rdo: log.rdoNumber }))
  );
  const progress = Math.min(100, Math.max(0, project.progressPercent));

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-5 pb-12">
      <header className="min-w-0 rounded-2xl border-2 border-[#C5A059] bg-[#121214] p-5 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <HardHat className="h-10 w-10 shrink-0 text-[#C5A059]" aria-hidden="true" />
          <h1 className="min-w-0 text-xl font-black break-words sm:text-2xl">{project.name}</h1>
        </div>
        <div className="mt-5 flex items-end justify-between gap-3">
          <p className="text-lg font-black">Avanço da obra</p>
          <p className="text-3xl font-black text-[#C5A059]">{progress}%</p>
        </div>
        <div className="mt-2 h-4 overflow-hidden rounded-full bg-white/15" aria-label={`${progress}% da obra concluída`}>
          <div className="h-full rounded-full bg-[#C5A059] transition-all" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <section className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Resumo da obra">
        <SummaryCard icon={FileText} label="RDOs" value={String(approvedLogs.length)} tone="text-[#B89047]" />
        <SummaryCard icon={Camera} label="Fotos" value={String(allPhotos.length)} tone="text-emerald-600" />
        <SummaryCard icon={TrendingUp} label="Avanço" value={`${progress}%`} tone="text-[#B89047]" />
      </section>

      <section className="min-w-0 rounded-2xl border-2 border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
          <FileText className="h-7 w-7 text-[#B89047]" aria-hidden="true" />
          Diário da obra
        </h2>

        {approvedLogs.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
            Ainda não há RDO aprovado.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {approvedLogs.map((log) => (
              <article key={log.id} className="min-w-0 rounded-2xl border-2 border-slate-200 p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-[#B89047]">
                    <FileText className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-black text-slate-900">RDO nº {log.rdoNumber}</h3>
                    <p className="text-sm font-bold text-slate-600">{formatDate(log.executionDate)}</p>
                  </div>
                </div>

                {log.generalNotes.trim() && (
                  <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    {log.generalNotes}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => downloadDailyLogPdf(log, project)}
                  className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#121214] bg-[#121214] px-4 text-base font-black text-white transition active:scale-[0.98] hover:bg-slate-800"
                >
                  <Download className="h-6 w-6 text-[#C5A059]" aria-hidden="true" />
                  Baixar PDF
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="min-w-0 rounded-2xl border-2 border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
          <Camera className="h-7 w-7 text-[#B89047]" aria-hidden="true" />
          Fotos da obra
        </h2>

        {allPhotos.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
            Ainda não há fotos.
          </p>
        ) : (
          <div className="mt-4 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {allPhotos.map((photo, index) => (
              <button
                key={`${photo.id}-${index}`}
                type="button"
                onClick={() => setSelectedPhotoIndex(index)}
                className="group relative min-w-0 overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-900 text-left aspect-square"
                aria-label={`Abrir foto ${index + 1}`}
              >
                <img src={photo.url} alt={photo.caption || `Foto ${index + 1}`} className="h-full w-full object-cover" />
                <span className="absolute inset-x-2 bottom-2 flex min-h-12 items-center justify-center gap-1 rounded-xl bg-black/75 px-2 text-sm font-black text-white">
                  <ZoomIn className="h-5 w-5" aria-hidden="true" />
                  Ver foto
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedPhotoIndex !== null && (
        <PhotoViewer
          photos={allPhotos.map((photo) => ({ ...photo, timestamp: formatDate(photo.date) }))}
          startIndex={selectedPhotoIndex}
          onClose={() => setSelectedPhotoIndex(null)}
        />
      )}
    </div>
  );
};
