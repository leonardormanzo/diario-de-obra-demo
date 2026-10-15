import React from 'react';
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  Check,
  CloudSun,
  History,
  Settings2,
  Sunrise,
  Sunset,
  Truck,
  UserPlus,
  Users,
  Wrench,
  Ban,
  HelpCircle,
} from 'lucide-react';
import { EquipmentEntry, Project, WorkforceEntry } from '../../types';
import { MACHINE_OPTIONS, ROLE_OPTIONS, WEATHER_OPTIONS, matchOption } from './rdoOptions';
import { BigTile, CounterTile, SectionLabel, StepHeader } from './rdoUi';
import { RdoDraft } from './rdoDraft';

export interface StepProps {
  draft: RdoDraft;
  update: (patch: Partial<RdoDraft>) => void;
}

const isoDay = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

/* ---------------------------------- 1. Obra ---------------------------------- */

export const StepObra: React.FC<StepProps & { projects: Project[]; nextRdoNumberFor?: (projectId: string) => number }> = ({
  draft,
  update,
  projects,
  nextRdoNumberFor,
}) => {
  const today = isoDay(0);
  const yesterday = isoDay(-1);
  const isOtherDay = draft.executionDate !== today && draft.executionDate !== yesterday;

  const selectProject = (project: Project) =>
    update({
      projectId: project.id,
      engineerInCharge: project.engineerInCharge,
      creaArt: project.artRrt,
      ...(nextRdoNumberFor ? { rdoNumber: nextRdoNumberFor(project.id) } : {}),
    });

  return (
    <div className="space-y-6">
      <StepHeader icon={Building2} title="Qual obra?" hint="Toque na obra e escolha o dia do trabalho." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {projects.map((p) => (
          <BigTile
            key={p.id}
            icon={Building2}
            tone="text-[#C5A059]"
            label={p.name}
            isSelected={draft.projectId === p.id}
            onClick={() => selectProject(p)}
          />
        ))}
      </div>

      <div>
        <SectionLabel icon={CalendarDays}>Qual dia?</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          <BigTile icon={CalendarCheck} tone="text-emerald-600" label="Hoje" isSelected={draft.executionDate === today} onClick={() => update({ executionDate: today })} />
          <BigTile icon={History} tone="text-blue-600" label="Ontem" isSelected={draft.executionDate === yesterday} onClick={() => update({ executionDate: yesterday })} />
          <label
            className={`relative flex flex-col items-center justify-center gap-1.5 min-w-0 rounded-2xl border-2 p-2 min-h-24 cursor-pointer transition ${
              isOtherDay ? 'border-[#C5A059] bg-[#C5A059]/15 ring-2 ring-[#C5A059]' : 'border-slate-200 bg-white'
            }`}
          >
            <CalendarDays className="w-9 h-9 text-slate-600" />
            <span className="text-sm font-bold text-slate-800 leading-tight">
              {isOtherDay ? draft.executionDate.split('-').reverse().slice(0, 2).join('/') : 'Outro dia'}
            </span>
            {/* Invisible date input covering the tile: tapping anywhere opens the calendar. */}
            <input
              type="date"
              value={draft.executionDate}
              onChange={(e) => e.target.value && update({ executionDate: e.target.value })}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Outro dia"
            />
          </label>
        </div>
      </div>

      <details className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <summary className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-600">
          <Settings2 className="w-5 h-5" /> Dados do engenheiro (opcional)
        </summary>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <label className="text-xs font-semibold text-slate-600">
            Engenheiro responsável
            <input
              type="text"
              value={draft.engineerInCharge}
              onChange={(e) => update({ engineerInCharge: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#C5A059]"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            ART / RRT
            <input
              type="text"
              value={draft.creaArt}
              onChange={(e) => update({ creaArt: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#C5A059]"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Número do RDO
            <input
              type="number"
              min={1}
              value={draft.rdoNumber}
              onChange={(e) => update({ rdoNumber: parseInt(e.target.value, 10) || 1 })}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#C5A059]"
            />
          </label>
        </div>
      </details>
    </div>
  );
};

/* --------------------------------- 2. Clima ---------------------------------- */

export const StepClima: React.FC<StepProps> = ({ draft, update }) => (
  <div className="space-y-6">
    <StepHeader icon={CloudSun} title="Como estava o tempo?" hint="Toque no desenho do tempo de manhã e de tarde." />

    <div>
      <SectionLabel icon={Sunrise} tone="text-amber-500">Manhã</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {WEATHER_OPTIONS.map((o) => (
          <BigTile key={o.value} icon={o.icon} tone={o.tone} label={o.label} size="lg" isSelected={draft.weatherMorning === o.value} onClick={() => update({ weatherMorning: o.value })} />
        ))}
      </div>
    </div>

    <div>
      <SectionLabel icon={Sunset} tone="text-orange-500">Tarde</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {WEATHER_OPTIONS.map((o) => (
          <BigTile key={o.value} icon={o.icon} tone={o.tone} label={o.label} size="lg" isSelected={draft.weatherAfternoon === o.value} onClick={() => update({ weatherAfternoon: o.value })} />
        ))}
      </div>
    </div>
  </div>
);

/* --------------------------------- 3. Equipe --------------------------------- */

const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function setCount<T extends { id: string; count: number }>(
  list: T[],
  existing: T | undefined,
  count: number,
  create: () => T
): T[] {
  if (existing) return list.map((item) => (item.id === existing.id ? { ...item, count } : item));
  return count > 0 ? [...list, { ...create(), count }] : list;
}

export const StepEquipe: React.FC<StepProps> = ({ draft, update }) => {
  const { workforce, equipment } = draft;
  const totalPeople = workforce.reduce((sum, w) => sum + w.count, 0);

  const roleEntry = (value: string) => workforce.find((w) => matchOption(ROLE_OPTIONS, w.role)?.value === value);
  const extraRoles = workforce.filter((w) => !matchOption(ROLE_OPTIONS, w.role));
  const machineEntry = (value: string) => equipment.find((e) => matchOption(MACHINE_OPTIONS, e.name)?.value === value);
  const extraMachines = equipment.filter((e) => !matchOption(MACHINE_OPTIONS, e.name));

  const setRole = (role: string, entry: WorkforceEntry | undefined, count: number) =>
    update({ workforce: setCount(workforce, entry, count, () => ({ id: newId('w'), role, count, company: 'Próprio' })) });

  const setMachine = (name: string, entry: EquipmentEntry | undefined, count: number) =>
    update({ equipment: setCount(equipment, entry, count, () => ({ id: newId('e'), name, count, operational: true })) });

  const patchWorker = (id: string, patch: Partial<WorkforceEntry>) =>
    update({ workforce: workforce.map((w) => (w.id === id ? { ...w, ...patch } : w)) });

  const patchMachine = (id: string, patch: Partial<EquipmentEntry>) =>
    update({ equipment: equipment.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const machineStatus = (entry: EquipmentEntry | undefined) =>
    entry && entry.count > 0 ? (
      <button
        type="button"
        onClick={() => patchMachine(entry.id, { operational: !entry.operational })}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition active:scale-95 ${
          entry.operational ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
        }`}
      >
        {entry.operational ? <Check className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
        {entry.operational ? 'Funcionando' : 'Quebrada'}
      </button>
    ) : null;

  return (
    <div className="space-y-6">
      <StepHeader icon={Users} title="Quem trabalhou hoje?" hint="Aperte o mais para contar as pessoas e as máquinas." />

      <div>
        <div className="flex items-center justify-between">
          <SectionLabel icon={Users}>Pessoas</SectionLabel>
          <span className="mb-2 px-3 py-1 rounded-full bg-[#121214] text-[#C5A059] text-sm font-black">
            Total: {totalPeople}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ROLE_OPTIONS.map((o) => {
            const entry = roleEntry(o.value);
            return <CounterTile key={o.value} icon={o.icon} tone={o.tone} label={o.label} count={entry?.count || 0} onChange={(c) => setRole(o.value, entry, c)} />;
          })}
          {extraRoles.map((w) => (
            <CounterTile
              key={w.id}
              icon={HelpCircle}
              label={w.role}
              count={w.count}
              onChange={(c) => patchWorker(w.id, { count: c })}
              labelNode={
                <input
                  type="text"
                  value={w.role}
                  onChange={(e) => patchWorker(w.id, { role: e.target.value })}
                  className="w-full min-h-[2.2em] text-center text-sm font-bold rounded-lg border border-slate-300 px-2 outline-none focus:border-[#C5A059]"
                  aria-label="Nome da função"
                />
              }
            />
          ))}
          <button
            type="button"
            onClick={() => update({ workforce: [...workforce, { id: newId('w'), role: 'Outra função', count: 1, company: 'Próprio' }] })}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 p-3 min-h-40 text-slate-500 hover:border-[#C5A059] hover:text-[#C5A059] transition"
          >
            <UserPlus className="w-10 h-10" />
            <span className="text-sm font-bold">Outra função</span>
          </button>
        </div>
      </div>

      <div>
        <SectionLabel icon={Truck}>Máquinas</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MACHINE_OPTIONS.map((o) => {
            const entry = machineEntry(o.value);
            return (
              <CounterTile key={o.value} icon={o.icon} tone={o.tone} label={o.label} count={entry?.count || 0} onChange={(c) => setMachine(o.value, entry, c)}>
                {machineStatus(entry)}
              </CounterTile>
            );
          })}
          {extraMachines.map((m) => (
            <CounterTile key={m.id} icon={Wrench} label={m.name} count={m.count} onChange={(c) => patchMachine(m.id, { count: c })}>
              {machineStatus(m)}
            </CounterTile>
          ))}
        </div>
      </div>
    </div>
  );
};
