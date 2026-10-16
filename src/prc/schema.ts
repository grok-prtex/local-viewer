/**
 * PRC のスキーマ（新しい版で追加された項目の読み方）を実行する小さな仮想機械。
 * prc-rs schema.rs（MIT, Copyright (c) 2025,2026 Kristóf Ralovich）の動きに合わせています。
 */
import { B, type R } from './bits';
import * as G from './gen';

const STORED_VERSION = 8137;
type V = number | boolean | string | number[];

export function evalSchema(r: R, schemas: Map<number, number[]>, type: number, ctx: unknown, depth = 0): void {
  const ops = schemas.get(type);
  if (!ops || depth > 20) return;
  const vars = new Map<number, V>();
  const st: V[] = [];
  const scalar = (v: V) => (typeof v === 'boolean' ? (v ? 1 : 0) : typeof v === 'number' ? v : NaN);
  // pc の命令を実行し、次の pc を返します
  const ev = (pc: number, skip: boolean): number => {
    if (pc >= ops.length) return pc;
    const t = ops[pc++];
    switch (t) {
      case 0: if (!skip) st.push(B.Boolean(r)); return pc;
      case 1: if (!skip) st.push(B.Double(r)); return pc;
      case 2: if (!skip) st.push(B.UnsignedCharacter(r)); return pc;
      case 3: if (!skip) st.push(B.UnsignedInteger(r)); return pc;
      case 4: if (!skip) st.push(B.Integer(r)); return pc;
      case 5: if (!skip) st.push(B.String(r)); return pc;
      case 6: { const ft = ops[pc++]; if (!skip) evalSchema(r, schemas, ft, ctx, depth + 1); return pc; }
      case 7: case 9: if (!skip) { B.Double(r); B.Double(r); } return pc;
      case 8: if (!skip) { B.Double(r); B.Double(r); B.Double(r); } return pc;
      case 10: if (!skip) for (let i = 0; i < 4; i++) B.Double(r); return pc;
      case 11: if (!skip) for (let i = 0; i < 6; i++) B.Double(r); return pc;
      case 13: if (!skip) G.r_PRC_TYPE_SURF(r, ctx); return pc;
      case 14: if (!skip) G.r_PRC_TYPE_CRV(r, ctx); return pc;
      case 15: { // For: 回数の式、本体
        if (skip) { pc = ev(pc, true); return ev(pc, true); }
        pc = ev(pc, false); const n = scalar(st.pop() ?? 0) | 0;
        let end = pc;
        if (n <= 0) return ev(pc, true);
        for (let i = 0; i < n; i++) end = ev(pc, false);
        return end;
      }
      case 16: { // SimpleFor
        if (skip) return ev(pc, true);
        const n = B.Integer(r);
        if (n <= 0) return ev(pc, true);
        let end = pc; for (let i = 0; i < n; i++) end = ev(pc, false);
        return end;
      }
      case 17: { // If
        if (skip) { pc = ev(pc, true); pc = ev(pc, true); if (ops[pc] === 18) pc = ev(pc, true); return pc; }
        pc = ev(pc, false); const c = scalar(st.pop() ?? 0) !== 0 || st.length < 0;
        if (c) { pc = ev(pc, false); if (ops[pc] === 18) pc = ev(pc, true); }
        else { pc = ev(pc, true); if (ops[pc] === 18) pc = ev(pc, false); }
        return pc;
      }
      case 18: return ev(pc, skip); // Else
      case 19: { while (pc < ops.length && ops[pc] !== 21) pc = ev(pc, skip); return pc + 1; }
      case 21: return pc;
      case 20: {
        const ver = ops[pc++]; const run = !skip && STORED_VERSION < ver;
        while (pc < ops.length && ops[pc] !== 21) pc = ev(pc, !run);
        return pc + 1;
      }
      case 24: { const id = ops[pc++]; pc = ev(pc, skip); if (!skip) vars.set(id, st.pop() ?? 0); return pc; }
      case 25: { const id = ops[pc++]; if (!skip) st.push(vars.get(id) ?? 0); return pc; }
      case 26: { const v = ops[pc++]; if (!skip) st.push(v); return pc; }
      case 37: { pc = ev(pc, skip); pc = ev(pc, skip); if (!skip) { const a = st.pop(), b = st.pop(); st.push(typeof a === 'string' || typeof b === 'string' ? a === b : scalar(a ?? 0) === scalar(b ?? 0)); } return pc; }
      case 39: case 40: return pc + 1;
      default: throw new Error('PRC: unsupported schema token ' + t);
    }
  };
  let pc = 0;
  while (pc < ops.length) pc = ev(pc, false);
}
