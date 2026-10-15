import {
  AppWindow,
  AudioWaveform,
  Ban,
  BrickWall,
  Building2,
  Camera,
  CircleCheckBig,
  Cloud,
  CloudRain,
  Construction,
  Container,
  Drill,
  Droplets,
  Grid3x3,
  Hammer,
  HardHat,
  Hourglass,
  LucideIcon,
  OctagonX,
  PaintRoller,
  PanelsTopLeft,
  PlugZap,
  Shovel,
  Sparkles,
  Sun,
  Tractor,
  Truck,
  Umbrella,
  UserCog,
  Waves,
  Wrench,
  Zap,
} from 'lucide-react';
import { PhotoRecord, TaskStatus, WeatherCondition } from '../../types';

export interface IconOption<T extends string = string> {
  value: T;
  label: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon color. */
  tone: string;
}

export const WEATHER_OPTIONS: IconOption<WeatherCondition>[] = [
  { value: 'ensolarado', label: 'Sol', icon: Sun, tone: 'text-amber-500' },
  { value: 'nublado', label: 'Nublado', icon: Cloud, tone: 'text-slate-500' },
  { value: 'chuvoso', label: 'Chuva', icon: CloudRain, tone: 'text-blue-500' },
  { value: 'impraticavel', label: 'Não deu pra trabalhar', icon: Ban, tone: 'text-red-500' },
];

/** Workforce roles. `aliases` match names already saved in older RDOs. */
export const ROLE_OPTIONS: (IconOption & { aliases: string[] })[] = [
  { value: 'Encarregado', label: 'Encarregado', icon: UserCog, tone: 'text-amber-600', aliases: ['encarregado geral', 'mestre', 'mestre de obras'] },
  { value: 'Pedreiro', label: 'Pedreiro', icon: BrickWall, tone: 'text-orange-600', aliases: ['pedreiros'] },
  { value: 'Servente', label: 'Servente', icon: Shovel, tone: 'text-stone-600', aliases: ['serventes', 'ajudante', 'ajudantes'] },
  { value: 'Carpinteiro', label: 'Carpinteiro', icon: Hammer, tone: 'text-yellow-700', aliases: ['carpinteiros'] },
  { value: 'Armador', label: 'Armador', icon: Grid3x3, tone: 'text-zinc-600', aliases: ['armadores', 'ferreiro'] },
  { value: 'Eletricista', label: 'Eletricista', icon: Zap, tone: 'text-yellow-500', aliases: ['eletricistas'] },
  { value: 'Encanador', label: 'Encanador', icon: Droplets, tone: 'text-blue-500', aliases: ['encanadores', 'bombeiro hidráulico'] },
  { value: 'Pintor', label: 'Pintor', icon: PaintRoller, tone: 'text-pink-500', aliases: ['pintores'] },
];

export const MACHINE_OPTIONS: (IconOption & { aliases: string[] })[] = [
  { value: 'Betoneira', label: 'Betoneira', icon: Container, tone: 'text-orange-500', aliases: ['betoneira 400l'] },
  { value: 'Andaime', label: 'Andaime', icon: Construction, tone: 'text-amber-600', aliases: ['andaimes', 'andaimes fachadeiros (m²)'] },
  { value: 'Caminhão', label: 'Caminhão', icon: Truck, tone: 'text-slate-600', aliases: ['caminhao', 'caminhão basculante'] },
  { value: 'Retroescavadeira', label: 'Retro / Trator', icon: Tractor, tone: 'text-yellow-600', aliases: ['trator', 'escavadeira'] },
  { value: 'Martelete / Furadeira', label: 'Martelete', icon: Drill, tone: 'text-zinc-600', aliases: ['furadeira', 'martelete'] },
  { value: 'Vibrador de Concreto', label: 'Vibrador', icon: AudioWaveform, tone: 'text-indigo-500', aliases: ['vibrador'] },
  { value: 'Gerador', label: 'Gerador', icon: PlugZap, tone: 'text-emerald-600', aliases: [] },
];

