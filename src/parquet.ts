/** Parquet の列の型と値の表示 */
export interface PqCol { name: string; type: string; }

interface SchemaNode { element: { name: string; type?: string; logical_type?: { type: string; precision?: number; scale?: number; unit?: string }; converted_type?: string; repetition_type?: string; scale?: number; precision?: number }; children: SchemaNode[]; }

export function colType(c: SchemaNode): string {
  const e = c.element; const lt = e.logical_type;
  let ty: string;
  if (lt?.type === 'DECIMAL') ty = `DECIMAL(${lt.precision ?? e.precision},${lt.scale ?? e.scale ?? 0})`;
  else if (lt?.type === 'TIMESTAMP') ty = `TIMESTAMP${lt.unit ? '[' + lt.unit + ']' : ''}`;
  else if (lt?.type) ty = lt.type;
  else if (e.converted_type === 'DECIMAL') ty = `DECIMAL(${e.precision},${e.scale ?? 0})`;
  else if (e.converted_type) ty = e.converted_type === 'UTF8' ? 'STRING' : e.converted_type;
  else if (e.type) ty = e.type;
  else ty = 'STRUCT';
  if (ty === 'LIST' || ty === 'MAP' || ty === 'MAP_KEY_VALUE') return ty === 'MAP_KEY_VALUE' ? 'MAP' : ty;
  if (e.repetition_type === 'REPEATED') return `${ty}[]`;
  return ty;
}

const MAX = 400;
const clip = (s: string) => (s.length > MAX ? s.slice(0, MAX) + '…' : s);

function json(v: unknown): string {
  return JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x instanceof Uint8Array ? bytes(x) : x instanceof Date ? iso(x) : x));
}
const iso = (d: Date) => (Number.isNaN(d.getTime()) ? String(d) : d.getUTCHours() + d.getUTCMinutes() + d.getUTCSeconds() + d.getUTCMilliseconds() === 0 ? d.toISOString().slice(0, 10) : d.toISOString());
function bytes(b: Uint8Array): string {
  try { const s = new TextDecoder('utf-8', { fatal: true }).decode(b); if (!/[\u0000-\u0008\u000e-\u001f]/.test(s)) return s; } catch { /* 文字列ではない */ }
  return '0x' + Array.from(b.subarray(0, 64), (x) => x.toString(16).padStart(2, '0')).join('') + (b.length > 64 ? '…' : '');
}

export function cellText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return clip(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v instanceof Date) return iso(v);
  if (v instanceof Uint8Array) return clip(bytes(v));
  return clip(json(v));
}
