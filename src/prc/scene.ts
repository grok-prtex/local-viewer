/**
 * PRC を「表示用メッシュ＋部品ツリー」にまとめます（Worker 内で実行）。
 *  - 圧縮メッシュ（TESS_3D_Compressed）は tess3dc.ts で復元
 *  - 通常メッシュ（TESS_3D）は三角形・扇・帯を展開
 *  - 部品ツリーは製品（ProductOccurrence）→ 部品（PartDefinition）→ 表現（RepresentationItem）→ メッシュの順にたどる。
 *    ツリーが読めない場合はメッシュを平らに並べる
 */
import { parsePrc, type PrcFile, type PrcFS } from './parse';
import { decodeTess3DCompressed } from './tess3dc';

export interface PrcMesh {
  name: string;
  positions: Float32Array;
  normals: Float32Array | null;
  /** 三角形ごとの色番号（colors の添字） */
  colorOfTriangle: Int32Array;
  colors: [number, number, number, number][];
  matrix: number[];
  ok: boolean;
}
export interface PrcNode { name: string; meshes: number[]; children: PrcNode[] }
export interface PrcScene {
  meshes: PrcMesh[];
  tree: PrcNode | null;
  /** メッシュを 1 つも持たない（B-rep のみ） */
  brepOnly: boolean;
  stats: { meshes: number; verified: number; triangles: number; treeFromFile: boolean };
  warnings: string[];
}

const ID = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a: number[], b: number[]): number[] {
  const r = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) for (let k = 0; k < 4; k++) r[c * 4 + rr] += a[k * 4 + rr] * b[c * 4 + k];
  return r;
}
/** 製品の配置（PRC の Transformation）を 4×4（列優先）に */
export function locationMatrix(loc: any): number[] {
  if (!loc) return ID;
  if (Array.isArray(loc.general_transform) && loc.general_transform.length === 16) return loc.general_transform.slice();
  const t = loc.transform;
  if (!t) return ID;
  const b = t.behavior ?? 0;
  const v = (p: any, d: number[]) => (p ? [p.x ?? 0, p.y ?? 0, p.z ?? 0] : d);
  let X = [1, 0, 0], Y = [0, 1, 0];
  if (b & 2) { X = v(t.x_axis, X); Y = v(t.y_axis, Y); }
  let Z = [X[1] * Y[2] - X[2] * Y[1], X[2] * Y[0] - X[0] * Y[2], X[0] * Y[1] - X[1] * Y[0]];
  if (b & 4) Z = [-Z[0], -Z[1], -Z[2]];
  let s = [1, 1, 1];
  if (b & 8) { const u = t.uniform_scale ?? 1; s = [u, u, u]; }
  if (b & 16) s = v(t.scale, s);
  const T = b & 1 ? v(t.translation, [0, 0, 0]) : [0, 0, 0];
  return [X[0] * s[0], X[1] * s[0], X[2] * s[0], 0, Y[0] * s[1], Y[1] * s[1], Y[2] * s[1], 0, Z[0] * s[2], Z[1] * s[2], Z[2] * s[2], 0, T[0], T[1], T[2], 1];
}

function nameOf(o: any): string {
  let b = o?.base;
  for (let i = 0; i < 4 && b; i++) { const n = b.entity_name; if (n && !n.same_name && n.name) return String(n.name); b = b.base; }
  return '';
}

/** 面の線属性（スタイル番号、1 始まり）→ RGBA */
function styleColor(fs: PrcFS, biasedStyle: number): [number, number, number, number] {
  const g = fs.globals?.global_data;
  const st = g?.styles?.[biasedStyle - 1];
  const fallback: [number, number, number, number] = [0.72, 0.74, 0.78, 1];
  if (!st) return fallback;
  let rgb: number[] | null = null;
  if (st.is_material) {
    const m = g.materials?.[st.biased_color_index - 1];
    const ci = m?.index_diffuse ?? m?.biased_index_diffuse ?? m?.index_ambient;
    const c = typeof ci === 'number' ? g.colors?.[Math.floor(ci / 3)] ?? g.colors?.[Math.floor((ci - 1) / 3)] : null;
    if (c) rgb = [c.red, c.green, c.blue];
  } else if (st.biased_color_index > 0) {
    const c = g.colors?.[Math.floor((st.biased_color_index - 1) / 3)];
    if (c) rgb = [c.red, c.green, c.blue];
  }
  if (!rgb) return fallback;
  const a = st.is_transparency && st.transparency >= 0 ? Math.max(0.15, 1 - st.transparency / 255) : 1;
  return [rgb[0], rgb[1], rgb[2], a];
}

