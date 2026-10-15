/** Parasolid（x_t / x_b）のヘッダーと、SolidWorks（2015 以降の形式）の中身を読み取ります */

export interface ParasolidInfo { format: 'テキスト（x_t）' | 'バイナリ（x_b）'; fields: Record<string, string>; schema?: string; }

/**
 * バイナリ（x_b）の名前属性（文字列ノード：型 0x0054 + 長さ + インデックス + 文字列）を拾います。
 * 実ファイル 2 件で STEP の部品名と完全に一致することを確認済み。階層や個数は分からないため、一覧だけを返します。
 */
export function parasolidNames(b: Uint8Array): string[] {
  const out = new Set<string>();
  for (let i = 0; i + 8 < b.length; i++) {
    if (b[i] !== 0 || b[i + 1] !== 0x54) continue;
    const L = ((b[i + 2] << 24) | (b[i + 3] << 16) | (b[i + 4] << 8) | b[i + 5]) >>> 0;
    if (L < 2 || L > 300) continue;
    const q = i + 6 + (b[i + 6] >= 0x80 ? 4 : 2);
    if (q + L > b.length) continue;
    let ok = true; for (let k = q; k < q + L; k++) if (b[k] < 0x20 || b[k] > 0x7e) { ok = false; break; }
    if (!ok) continue;
    const name = String.fromCharCode(...b.subarray(q, q + L));
    if (name !== 'NONE') out.add(name);
    i = q + L - 1;
  }
  return [...out].sort();
}

export function isParasolid(head: Uint8Array): boolean {
  const s = String.fromCharCode(...head.subarray(0, 200));
  return /\*\*PARASOLID/.test(s) || /^PS\0/.test(s) || /TRANSMIT FILE/.test(s);
}

export function parseParasolidHeader(bytes: Uint8Array): ParasolidInfo {
  const s = String.fromCharCode(...bytes.subarray(0, Math.min(bytes.length, 8192)));
  const fields: Record<string, string> = {};
  const hdr = s.slice(s.indexOf('**PART1;'), s.indexOf('**END_OF_HEADER') > 0 ? s.indexOf('**END_OF_HEADER') : 4000);
  for (const m of hdr.matchAll(/([A-Z_]+)=([^;\n]*);/g)) fields[m[1]] = m[2].trim();
  const binary = (fields.FORMAT ?? '').toLowerCase().includes('binary') || /PS\0/.test(s.slice(s.indexOf('END_OF_HEADER')));
  return { format: binary ? 'バイナリ（x_b）' : 'テキスト（x_t）', fields, schema: fields.SCH };
}

export interface SwInfo { entries: string[]; preview?: Uint8Array; refs: string[]; }

async function inflateRaw(data: Uint8Array, expect: number): Promise<Uint8Array | null> {
  try {
    const ds = new DecompressionStream('deflate-raw');
    const out = new Uint8Array(await new Response(new Blob([data as BlobPart]).stream().pipeThrough(ds)).arrayBuffer());
    return out.length === expect ? out : null;
  } catch { return null; }
}

const nibble = (c: number) => ((c << 4) | (c >> 4)) & 0xff;

/** SolidWorks 2015 以降の SLDPRT / SLDASM（独自コンテナ）を読み取ります */
export async function parseSolidWorks(b: Uint8Array): Promise<SwInfo> {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const entries = new Set<string>(); const refs = new Set<string>();
  let preview: Uint8Array | undefined;
  for (let p = 0; p + 26 < b.length; p++) {
    if (b[p] !== 0x14 || b[p + 1] !== 0 || b[p + 2] !== 6 || b[p + 3] !== 0 || b[p + 4] !== 8 || b[p + 5] !== 0) continue;
    const cs = dv.getUint32(p + 14, true), us = dv.getUint32(p + 18, true), nl = dv.getUint32(p + 22, true);
    if (!(nl > 0 && nl < 300 && cs > 0 && p + 26 + nl + cs <= b.length && us < 200e6)) continue;
    const name = String.fromCharCode(...Array.from(b.subarray(p + 26, p + 26 + nl), nibble));
    if (!/^[\x20-\x7e]+$/.test(name)) continue;
    const dataStart = p + 26 + nl;
    if (name === 'PreviewPNG' || (/Contents\/|Header2|SwDocContentMgr/.test(name) && us < 20e6)) {
      const out = await inflateRaw(b.subarray(dataStart, dataStart + cs), us);
      if (!out) continue;
      entries.add(name);
      if (name === 'PreviewPNG' && out[0] === 0x89 && out[1] === 0x50 && (!preview || out.length > preview.length)) preview = out;
      else {
        // UTF-16LE の参照ファイル名（部品・サブアセンブリ）
        const t = new TextDecoder('utf-16le').decode(out.subarray(0, out.length & ~1));
        for (const m of t.matchAll(/[^\0\\/:*?"<>|\r\n]{1,120}\.(SLDPRT|SLDASM)/gi)) refs.add(m[0].trim());
      }
      p = dataStart + cs - 1;
    } else entries.add(name);
  }
  return { entries: [...entries], preview, refs: [...refs].filter((r) => r.length > 7).sort().slice(0, 300) };
}
