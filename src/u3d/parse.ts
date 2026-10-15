/*
 * U3D（ECMA-363）の最小パーサー。CLOD メッシュのベースメッシュ、ノードの変換、
 * シェーダー → マテリアルの拡散色を読み取り、三角形メッシュとして返します。
 * プログレッシブ（解像度を段階的に増やす）部分の復号には未対応です。
 */
import { BitReader } from './bitstream';

const T = {
  header: 0x00443355, chain: 0xffffff14, group: 0xffffff21, model: 0xffffff22,
  clodDecl: 0xffffff31, clodBase: 0xffffff3b, clodProg: 0xffffff3c, shading: 0xffffff45,
  shader: 0xffffff53, material: 0xffffff54,
};
const STATIC_FULL = 0x400;

export interface U3DMesh { name: string; positions: Float32Array; normals: Float32Array | null; colors: number[]; materialOfFace: Uint32Array; matrix: number[]; }
export interface U3DResult { meshes: U3DMesh[]; progressiveSkipped: number; }

interface Block { type: number; data: Uint8Array; }
interface Decl { excludeNormals: boolean; materials: { diffuse: boolean; specular: boolean; layers: number }[]; }
interface Node { parents: { name: string; m: number[] }[]; resource?: string; }

function readBlocks(buf: Uint8Array, start: number, end: number, out: Block[]) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let o = start;
  while (o + 12 <= end) {
    const type = dv.getUint32(o, true), ds = dv.getUint32(o + 4, true), ms = dv.getUint32(o + 8, true);
    const body = o + 12;
    if (body + ds > buf.length) break;
    if (type === T.chain) {
      let p = body; const nl = dv.getUint16(p, true); p += 2 + nl;
      p += 4; // chain type
      const attr = dv.getUint32(p, true); p += 4;
      if (attr & 1) p += 16;
      if (attr & 2) p += 24;
      p = (p + 3) & ~3;
      p += 4; // count
      readBlocks(buf, p, body + ds, out);
    } else out.push({ type, data: buf.subarray(body, body + ds) });
    o = ((body + ds + 3) & ~3) + ms; o = (o + 3) & ~3;
  }
}