/** 通常メッシュ（TESS_3D）の展開 */
export function expandTess3D(c: any): { positions: Float32Array; normals: Float32Array | null; faceOfTriangle: Int32Array } {
  const P: number[] = c.tessellation_coordinates?.coordinates ?? [];
  const N: number[] = c.normal_coordinates ?? [];
  const I: number[] = c.triangulated_index_array ?? [];
  const pos: number[] = [], nor: number[] = [], face: number[] = [];
  const faces: any[] = c.face_tessellation_data ?? [];
  const put = (n: number, p: number, f: number) => { pos.push(P[p], P[p + 1], P[p + 2]); nor.push(N[n] ?? 0, N[n + 1] ?? 0, N[n + 2] ?? 1); face.push(f); };
  faces.forEach((fd, fi) => {
    let k = fd.start_triangulated ?? 0;
    const sizes: number[] = fd.triangulateddata ?? [];
    const tex = fd.number_of_textured_coordinate_indices ?? 0;
    const flags: number = fd.used_entities_flag ?? 0;
    let si = 0;
    const vert = () => { const n = I[k]; k += 1 + tex; const p = I[k]; k++; return [n, p]; };
    const vertP = () => { k += tex; const p = I[k]; k++; return p; };
    const tri = (a: number[], b: number[], cc: number[]) => { put(a[0], a[1], fi); put(b[0], b[1], fi); put(cc[0], cc[1], fi); };
    // 種類ごとに順に並ぶ（三角形 → 扇 → 帯 → それぞれの「法線 1 つ」版）
    if (flags & 0x2) { const n = sizes[si++] ?? 0; for (let i = 0; i < n; i++) tri(vert(), vert(), vert()); }
    if (flags & 0x4) { const nf = sizes[si++] ?? 0; for (let f = 0; f < nf; f++) { const cnt = (sizes[si++] ?? 0) & 0x7fffffff; const v0 = vert(); let prev = vert(); for (let i = 2; i < cnt; i++) { const cur = vert(); tri(v0, prev, cur); prev = cur; } } }
    if (flags & 0x8) { const ns = sizes[si++] ?? 0; for (let s = 0; s < ns; s++) { const cnt = (sizes[si++] ?? 0) & 0x7fffffff; let a = vert(), b = vert(); for (let i = 2; i < cnt; i++) { const cur = vert(); if (i % 2) tri(b, a, cur); else tri(a, b, cur); a = b; b = cur; } } }
    if (flags & 0x20) { const n = sizes[si++] ?? 0; for (let i = 0; i < n; i++) { const nn = I[k++]; const a = vertP(), b = vertP(), cc = vertP(); tri([nn, a], [nn, b], [nn, cc]); } }
    if (flags & 0x40) { const nf = sizes[si++] ?? 0; for (let f = 0; f < nf; f++) { const cnt = (sizes[si++] ?? 0) & 0x7fffffff; const nn = I[k++]; const v0 = vertP(); let prev = vertP(); for (let i = 2; i < cnt; i++) { const cur = vertP(); tri([nn, v0], [nn, prev], [nn, cur]); prev = cur; } } }
    if (flags & 0x80) { const ns = sizes[si++] ?? 0; for (let s = 0; s < ns; s++) { const cnt = (sizes[si++] ?? 0) & 0x7fffffff; const nn = I[k++]; let a = vertP(), b = vertP(); for (let i = 2; i < cnt; i++) { const cur = vertP(); if (i % 2) tri([nn, b], [nn, a], [nn, cur]); else tri([nn, a], [nn, b], [nn, cur]); a = b; b = cur; } } }
  });
  const bad = pos.some((x) => !Number.isFinite(x));
  return { positions: new Float32Array(bad ? [] : pos), normals: c.must_calculate_normals || !N.length ? null : new Float32Array(nor), faceOfTriangle: new Int32Array(face.filter((_, i) => i % 3 === 0)) };
}

