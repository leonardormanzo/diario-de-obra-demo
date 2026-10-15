import React from 'react';
import { Check, LucideIcon, Minus, Plus, ThumbsDown, ThumbsUp } from 'lucide-react';

const GOLD_SELECTED = 'border-[#C5A059] bg-[#C5A059]/15 ring-2 ring-[#C5A059]';
const IDLE = 'border-slate-200 bg-white hover:border-[#C5A059]/60 hover:bg-amber-50/40';

/** Step title: big icon, short question and one-line hint. */
export const StepHeader: React.FC<{ icon: LucideIcon; title: string; hint: string }> = ({ icon: Icon, title, hint }) => (
  <div className="flex items-center gap-3">
    <div className="flex items-center justify-center w-14 h-14 shrink-0 rounded-2xl bg-[#121214] text-[#C5A059]">
      <Icon className="w-8 h-8" />
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-xl font-black text-slate-900 leading-tight">{title}</h3>
      <p className="text-sm text-slate-500">{hint}</p>
    </div>
  </div>
);

/** Section label inside a step (icon + short text). */
export const SectionLabel: React.FC<{ icon: LucideIcon; children: React.ReactNode; tone?: string }> = ({
  icon: Icon,
  children,
  tone = 'text-[#C5A059]',
}) => (
  <div className="flex items-center gap-2 mb-2">
    <Icon className={`w-6 h-6 ${tone}`} />
    <span className="text-base font-bold text-slate-800">{children}</span>
  </div>
);

interface BigTileProps {
  icon: LucideIcon;
  label: string;
  tone?: string;
  isSelected: boolean;
  onClick: () => void;
  size?: 'md' | 'lg';
}

/** Large tappable tile: big icon + one or two words. */
export const BigTile: React.FC<BigTileProps> = ({ icon: Icon, label, tone = 'text-slate-600', isSelected, onClick, size = 'md' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={isSelected}
    className={`relative flex flex-col items-center justify-center gap-1.5 min-w-0 rounded-2xl border-2 p-3 text-center transition active:scale-95 ${
      size === 'lg' ? 'min-h-32' : 'min-h-24'
    } ${isSelected ? GOLD_SELECTED : IDLE}`}
  >
    {isSelected && (
      <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-6 h-6 rounded-full bg-[#C5A059] text-white">
        <Check className="w-4 h-4" strokeWidth={3} />
      </span>
    )}
    <Icon className={`${size === 'lg' ? 'w-12 h-12' : 'w-9 h-9'} ${tone}`} />
    <span className="text-sm font-bold text-slate-800 leading-tight">{label}</span>
  </button>
);

interface CounterTileProps {
  icon: LucideIcon;
  label: string;
  tone?: string;
  count: number;
  onChange: (count: number) => void;
  /** Replaces the text label (e.g. an editable name). */
  labelNode?: React.ReactNode;
  children?: React.ReactNode;
}

/** Tile with a big icon and − / + buttons to count people or machines. */
export const CounterTile: React.FC<CounterTileProps> = ({ icon: Icon, label, tone = 'text-slate-600', count, onChange, labelNode, children }) => (
  <div className={`flex flex-col items-center gap-2 min-w-0 rounded-2xl border-2 p-3 transition ${count > 0 ? GOLD_SELECTED : 'border-slate-200 bg-white'}`}>
    <Icon className={`w-10 h-10 ${tone}`} />
    {labelNode || (
      <span className="text-sm font-bold text-slate-800 text-center leading-tight min-h-[2.2em] flex items-center">{label}</span>
    )}
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, count - 1))}
        disabled={count === 0}
        className="flex items-center justify-center w-11 h-11 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-90 disabled:opacity-30 transition"
        aria-label={`Menos ${label}`}
      >
        <Minus className="w-6 h-6" strokeWidth={3} />
      </button>
      <span className="w-10 text-center text-2xl font-black text-slate-900 tabular-nums">{count}</span>
      <button
        type="button"
        onClick={() => onChange(count + 1)}
        className="flex items-center justify-center w-11 h-11 rounded-full bg-[#C5A059] text-white hover:bg-[#B89047] active:scale-90 transition"
        aria-label={`Mais ${label}`}
      >
        <Plus className="w-6 h-6" strokeWidth={3} />
      </button>
    </div>
    {children}
  </div>
);

/** Big YES / NO answer. */
export const YesNo: React.FC<{ value: boolean; onChange: (value: boolean) => void; yesIsBad?: boolean }> = ({
  value,
  onChange,
  yesIsBad = true,
}) => {
  const yesActive = yesIsBad ? 'bg-red-600 border-red-600 text-white' : 'bg-emerald-600 border-emerald-600 text-white';
  const noActive = yesIsBad ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-600 border-slate-600 text-white';
  const base = 'flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 py-4 text-lg font-black transition active:scale-95';
  return (
    <div className="flex gap-3">
      <button type="button" onClick={() => onChange(false)} aria-pressed={!value} className={`${base} ${!value ? noActive : IDLE}`}>
        <ThumbsUp className="w-7 h-7" /> NÃO
      </button>
      <button type="button" onClick={() => onChange(true)} aria-pressed={value} className={`${base} ${value ? yesActive : IDLE}`}>
        <ThumbsDown className="w-7 h-7" /> SIM
      </button>
    </div>
  );
};

interface NoteFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
}

/** Large, easy-to-tap text field. */
export const NoteField: React.FC<NoteFieldProps> = ({ value, onChange, placeholder, rows = 2 }) => (
  <textarea
    rows={rows}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full min-w-0 rounded-2xl border-2 border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-[#C5A059] resize-none"
  />
);
