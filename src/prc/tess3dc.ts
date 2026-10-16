/**
 * PRC_TYPE_TESS_3D_Compressed（高圧縮メッシュ）の復元。
 *
 * ISO 14739-1 §7.8.9 と、PDF Association で公開されている議論（pdf-issues #436, #727, #772–#775）に
 * 書かれた手順にもとづく独自実装です。
 *  - 三角形はスタックで辿る。空になったら新しい種三角形（参照フラグ 3 つ）。成分が複数でも T 個まで続ける。
 *  - 種三角形: V0 = 原点 + d、V1 = V0 + d、V2 = (V0+V1)/2 + d（d = 整数 × 許容差、参照点はそのまま）。
 *  - 辺の上の新しい頂点: O = 辺の中点、X = 低番号 − 高番号、Z = (奥 − O) × X、Y = Z × X、
 *    Y が奥の頂点の側を向かないよう Y,Z を反転、の局所座標に整数 × 許容差を当てる。
 *  - edge_status_array の先頭 T 個（&3）: 1 = 右, 2 = 左。右を先に積む。隣のない辺は「処理済み」に登録し、
 *    直前の三角形が何も積まなかったときだけ、取り出した辺が処理済みかを確かめて読み飛ばす。
 *  - 左右は三角形が「裏返っているか」（保存された法線と三角形の向きの内積が負か）で入れ替わる。
 *    そのため法線ビット列を三角形ごとに読み進める（初出の頂点: 複数法線フラグ + 3 ビット、
 *    複数法線の頂点の再訪: 参照ビット + 番号 or 3 ビット、平面の面は面に 1 つ）。
 */
export interface DecodedMesh {
  /** 三角形ごとに 3 頂点（非インデックス、表向きの巻き順） */
  positions: Float32Array;
  normals: Float32Array;
  faceOfTriangle: Int32Array;
  triangles: number;
  ok: boolean;
  note?: string;
}

interface Gate { a: number; b: number; O: number[]; X: number[]; Y: number[]; Z: number[] }
const KEY = (a: number, b: number) => (a < b ? a * 67108864 + b : b * 67108864 + a);

const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const neg = (a: number[]) => [-a[0], -a[1], -a[2]];
/** 長さは仕様どおり「二乗和を単精度に丸めてから平方根」。書き出し側と同じ丸めにしないと誤差が連鎖して形が崩れる */
const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
const len = (a: number[]) => {
  // 二乗和を単精度に丸め、指数を半分にした値を初期値としてニュートン法（値が変わらなくなるまで）
  f32[0] = a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
  const sq = f32[0];
  const e = (u32[0] >>> 23) & 255;
  if (e > 127) u32[0] = (u32[0] & 0x807fffff) | ((((e - 127) >> 1) + 127) << 23);
  let x0 = f32[0], x = x0;
  if (!(sq > 0)) return 0;
  for (let n = 0; n < 100; n++) { x = (x0 + sq / x0) / 2; if (x === x0) return x; x0 = x; }
  return -1;
};
/** 単位化。長さが float の機械イプシロン未満なら「向きなし」とみなす（書き出し側と同じ閾値） */
const EPS = 1.1920928955078125e-7;
function unit(a: number[]): number[] | null { const l = len(a); return l >= EPS ? [a[0] / l, a[1] / l, a[2] / l] : null; }
/** X に直交する 2 軸（仕様の MakeOrthoRep: X を単位化し、まず Y 軸、だめなら X 軸と外積をとる） */
function orthoOf(X: number[]): [number[], number[]] {
  const X2 = unit(X) ?? [1, 0, 0];
  const Z = unit(cross(X2, [0, 1, 0])) ?? unit(cross(X2, [1, 0, 0])) ?? [0, 0, 1];
  const Y = unit(cross(Z, X2)) ?? [0, 1, 0];
  return [Y, Z];
}
// 仕様の Taylor 近似。π/4 を超える角は余角に置き換えて精度を保つ（π/2 で cos がちょうど 0 になる）
const HALF_PI = Math.PI / 2, QUARTER_PI = Math.PI / 4;
function sinT(x: number): number { return x > QUARTER_PI ? cosT(HALF_PI - x) : x - (x * x * x) / 6.0 + (x * x * x * x * x) / 120.0 - (x * x * x * x * x * x * x) / 5040.0; }
function cosT(x: number): number { return x > QUARTER_PI ? sinT(HALF_PI - x) : 1.0 - (x * x) / 2.0 + (x * x * x * x) / 24.0 - (x * x * x * x * x * x) / 720.0; }
/** n を表すのに要るビット数（最低 1） */
const bitsFor = (n: number) => { let b = 1, t = 1; while (n > t) { t *= 2; b++; } return b; };

