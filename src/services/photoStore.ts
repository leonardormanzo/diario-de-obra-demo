/**
 * Photo storage in IndexedDB.
 *
 * localStorage only holds ~5 MB, which fits about 20 photos. Photos are kept in
 * IndexedDB (hundreds of MB) and mirrored in an in-memory cache, so the rest of
 * the app can keep reading `log.photos[i].url` synchronously.
 *
 * The same database keeps the RDO being filled (draft), so nothing is lost if
 * the phone reloads the page.
 */

const DB_NAME = 'diario-de-obra';
const DB_VERSION = 1;
const PHOTOS = 'photos';
const DRAFTS = 'drafts';
const DRAFT_KEY = 'current';

interface StoredPhoto {
  id: string;
  url: string;
}

const cache = new Map<string, string>();
let db: IDBDatabase | null = null;
let hasWarnedWriteFailure = false;

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PHOTOS)) database.createObjectStore(PHOTOS, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(DRAFTS)) database.createObjectStore(DRAFTS);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/** Opens the database and loads all photos into memory. Call once before rendering. */
export async function initPhotoStore(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    db = await openDb();
    const all = await requestToPromise<StoredPhoto[]>(db.transaction(PHOTOS).objectStore(PHOTOS).getAll());
    all.forEach((p) => cache.set(p.id, p.url));
    // Ask the browser not to evict site data when the phone is low on space.
    navigator.storage?.persist?.().catch(() => undefined);
  } catch (error) {
    console.error('IndexedDB indisponível, fotos ficarão no localStorage:', error);
    db = null;
  }
}

export const isPhotoStoreReady = (): boolean => db !== null;

export const getPhotoUrl = (id: string): string | undefined => cache.get(id);

const warnWriteFailure = (error: unknown) => {
  console.error('Falha ao gravar fotos no aparelho:', error);
  if (hasWarnedWriteFailure) return;
  hasWarnedWriteFailure = true;
  window.alert('Não foi possível guardar as fotos: a memória do aparelho está cheia. Envie os RDOs ao OneDrive e apague fotos antigas.');
};

/** Saves new or changed photos and removes the ones no longer referenced by any RDO. */
export function syncPhotos(photos: StoredPhoto[]): void {
  if (!db) return;
  const keepIds = new Set(photos.map((p) => p.id));
  const tx = db.transaction(PHOTOS, 'readwrite');
  const store = tx.objectStore(PHOTOS);

  photos.forEach((p) => {
    if (p.url && cache.get(p.id) !== p.url) {
      cache.set(p.id, p.url);
      store.put(p);
    }
  });
  Array.from(cache.keys()).forEach((id) => {
    if (!keepIds.has(id)) {
      cache.delete(id);
      store.delete(id);
    }
  });
  tx.onerror = () => warnWriteFailure(tx.error);
  tx.onabort = () => warnWriteFailure(tx.error);
}

export const hasPhoto = (id: string): boolean => cache.has(id);

/** Adds one photo without touching the others (used when downloading from the cloud). */
export async function putPhoto(id: string, url: string): Promise<void> {
  cache.set(id, url);
  if (!db) return;
  try {
    db.transaction(PHOTOS, 'readwrite').objectStore(PHOTOS).put({ id, url });
  } catch (error) {
    console.error('Falha ao guardar foto baixada:', error);
  }
}

/** Removes every photo and the draft from this device (used when another user signs in). */
export async function clearPhotoStore(): Promise<void> {
  cache.clear();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db!.transaction([PHOTOS, DRAFTS], 'readwrite');
    tx.objectStore(PHOTOS).clear();
    tx.objectStore(DRAFTS).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
}

/* ------------------------------ RDO draft ------------------------------ */

export async function saveDraft(value: unknown): Promise<void> {
  if (!db) return;
  try {
    const tx = db.transaction(DRAFTS, 'readwrite');
    tx.objectStore(DRAFTS).put(value, DRAFT_KEY);
  } catch (error) {
    console.error('Falha ao guardar rascunho do RDO:', error);
  }
}

export async function loadDraft<T>(): Promise<T | null> {
  if (!db) return null;
  try {
    const value = await requestToPromise(db.transaction(DRAFTS).objectStore(DRAFTS).get(DRAFT_KEY));
    return (value as T) ?? null;
  } catch (error) {
    console.error('Falha ao ler rascunho do RDO:', error);
    return null;
  }
}

export async function clearDraft(): Promise<void> {
  if (!db) return;
  try {
    db.transaction(DRAFTS, 'readwrite').objectStore(DRAFTS).delete(DRAFT_KEY);
  } catch (error) {
    console.error('Falha ao apagar rascunho do RDO:', error);
  }
}
