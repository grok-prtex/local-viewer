/**
 * メールヘッダー（件名・差出人・宛先・CC）を元のバイト列から読み直します。
 * postal-mime は生 8bit ヘッダー（Shift_JIS / EUC-JP）や、エンコード語でない ISO-2022-JP を
 * Latin-1 として扱うため文字化けします。ここではブラウザ内の TextDecoder だけで補完します。
 */
import { decodeText } from './text';

export interface MailAddr { name: string; address: string; }

const latin1 = (b: Uint8Array) => { let s = ''; for (const c of b) s += String.fromCharCode(c); return s; };

/** ヘッダー部の行を「名前 → 生バイト列」に分けます（折り返し行は連結） */
export function rawHeaders(buf: Uint8Array): Map<string, Uint8Array> {
  let end = buf.length;
  for (let i = 0; i + 1 < buf.length; i++) {
    if (buf[i] === 10 && buf[i + 1] === 10) { end = i; break; }
    if (buf[i] === 10 && buf[i + 1] === 13 && buf[i + 2] === 10) { end = i; break; }
  }
  const out = new Map<string, Uint8Array>();
  const lines: number[][] = [];
  let cur: number[] = [];
  for (let i = 0; i < end; i++) {
    const c = buf[i];
    if (c === 13) continue;
    if (c === 10) {
      const nx = buf[i + 1];
      if (nx === 32 || nx === 9) { cur.push(32); while (buf[i + 1] === 32 || buf[i + 1] === 9) i++; continue; }
      lines.push(cur); cur = []; continue;
    }
    cur.push(c);
  }
  if (cur.length) lines.push(cur);
  for (const l of lines) {
    const k = l.indexOf(58);
    if (k <= 0) continue;
    const name = latin1(new Uint8Array(l.slice(0, k))).trim().toLowerCase();
    if (out.has(name)) continue; // 最初の 1 件だけ
    let v = l.slice(k + 1); while (v[0] === 32 || v[0] === 9) v = v.slice(1);
    out.set(name, new Uint8Array(v));
  }
  return out;
}

// eslint-disable-next-line no-control-regex -- ISO-2022-JP のエスケープ列を検出するため
const ESC_JIS = /\x1b\$[@B]|\x1b\$\(D/;

/** 生のヘッダー値（バイト列）を文字列にします。8bit やエスケープ列があれば文字コードを推定 */
export function decodeRawValue(b: Uint8Array): string {
  const s = latin1(b);
  if (ESC_JIS.test(s)) return new TextDecoder('iso-2022-jp').decode(b);
  if (!b.some((c) => c >= 0x80)) return s;
  return decodeText(b).text;
}

function safeDecoder(cs: string): TextDecoder {
  const c = cs.toLowerCase().replace(/\*.*$/, '');
  const alias: Record<string, string> = { 'x-sjis': 'shift_jis', 'sjis': 'shift_jis', 'cp932': 'shift_jis', 'ms932': 'shift_jis', 'windows-31j': 'shift_jis', 'x-euc-jp': 'euc-jp', 'iso-2022-jp-2': 'iso-2022-jp' };
  try { return new TextDecoder(alias[c] ?? c); } catch { return new TextDecoder('utf-8'); }
}

function wordBytes(enc: string, text: string): Uint8Array {
  if (enc.toUpperCase() === 'B') {
    try { const bin = atob(text.replace(/[^A-Za-z0-9+/=]/g, '')); return Uint8Array.from(bin, (c) => c.charCodeAt(0)); } catch { return new Uint8Array(); }
  }
  const s = text.replace(/_/g, ' ');
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) { out.push(parseInt(s.slice(i + 1, i + 3), 16)); i += 2; }
    else out.push(s.charCodeAt(i) & 0xff);
  }
  return new Uint8Array(out);
}

