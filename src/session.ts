/**
 * 開いたファイルを「このタブの間だけ」保持します。
 * - タブごとのセッション ID は sessionStorage に保存（タブを閉じると消える）
 * - ファイル本体は IndexedDB に、セッション ID をキーにして保存（localStorage は使いません）
 * - 起動時に、ほかのセッション ID のデータを削除します（生存確認の更新が 45 秒以上ない＝閉じたタブ）
 */
const DB = 'local-viewer-session', STORE = 'sessions', SID_KEY = 'lv-session-id';
const STALE_MS = 45_000;
export interface SavedFile { name: string; type: string; bytes: ArrayBuffer; }

export function sessionId(): string {
  let id = sessionStorage.getItem(SID_KEY);
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(SID_KEY, id); }
  return id;
}

function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'sid' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(STORE, mode); const req = fn(t.objectStore(STORE));
    t.oncomplete = () => { d.close(); res(req ? req.result : undefined); };
    t.onerror = () => { d.close(); rej(t.error); };
  });
}

export async function saveSession(files: File[]) {
  const sid = sessionId();
  if (!files.length) { await tx('readwrite', (s) => { s.delete(sid); }); return; }
  const saved: SavedFile[] = await Promise.all(files.map(async (f) => ({ name: f.name, type: f.type, bytes: await f.arrayBuffer() })));
  await tx('readwrite', (s) => { s.put({ sid, ts: Date.now(), files: saved }); });
}

export async function loadSession(): Promise<File[]> {
  const sid = sessionId();
  const all = (await tx('readonly', (s) => s.getAll())) as { sid: string; ts: number; files: SavedFile[] }[] | undefined;
  const now = Date.now();
  await tx('readwrite', (s) => { for (const e of all ?? []) if (e.sid !== sid && now - e.ts > STALE_MS) s.delete(e.sid); });
  const mine = all?.find((e) => e.sid === sid);
  return mine ? mine.files.map((f) => new File([f.bytes], f.name, { type: f.type })) : [];
}

/** 開いている間は生存確認の時刻を更新します */
export async function touchSession() {
  const sid = sessionId();
  await tx('readwrite', (s) => {
    const g = s.get(sid);
    g.onsuccess = () => { if (g.result) s.put({ ...g.result, ts: Date.now() }); };
  });
}

export const clearSession = () => saveSession([]);
