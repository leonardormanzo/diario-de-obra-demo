import React from 'react';
import {
  CircleCheckBig,
  CloudRain,
  Eraser,
  LucideIcon,
  MessageSquareText,
  PackageCheck,
  PackageX,
  ShieldCheck,
  Truck,
  UserCheck,
  UserX,
  HardHat,
} from 'lucide-react';
import { StepHeader } from './rdoUi';
import type { StepProps } from './RdoStepsSetup';

const QUICK_PHRASES: { icon: LucideIcon; tone: string; text: string }[] = [
  { icon: CircleCheckBig, tone: 'text-emerald-600', text: 'Dia normal, serviço andou bem.' },
  { icon: PackageCheck, tone: 'text-blue-600', text: 'Chegou material na obra.' },
  { icon: PackageX, tone: 'text-red-600', text: 'Faltou material.' },
  { icon: CloudRain, tone: 'text-sky-600', text: 'Chuva atrapalhou o serviço.' },
  { icon: UserX, tone: 'text-orange-600', text: 'Faltou gente da equipe.' },
  { icon: Truck, tone: 'text-slate-600', text: 'Entrega de caminhão / caçamba.' },
  { icon: HardHat, tone: 'text-amber-600', text: 'Visita do engenheiro.' },
  { icon: UserCheck, tone: 'text-violet-600', text: 'Visita do cliente.' },
  { icon: ShieldCheck, tone: 'text-emerald-700', text: 'Equipe usando EPI corretamente.' },
];

/** "Descritivo do dia": free comments about the day, with tap-to-add phrases. */
export const StepComentarios: React.FC<StepProps> = ({ draft, update }) => {
  const text = draft.generalNotes;

  const addPhrase = (phrase: string) => {
    if (text.includes(phrase)) return;
    update({ generalNotes: text.trim() ? `${text.trim()}\n${phrase}` : phrase });
  };

  return (
    <div className="space-y-5">
      <StepHeader icon={MessageSquareText} title="Comentários do dia" hint="Conte como foi o dia. Toque nas frases prontas ou escreva." />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {QUICK_PHRASES.map(({ icon: Icon, tone, text: phrase }) => {
          const isAdded = text.includes(phrase);
          return (
            <button
              key={phrase}
              type="button"
              onClick={() => addPhrase(phrase)}
              aria-pressed={isAdded}
              className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left text-base font-bold transition active:scale-[0.98] ${
                isAdded ? 'border-[#C5A059] bg-[#C5A059]/15 text-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:border-[#C5A059]/60'
              }`}
            >
              <Icon className={`w-8 h-8 shrink-0 ${tone}`} />
              {phrase}
            </button>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-base font-bold text-slate-800">Descritivo do dia</span>
          {text && (
            <button
              type="button"
              onClick={() => update({ generalNotes: '' })}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100"
            >
              <Eraser className="w-5 h-5" /> Limpar
            </button>
          )}
        </div>
        <textarea
          rows={7}
          value={text}
          onChange={(e) => update({ generalNotes: e.target.value })}
          placeholder="Ex.: Concretamos a laje do 2º andar. Chegou o aço à tarde."
          className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base leading-relaxed text-slate-900 outline-none focus:border-[#C5A059]"
        />
      </div>
    </div>
  );
};
