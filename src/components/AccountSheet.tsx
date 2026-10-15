import React, { useState } from 'react';
import { CircleCheckBig, CloudUpload, KeyRound, Loader2, LogOut, RefreshCw, TriangleAlert, UserRound, X } from 'lucide-react';
import { AuthUser } from '../types';
import { ROLE_LABELS, changePassword } from '../services/auth';
import { SyncSnapshot } from '../services/cloudSync';

interface AccountSheetProps {
  user: AuthUser;
  sync: SyncSnapshot;
  onSyncNow: () => void;
  onLogout: () => void;
  onClose: () => void;
}

const inputClass =
  'w-full min-w-0 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-[#C5A059]';

const formatTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;

/** Account menu: who is signed in, cloud status, change password and sign out. */
export const AccountSheet: React.FC<AccountSheetProps> = ({ user, sync, onSyncNow, onLogout, onClose }) => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    setIsBusy(true);
    try {
      await changePassword(current, next);
      setFeedback({ tone: 'ok', text: 'Senha alterada.' });
      setCurrent('');
      setNext('');
      setIsChangingPassword(false);
    } catch (error) {
      setFeedback({ tone: 'error', text: error instanceof Error ? error.message : 'Não foi possível trocar a senha.' });
    } finally {
      setIsBusy(false);
    }
  };

  const syncLabel = (() => {
    if (sync.phase === 'syncing') return 'Enviando…';
    if (sync.phase === 'offline') return 'Sem internet';
    if (sync.phase === 'error') return 'Falha ao enviar';
    if (sync.pending > 0) return `${sync.pending} para enviar`;
    return `Tudo na nuvem${formatTime(sync.lastSyncAt) ? ` • ${formatTime(sync.lastSyncAt)}` : ''}`;
  })();
  const isAllSynced = sync.phase === 'idle' && sync.pending === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-lg max-h-[90vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 bg-[#121214] px-4 py-3 text-white">
          <UserRound className="h-8 w-8 text-[#C5A059]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black leading-tight">{user.name}</p>
            <p className="truncate text-sm text-white/70">{ROLE_LABELS[user.role]}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            aria-label="Fechar"
          >
            <X className="h-7 w-7" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <p className="truncate text-sm font-semibold text-slate-500">{user.email}</p>

          <div
            className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${
              isAllSynced ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
            }`}
          >
            {isAllSynced ? (
              <CircleCheckBig className="h-8 w-8 shrink-0 text-emerald-600" />
            ) : sync.phase === 'error' ? (
              <TriangleAlert className="h-8 w-8 shrink-0 text-amber-600" />
            ) : (
              <CloudUpload className="h-8 w-8 shrink-0 text-amber-600" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-base font-black text-slate-900">{syncLabel}</p>
              {sync.phase === 'error' && sync.error && <p className="truncate text-sm text-slate-600">{sync.error}</p>}
            </div>
            <button
              type="button"
              onClick={onSyncNow}
              disabled={sync.phase === 'syncing'}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition active:scale-90 disabled:opacity-40"
              aria-label="Sincronizar agora"
            >
              {sync.phase === 'syncing' ? <Loader2 className="h-6 w-6 animate-spin" /> : <RefreshCw className="h-6 w-6" />}
            </button>
          </div>

          {feedback && (
            <p
              className={`rounded-xl px-3 py-2 text-sm font-bold ${
                feedback.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {feedback.text}
            </p>
          )}

          {isChangingPassword ? (
            <form onSubmit={submitPassword} className="space-y-3 rounded-2xl border-2 border-slate-200 p-3">
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-600">Senha atual</span>
                <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-600">Nova senha (mínimo 10)</span>
                <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required minLength={10} className={inputClass} />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(false)}
                  className="flex-1 rounded-2xl border-2 border-slate-200 py-3 text-base font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex-1 rounded-2xl bg-[#C5A059] py-3 text-base font-black text-white disabled:opacity-60"
                >
                  Salvar senha
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                setIsChangingPassword(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 py-3.5 text-base font-bold text-slate-700 active:scale-[0.98]"
            >
              <KeyRound className="h-6 w-6 text-[#C5A059]" /> Trocar senha
            </button>
          )}
        </div>

        <div className="border-t border-slate-200 bg-slate-50 p-3">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-red-200 bg-white py-3.5 text-lg font-black text-red-600 active:scale-[0.98]"
          >
            <LogOut className="h-6 w-6" /> Sair
          </button>
        </div>
      </div>
    </div>
  );
};
