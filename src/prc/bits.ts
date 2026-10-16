/**
 * PRC（ISO 14739-1）のビットストリーム読み取り。
 * 読み方は prc-rs（MIT License, Copyright (c) 2025,2026 Kristóf Ralovich）の builtin.rs / double.rs / huffman.rs を TypeScript に移植したものです。
 */
import { COFDOE } from './doubleTable';

export class R {
  p = 0; // ビット位置
  constructor(public b: Uint8Array) {}
  get end() { return this.b.length * 8; }
  bit(): number {
    const p = this.p;
    if (p >= this.b.length * 8) throw new Error('PRC: unexpected end of data');
    this.p = p + 1;
    return (this.b[p >> 3] >> (7 - (p & 7))) & 1;
  }
  bits(n: number): number { let v = 0; for (let i = 0; i < n; i++) v = v * 2 + this.bit(); return v; }
  peek<T>(f: () => T): T { const p = this.p; try { return f(); } finally { this.p = p; } }
}

// 符号表を (ビット数, 符号) で引けるようにします
const dbl = new Map<number, number>();
for (let i = 0; i < COFDOE.length; i += 5) dbl.set(COFDOE[i + 1] * 0x1000000 + COFDOE[i + 2], i);
const f64 = new Float64Array(1); const u8 = new Uint8Array(f64.buffer); const u32 = new Uint32Array(f64.buffer);

function readDouble(r: R): number {
  let code = 0; let at = -1;
  for (let i = 1; i <= 22; i++) {
    code = code * 2 + r.bit();
    const k = dbl.get(i * 0x1000000 + code);
    if (k !== undefined) { at = k; break; }
  }
  if (at < 0) throw new Error('PRC: double code not found');
  const type = COFDOE[at], nb = COFDOE[at + 1], bits = COFDOE[at + 2];
  u32[1] = COFDOE[at + 3]; u32[0] = COFDOE[at + 4];
  if (nb === 2 && bits === 1 && type === 0) return f64[0];
  if (r.bit()) u8[7] |= 0x80; else u8[7] &= 0x7f;
  if (type === 0) return f64[0];
  if (!r.bit()) return f64[0];
  u8[6] |= r.bits(4) & 0x0f;
  let lbi = 0, cbi = 5;
  while (cbi >= lbi) {
    if (r.bit()) u8[cbi] = r.bits(8);
    else {
      const off = r.bits(3);
      if (off === 0) { const v = u8[cbi + 1]; while (cbi >= lbi) { u8[cbi] = v; cbi--; } break; }
      if (off === 6) { const v = u8[cbi + 1]; lbi++; while (cbi >= lbi) { u8[cbi] = v; cbi--; } u8[cbi] = r.bits(8); break; }
      if (cbi + off >= 8) throw new Error('PRC: bad double');
      u8[cbi] = u8[cbi + off];
    }
    cbi--;
  }
  return f64[0];
}

function uint(r: R): number {
  let v = 0, i = 0;
  while (i < 4 && r.bit()) { v += r.bits(8) * 2 ** (8 * i); i++; }
  return v >>> 0;
}
function int(r: R): number {
  let v = 0, j = 0;
  while (r.bit()) { v |= r.bits(8) << (8 * j); j++; if (j > 4) throw new Error('PRC: bad int'); }
  if (j > 0 && j < 4) { v <<= (4 - j) * 8; v >>= (4 - j) * 8; }
  return v;
}
function uvar(r: R, n: number): number { let v = 0; for (let i = 0; i < n; i++) v = v * 2 + r.bit(); return v; }
function ivar(r: R, n: number): number { const neg = r.bit(); const u = n <= 1 ? 0 : uvar(r, n - 1); return neg ? -u : u; }

const td = new TextDecoder('utf-8');
const td1 = new TextDecoder('latin1');
function str(r: R): string {
  if (!r.bit()) return '';
  const n = uint(r);
  if (n > 1e7) throw new Error('PRC: string too long');
  const a = new Uint8Array(n);
  for (let i = 0; i < n; i++) a[i] = r.bits(8);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(a); } catch { return td1.decode(a); }
}
void td;