export function decodeOnce(c: any, flips: Set<number> | null, ambiguous: number[], onProgress?: (done: number, total: number) => void): DecodedMesh {
  const T: number = c.triangle_face_array?.length ?? 0;
  const pa: number[] = c.point_array ?? [];
  const tol: number = c.tolerance;
  const org: number[] = c.origin_array ?? [0, 0, 0];
  const isRef: boolean[] = c.point_is_reference_array ?? [];
  const refs: number[] = c.point_reference_array ?? [];
  const es: number[] = c.edge_status_array ?? [];
  const tf: number[] = c.triangle_face_array ?? [];
  const planar: boolean[] = c.is_face_planar ?? [];
  const nb: boolean[] = c.normal_binary_data ?? [];
  const na: number[] = c.normal_angle_array ?? [];
  const recalc: boolean = !!c.must_recalculate_normals;
  const nRev: boolean[] = c.normal_is_reversed ?? [];
  const nbits = c.normal_angle_number_of_bits ?? 0;
  const angMask = 2 ** nbits - 1;
  const angScale = (Math.PI / 2) / (2 ** nbits - 1);

  const P: number[][] = [];
  const outP = new Float32Array(T * 9);
  const outN = new Float32Array(T * 9);
  let pp = 0, ri = 0, ii = 3, bi = 0, ai = 0;
  let err = '';
  const fail = (m: string) => { err ||= m; return null; };
  const bit = (): boolean => (bi < nb.length ? !!nb[bi++] : (fail('normal bits exhausted'), false));
  const offs = (): number[] | null => { if (pp + 3 > pa.length) return fail('point array exhausted'); const r = [pa[pp] * tol, pa[pp + 1] * tol, pa[pp + 2] * tol]; pp += 3; return r; };
  const readRef = (): number | null => { if (ri >= refs.length) return fail('reference array exhausted'); const v = refs[ri++]; return v >= 0 && v < P.length ? v : fail('bad point reference'); };
  const add = (p: number[]) => { P.push(p); return P.length - 1; };

  // ---- 法線
  const normals: number[][] = [];
  type VState = { multi: boolean; list: number[] };
  const vstate = new Map<number, VState>();
  const faceNormal = new Map<number, number>();
  function nextNormal(tri: number[][]): number {
    const rt = bit(), rx = bit(), ry = bit();
    const v1 = unit(sub(tri[1], tri[0])) ?? [1, 0, 0], v2 = unit(sub(tri[2], tri[0])) ?? [0, 1, 0], v3 = unit(sub(tri[2], tri[1])) ?? [0, 0, 1];
    // 2 本の向きの直角からのずれ。ほぼ平行（|内積| > 1−1e-12）なら直角扱い（π/2）にする。
    // ほぼ一直線の三角形では 3 つとも π/2 ちょうどになり、どの軸を使うかがこれで決まる
    const off = (a0: number[], b0: number[]) => {
      const a = unit(a0) ?? a0, b = unit(b0) ?? b0; const d = dot(a, b);
      if (d > 1 - 1e-12 || d < -1 + 1e-12) return Math.PI / 2;
      return Math.abs(Math.abs(Math.acos(d)) - Math.PI / 2);
    };
    const th1 = off(v1, v2), th2 = off(v3, neg(v1)), th3 = off(neg(v2), neg(v3));
    let X: number[], Zr: number[];
    if (th1 < th2 && th1 < th3) { X = v1; Zr = cross(v1, v2); }
    else if (th2 < th3) { X = v3; Zr = cross(neg(v3), v1); }
    else { X = neg(v2); Zr = cross(v2, v3); }
    let Z = unit(Zr) ?? orthoOf(X)[1];
    if (rt) Z = neg(Z);
    let Y = unit(cross(Z, X)) ?? orthoOf(X)[0];
    if (rx) X = neg(X);
    if (ry) Y = neg(Y);
    if (ai + 2 > na.length) fail('normal angles exhausted');
    const th = ((na[ai++] ?? 0) & angMask) * angScale, ph = ((na[ai++] ?? 0) & angMask) * angScale;
    const ct = cosT(th), st = sinT(th), cp = cosT(ph), sp = sinT(ph);
    const n = unit([X[0] * ct * cp + Y[0] * st * cp + Z[0] * sp, X[1] * ct * cp + Y[1] * st * cp + Z[1] * sp, X[2] * ct * cp + Y[2] * st * cp + Z[2] * sp]) ?? Z;
    normals.push(n);
    return normals.length - 1;
  }
  /** 頂点 v の法線を 1 つ得る（ビット列を読む） */
  function vertexNormal(v: number, tri: number[][]): number {
    const s = vstate.get(v);
    if (!s) {
      const multi = bit();
      const n = nextNormal(tri);
      vstate.set(v, { multi, list: [n] });
      return n;
    }
    if (!s.multi) return s.list[0];
    if (bit()) {
      const cnt = s.list.length, k = bitsFor(cnt - 1);
      let r = 0;
      for (let j = 0; j < k; j++) if (bit()) r |= 1 << j;
      return s.list[r >= cnt ? 0 : cnt - 1 - r];
    }
    const n = nextNormal(tri);
    s.list.push(n);
    return n;
  }

  // ---- 三角形を確定し、左右の辺を積む
  const stack: Gate[] = [];
  const closed = new Set<number>();
  let pushed = 0;
  function gate(a: number, b: number, far: number): Gate {
    const A = P[a], B = P[b], F = P[far];
    const O = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
    const X = unit(sub(A, B)) ?? [1, 0, 0];
    let Z = unit(cross(sub(F, O), X));
    let Y = Z ? unit(cross(Z, X)) : null;
    if (!Z || !Y) { const [y, z] = orthoOf(X); Z = z; Y = unit(cross(Z, X)) ?? y; }
    if (dot(Y, sub(O, F)) > 0) { Y = neg(Y); Z = neg(Z); }
    return { a, b, O, X, Y, Z };
  }
  function commit(i: number, t: number[]) {
    const f = tf[i] ?? 0;
    const tri = [P[t[0]], P[t[1]], P[t[2]]];
    const vn = [0, 0, 0];
    let rev: boolean;
    const m = [(tri[0][0] + tri[1][0]) / 2, (tri[0][1] + tri[1][1]) / 2, (tri[0][2] + tri[1][2]) / 2];
    const derived = cross(sub(tri[2], m), sub(tri[1], tri[0]));
    if (recalc) {
      rev = !!nRev[i];
    } else if (planar[f]) {
      let n = faceNormal.get(f);
      if (n === undefined) {
        // 面の法線は、その面の最初の三角形の頂点 0 の法線として読む
        const s = vstate.get(t[0]);
        if (s && !s.multi) n = s.list[0];
        else n = vertexNormal(t[0], tri);
        faceNormal.set(f, n);
      }
      vn[0] = vn[1] = vn[2] = n;
      rev = dot(derived, normals[n]) < 0;
    } else {
      for (let k = 0; k < 3; k++) vn[k] = vertexNormal(t[k], tri);
      rev = dot(derived, normals[vn[0]]) < 0;
    }
    // 三角形がほぼ一直線だと向きの判定が丸め誤差次第になる。候補として記録し、外から反転を指定できるようにする
    if (!recalc && len(derived) <= 1e-9 * len(sub(tri[1], tri[0])) * len(sub(tri[2], m))) ambiguous.push(i);
    if (flips?.has(i)) rev = !rev;
    // 出力（裏返っていなければ (0,2,1)）
    const order = rev ? [0, 1, 2] : [0, 2, 1];
    let fn: number[] | null = null;
    if (recalc) { const a = tri[order[0]], b = tri[order[1]], cc = tri[order[2]]; fn = unit(cross(sub(b, a), sub(cc, a))) ?? [0, 0, 1]; }
    for (let k = 0; k < 3; k++) {
      const p = tri[order[k]], n = fn ?? normals[vn[order[k]]];
      outP.set(p, i * 9 + k * 3); outN.set(n, i * 9 + k * 3);
    }
    // 左右
    let R = [t[1], t[2], t[0]], L = [t[0], t[2], t[1]];
    if (rev) { const x = R; R = L; L = x; }
    const st = (es[i] ?? 0) & 3;
    pushed = 0;
    const lo = (e: number[]) => (e[0] < e[1] ? [e[0], e[1], e[2]] : [e[1], e[0], e[2]]);
    const r = lo(R), l = lo(L);
    if (!(st & 1)) closed.add(KEY(r[0], r[1]));
    if (!(st & 2)) closed.add(KEY(l[0], l[1]));
    if (st & 1) { stack.push(gate(r[0], r[1], r[2])); pushed++; }
    if (st & 2) { stack.push(gate(l[0], l[1], l[2])); pushed++; }
  }

  function seed(): number[] | null {
    const flags = [isRef[ii], isRef[ii + 1], isRef[ii + 2]];
    if (ii + 3 > isRef.length) return fail('reference flags exhausted');
    ii += 3;
    const idx: number[] = [];
    for (let k = 0; k < 3; k++) {
      if (flags[k]) { const v = readRef(); if (v === null) return null; idx.push(v); continue; }
      const d = offs(); if (!d) return null;
      if (k === 0) idx.push(add([org[0] + d[0], org[1] + d[1], org[2] + d[2]]));
      else if (k === 1) { const q = P[idx[0]]; idx.push(add([q[0] + d[0], q[1] + d[1], q[2] + d[2]])); }
      else { const a = P[idx[0]], b = P[idx[1]]; idx.push(add([(a[0] + b[0]) / 2 + d[0], (a[1] + b[1]) / 2 + d[1], (a[2] + b[2]) / 2 + d[2]])); }
    }
    if (idx[0] > idx[1]) [idx[0], idx[1]] = [idx[1], idx[0]];
    return idx;
  }

  let i = 0;
  if (T > 0) {
    // 最初の三角形は常に新しい 3 点
    const d0 = offs(), d1 = offs(), d2 = offs();
    if (d0 && d1 && d2) {
      const V0 = [org[0] + d0[0], org[1] + d0[1], org[2] + d0[2]];
      const V1 = [V0[0] + d1[0], V0[1] + d1[1], V0[2] + d1[2]];
      const V2 = [(V0[0] + V1[0]) / 2 + d2[0], (V0[1] + V1[1]) / 2 + d2[1], (V0[2] + V1[2]) / 2 + d2[2]];
      commit(0, [add(V0), add(V1), add(V2)]);
      i = 1;
    }
  }
  for (; i < T && !err; i++) {
    let t: number[] | null = null;
    if (!stack.length) t = seed();
    else {
      let g = stack.pop()!;
      let fresh = false;
      if (pushed === 0) {
        while (closed.has(KEY(g.a, g.b))) {
          if (!stack.length) { t = seed(); fresh = true; break; }
          g = stack.pop()!;
        }
      }
      if (!fresh) {
        if (ii >= isRef.length) { fail('reference flags exhausted'); break; }
        let ap: number | null;
        if (isRef[ii++]) ap = readRef();
        else {
          const d = offs();
          ap = d ? add([g.O[0] + d[0] * g.X[0] + d[1] * g.Y[0] + d[2] * g.Z[0], g.O[1] + d[0] * g.X[1] + d[1] * g.Y[1] + d[2] * g.Z[1], g.O[2] + d[0] * g.X[2] + d[1] * g.Y[2] + d[2] * g.Z[2]]) : null;
        }
        if (ap !== null) t = [g.a, g.b, ap];
      }
    }
    if (!t) break;
    commit(i, t);
    if (onProgress && (i & 4095) === 0) onProgress(i, T);
  }
  const n = err ? i : Math.min(i, T);
  let ok = !err && n === T;
  let note = err ? `${err} at ${i}/${T}` : '';
  if (ok && (pp !== pa.length || ri !== refs.length || ii !== isRef.length)) { ok = false; note = `points ${pp / 3}/${pa.length / 3}, refs ${ri}/${refs.length}, flags ${ii}/${isRef.length}`; }
  if (ok && !recalc && (bi !== nb.length || ai !== na.length)) { ok = false; note = `normal bits ${bi}/${nb.length}, angles ${ai}/${na.length}`; }
  return { positions: outP.subarray(0, n * 9), normals: outN.subarray(0, n * 9), faceOfTriangle: Int32Array.from(tf.slice(0, n)), triangles: n, ok, note };
}