/**
 * RFC 2047 のエンコード語をデコードします。隣り合うエンコード語の間の空白は削除し、
 * 同じ文字コードの連続した語はバイト列をつないでからデコードします（語の途中で文字が分割されている場合に対応）。
 */
export function decodeWords(s: string): string {
  const re = /=\?([^?\s]+)\?([BbQq])\?([^?\s]*)\?=/g;
  let out = ''; let last = 0; let pend: { cs: string; bytes: number[] } | null = null;
  const flush = () => { if (pend) { out += safeDecoder(pend.cs).decode(new Uint8Array(pend.bytes)); pend = null; } };
  for (let m: RegExpExecArray | null; (m = re.exec(s));) {
    const gap = s.slice(last, m.index);
    const adjacent = pend !== null && /^\s*$/.test(gap);
    if (!adjacent) { flush(); out += gap; }
    const bytes = wordBytes(m[2], m[3]);
    const cs = m[1].toLowerCase();
    // ISO-2022-JP は語ごとに完結しているので連結しない（連結するとエスケープ列が重なり置換文字になる）
    if (pend && pend.cs === cs && !cs.startsWith('iso-2022')) pend.bytes.push(...bytes);
    else { flush(); pend = { cs, bytes: [...bytes] }; }
    last = m.index + m[0].length;
  }
  flush();
  return out + s.slice(last);
}

export const decodeHeader = (b?: Uint8Array) => (b ? decodeWords(decodeRawValue(b)).replace(/\s+/g, ' ').trim() : '');

/** アドレス一覧を分解します（引用符・コメント・グループ・山かっこに対応） */
export function parseAddressList(v: string): MailAddr[] {
  const parts: string[] = [];
  let buf = ''; let q = false; let angle = 0; let paren = 0;
  for (let i = 0; i < v.length; i++) {
    const c = v[i];
    if (q) { buf += c; if (c === '\\' && i + 1 < v.length) { buf += v[++i]; } else if (c === '"') q = false; continue; }
    if (c === '"') { q = true; buf += c; continue; }
    if (c === '(') paren++; else if (c === ')' && paren) paren--;
    if (c === '<') angle++; else if (c === '>' && angle) angle--;
    if (!paren && !angle && (c === ',' || c === ';')) { parts.push(buf); buf = ''; continue; }
    if (!paren && !angle && c === ':' && !/@/.test(buf)) { buf = ''; continue; } // グループ名は捨てる
    buf += c;
  }
  parts.push(buf);
  const out: MailAddr[] = [];
  for (let p of parts) {
    p = p.trim(); if (!p) continue;
    let comment = '';
    p = p.replace(/\(([^()]*)\)/g, (_, c) => { comment ||= c.trim(); return ''; }).trim();
    const m = /^(.*?)<\s*([^<>]*?)\s*>\s*$/.exec(p);
    let name = ''; let address = '';
    if (m) { name = m[1].trim(); address = m[2]; } else { address = p; name = comment; }
    if (/^".*"$/.test(name)) name = name.slice(1, -1).replace(/\\(.)/g, '$1');
    name = decodeWords(name).replace(/\s+/g, ' ').trim();
    address = address.replace(/\s+/g, '');
    if (name === address) name = '';
    if (name || address) out.push({ name, address });
  }
  return out;
}

export function readMailHeaders(buf: Uint8Array) {
  const h = rawHeaders(buf);
  const addrs = (k: string) => { const b = h.get(k); return b ? parseAddressList(decodeRawValue(b)) : []; };
  return { subject: decodeHeader(h.get('subject')), from: addrs('from'), to: addrs('to'), cc: addrs('cc') };
}

/** postal-mime の値に文字化けの疑い（Latin-1 補助文字・制御文字・未デコードのエンコード語）があるか */
// eslint-disable-next-line no-control-regex -- ESC の残りを検出するため
export const looksGarbled = (s: string) => /[\u0080-\u00ff]|\x1b|\$B|=\?[^?]+\?[BbQq]\?/.test(s);
