import { HttpError, assertId, optionalText, text } from './http';

const MAX_LIST_ITEMS = 100;
const MAX_FUTURE_MS = 5 * 60_000; // client clocks may be a little ahead; never trust far-future dates
const PHOTO_DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
const MAX_SIGNATURE_CHARS = 200_000;
export const MAX_PHOTOS_PER_LOG = 60;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WEATHER = ['ensolarado', 'nublado', 'chuvoso', 'impraticavel'];
const PROJECT_STATUS = ['em_andamento', 'concluido', 'pausado'];

export interface ProjectRecord {
  id: string;
  code: string;
  name: string;
  address: string;
  artRrt: string;
  engineerInCharge: string;
  engineerEmail: string;
  clientName: string;
  clientEmail: string;
  startDate: string;
  expectedEndDate: string;
  progressPercent: number;
  status: string;
}

export interface LogRecord {
  id: string;
  projectId: string;
  updatedAt: string;
  photos: Array<{ id: string; caption: string; tag: string; timestamp: string; url: string }>;
  [field: string]: unknown;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function list(value: unknown, label: string, max = MAX_LIST_ITEMS): unknown[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > max) throw new HttpError(400, `Lista inválida (${label}).`);
  return value;
}

function clampPercent(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function sanitizeProject(body: Record<string, unknown>, id: string): ProjectRecord {
  return {
    id,
    code: optionalText(body.code, 'Código', 40),
    name: text(body.name, 'Nome da obra', 1, 120),
    address: optionalText(body.address, 'Endereço', 200),
    artRrt: optionalText(body.artRrt, 'ART/RRT', 80),
    engineerInCharge: optionalText(body.engineerInCharge, 'Engenheiro', 120),
    engineerEmail: optionalText(body.engineerEmail, 'E-mail do engenheiro', 120),
    clientName: optionalText(body.clientName, 'Cliente', 120),
    clientEmail: optionalText(body.clientEmail, 'E-mail do cliente', 120),
    startDate: optionalText(body.startDate, 'Início', 20),
    expectedEndDate: optionalText(body.expectedEndDate, 'Previsão', 20),
    progressPercent: clampPercent(body.progressPercent),
    status: PROJECT_STATUS.includes(body.status as string) ? (body.status as string) : 'em_andamento',
  };
}

function validIso(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value.length > 40) return fallback;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return fallback;
  // A far-future timestamp would make the RDO impossible to edit again (newest edit wins).
  return new Date(Math.min(time, Date.now() + MAX_FUTURE_MS)).toISOString();
}

function sanitizeSignature(value: unknown, now: string): Record<string, unknown> | undefined {
  if (!isObject(value)) return undefined;
  const image = typeof value.signatureDataUrl === 'string' ? value.signatureDataUrl : '';
  if (image.length > MAX_SIGNATURE_CHARS || !PHOTO_DATA_URL.test(image)) return undefined;
  return {
    signatureDataUrl: image,
    signerName: optionalText(value.signerName, 'Assinante', 120),
    signerEmail: optionalText(value.signerEmail, 'E-mail do assinante', 120),
    signerRole: optionalText(value.signerRole, 'Função do assinante', 120),
    creaArt: optionalText(value.creaArt, 'ART/RRT', 80),
    signedAt: validIso(value.signedAt, now),
    verificationHash: optionalText(value.verificationHash, 'Código', 128),
  };
}

/** Keeps only the known RDO fields. Photo pixels are stored separately, never inside the RDO. */
export function sanitizeLog(body: Record<string, unknown>, id: string, userEmail: string): LogRecord {
  const projectId = assertId(body.projectId, 'obra');
  if (typeof body.executionDate !== 'string' || !DATE_PATTERN.test(body.executionDate)) {
    throw new HttpError(400, 'Data do RDO inválida.');
  }
  const now = new Date().toISOString();

  const photos = list(body.photos, 'fotos', MAX_PHOTOS_PER_LOG).map((raw) => {
    if (!isObject(raw)) throw new HttpError(400, 'Foto inválida.');
    return {
      id: assertId(raw.id, 'foto'),
      caption: optionalText(raw.caption, 'Legenda', 200),
      tag: optionalText(raw.tag, 'Tipo da foto', 30) || 'Geral',
      timestamp: optionalText(raw.timestamp, 'Hora', 20),
      url: '',
    };
  });

  const rdoNumber = typeof body.rdoNumber === 'number' && Number.isFinite(body.rdoNumber) ? Math.trunc(body.rdoNumber) : 1;

  return {
    id,
    projectId,
    projectName: optionalText(body.projectName, 'Obra', 120),
    rdoNumber: Math.max(0, rdoNumber),
    date: typeof body.date === 'string' && DATE_PATTERN.test(body.date) ? body.date : body.executionDate,
    executionDate: body.executionDate,
    engineerInCharge: optionalText(body.engineerInCharge, 'Engenheiro', 120),
    creaArt: optionalText(body.creaArt, 'ART/RRT', 80),
    weatherMorning: WEATHER.includes(body.weatherMorning as string) ? body.weatherMorning : 'ensolarado',
    weatherAfternoon: WEATHER.includes(body.weatherAfternoon as string) ? body.weatherAfternoon : 'ensolarado',
    workforce: list(body.workforce, 'equipe'),
    equipment: list(body.equipment, 'máquinas'),
    tasks: list(body.tasks, 'serviços'),
    generalNotes: optionalText(body.generalNotes, 'Notas', 4000),
    occurrences: optionalText(body.occurrences, 'Ocorrências', 4000),
    safetyAccidents: body.safetyAccidents === true,
    safetyNotes: optionalText(body.safetyNotes, 'Segurança', 2000),
    photos,
    digitalSignature: sanitizeSignature(body.digitalSignature, now),
    status: body.status === 'rascunho' ? 'rascunho' : 'aprovado',
    syncStatus: 'synced',
    exportedPdfName: optionalText(body.exportedPdfName, 'Arquivo', 200) || undefined,
    createdAt: validIso(body.createdAt, now),
    updatedAt: validIso(body.updatedAt, now),
    createdByEmail: userEmail, // always the real author, never what the client claims
  };
}

export const MAX_PHOTO_CHARS = 1_500_000;

export function assertPhotoDataUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > MAX_PHOTO_CHARS || !PHOTO_DATA_URL.test(value)) {
    throw new HttpError(400, 'Foto inválida ou grande demais.');
  }
  return value;
}