/** 法線と三角形の向きが最初に食い違う三角形の番号（誤った分岐を見分ける目安。食い違いがなければ三角形数） */
export function firstDisagreement(m: DecodedMesh, skip: number[] = []): number {
  const sk = new Set(skip);
  const P = m.positions, N = m.normals;
  for (let i = 0; i < m.triangles; i++) {
    if (sk.has(i)) continue;
    const o = i * 9;
    const u = [P[o + 3] - P[o], P[o + 4] - P[o + 1], P[o + 5] - P[o + 2]], v = [P[o + 6] - P[o], P[o + 7] - P[o + 1], P[o + 8] - P[o + 2]];
    const g = cross(u, v); const gl = Math.hypot(g[0], g[1], g[2]);
    if (!(gl > 1e-7 * (Math.hypot(u[0], u[1], u[2]) * Math.hypot(v[0], v[1], v[2]) + 1e-300))) continue;
    for (let k = 0; k < 3; k++) if ((g[0] * N[o + k * 3] + g[1] * N[o + k * 3 + 1] + g[2] * N[o + k * 3 + 2]) / gl < -0.2) return i;
  }
  return m.ok ? m.triangles + 1 : m.triangles;
}

/**
 * 圧縮メッシュを復元する。ほぼ一直線の三角形では表裏の判定が丸め誤差で揺れるため、
 * 検証（全データをちょうど使い切る）に通らなければ、そうした三角形ごとに判定を反転した場合と比べ、
 * 法線との食い違いが遅く現れる方を採る。
 */
