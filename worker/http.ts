export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

const BASE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...BASE_HEADERS, ...extraHeaders } });
}

const MAX_BYTES_PER_CHAR = 4; // UTF-8 upper bound

/** Reads the body but stops as soon as it is larger than allowed (also for chunked uploads). */
async function readBodyLimited(request: Request, maxChars: number): Promise<string> {
  const maxBytes = maxChars * MAX_BYTES_PER_CHAR;
  if (Number(request.headers.get('content-length') || 0) > maxBytes) throw new HttpError(413, 'Conteúdo grande demais.');
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, 'Conteúdo grande demais.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  chunks.forEach((chunk) => {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return new TextDecoder().decode(bytes);
}

export async function readJson(request: Request, maxChars: number): Promise<Record<string, unknown>> {
  const body = await readBodyLimited(request, maxChars);
  if (body.length > maxChars) throw new HttpError(413, 'Conteúdo grande demais.');
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('not an object');
    return parsed as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'Dados inválidos.');
  }
}

export function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

export const SESSION_COOKIE = 'diario_session';
export const SESSION_DAYS = 30;

export function sessionCookie(token: string, isSecure: boolean): string {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${isSecure ? '; Secure' : ''}`;
}

export function clearSessionCookie(isSecure: boolean): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${isSecure ? '; Secure' : ''}`;
}

/** Blocks cross-site writes: the Origin of a state-changing request must be this site. */
export function assertSameOrigin(request: Request, url: URL): void {
  if (request.method === 'GET' || request.method === 'HEAD') return;

  if (request.headers.get('sec-fetch-site') === 'cross-site') throw new HttpError(403, 'Origem não permitida.');

  const origin = request.headers.get('origin');
  if (origin === null) return; // not a browser cross-site request; cookies are SameSite=Strict anyway
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    /* "null" or malformed origin */
  }
  if (originHost !== url.host) throw new HttpError(403, 'Origem não permitida.');
}

const ID_PATTERN = /^[A-Za-z0-9_.:-]{1,80}$/;

export function assertId(value: unknown, label = 'id'): string {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) throw new HttpError(400, `Identificador inválido (${label}).`);
  return value;
}

export function text(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== 'string') throw new HttpError(400, `${label} é obrigatório.`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new HttpError(400, min > 0 ? `${label} precisa ter de ${min} a ${max} caracteres.` : `${label} muito longo.`);
  }
  return trimmed;
}

export function optionalText(value: unknown, label: string, max: number): string {
  if (value === undefined || value === null || value === '') return '';
  return text(value, label, 0, max);
}
