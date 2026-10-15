import { AuthUser, ManagedUser } from '../types';
import { ApiError, api } from './api';

const CACHED_USER_KEY = 'diario_obra_session_user';
const FORCE_LOGOUT_KEY = 'diario_obra_force_logout';

export const ROLE_LABELS: Record<AuthUser['role'], string> = {
  coordenador: 'Coordenador',
  engenheiro: 'Eng. responsável',
  cliente: 'Cliente',
};

/* ------------------- last known user (lets the app open offline) ------------------- */

export function readCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function clearCachedUser(): void {
  writeCachedUser(null);
}

function writeCachedUser(user: AuthUser | null): void {
  try {
    if (user) localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(CACHED_USER_KEY);
  } catch {
    /* storage unavailable: the app still works online */
  }
}

/* --------------------------------- session --------------------------------- */

export type SessionResult =
  | { kind: 'user'; user: AuthUser; isOffline: boolean }
  /** `expired`: the server explicitly refused the session (not just a network problem). */
  | { kind: 'login'; expired?: boolean }
  | { kind: 'setup'; expired?: boolean };

/** Decides what to show on startup: the app, the login or the first-time setup. */
export async function restoreSession(): Promise<SessionResult> {
  if (localStorage.getItem(FORCE_LOGOUT_KEY)) {
    // A logout was done offline: finish it before anything else.
    try {
      await api('POST', '/logout');
      localStorage.removeItem(FORCE_LOGOUT_KEY);
      writeCachedUser(null);
    } catch (error) {
      if (!(error instanceof ApiError) || !error.isOffline) localStorage.removeItem(FORCE_LOGOUT_KEY);
      else return { kind: 'login' };
    }
  }

  try {
    const { user } = await api<{ user: AuthUser }>('GET', '/me');
    writeCachedUser(user);
    return { kind: 'user', user, isOffline: false };
  } catch (error) {
    if (error instanceof ApiError && error.isOffline) {
      const cached = readCachedUser();
      return cached ? { kind: 'user', user: cached, isOffline: true } : { kind: 'login' };
    }
    if (error instanceof ApiError && error.isUnauthorized) {
      try {
        const { needsSetup } = await api<{ needsSetup: boolean }>('GET', '/setup');
        return needsSetup ? { kind: 'setup', expired: true } : { kind: 'login', expired: true };
      } catch {
        return { kind: 'login', expired: true };
      }
    }
    return { kind: 'login' };
  }
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { user } = await api<{ user: AuthUser }>('POST', '/login', { email, password });
  writeCachedUser(user);
  return user;
}

export async function setupFirstCoordinator(input: {
  code: string;
  name: string;
  email: string;
  password: string;
}): Promise<AuthUser> {
  const { user } = await api<{ user: AuthUser }>('POST', '/setup', input);
  writeCachedUser(user);
  return user;
}

export async function logout(): Promise<void> {
  try {
    await api('POST', '/logout');
  } catch (error) {
    // Offline: remember to end the session on the server as soon as there is a connection.
    if (error instanceof ApiError && error.isOffline) localStorage.setItem(FORCE_LOGOUT_KEY, '1');
  }
  writeCachedUser(null);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api('POST', '/me/password', { currentPassword, newPassword });
}

/* ------------------------------ user management ----------------------------- */

export async function listUsers(): Promise<ManagedUser[]> {
  const { users } = await api<{ users: ManagedUser[] }>('GET', '/users');
  return users;
}

export interface UserInput {
  name: string;
  email?: string;
  role: AuthUser['role'];
  projectIds: string[];
  password?: string;
  active?: boolean;
}

export async function createUser(input: UserInput & { email: string; password: string }): Promise<ManagedUser> {
  const { user } = await api<{ user: ManagedUser }>('POST', '/users', input);
  return user;
}

export async function updateUser(id: string, input: Partial<UserInput>): Promise<ManagedUser> {
  const { user } = await api<{ user: ManagedUser }>('PUT', `/users/${encodeURIComponent(id)}`, input);
  return user;
}
