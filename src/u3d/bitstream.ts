/*
 * U3D（ECMA-363）のビットストリーム復号器。
 * Intel U3D Sample Software（Apache License 2.0）の CIFXBitStreamX / IFXHistogramDynamic を
 * 参考に TypeScript で書き直したものです。詳細は NOTICE を参照してください。
 */
const STATIC_FULL = 0x400;
const MAX_RANGE = STATIC_FULL + 0x3fff;
const HALF = 0x8000, QUARTER = 0x4000;
const ELEPHANT = 0x1fff;

class Histogram {
  counts: number[] = [1];
  total = 1;
  freq(s: number) { return this.counts[s] ?? 0; }
  cum(s: number) { let c = 0; for (let i = 0; i < s && i < this.counts.length; i++) c += this.counts[i]; return c; }
  symbolFromFreq(f: number) {
    let c = 0;
    for (let i = 0; i < this.counts.length; i++) { c += this.counts[i]; if (f < c) return i; }
    return 0;
  }
  add(s: number) {
    if (s > 0xffff) return;
    if (this.total >= ELEPHANT) {
      let t = 0;
      for (let i = 0; i < this.counts.length; i++) { this.counts[i] >>= 1; t += this.counts[i]; }
      this.counts[0] += 1; this.total = t + 1;
    }
    while (this.counts.length <= s) this.counts.push(0);
    this.counts[s]++; this.total++;
  }
}

export class BitReader {
  private bitPos: number;
  private high = 0xffff; private low = 0; private underflow = 0;
  private ctx = new Map<number, Histogram>();
  constructor(private bytes: Uint8Array, byteOffset = 0, private end = bytes.length) { this.bitPos = byteOffset * 8; }

  private bit(pos: number): number {
    const b = pos >> 3;
    if (b >= this.end) return 0;
    return (this.bytes[b] >> (pos & 7)) & 1;
  }

  private readSymbol(context: number): number {
    // 符号値の先頭 16 ビット（1 ビット + アンダーフロー分を飛ばした 15 ビット）
    let code = this.bit(this.bitPos);
    let p = this.bitPos + 1 + this.underflow;
    for (let i = 0; i < 15; i++) code = (code << 1) | this.bit(p++);
    const range = this.high + 1 - this.low;
    let total: number, value: number, cum: number, freq: number;
    let hist: Histogram | undefined;
    if (context === 0 || context > STATIC_FULL) {
      total = context === 0 ? 256 : context - STATIC_FULL;
      const codeCum = Math.floor((total * (1 + code - this.low) - 1) / range);
      value = codeCum + 1; cum = value - 1; freq = 1;
    } else {
      hist = this.ctx.get(context);
      if (!hist) { hist = new Histogram(); this.ctx.set(context, hist); }
      total = hist.total;
      const codeCum = Math.floor((total * (1 + code - this.low) - 1) / range);
      value = hist.symbolFromFreq(codeCum); cum = hist.cum(value); freq = hist.freq(value);
    }
    let high = this.low - 1 + Math.floor((range * (cum + freq)) / total);
    let low = this.low + Math.floor((range * cum) / total);
    hist?.add(value);
    let bitCount = 0;
    while ((low & HALF) === (high & HALF)) {
      low = (low & ~HALF) << 1;
      high = ((high & ~HALF) << 1) | 1;
      bitCount++;
    }
    if (bitCount > 0) { bitCount += this.underflow; this.underflow = 0; }
    while ((low & QUARTER) !== 0 && (high & QUARTER) === 0) {
      low = ((low & ~QUARTER) << 1) & 0xffff;
      high = (((high & ~HALF) << 1) | HALF | 1) & 0xffff;
      this.underflow++;
    }
    this.low = low; this.high = high; this.bitPos += bitCount;
    return value;
  }

  u8(): number {
    const v = this.readSymbol(0) - 1;
    // ビット順の反転（スタティック 256 記号の値は MSB 先頭で得られるため）
    let r = 0; for (let i = 0; i < 8; i++) r |= ((v >> i) & 1) << (7 - i);
    return r;
  }
  u16() { const a = this.u8(); return a | (this.u8() << 8); }
  u32() { const a = this.u16(); return (a | (this.u16() << 16)) >>> 0; }
  f32() { const dv = new DataView(new ArrayBuffer(4)); dv.setUint32(0, this.u32(), true); return dv.getFloat32(0, true); }
  str() { const n = this.u16(); const b = new Uint8Array(n); for (let i = 0; i < n; i++) b[i] = this.u8(); return new TextDecoder().decode(b); }

  compressedU32(context: number): number {
    if (context && context < MAX_RANGE) {
      const s = this.readSymbol(context);
      if (s !== 0) return s - 1;
      const v = this.u32();
      if (context <= STATIC_FULL) { let h = this.ctx.get(context); if (!h) { h = new Histogram(); this.ctx.set(context, h); } h.add(v + 1); }
      return v;
    }
    return this.u32();
  }
}