import { huffmanArray } from './huffman';

export const B = {
  Boolean: (r: R) => r.bit() === 1,
  Character: (r: R) => { const v = r.bits(8); return v > 127 ? v - 256 : v; },
  UnsignedCharacter: (r: R) => r.bits(8),
  UnsignedShort: (r: R) => { const lo = r.bits(8); return lo | (r.bits(8) << 8); },
  UnsignedInteger: uint,
  Integer: int,
  Double: readDouble,
  String: str,
  UserData: (r: R) => { const n = uint(r); r.p += n; if (r.p > r.end) throw new Error('PRC: bad user data'); return n; },
  NumberOfBitsThenUnsignedInteger: (r: R) => uvar(r, uvar(r, 5)),
  UnsignedIntegerWithVariableBitNumber: (r: R, n: number) => uvar(r, n),
  FloatAsBytes: (r: R) => { const b = new Uint8Array(4); for (let i = 0; i < 4; i++) b[i] = r.bits(8); return new Float32Array(b.buffer)[0]; },
  CompressedEntityType: (r: R) => {
    const isCurve = r.bit() === 1;
    let value: number;
    if (isCurve) {
      const x2 = uvar(r, 2);
      if (x2 < 3) value = [1, 2, 3][x2]; // Line, Circle, BSplineHermiteCurve
      else { const x4 = uvar(r, 2); if (x4 === 0) value = 5; else if (x4 === 1) value = 4; else throw new Error('PRC: bad curve type'); }
    } else value = uvar(r, 4);
    return { value, is_a_curve: isCurve };
  },
  CharacterArray: (r: R, nb: number) => huffmanArray(r, true, nb, true, false),
  ShortArray: (r: R, nb: number) => huffmanArray(r, true, nb, true, true),
  CompressedIntegerArray: (r: R) => { const nbs = huffmanArray(r, true, 6, true, true); return nbs.map((n) => ivar(r, n)); },
  CompressedIndiceArray: (r: R) => indices(r, true, true),
  CompressedIndiceArrayWithoutBit: (r: R, dv: boolean) => indices(r, false, dv),
  DoubleWithVariableBitNumber: (r: R, n: number, tol: number) => dvar(r, n, tol),
  Point3DWithVariableBitNumber: (r: R, n: number, tol: number) => ({ x: dvar(r, n, tol), y: dvar(r, n, tol), z: dvar(r, n, tol) }),
  CompressedPoint: (r: R, tol: number) => {
    const n = uvar(r, 6);
    if (n === 0) return { x: 0, y: 0, z: 0 };
    if (n <= 30) return { x: dvar(r, n, tol), y: dvar(r, n, tol), z: dvar(r, n, tol) };
    return { x: readDouble(r), y: readDouble(r), z: readDouble(r) };
  },
  UncompressedBoolArray: (r: R, n: number) => { const a = new Array<boolean>(n); for (let i = 0; i < n; i++) a[i] = r.bit() === 1; return a; },
  UncompressedUnsignedInteger: () => { throw new Error('byte aligned'); },
  UncompressedByteArray: () => { throw new Error('byte aligned'); },
};

function dvar(r: R, n: number, tol: number): number {
  const neg = r.bit();
  if (n === 1) return neg ? -0 : 0;
  let u = 0;
  for (let i = 0; i < n - 1; i++) u = u * 2 + r.bit();
  return u * tol * (neg ? -1 : 1);
}
function indices(r: R, hasBit: boolean, dv: boolean): number[] {
  const diff = huffmanArray(r, hasBit, 6, dv, true);
  if (!diff.length) return [];
  let c = diff[0];
  const out = [ivar(r, c)];
  for (let i = 1; i < diff.length; i++) { c += diff[i]; out.push(ivar(r, c) + out[i - 1]); }
  return out;
}
export const bitHelpers = { uint, int, uvar, ivar };
