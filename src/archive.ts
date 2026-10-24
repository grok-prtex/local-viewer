/**
 * tar / gzip をブラウザーの中だけで読みます（送信なし）。
 * - tar：ustar・GNU（長い名前 'L'）・pax（path=）に対応。名前は UTF-8、だめなら Shift_JIS で読みます
 * - gzip：ブラウザー標準の DecompressionStream で展開し、上限を超えたら止めます
 */
export interface ArcEntry { name: string; size: number; dir: boolean; mtime?: Date; offset?: number; }
export interface ArcList { entries: ArcEntry[]; truncated: boolean; }

export const MAX_ENTRIES = 20000;
/** gzip を展開したあとの大きさの上限 */
export const GZ_MAX = 1024 * 1024 * 1024;
/** 7z として読み込む大きさの上限 */
export const SEVENZ_MAX = 512 * 1024 * 1024;

export class ArcError extends Error { constructor(public code: 'corrupt' | 'too-large' | 'encrypted' | 'unsupported') { super(code); } }

export function decodeName(b: Uint8Array): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch { return new TextDecoder('shift_jis').decode(b); }
}

const cstr = (b: Uint8Array, s: number, n: number) => { let e = s; while (e < s + n && b[e]) e++; return b.subarray(s, e); };
function octal(b: Uint8Array, s: number, n: number): number {
  if (b[s] & 0x80) { // GNU の base-256
    let v = b[s] & 0x7f; for (let i = 1; i < n; i++) v = v * 256 + b[s + i]; return v;
  }
  const str = new TextDecoder().decode(cstr(b, s, n)).trim();
  if (!str) return 0;
  if (!/^[0-7]+$/.test(str)) return NaN;
  return parseInt(str, 8);
}
function checksumOk(h: Uint8Array): boolean {
  const want = octal(h, 148, 8); if (Number.isNaN(want)) return false;
  let sum = 0; for (let i = 0; i < 512; i++) sum += i >= 148 && i < 156 ? 32 : h[i];
  return sum === want;
}
const allZero = (h: Uint8Array) => { for (let i = 0; i < h.length; i++) if (h[i]) return false; return true; };

export function isTar(head: Uint8Array): boolean {
  if (head.length < 512) return false;
  return checksumOk(head.subarray(0, 512));
}

/** pax 拡張ヘッダー（"長さ key=value\n" の並び）から path を取り出します */
function paxPath(b: Uint8Array): string | undefined {
  let i = 0; let out: string | undefined;
  while (i < b.length) {
    let sp = i; while (sp < b.length && b[sp] !== 0x20) sp++;
    const len = parseInt(new TextDecoder().decode(b.subarray(i, sp)), 10);
    if (!len || len <= 0) break;
    const rec = b.subarray(sp + 1, i + len - 1); const eq = rec.indexOf(0x3d);
    if (eq > 0) { const k = new TextDecoder().decode(rec.subarray(0, eq)); if (k === 'path') out = decodeName(rec.subarray(eq + 1)); }
    i += len;
  }
  return out;
}

export type ReadAt = (off: number, len: number) => Promise<Uint8Array>;
export const bytesReader = (u: Uint8Array): ReadAt => async (o, l) => u.subarray(o, Math.min(u.length, o + l));
export const blobReader = (b: Blob): ReadAt => async (o, l) => new Uint8Array(await b.slice(o, o + l).arrayBuffer());

/** tar の目次を読みます（データ部分は読まず、位置だけ覚えます） */
export async function listTar(read: ReadAt, total: number): Promise<ArcList> {
  const entries: ArcEntry[] = []; let off = 0; let longName: string | undefined; let first = true; let truncated = false;
  while (off + 512 <= total) {
    const h = await read(off, 512);
    if (h.length < 512) break;
    if (allZero(h)) break;
    if (!checksumOk(h)) { if (first) throw new ArcError('corrupt'); break; }
    first = false;
    const size = octal(h, 124, 12); if (Number.isNaN(size)) throw new ArcError('corrupt');
    const type = String.fromCharCode(h[156] || 0x30);
    const data = off + 512; const next = data + Math.ceil(size / 512) * 512;
    if (type === 'L' || type === 'x') {
      const body = await read(data, size);
      longName = type === 'L' ? decodeName(cstr(body, 0, body.length)) : paxPath(body) ?? longName;
    } else if (type === 'g' || type === 'K') {
      // 全体設定・リンク先の長い名前は表示に使いません
    } else {
      const ustar = new TextDecoder().decode(h.subarray(257, 262)) === 'ustar';
      let name = decodeName(cstr(h, 0, 100));
      if (ustar && h[345]) { const pre = decodeName(cstr(h, 345, 155)); if (pre && new TextDecoder().decode(h.subarray(257, 263)) === 'ustar\0') name = pre + '/' + name; }
      if (longName) { name = longName; longName = undefined; }
      name = name.replace(/^\.\//, '');
      const mt = octal(h, 136, 12);
      const dir = type === '5' || name.endsWith('/');
      if (name && name !== '.' && (type === '0' || type === '\0' || type === '7' || dir)) {
        if (entries.length >= MAX_ENTRIES) { truncated = true; break; }
        entries.push({ name: dir ? name.replace(/\/?$/, '/') : name, size: dir ? 0 : size, dir, mtime: mt ? new Date(mt * 1000) : undefined, offset: data });
      }
    }
    off = next;
  }
  if (first) throw new ArcError('corrupt');
  return { entries, truncated };
}

/** gzip ヘッダーにある元のファイル名（なければ undefined） */
export function gzipName(head: Uint8Array): string | undefined {
  if (head[0] !== 0x1f || head[1] !== 0x8b || head.length < 10) return;
  const flg = head[3]; let i = 10;
  if (flg & 4) i += 2 + (head[i] | (head[i + 1] << 8));
  if (!(flg & 8)) return;
  let e = i; while (e < head.length && head[e]) e++;
  if (e >= head.length) return;
  return decodeName(head.subarray(i, e));
}

/** gzip を展開します。上限を超えたら 'too-large'、壊れていたら 'corrupt' */
export async function gunzip(blob: Blob, max = GZ_MAX, onBytes?: (inBytes: number, outBytes: number) => void, signal?: { cancelled: boolean }): Promise<Uint8Array> {
  let inBytes = 0;
  const counted = blob.stream().pipeThrough(new TransformStream<Uint8Array, Uint8Array>({ transform(c, ctl) { inBytes += c.length; ctl.enqueue(c); } }));
  const reader = counted.pipeThrough(new DecompressionStream('gzip') as unknown as TransformStream<Uint8Array, Uint8Array>).getReader();
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    for (;;) {
      if (signal?.cancelled) { await reader.cancel(); throw new Error('cancelled'); }
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > max) { await reader.cancel().catch(() => {}); throw new ArcError('too-large'); }
      chunks.push(value); onBytes?.(inBytes, total);
    }
  } catch (e) {
    if (e instanceof ArcError || (e as Error)?.message === 'cancelled') throw e;
    throw new ArcError('corrupt');
  }
  if (!total) throw new ArcError('corrupt');
  const out = new Uint8Array(total); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

/** .gz を外した中身の名前 */
export function innerName(file: string, head: Uint8Array): string {
  const g = gzipName(head);
  if (g) return g.split(/[\\/]/).pop() || g;
  const b = file.replace(/\.(tgz)$/i, '.tar').replace(/\.gz$/i, '');
  return b === file ? file + '.out' : b;
}
