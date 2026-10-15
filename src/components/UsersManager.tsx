import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Eye,
  HardHat,
  Loader2,
  LucideIcon,
  Plus,
  Save,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  Wand2,
  X,
} from 'lucide-react';
import { BRAND } from '../brand';
import { ManagedUser, Project, UserRole } from '../types';
import { ROLE_LABELS, createUser, listUsers, updateUser } from '../services/auth';

interface UsersManagerProps {
  projects: Project[];
  currentUserId: string;
  onClose: () => void;
}

const ROLE_OPTIONS: { role: UserRole; icon: LucideIcon; hint: string; tone: string }[] = [
  { role: 'coordenador', icon: ShieldCheck, hint: 'Vê e edita tudo', tone: 'text-[#B89047]' },
  { role: 'engenheiro', icon: HardHat, hint: 'Vê e edita as obras dele', tone: 'text-blue-600' },
  { role: 'cliente', icon: Eye, hint: 'Só vê as obras dele', tone: 'text-emerald-600' },
];

const PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GENERATED_PASSWORD_LENGTH = 10;

function generatePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(GENERATED_PASSWORD_LENGTH));
  return Array.from(bytes, (b) => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]).join('');
}

const inputClass =
  'w-full min-w-0 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-[#C5A059]';

const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Não foi possível concluir.');

/* ----------------------------------- form ---------------------------------- */

interface UserFormProps {
  user: ManagedUser | null;
  projects: Project[];
  isSelf: boolean;
  onSaved: (user: ManagedUser, password: string | null) => void;
  onCancel: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ user, projects, isSelf, onSaved, onCancel }) => {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'engenheiro');
  const [projectIds, setProjectIds] = useState<string[]>(user?.projectIds ?? []);
  const [password, setPassword] = useState('');
  const [active, setActive] = useState(user?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const toggleProject = (id: string) =>
    setProjectIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsBusy(true);
    try {
      if (user) {
        const saved = await updateUser(user.id, {
          name: name.trim(),
          role,
          projectIds,
          active,
          ...(password ? { password } : {}),
        });
        onSaved(saved, password || null);
      } else {
        const saved = await createUser({ name: name.trim(), email: email.trim(), role, projectIds, password });
        onSaved(saved, password);
      }
    } catch (err) {
      setError(errorText(err));
      setIsBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-slate-600">Nome</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className={inputClass} />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-slate-600">E-mail (é o login)</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!!user}
            autoCapitalize="none"
            className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-500`}
          />
        </label>

        <div>
          <span className="mb-1.5 block text-sm font-bold text-slate-600">Função</span>
          <div className="space-y-2">
            {ROLE_OPTIONS.map(({ role: option, icon: Icon, hint, tone }) => {
              const isSelected = role === option;
              const isLocked = isSelf && option !== 'coordenador';
              return (
                <button
                  key={option}
                  type="button"
                  disabled={isLocked}
                  onClick={() => setRole(option)}
                  aria-pressed={isSelected}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition active:scale-[0.99] disabled:opacity-40 ${
                    isSelected ? 'border-[#C5A059] bg-[#C5A059]/15 ring-2 ring-[#C5A059]' : 'border-slate-200 bg-white'
                  }`}
                >
                  <Icon className={`h-9 w-9 shrink-0 ${tone}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-black text-slate-900">{ROLE_LABELS[option]}</span>
                    <span className="block text-sm text-slate-600">{hint}</span>
                  </span>
                  {isSelected && <Check className="h-6 w-6 shrink-0 text-[#B89047]" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>

        {role !== 'coordenador' && (
          <div>
            <span className="mb-1.5 block text-sm font-bold text-slate-600">Obras que ele pode ver</span>
            {projects.length === 0 ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
                Cadastre uma obra primeiro (tela Início).
              </p>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => {
                  const isOn = projectIds.includes(project.id);
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => toggleProject(project.id)}
                      aria-pressed={isOn}
                      className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition active:scale-[0.99] ${
                        isOn ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 ${
                          isOn ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isOn && <Check className="h-5 w-5" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1 break-words text-base font-bold text-slate-900">{project.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div>
          <span className="mb-1.5 block text-sm font-bold text-slate-600">
            {user ? 'Nova senha (deixe vazio para manter)' : 'Senha (mínimo 10)'}
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!user}
              minLength={password || !user ? 10 : undefined}
              autoComplete="off"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setPassword(generatePassword())}
              className="flex h-[52px] w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-slate-200 text-[#B89047] active:scale-95"
              aria-label="Gerar senha"
              title="Gerar senha"
            >
              <Wand2 className="h-6 w-6" />
            </button>
          </div>
        </div>

        {user && (
          <button
            type="button"
            disabled={isSelf}
            onClick={() => setActive((v) => !v)}
            aria-pressed={active}
            className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left disabled:opacity-40 ${
              active ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
            }`}
          >
            <span className={`text-base font-black ${active ? 'text-emerald-700' : 'text-red-700'}`}>
              {active ? 'Acesso liberado' : 'Acesso bloqueado'}
            </span>
            <span className="ml-auto text-sm font-bold text-slate-600">{isSelf ? '(é você)' : 'toque para alterar'}</span>
          </button>
        )}

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" /> {error}
          </p>
        )}
      </div>

      <div className="flex gap-2 border-t border-slate-200 bg-slate-50 p-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border-2 border-slate-200 bg-white px-5 py-3.5 text-base font-bold text-slate-600"
        >
          Voltar
        </button>
        <button
          type="submit"
          disabled={isBusy}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-lg font-black text-white disabled:opacity-60"
        >
          {isBusy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />} SALVAR ACESSO
        </button>
      </div>
    </form>
  );
};

