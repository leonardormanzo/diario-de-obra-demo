import React from 'react';
import { Bell, CloudCheck, CloudOff, CloudUpload, Loader2, TriangleAlert, UserRound } from 'lucide-react';
import { AuthUser } from '../types';
import { SyncSnapshot } from '../services/cloudSync';
import { AppLogo } from './AppLogo';

interface AppHeaderProps {
  user: AuthUser;
  sync: SyncSnapshot;
  unreadCount: number;
  showBell: boolean;
  onOpenAccount: () => void;
  onOpenNotifications: () => void;
}

const round = 'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-90';

function syncIndicator(sync: SyncSnapshot): { icon: React.ReactNode; label: string } {
  if (sync.phase === 'syncing') {
    return { icon: <Loader2 className="h-6 w-6 animate-spin text-blue-600" />, label: 'Enviando para a nuvem' };
  }
  if (sync.phase === 'offline') return { icon: <CloudOff className="h-6 w-6 text-slate-500" />, label: 'Sem internet' };
  if (sync.phase === 'error') return { icon: <TriangleAlert className="h-6 w-6 text-amber-600" />, label: 'Falha ao enviar' };
  if (sync.pending > 0) {
    return { icon: <CloudUpload className="h-6 w-6 text-amber-600" />, label: `${sync.pending} para enviar` };
  }
  return { icon: <CloudCheck className="h-6 w-6 text-emerald-600" />, label: 'Tudo na nuvem' };
}

export const AppHeader: React.FC<AppHeaderProps> = ({ user, sync, unreadCount, showBell, onOpenAccount, onOpenNotifications }) => {
  const indicator = syncIndicator(sync);
  const firstName = user.name.split(' ')[0];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-2 px-3">
        <div className="min-w-0">
          <span className="sm:hidden">
            <AppLogo size="sm" />
          </span>
          <span className="hidden sm:block">
            <AppLogo size="md" />
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-1">
          <button type="button" onClick={onOpenAccount} className={`${round} hover:bg-slate-100`} aria-label={indicator.label} title={indicator.label}>
            {indicator.icon}
            {sync.pending > 0 && sync.phase !== 'syncing' && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white">
                {sync.pending}
              </span>
            )}
          </button>

          {showBell && (
            <button type="button" onClick={onOpenNotifications} className={`${round} text-slate-600 hover:bg-slate-100`} aria-label="Avisos">
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAccount}
            className="flex h-11 min-w-0 max-w-28 items-center gap-1.5 rounded-full border-2 border-slate-200 bg-white pl-2.5 pr-3 text-sm font-bold text-slate-800 transition active:scale-95"
            aria-label={`Minha conta: ${user.name}`}
          >
            <UserRound className="h-5 w-5 shrink-0 text-slate-500" />
            <span className="truncate">{firstName}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
