/**
 * PRC の圧縮配列（ハフマン符号）。prc-rs huffman.rs（MIT, Copyright (c) 2025,2026 Kristóf Ralovich）の読み取り部分の移植です。
 */
import type { R } from './bits';

function uint(r: R): number { let v = 0, i = 0; while (i < 4 && r.bit()) { v += r.bits(8) * 2 ** (8 * i); i++; } return v >>> 0; }

/** 下位ビットから読むビット列（ハフマン部分は LittleEndian のビット順） */
class LE {
  p = 0;
  constructor(private b: Uint8Array) {}
  bit(): number { const p = this.p; if (p >= this.b.length * 8) throw new Error('PRC: huffman eof'); this.p++; return (this.b[p >> 3] >> (p & 7)) & 1; }
  read(n: number): number { let v = 0; for (let i = 0; i < n; i++) v += this.bit() * 2 ** i; return v; }
}

export function huffmanArray(r: R, hasBit: boolean, nb: number, dv: boolean, signExt: boolean): number[] {
  const compressed = hasBit ? r.bit() === 1 : dv;
  if (!compressed) {
    const n = uint(r); const out = new Array<number>(n);
    const wide = nb > 8;
    for (let i = 0; i < n; i++) {
      let v = wide ? (r.bits(8) | (r.bits(8) << 8)) : r.bits(8);
      if (signExt) { const w = wide ? 16 : 8; if (v >= 2 ** (w - 1)) v -= 2 ** w; }
      out[i] = v;
    }
    return out;
  }
  const size = uint(r);
  if (size === 0) return [];
  if (size > 1e8) throw new Error('PRC: huffman too large');
  const bytes = new Uint8Array(size * 4);
  for (let i = 0; i < bytes.length; i++) bytes[i] = r.bits(8);
  const last = uint(r);
  if (last > 32) throw new Error('PRC: bad huffman tail');
  const h = new LE(bytes);
  const numLeaves = h.read(nb + 1);
  if (numLeaves === 0) return [];
  const maxLen = h.read(8);
  if (maxLen <= 0 || maxLen > 32) throw new Error('PRC: bad huffman code length');
  const codes = new Map<number, number>(); // (len, code) → symbol
  let single: number | null = null;
  for (let i = 0; i < numLeaves; i++) {
    let s = h.read(nb);
    if (signExt && s >= 2 ** (nb - 1)) s -= 2 ** nb;
    const len = h.read(maxLen); const code = h.read(len);
    if (len === 0) single = s;
    codes.set(len * 2 ** 32 + code, s);
  }
  const n = h.read(32);
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    if (single !== null && numLeaves === 1) { out[i] = single; continue; }
    let code = 0, len = 0, s: number | undefined;
    while (s === undefined) {
      code = code * 2 + h.bit(); len++;
      if (len > 32) throw new Error('PRC: bad huffman code');
      s = codes.get(len * 2 ** 32 + code);
    }
    out[i] = s;
  }
  return out;
}