export async function buildPrcScene(buf: Uint8Array, onProgress?: (p: number, label: string) => void, cancelled?: () => boolean): Promise<PrcScene> {
  const file: PrcFile = await parsePrc(buf, { onProgress: (p) => onProgress?.(p * 0.3, 'parse') });
  const warnings = [...file.warnings];
  const meshes: PrcMesh[] = [];
  // fs 番号・テッセレーション番号 → meshes の添字
  const meshOf = new Map<string, number>();
  let total = 0, done = 0;
  for (const fs of file.fs) total += fs.tess.length;
  let verified = 0, tris = 0;
  for (let fi = 0; fi < file.fs.length; fi++) {
    const fs = file.fs[fi];
    for (let ti = 0; ti < fs.tess.length; ti++) {
      if (cancelled?.()) throw new Error('cancelled');
      const c = fs.tess[ti]?.id; done++;
      onProgress?.(0.3 + 0.7 * (done / Math.max(1, total)), 'mesh');
      if (!c) continue;
      let positions: Float32Array, normals: Float32Array | null, faceOf: Int32Array, ok = true;
      try {
        if (c._t === 'PRC_TYPE_TESS_3D_Compressed') {
          const m = decodeTess3DCompressed(c);
          positions = m.positions; normals = m.normals; faceOf = m.faceOfTriangle; ok = m.ok;
          if (!ok) warnings.push(`tess ${fi}/${ti}: ${m.note}`);
        } else if (c._t === 'PRC_TYPE_TESS_3D') {
          const m = expandTess3D(c); positions = m.positions; normals = m.normals; faceOf = m.faceOfTriangle;
        } else continue;
      } catch (e) { warnings.push(`tess ${fi}/${ti}: ${(e as Error).message}`); continue; }
      if (!positions.length) continue;
      // 面ごとの色
      const la: number[] = c.line_attribute_array ?? [];
      const faceStyle = (f: number) => (c._t === 'PRC_TYPE_TESS_3D' ? c.face_tessellation_data?.[f]?.line_attributes?.[0] ?? 0 : la[f] ?? la[0] ?? 0);
      const colorIdx = new Map<number, number>(); const colors: [number, number, number, number][] = [];
      const cot = new Int32Array(faceOf.length);
      for (let i = 0; i < faceOf.length; i++) {
        const s = faceStyle(faceOf[i]);
        let k = colorIdx.get(s);
        if (k === undefined) { k = colors.length; colorIdx.set(s, k); colors.push(styleColor(fs, s)); }
        cot[i] = k;
      }
      if (ok) verified++;
      tris += positions.length / 9;
      meshOf.set(`${fi}/${ti}`, meshes.length);
      meshes.push({ name: '', positions, normals, colorOfTriangle: cot, colors, matrix: ID, ok });
    }
  }

  // 部品ツリー
  let tree: PrcNode | null = null;
  const placed: { mesh: number; matrix: number[]; name: string }[] = [];
  try {
    const roots: PrcNode[] = [];
    const visit = (fi: number, pi: number, M: number[], depth: number): PrcNode | null => {
      const fs = file.fs[fi]; const pr = fs?.tree?.products?.[pi];
      if (!pr || depth > 64) return null;
      const MM = pr.has_transformation ? mul(M, locationMatrix(pr.location)) : M;
      const node: PrcNode = { name: nameOf(pr) || `product ${pi + 1}`, meshes: [], children: [] };
      const ref = pr.references_product_occurrence ?? {};
      const addPart = (bi: number) => {
        const part = fs.tree?.parts?.[bi - 1]; if (!part) return;
        const walk = (items: any[]) => {
          for (const ri of items ?? []) {
            const d = ri?.data ?? ri; const ic = d?.item_content;
            if (d?.elements || d?.representation_items) walk(d.elements ?? d.representation_items);
            const bt = ic?.biased_index_tessellation ?? 0;
            if (bt > 0) {
              const mi = meshOf.get(`${fi}/${bt - 1}`);
              if (mi !== undefined) { node.meshes.push(placed.length); placed.push({ mesh: mi, matrix: MM, name: nameOf(ic) || nameOf(part) || node.name }); }
            }
          }
        };
        walk(part.representation_items);
      };
      if (ref.biased_index_part > 0) addPart(ref.biased_index_part);
      if (ref.biased_index_prototype > 0) { const ch = visit(fi, ref.biased_index_prototype - 1, MM, depth + 1); if (ch) { node.meshes.push(...ch.meshes); node.children.push(...ch.children); } }
      for (const ci of ref.index_child_occurrence ?? []) { const ch = visit(fi, ci, MM, depth + 1); if (ch) node.children.push(ch); }
      return node;
    };
    file.fs.forEach((fs, fi) => {
      const prods: any[] = fs.tree?.products ?? [];
      const isChild = new Set<number>();
      prods.forEach((p) => { for (const c of p.references_product_occurrence?.index_child_occurrence ?? []) isChild.add(c); const pt = p.references_product_occurrence?.biased_index_prototype; if (pt > 0) isChild.add(pt - 1); });
      prods.forEach((_, pi) => { if (!isChild.has(pi)) { const n = visit(fi, pi, ID, 0); if (n) roots.push(n); } });
    });
    const prune = (n: PrcNode): PrcNode | null => { n.children = n.children.map(prune).filter(Boolean) as PrcNode[]; return n.meshes.length || n.children.length ? n : null; };
    const kept = roots.map(prune).filter(Boolean) as PrcNode[];
    if (kept.length && placed.length) tree = kept.length === 1 ? kept[0] : { name: nameOf(file.model) || 'PRC', meshes: [], children: kept };
  } catch (e) { warnings.push('tree: ' + (e as Error).message); tree = null; }

  let out: PrcMesh[];
  if (tree && placed.length) {
    // ツリーが参照しなかったメッシュも残す（取りこぼし防止）
    const used = new Set(placed.map((p) => p.mesh));
    out = placed.map((p) => ({ ...meshes[p.mesh], matrix: p.matrix, name: p.name }));
    const rest = meshes.map((_m, i) => (used.has(i) ? -1 : i)).filter((i) => i >= 0);
    if (rest.length) { const n: PrcNode = { name: 'other meshes', meshes: [], children: [] }; for (const i of rest) { n.meshes.push(out.length); out.push({ ...meshes[i], name: `mesh ${i + 1}` }); } tree.children.push(n); }
  } else {
    out = meshes.map((mm, i) => ({ ...mm, name: `mesh ${i + 1}` }));
    tree = out.length > 1 ? { name: nameOf(file.model) || 'PRC', meshes: out.map((_, i) => i), children: [] } : null;
  }
  return { meshes: out, tree, brepOnly: meshes.length === 0, stats: { meshes: meshes.length, verified, triangles: tris, treeFromFile: !!(tree && placed.length) }, warnings };
}