const mul = (a: number[], b: number[]) => {
  const r = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) for (let k = 0; k < 4; k++) r[c * 4 + rr] += a[k * 4 + rr] * b[c * 4 + k];
  return r;
};
const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export function parseU3D(input: Uint8Array): U3DResult {
  if (input[0] !== 0x55 || input[1] !== 0x33 || input[2] !== 0x44 || input[3] !== 0) throw new Error('not u3d');
  const blocks: Block[] = []; readBlocks(input, 0, input.length, blocks);
  const decls = new Map<string, Decl>();
  const nodes = new Map<string, Node>();
  const shadingOf = new Map<string, string[][]>(); // model node name → shader 名のリスト
  const shaderMat = new Map<string, string>();
  const matColor = new Map<string, number[]>();
  const meshes: U3DMesh[] = []; let progressiveSkipped = 0;
  const bases: { name: string; b: BitReader }[] = [];

  for (const blk of blocks) {
    const r = new BitReader(blk.data);
    switch (blk.type) {
      case T.group: case T.model: {
        const name = r.str(); const n = r.u32(); const parents = [];
        for (let i = 0; i < n; i++) { const pn = r.str(); const m = []; for (let k = 0; k < 16; k++) m.push(r.f32()); parents.push({ name: pn, m }); }
        const node: Node = { parents };
        if (blk.type === T.model) node.resource = r.str();
        nodes.set(name, node); break;
      }
      case T.clodDecl: {
        const name = r.str(); r.u32(); const attr = r.u32();
        for (let i = 0; i < 6; i++) r.u32();
        const nm = r.u32(); const materials = [];
        for (let i = 0; i < nm; i++) {
          const a = r.u32(); const layers = r.u32();
          for (let j = 0; j < layers; j++) r.u32();
          r.u32();
          materials.push({ diffuse: !!(a & 1), specular: !!(a & 2), layers });
        }
        decls.set(name, { excludeNormals: !!(attr & 1), materials }); break;
      }
      case T.clodBase: bases.push({ name: r.str(), b: r }); break;
      case T.clodProg: progressiveSkipped++; break;
      case T.shading: {
        const name = r.str(); r.u32(); r.u32(); const nl = r.u32(); const lists: string[][] = [];
        for (let i = 0; i < nl; i++) { const c = r.u32(); const l = []; for (let j = 0; j < c; j++) l.push(r.str()); lists.push(l); }
        shadingOf.set(name, lists); break;
      }
      case T.shader: {
        const name = r.str(); r.u32(); r.f32(); r.u32(); r.u32(); r.u32(); r.u32(); r.u32();
        shaderMat.set(name, r.str()); break;
      }
      case T.material: {
        const name = r.str(); r.u32(); for (let i = 0; i < 3; i++) r.f32();
        matColor.set(name, [r.f32(), r.f32(), r.f32()]); break;
      }
    }
  }

  // ベースメッシュの復号
  const geom = new Map<string, Omit<U3DMesh, 'matrix' | 'colors' | 'name'>>();
  for (const { name, b } of bases) {
    const d = decls.get(name); if (!d) continue;
    b.u32(); // chain index
    const nf = b.u32(), np = b.u32(), nn = b.u32(), nd = b.u32(), ns = b.u32(), nt = b.u32();
    if (nf > 5e6 || np > 1e7) throw new Error('too large');
    const pos = new Float32Array(np * 3); for (let i = 0; i < np * 3; i++) pos[i] = b.f32();
    const nor = new Float32Array(nn * 3); for (let i = 0; i < nn * 3; i++) nor[i] = b.f32();
    for (let i = 0; i < nd * 4 + ns * 4 + nt * 4; i++) b.f32();
    const outP = new Float32Array(nf * 9);
    const outN = !d.excludeNormals && nn ? new Float32Array(nf * 9) : null;
    const mof = new Uint32Array(nf);
    for (let f = 0; f < nf; f++) {
      const mi = b.compressedU32(1); mof[f] = mi;
      const m = d.materials[mi] ?? { diffuse: false, specular: false, layers: 0 };
      for (let c = 0; c < 3; c++) {
        const pi = b.compressedU32(STATIC_FULL + np);
        if (pi >= np) throw new Error('corrupt index');
        const ni = d.excludeNormals ? 0 : b.compressedU32(STATIC_FULL + nn);
        if (m.diffuse) b.compressedU32(STATIC_FULL + nd);
        if (m.specular) b.compressedU32(STATIC_FULL + ns);
        for (let j = 0; j < m.layers; j++) b.compressedU32(STATIC_FULL + nt);
        outP.set(pos.subarray(pi * 3, pi * 3 + 3), f * 9 + c * 3);
        if (outN && ni < nn) outN.set(nor.subarray(ni * 3, ni * 3 + 3), f * 9 + c * 3);
      }
    }
    geom.set(name, { positions: outP, normals: outN, materialOfFace: mof });
  }

  // ノードのワールド変換（複数の親はそれぞれのインスタンスとして展開）
  const worlds = (name: string, depth = 0): number[][] => {
    const n = nodes.get(name);
    if (!n || depth > 32) return [I];
    if (!n.parents.length) return [I];
    const out: number[][] = [];
    for (const p of n.parents) for (const w of (p.name && nodes.has(p.name) ? worlds(p.name, depth + 1) : [I])) { out.push(mul(w, p.m)); if (out.length > 64) return out; }
    return out;
  };
  const colorFor = (model: string, mi: number) => {
    const lists = shadingOf.get(model);
    const sh = lists?.[mi]?.[0] ?? lists?.[0]?.[0];
    const c = sh ? matColor.get(shaderMat.get(sh) ?? '') : undefined;
    return c ? (Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255) : 0x9aa3ab;
  };
  let instanced = false;
  nodes.forEach((n, name) => {
    if (!n.resource) return;
    const g = geom.get(n.resource); if (!g) return;
    instanced = true;
    const nmat = Math.max(1, ...Array.from(g.materialOfFace).map((x) => x + 1));
    const colors = Array.from({ length: nmat }, (_, i) => colorFor(name, i));
    for (const m of worlds(name)) meshes.push({ name, ...g, colors, matrix: m });
  });
  if (!instanced) geom.forEach((g, name) => meshes.push({ name, ...g, colors: [0x9aa3ab], matrix: I }));
  return { meshes, progressiveSkipped };
}
