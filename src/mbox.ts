/**
 * MBOX（メールを 1 つのファイルに連結した形式）を、メールごとに分けます。
 * 区切りは行頭の "From "（次の行がヘッダーの形をしているときだけ）。本文中の ">From " は元に戻します。
 */
import { rawHeaders, readMailHeaders, type MailAddr } from './mailHeaders';

export interface MboxMsg { start: number; end: number; subject: string; from: MailAddr[]; date: Date | null; }

const isHeaderLine = (b: Uint8Array, i: number) => {
  // "Name:" の形（印字可能 ASCII、コロンまで）
  let j = i; while (j < b.length && j - i < 80) { const c = b[j]; if (c === 58) return j > i; if (c <= 32 || c >= 127) return false; j++; }
  return false;
};
const isFrom = (b: Uint8Array, i: number) => b[i] === 70 && b[i + 1] === 114 && b[i + 2] === 111 && b[i + 3] === 109 && b[i + 4] === 32;

/** メールの範囲（"From " 行の次から、次の "From " 行の手前まで） */
export function splitMbox(b: Uint8Array): { start: number; end: number; envDate: string }[] {
  const out: { start: number; end: number; envDate: string }[] = [];
  let cur: { start: number; envDate: string } | null = null;
  for (let i = 0; i < b.length;) {
    let e = b.indexOf(10, i); if (e < 0) e = b.length;
    if (isFrom(b, i) && isHeaderLine(b, e + 1)) {
      if (cur) out.push({ ...cur, end: i });
      let env = ''; for (let k = i + 5; k < e && k - i < 200; k++) env += String.fromCharCode(b[k]);
      cur = { start: e + 1, envDate: env.replace(/^\S+\s+/, '').trim() };
    }
    i = e + 1;
  }
  if (cur) out.push({ ...cur, end: b.length });
  // 区切りの前の空行は除きます
  for (const m of out) { while (m.end > m.start && (b[m.end - 1] === 10 || b[m.end - 1] === 13)) m.end--; }
  return out;
}

/** 本文中の ">From "（">>From " など）を 1 段戻します（mboxrd） */
export function unescapeFrom(b: Uint8Array): Uint8Array {
  const out: number[] = []; let changed = false;
  for (let i = 0; i < b.length;) {
    let e = b.indexOf(10, i); if (e < 0) e = b.length - 1;
    let j = i; while (b[j] === 62) j++;
    if (j > i && isFrom(b, j)) { changed = true; for (let k = i + 1; k <= e; k++) out.push(b[k]); }
    else for (let k = i; k <= e; k++) out.push(b[k]);
    i = e + 1;
  }
  return changed ? new Uint8Array(out) : b;
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s.replace(/\s*\([^)]*\)\s*$/, ''));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseMbox(b: Uint8Array): MboxMsg[] {
  return splitMbox(b).map(({ start, end, envDate }) => {
    const m = b.subarray(start, end);
    const h = readMailHeaders(m);
    const dh = rawHeaders(m).get('date');
    let ds = ''; if (dh) for (const c of dh) ds += String.fromCharCode(c);
    return { start, end, subject: h.subject, from: h.from, date: parseDate(ds) ?? parseDate(envDate) };
  });
}

export function messageBytes(b: Uint8Array, m: MboxMsg): Uint8Array { return unescapeFrom(b.subarray(m.start, m.end)); }

export function emlName(subject: string, i: number): string {
  const s = subject.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 60);
  return (s || `message-${i + 1}`) + '.eml';
}
