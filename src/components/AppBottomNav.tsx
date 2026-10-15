import React from 'react';
import { Clock, Home, LucideIcon, NotebookPen, UsersRound } from 'lucide-react';

export type NavTarget = 'dashboard' | 'logs' | 'deadlines' | 'users';

interface AppBottomNavProps {
  active: NavTarget;
  logsCount: number;
  lateCount: number;
  /** The "Acessos" tab is only for the coordinator. */
  showUsers: boolean;
  onNavigate: (target: NavTarget) => void;
}

interface NavItem {
  target: NavTarget;
  label: string;
  icon: LucideIcon;
  badge?: number;
  badgeTone?: string;
}

/** Fixed bottom navigation with big icons (app-style, thumb reachable). */
export const AppBottomNav: React.FC<AppBottomNavProps> = ({ active, logsCount, lateCount, showUsers, onNavigate }) => {
  const allItems: NavItem[] = [
    { target: 'dashboard', label: 'Início', icon: Home },
    { target: 'logs', label: 'Diários', icon: NotebookPen, badge: logsCount, badgeTone: 'bg-[#C5A059]' },
    { target: 'deadlines', label: 'Prazos', icon: Clock, badge: lateCount, badgeTone: 'bg-red-600' },
    { target: 'users', label: 'Acessos', icon: UsersRound },
  ];
  const items = allItems.filter((item) => item.target !== 'users' || showUsers);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação principal"
    >
      <div className={`max-w-2xl mx-auto grid ${items.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {items.map(({ target, label, icon: Icon, badge, badgeTone }) => {
          const isActive = active === target;
          return (
            <button
              key={target}
              type="button"
              onClick={() => onNavigate(target)}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center gap-1 py-2.5 active:scale-95 transition"
            >
              <span
                className={`relative flex items-center justify-center w-14 h-9 rounded-full transition ${
                  isActive ? 'bg-[#121214] text-[#C5A059]' : 'text-slate-500'
                }`}
              >
                <Icon className="w-7 h-7" />
                {!!badge && badge > 0 && (
                  <span
                    className={`absolute -top-1 right-0 min-w-5 h-5 px-1 rounded-full ${badgeTone} text-white text-[11px] font-black flex items-center justify-center`}
                  >
                    {badge}
                  </span>
                )}
              </span>
              <span className={`text-xs font-bold ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
