/**
 * PDF 内の 3D ストリーム（/Type /3D、/Subtype /U3D または /PRC）を探して取り出します。
 * ブラウザ内の DecompressionStream で FlateDecode を展開します（通信なし）。
 * 暗号化された PDF には未対応です。
 */
export type Pdf3DKind = 'U3D' | 'PRC';
export interface Pdf3D { kind: Pdf3DKind; data: Uint8Array; }

function latin1(b: Uint8Array): string {
  let s = ''; const C = 0x8000;
  for (let i = 0; i < b.length; i += C) s += String.fromCharCode(...b.subarray(i, i + C));
  return s;
}

/** 3D ストリームの辞書を探します（展開前） */
export function find3DStreams(bytes: Uint8Array): { kind: Pdf3DKind; dict: string; start: number; end: number }[] {
  const s = latin1(bytes);
  const out: { kind: Pdf3DKind; dict: string; start: number; end: number }[] = [];
  const re = /\/Subtype\s*\/(U3D|PRC)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const objStart = s.lastIndexOf(' obj', m.index);
    const streamKw = s.indexOf('stream', m.index);
    if (objStart < 0 || streamKw < 0) continue;
    const dict = s.slice(objStart, streamKw);
    if (/endobj/.test(dict)) continue; // 別のオブジェクトにまたがる場合は対象外
    let start = streamKw + 6;
    if (s[start] === '\r') start++;
    if (s[start] === '\n') start++;
    let end = -1;
    const lm = dict.match(/\/Length\s+(\d+)(\s+\d+\s+R)?/);
    if (lm && !lm[2]) end = start + Number(lm[1]);
    if (end < 0 || s.slice(end, end + 12).indexOf('endstream') < 0) {
      end = s.indexOf('endstream', start);
      while (end > start && (s[end - 1] === '\n' || s[end - 1] === '\r')) end--;
    }
    if (end > start) out.push({ kind: m[1] as Pdf3DKind, dict, start, end });
  }
  return out;
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate');
  const buf = await new Response(new Blob([data as BlobPart]).stream().pipeThrough(ds)).arrayBuffer();
  return new Uint8Array(buf);
}

export async function extract3D(bytes: Uint8Array): Promise<Pdf3D | null> {
  const found = find3DStreams(bytes);
  if (!found.length) return null;
  const u3d = found.find((f) => f.kind === 'U3D') ?? found[0];
  let data = bytes.subarray(u3d.start, u3d.end);
  if (/\/Encrypt\b/.test(latin1(bytes.subarray(Math.max(0, bytes.length - 4096))))) return { kind: u3d.kind, data: new Uint8Array() };
  if (/\/FlateDecode/.test(u3d.dict)) data = await inflate(data);
  return { kind: u3d.kind, data };
}
