/**
 * PRC ファイル（ISO 14739-1）を読み、ツリー（製品・部品）とテッセレーション（三角形メッシュ）を取り出します。
 * B-rep（厳密形状）のジオメトリ節は読みません（メッシュが無い場合は「B-rep のみ」と報告）。
 */
import { R } from './bits';
import * as G from './gen';
import { evalSchema } from './schema';

export interface PrcFS { tree: any; tess: any[]; globals: any; error?: string; uuid?: string }
export interface PrcFile { version: number; fs: PrcFS[]; model: any; hasGeometry: boolean[]; warnings: string[] }

function u32(b: Uint8Array, o: number) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  // 末尾に余りがあっても、そこまでに展開できた分を使います
  const ds = new DecompressionStream('deflate');
  const w = ds.writable.getWriter();
  w.write(data as BufferSource).catch(() => {}); w.close().catch(() => {});
  const rd = ds.readable.getReader();
  const chunks: Uint8Array[] = []; let n = 0;
  try { for (;;) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); n += value.length; } } catch (e) { if (!n) throw e; }
  const out = new Uint8Array(n); let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

class Ctx {
  authoring_version = 0; num_fsi = 0;
  current_name = ''; layer_index = 0; index_of_line_style = 0; behavior_bit_field = 0;
  ContentCurve_is_3d_flag = false; PRC_TYPE_CRV_NURBS_is_rational = false;
  VertexColors_number_of_colors = 0; inWire = false;
  schema = new Map<number, number[]>();
  t3dw = { n: 0, set0: (_c: unknown, idx: number[]) => { this.t3dw.n = countWire(idx); }, set1: () => {} };
  t3dc = {
    enter: () => {}, leave: () => {}, on_point_color: () => {}, get_points: () => {},
    number_of_referenced_points: (a: boolean[]) => { let c = 0; for (const x of a) if (x) c++; return c; },
    number_of_faces_stored_in_mesh: (tf: number[]) => { let m = -1; for (const x of tf) if (x > m) m = x; return m + 1; },
  };
  get_authoring_version() { return this.authoring_version; }
  get_num_fsi() { return this.num_fsi; }
  se(r: R, type: number) { if (this.schema.size) evalSchema(r, this.schema, type, this); }
  TESS_3D_Wire__enter() { this.inWire = true; this.VertexColors_number_of_colors = 0; }
  TESS_3D_Wire__leave() { this.inWire = false; }
  TESS_3D_Wire__is_inside() { return this.inWire; }
  VertexColors_get_number_of_colors() { return this.inWire ? this.t3dw.n : this.VertexColors_number_of_colors; }
  set_num_vertex_colors_from_tess_3d_face(_flag: number, td: number[]) { let n = 0; for (const x of td) n += 3 * x; this.VertexColors_number_of_colors = n; }
  have_bbox() { return false; }
}
function countWire(idx: number[]) {
  // wire_indexes: [フラグ付き点数, 点インデックス...] の繰り返し
  let n = 0, i = 0;
  while (i < idx.length) { const c = idx[i] & 0x0fffffff; n += c; i += c + 1; }
  return n;
}

function readSchema(r: R, ctx: Ctx) {
  const s = G.r_Schema(r, ctx) as any;
  for (const e of s.schemas) ctx.schema.set(e.entity_type, e.schema_tokens);
}

export async function parsePrc(buf: Uint8Array, opts: { onProgress?: (p: number) => void } = {}): Promise<PrcFile> {
  if (buf[0] !== 0x50 || buf[1] !== 0x52 || buf[2] !== 0x43) throw new Error('PRC: not a PRC file');
  const version = u32(buf, 7);
  let o = 3 + 4 + 4 + 16 + 16;
  const nfs = u32(buf, o); o += 4;
  if (nfs > 10000) throw new Error('PRC: bad header');
  const fsd: { offsets: number[]; uuid: string }[] = [];
  for (let i = 0; i < nfs; i++) {
    const uuid = [0, 4, 8, 12].map((k) => u32(buf, o + k)).join(',');
    o += 16 + 4; const nsec = u32(buf, o); o += 4;
    const offsets: number[] = []; for (let j = 0; j < nsec; j++) { offsets.push(u32(buf, o)); o += 4; }
    fsd.push({ offsets, uuid });
  }
  const mfStart = u32(buf, o), mfEnd = u32(buf, o + 4);
  const all = [...fsd.flatMap((f) => f.offsets), mfStart, mfEnd, buf.length].sort((a, b) => a - b);
  const next = (x: number) => all.find((y) => y > x) ?? buf.length;
  const sec = (x: number) => inflate(buf.subarray(x, next(x)));
  const ctx = new Ctx(); ctx.authoring_version = version; ctx.num_fsi = nfs;
  const warnings: string[] = [];
  const fs: PrcFS[] = []; const hasGeometry: boolean[] = [];
  for (let i = 0; i < nfs; i++) {
    const off = fsd[i].offsets; // [header, globals, tree, tess, geom, extgeom]
    const item: PrcFS = { tree: null, tess: [], globals: null, uuid: fsd[i].uuid };
    try {
      ctx.schema = new Map();
      const g = new R(await sec(off[1])); readSchema(g, ctx); item.globals = G.r_PRC_TYPE_ASM_FileStructureGlobals(g, ctx);
    } catch (e) { warnings.push(`globals[${i}]: ${(e as Error).message}`); }
    try { const t = new R(await sec(off[2])); item.tree = G.r_PRC_TYPE_ASM_FileStructureTree(t, ctx); } catch (e) { warnings.push(`tree[${i}]: ${(e as Error).message}`); item.error = String((e as Error).message); }
    try {
      const t = new R(await sec(off[3]));
      const tr = G.r_PRC_TYPE_ASM_FileStructureTessellation(t, ctx) as any;
      item.tess = tr.tess;
    } catch (e) { warnings.push(`tess[${i}]: ${(e as Error).message}`); item.error = (item.error ? item.error + '; ' : '') + (e as Error).message; }
    try { const gb = await sec(off[4]); hasGeometry.push(gb.length > 16); } catch { hasGeometry.push(false); }
    fs.push(item);
    opts.onProgress?.((i + 1) / (nfs + 1));
  }
  let model: any = null;
  try { const m = new R(await inflate(buf.subarray(mfStart, mfEnd > mfStart ? mfEnd : buf.length))); ctx.schema = new Map(); readSchema(m, ctx); model = G.r_PRC_TYPE_ASM_ModelFile(m, ctx); } catch (e) { warnings.push('model: ' + (e as Error).message); }
  return { version, fs, model, hasGeometry, warnings };
}
