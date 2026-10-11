import type { StoredUpload } from './uploads';

// Browser-only persistence for officer uploads (CSV text and optional PDF blob).
// Data stays on this device; nothing is sent to a server.

const DB_NAME = 'visarjan-ghat-watch';
const STORE = 'uploads';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser cannot store uploaded reports (IndexedDB unavailable).'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open upload storage.'));
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Upload storage request failed.'));
    });
  } finally {
    db.close();
  }
}

export async function listUploads(): Promise<StoredUpload[]> {
  const uploads = await run<StoredUpload[]>('readonly', (store) => store.getAll() as IDBRequest<StoredUpload[]>);
  return uploads.sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
}

export async function saveUpload(upload: StoredUpload): Promise<void> {
  await run('readwrite', (store) => store.put(upload));
}

export async function deleteUpload(id: string): Promise<void> {
  await run('readwrite', (store) => store.delete(id));
}
