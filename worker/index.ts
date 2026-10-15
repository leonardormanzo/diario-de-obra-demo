import { Env } from './env';
import { HttpError, assertSameOrigin, json } from './http';
import { RequestContext, changeOwnPassword, getSetupStatus, login, logout, me, setup } from './routes/account';
import { deleteLog, deleteProject, getPhoto, putLog, putPhoto, putProject, sync } from './routes/data';
import { createUser, listUsers, updateUser } from './routes/users';

type Handler = (ctx: RequestContext, ...params: string[]) => Promise<Response>;

interface Route {
  method: string;
  pattern: RegExp;
  handler: Handler;
}

const ROUTES: Route[] = [
  { method: 'GET', pattern: /^\/api\/setup$/, handler: getSetupStatus },
  { method: 'POST', pattern: /^\/api\/setup$/, handler: setup },
  { method: 'POST', pattern: /^\/api\/login$/, handler: login },
  { method: 'POST', pattern: /^\/api\/logout$/, handler: logout },
  { method: 'GET', pattern: /^\/api\/me$/, handler: me },
  { method: 'POST', pattern: /^\/api\/me\/password$/, handler: changeOwnPassword },

  { method: 'GET', pattern: /^\/api\/users$/, handler: listUsers },
  { method: 'POST', pattern: /^\/api\/users$/, handler: createUser },
  { method: 'PUT', pattern: /^\/api\/users\/([^/]+)$/, handler: updateUser },

  { method: 'GET', pattern: /^\/api\/sync$/, handler: sync },
  { method: 'PUT', pattern: /^\/api\/projects\/([^/]+)$/, handler: putProject },
  { method: 'DELETE', pattern: /^\/api\/projects\/([^/]+)$/, handler: deleteProject },
  { method: 'PUT', pattern: /^\/api\/logs\/([^/]+)$/, handler: putLog },
  { method: 'DELETE', pattern: /^\/api\/logs\/([^/]+)$/, handler: deleteLog },
  { method: 'PUT', pattern: /^\/api\/photos\/([^/]+)$/, handler: putPhoto },
  { method: 'GET', pattern: /^\/api\/photos\/([^/]+)$/, handler: getPhoto },
];

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  assertSameOrigin(request, url);

  const pathMatches = ROUTES.filter((route) => route.pattern.test(url.pathname));
  if (pathMatches.length === 0) throw new HttpError(404, 'Não encontrado.');

  const route = pathMatches.find((r) => r.method === request.method);
  if (!route) throw new HttpError(405, 'Método não permitido.');

  let params: string[];
  try {
    params = (route.pattern.exec(url.pathname) ?? []).slice(1).map(decodeURIComponent);
  } catch {
    throw new HttpError(400, 'Endereço inválido.');
  }
  return route.handler({ request, url, env }, ...params);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handle(request, env);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      console.error('Erro inesperado na API:', error);
      return json({ error: 'Erro interno. Tente novamente.' }, 500);
    }
  },
};