/** Task categories, using the same names as the deadline service and PDF. */
export const CATEGORY_OPTIONS: IconOption[] = [
  { value: 'Concreto / Estrutura', label: 'Concreto', icon: Building2, tone: 'text-slate-600' },
  { value: 'Alvenaria & Vedação', label: 'Parede / Tijolo', icon: BrickWall, tone: 'text-orange-600' },
  { value: 'Instalações Hidráulicas', label: 'Água / Esgoto', icon: Droplets, tone: 'text-blue-500' },
  { value: 'Instalações Elétricas', label: 'Elétrica', icon: Zap, tone: 'text-yellow-500' },
  { value: 'Impermeabilização', label: 'Impermeabilização', icon: Umbrella, tone: 'text-cyan-600' },
  { value: 'Gesso & Drywall', label: 'Gesso', icon: PanelsTopLeft, tone: 'text-stone-500' },
  { value: 'Revestimento & Pisos', label: 'Piso / Azulejo', icon: Grid3x3, tone: 'text-teal-600' },
  { value: 'Pintura & Vernizes', label: 'Pintura', icon: PaintRoller, tone: 'text-pink-500' },
  { value: 'Esquadrias & Vidros', label: 'Janela / Porta', icon: AppWindow, tone: 'text-sky-600' },
  { value: 'Terraplenagem & Fundações', label: 'Terra / Fundação', icon: Shovel, tone: 'text-amber-700' },
  { value: 'Segurança do Trabalho (SST)', label: 'Segurança', icon: HardHat, tone: 'text-emerald-600' },
  { value: 'Infraestrutura & Drenagem', label: 'Drenagem', icon: Waves, tone: 'text-blue-700' },
  { value: 'Limpeza & Entrega', label: 'Limpeza', icon: Sparkles, tone: 'text-violet-500' },
  { value: 'Demolição', label: 'Demolição', icon: Hammer, tone: 'text-red-600' },
  { value: 'Outros / Geral', label: 'Outro serviço', icon: Wrench, tone: 'text-slate-500' },
];

export const STATUS_OPTIONS: (IconOption<TaskStatus> & { active: string })[] = [
  { value: 'pendente', label: 'Não começou', icon: Hourglass, tone: 'text-slate-500', active: 'bg-slate-600 text-white border-slate-600' },
  { value: 'em_andamento', label: 'Fazendo', icon: Hammer, tone: 'text-amber-600', active: 'bg-amber-500 text-slate-950 border-amber-500' },
  { value: 'concluida', label: 'Pronto', icon: CircleCheckBig, tone: 'text-emerald-600', active: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'bloqueada', label: 'Parado', icon: OctagonX, tone: 'text-red-600', active: 'bg-red-600 text-white border-red-600' },
];

export const PHOTO_TAG_OPTIONS: IconOption<PhotoRecord['tag']>[] = [
  { value: 'Estrutura', label: 'Estrutura', icon: Building2, tone: 'text-slate-600' },
  { value: 'Alvenaria', label: 'Parede', icon: BrickWall, tone: 'text-orange-600' },
  { value: 'Instalações', label: 'Instalações', icon: Zap, tone: 'text-yellow-500' },
  { value: 'Acabamento', label: 'Acabamento', icon: PaintRoller, tone: 'text-pink-500' },
  { value: 'Segurança', label: 'Segurança', icon: HardHat, tone: 'text-emerald-600' },
  { value: 'Geral', label: 'Geral', icon: Camera, tone: 'text-slate-500' },
];

export const PROGRESS_STEPS = [25, 50, 75, 100];

const normalize = (text: string) => text.trim().toLowerCase();

/** Finds the option that matches a saved name (label, value or alias). */
export function matchOption<T extends { value: string; aliases: string[] }>(
  options: T[],
  name: string
): T | undefined {
  const key = normalize(name);
  return options.find((o) => normalize(o.value) === key || o.aliases.includes(key));
}

export function categoryOption(category: string): IconOption {
  return CATEGORY_OPTIONS.find((c) => c.value === category) || CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1];
}