export function decodeTess3DCompressed(c: any, onProgress?: (done: number, total: number) => void, maxTries = 24): DecodedMesh {
  let amb: number[] = [];
  let best = decodeOnce(c, null, amb, onProgress);
  if (best.ok) return best;
  if (!amb.length) return truncate(best, firstDisagreement(best, amb));
  const flips = new Set<number>();
  let bestBad = firstDisagreement(best, amb);
  let tries = 0;
  for (let j = 0; j < amb.length && tries < maxTries; j++) {
    const i = amb[j];
    if (i > bestBad) break;
    flips.add(i); tries++;
    const a2: number[] = [];
    const m = decodeOnce(c, flips, a2);
    if (m.ok) return { ...m, note: `orientation of ${flips.size} near-degenerate triangle(s) resolved` };
    const bad = firstDisagreement(m, a2);
    if (bad > bestBad) { best = m; bestBad = bad; amb = a2; j = amb.indexOf(i); }
    else flips.delete(i);
  }
  return truncate(best, Math.min(bestBad, best.triangles));
}

/** 検証に通らなかったメッシュは、法線と食い違い始める手前までに切り詰める（崩れた三角形を表示しない） */
function truncate(m: DecodedMesh, n: number): DecodedMesh {
  if (n >= m.triangles) return m;
  return { ...m, positions: m.positions.subarray(0, n * 9), normals: m.normals.subarray(0, n * 9), faceOfTriangle: m.faceOfTriangle.subarray(0, n), triangles: n, note: `${m.note}; kept ${n} triangles` };
}
