import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, LogIn, TriangleAlert } from 'lucide-react';
import { AuthUser } from '../types';
import { login, setupFirstCoordinator } from '../services/auth';
import { AppLogo } from './AppLogo';

interface LoginScreenProps {
  /** `setup` is the very first run: creates the coordinator account. */
  mode: 'login' | 'setup';
  onSuccess: (user: AuthUser) => void;
}

const inputClass =
  'w-full min-w-0 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none focus:border-[#C5A059]';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-bold text-slate-600">{label}</span>
    {children}
  </label>
);

export const LoginScreen: React.FC<LoginScreenProps> = ({ mode, onSuccess }) => {
  const isSetup = mode === 'setup';
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (isSetup && password !== confirm) {
      setError('As duas senhas não são iguais.');
      return;
    }

    setIsBusy(true);
    try {
      const user = isSetup
        ? await setupFirstCoordinator({ code: code.trim(), name: name.trim(), email: email.trim(), password })
        : await login(email.trim(), password);
      onSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-slate-200 bg-white px-5 py-6">
          <AppLogo size="lg" />
          <p className="text-sm font-bold uppercase tracking-widest text-[#B89047]">Registro diário de obra</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-3xl border-2 border-slate-200 bg-white p-5">
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            {isSetup ? <KeyRound className="h-7 w-7 text-[#C5A059]" /> : <LogIn className="h-7 w-7 text-[#C5A059]" />}
            {isSetup ? 'Primeiro acesso' : 'Entrar'}
          </h1>
          {isSetup && (
            <p className="text-sm text-slate-600">
              Crie o acesso do <strong>coordenador</strong>. Você vai precisar do código de instalação.
            </p>
          )}

          {isSetup && (
            <>
              <Field label="Código de instalação">
                <input type="text" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" required className={inputClass} />
              </Field>
              <Field label="Seu nome">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required minLength={2} className={inputClass} />
              </Field>
            </>
          )}

          <Field label="E-mail">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              required
              className={inputClass}
            />
          </Field>

          <Field label={isSetup ? 'Senha (mínimo 10 caracteres)' : 'Senha'}>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSetup ? 'new-password' : 'current-password'}
                required
                minLength={isSetup ? 10 : undefined}
                className={`${inputClass} pr-14`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-slate-500"
                aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
              </button>
            </div>
          </Field>

          {isSetup && (
            <Field label="Repita a senha">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                className={inputClass}
              />
            </Field>
          )}

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isBusy}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#C5A059] py-4 text-lg font-black text-white shadow-md transition hover:bg-[#B89047] active:scale-[0.98] disabled:opacity-60"
          >
            {isBusy ? <Loader2 className="h-7 w-7 animate-spin" /> : <LogIn className="h-7 w-7" />}
            {isSetup ? 'CRIAR ACESSO' : 'ENTRAR'}
          </button>
        </form>

        {!isSetup && (
          <p className="text-center text-sm text-slate-500">
            Não tem acesso? Peça ao coordenador da obra.
          </p>
        )}
      </div>
    </div>
  );
};