/* ----------------------------------- list ---------------------------------- */

export const UsersManager: React.FC<UsersManagerProps> = ({ projects, currentUserId, onClose }) => {
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ManagedUser | 'new' | null>(null);
  const [created, setCreated] = useState<{ user: ManagedUser; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(async () => {
    try {
      setUsers(await listUsers());
      setLoadError(null);
    } catch (error) {
      setLoadError(errorText(error));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? 'Obra removida';

  const handleSaved = (user: ManagedUser, password: string | null) => {
    setEditing(null);
    setCreated(password ? { user, password } : null);
    setCopied(false);
    void reload();
  };

  const copyCredentials = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(`${BRAND.appName} (${BRAND.company})\nE-mail: ${created.user.email}\nSenha: ${created.password}`);
      setCopied(true);
    } catch {
      /* clipboard blocked: the data is visible on screen */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center gap-3 bg-[#121214] px-4 py-3 text-white">
          <UserRound className="h-8 w-8 text-[#C5A059]" />
          <h2 className="flex-1 text-xl font-black">{editing ? (editing === 'new' ? 'Novo acesso' : 'Editar acesso') : 'Acessos'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            aria-label="Fechar"
          >
            <X className="h-7 w-7" />
          </button>
        </div>

        {editing ? (
          <UserForm
            user={editing === 'new' ? null : editing}
            projects={projects}
            isSelf={editing !== 'new' && editing.id === currentUserId}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {created && (
                <div className="space-y-2 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-3">
                  <p className="text-base font-black text-emerald-800">Acesso salvo para {created.user.name}</p>
                  <p className="break-all text-sm text-slate-700">
                    E-mail: <strong>{created.user.email}</strong>
                    <br />
                    Senha: <strong>{created.password}</strong>
                  </p>
                  <p className="text-sm text-slate-600">Passe estes dados para a pessoa. A senha não aparece de novo.</p>
                  <button
                    type="button"
                    onClick={copyCredentials}
                    className="flex items-center gap-2 rounded-xl border-2 border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800"
                  >
                    {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />} {copied ? 'Copiado' : 'Copiar dados'}
                  </button>
                </div>
              )}

              {loadError && (
                <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                  {loadError}
                </p>
              )}
              {!users && !loadError && (
                <p className="flex items-center justify-center gap-2 py-8 text-slate-500">
                  <Loader2 className="h-6 w-6 animate-spin" /> Carregando…
                </p>
              )}

              {users?.map((u) => {
                const option = ROLE_OPTIONS.find((o) => o.role === u.role)!;
                const Icon = option.icon;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setEditing(u)}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left active:scale-[0.99] ${
                      u.active ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-60'
                    }`}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <Icon className={`h-7 w-7 ${option.tone}`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-black text-slate-900">
                        {u.name}
                        {u.id === currentUserId && <span className="ml-2 text-sm font-bold text-slate-500">(você)</span>}
                      </span>
                      <span className="block truncate text-sm text-slate-500">{u.email}</span>
                      <span className="block text-sm font-bold text-slate-700">
                        {ROLE_LABELS[u.role]}
                        {u.role !== 'coordenador' &&
                          ` • ${
                            u.projectIds.length === 0
                              ? 'sem obras'
                              : u.projectIds.length === 1
                                ? projectName(u.projectIds[0])
                                : `${u.projectIds.length} obras`
                          }`}
                        {!u.active && ' • bloqueado'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-3">
              <button
                type="button"
                onClick={() => {
                  setCreated(null);
                  setEditing('new');
                }}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#C5A059] py-4 text-lg font-black text-white shadow-md active:scale-[0.98]"
              >
                <Plus className="h-7 w-7" strokeWidth={3} /> NOVO ACESSO
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
