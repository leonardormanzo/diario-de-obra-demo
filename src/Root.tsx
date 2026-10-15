import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthUser } from './types';
import App from './App';
import { LoginScreen } from './components/LoginScreen';
import { AppLogo } from './components/AppLogo';
import { clearCachedUser, logout, restoreSession } from './services/auth';
import { adoptLocalCache, countPending, getSnapshot, hasForeignPending, subscribe, wipeLocalData } from './services/cloudSync';

type Screen =
  | { kind: 'loading' }
  | { kind: 'login'; isSetup: boolean }
  | { kind: 'app'; user: AuthUser };

/** Decides what to show: loading, login / first access, or the app for the signed-in user. */
export default function Root() {
  const [screen, setScreen] = useState<Screen>({ kind: 'loading' });
  const sync = useSyncExternalStore(subscribe, getSnapshot);

  const enter = useCallback(async (user: AuthUser): Promise<boolean> => {
    if (hasForeignPending(user.id)) {
      const proceed = window.confirm(
        'Este aparelho tem RDOs de outra pessoa que ainda não foram enviados. Entrar agora vai apagá-los. Continuar?'
      );
      if (!proceed) {
        await logout();
        return false;
      }
    }
    await adoptLocalCache(user.id);
    setScreen({ kind: 'app', user });
    return true;
  }, []);

  useEffect(() => {
    let isCancelled = false;
    restoreSession().then(async (result) => {
      if (isCancelled) return;
      if (result.kind === 'user') {
        await enter(result.user);
        return;
      }
      // Session refused by the server: do not leave company data on this phone (unless it has unsent work).
      if (result.expired && countPending() === 0) {
        clearCachedUser();
        await wipeLocalData();
      }
      if (!isCancelled) setScreen({ kind: 'login', isSetup: result.kind === 'setup' });
    });
    return () => {
      isCancelled = true;
    };
  }, [enter]);

  // The server refused the session while syncing (expired, blocked or password changed).
  useEffect(() => {
    if (sync.phase !== 'signed-out' || screen.kind !== 'app') return;
    void (async () => {
      if (countPending() === 0) {
        clearCachedUser();
        await wipeLocalData();
      }
      setScreen({ kind: 'login', isSetup: false });
    })();
  }, [sync.phase, screen.kind]);

  const handleLogout = async () => {
    const pending = countPending();
    if (
      pending > 0 &&
      !window.confirm(
        `Ainda há ${pending} item(ns) que não foram enviados para a nuvem. Se sair agora, eles serão perdidos. Sair mesmo assim?`
      )
    ) {
      return;
    }
    await logout();
    await wipeLocalData();
    setScreen({ kind: 'login', isSetup: false });
  };

  if (screen.kind === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100">
        <AppLogo size="lg" />
        <Loader2 className="h-8 w-8 animate-spin text-[#C5A059]" />
      </div>
    );
  }

  if (screen.kind === 'login') {
    return <LoginScreen mode={screen.isSetup ? 'setup' : 'login'} onSuccess={(user) => void enter(user)} />;
  }

  return <App key={screen.user.id} user={screen.user} onLogout={() => void handleLogout()} />;
}
