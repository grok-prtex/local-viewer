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
  // 0x02 回転（X・Y 軸）、0x04 鏡映、0x08 一様拡大、0x10 非一様拡大、0x20 非直交行列（3 軸）
  let X = [1, 0, 0], Y = [0, 1, 0];
  let Z: number[] | null = null;
  if (b & 32 && Array.isArray(t.non_ortho_matrix)) { X = v(t.non_ortho_matrix[0], X); Y = v(t.non_ortho_matrix[1], Y); Z = v(t.non_ortho_matrix[2], [0, 0, 1]); }
  else if (b & 2 && Array.isArray(t.rotation)) { X = v(t.rotation[0], X); Y = v(t.rotation[1], Y); }
  if (!Z) { Z = [X[1] * Y[2] - X[2] * Y[1], X[2] * Y[0] - X[0] * Y[2], X[0] * Y[1] - X[1] * Y[0]]; if (b & 4) Z = [-Z[0], -Z[1], -Z[2]]; }
  let s = [1, 1, 1];
  if (b & 8 && typeof t.scale === 'number') s = [t.scale, t.scale, t.scale];
  if (b & 16) s = v(t.non_uniform_scale, s);
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
    // 材質（Material）か、材質を指すテクスチャ適用（TextureApplication）。拡散色→環境色の順に使う
    let m = g.materials?.[st.biased_color_index - 1]; m = m?.id ?? m;
    for (let hop = 0; hop < 4 && m?._t === 'PRC_TYPE_GRAPH_TextureApplication'; hop++) { const n = g.materials?.[(m.biased_material_generic_index ?? 0) - 1]; m = n?.id ?? n; }
    const ci = m?.biased_diffuse_index || m?.biased_ambient_index || 0;
    const c = ci > 0 ? g.colors?.[Math.floor((ci - 1) / 3)] : null;
    if (c) rgb = [c.red, c.green, c.blue];
    if (rgb && typeof m?.diffuse_alpha === 'number' && m.diffuse_alpha < 1 && !st.is_transparency) return [rgb[0], rgb[1], rgb[2], Math.max(0.15, m.diffuse_alpha)];
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
  // メッシュの色枠ごとの線スタイル番号（0 = 面に色の指定なし → 親の指定を使う）
  const styleSlots = new Map<number, number[]>();
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
      styleSlots.set(meshes.length - 1, [...colorIdx.keys()]);
    }
  }

  // 部品ツリー
  let tree: PrcNode | null = null;
  type Inh = { fi: number; s: number } | null;
  const placed: { mesh: number; matrix: number[]; name: string; inh: Inh }[] = [];
  // 図形属性（graphics）の線スタイル。面に無ければ RI → 部品 → 製品（親へ）の順に引き継ぎます
  type GBase = { same_graphics?: boolean; graphics_content?: { biased_index_of_line_style?: number } } | undefined;
  const gstyle = (o: GBase): number => (o?.same_graphics === false ? o.graphics_content?.biased_index_of_line_style ?? 0 : 0);
  try {
    const roots: PrcNode[] = [];
    // 別のファイル構造にある原型（prototype）は UUID で探します
    const fsByUuid = new Map<string, number>();
    file.fs.forEach((f, i) => { if (f.uuid) fsByUuid.set(f.uuid, i); });
    type Uid = { unique_id0: number; unique_id1: number; unique_id2: number; unique_id3: number } | undefined;
    const uid = (u: Uid) => (u ? [u.unique_id0, u.unique_id1, u.unique_id2, u.unique_id3].map((x: number) => x >>> 0).join(',') : '');
    const fsOf = (cur: number, fid: { flag?: boolean; unique_id?: Uid } | undefined) => (!fid || fid.flag ? cur : fsByUuid.get(uid(fid.unique_id)) ?? -1);
    const onPath = new Set<string>();
    // 配置: 自分が持てばそれ、無ければ原型（prototype）の配置を引き継ぎます
    const effLoc = (fi: number, pi: number, d: number): number[] => {
      const pr = file.fs[fi]?.tree?.products?.[pi];
      if (!pr || d > 32) return ID;
      if (pr.has_transformation) return locationMatrix(pr.location);
      const ref = pr.references_product_occurrence ?? {};
      if (ref.biased_index_prototype > 0) { const pf = fsOf(fi, ref.prototype_in_same_file_structure); if (pf >= 0) return effLoc(pf, ref.biased_index_prototype - 1, d + 1); }
      return ID;
    };
    let budget = 200000; // 異常なファイルでの爆発を防ぐ
    const visit = (fi: number, pi: number, M: number[], depth: number, noKids = false, noPart = false, noLoc = false, inh: Inh = null): PrcNode | null => {
      const fs = file.fs[fi]; const pr = fs?.tree?.products?.[pi];
      const key = fi + '/' + pi;
      if (!pr || depth > 64 || onPath.has(key) || --budget < 0) return null;
      onPath.add(key);
      try {
        // 原型の配置は、参照する側が配置を持つときはそちらで置き換えます（二重に掛けない）
        const MM = noLoc ? M : mul(M, effLoc(fi, pi, 0));
        const node: PrcNode = { name: nameOf(pr) || '', meshes: [], children: [] };
        const ref = pr.references_product_occurrence ?? {};
        const own = gstyle(pr.base); const inhP: Inh = own ? { fi, s: own } : inh;
        const addPart = (bi: number) => {
          const part = fs.tree?.parts?.[bi - 1]; if (!part) return;
          const ps = gstyle(part.base); const inhPart: Inh = ps ? { fi, s: ps } : inhP;
          const walk = (items: any[], up: Inh) => {
            for (const ri of items ?? []) {
              const d = ri?.data ?? ri; const ic = d?.item_content;
              const rs = gstyle(ic?.base); const inhRI: Inh = rs ? { fi, s: rs } : up;
              if (d?.elements || d?.representation_items) walk(d.elements ?? d.representation_items, inhRI);
              const bt = ic?.biased_index_tessellation ?? 0;
              if (bt > 0) {
                const mi = meshOf.get(`${fi}/${bt - 1}`);
                if (mi !== undefined) { node.meshes.push(placed.length); placed.push({ mesh: mi, matrix: MM, name: nameOf(ic) || nameOf(part) || node.name, inh: inhRI }); }
              }
            }
          };
          walk(part.representation_items, inhPart);
        };
        if (ref.biased_index_part > 0 && !noPart) addPart(ref.biased_index_part);
        if (ref.biased_index_prototype > 0) {
          const pf = fsOf(fi, ref.prototype_in_same_file_structure);
          const ch = pf >= 0 ? visit(pf, ref.biased_index_prototype - 1, MM, depth + 1, !!ref.index_child_occurrence?.length, ref.biased_index_part > 0, true, inhP) : null;
          // 原型の部品・子は、この occurrence 自身が持たないときだけ引き継ぎます
          if (ch) { if (!(ref.biased_index_part > 0)) node.meshes.push(...ch.meshes); if (!(ref.index_child_occurrence?.length)) node.children.push(...ch.children); if (!node.name) node.name = ch.name; }
        }
        if (!noKids) for (const ci of ref.index_child_occurrence ?? []) { const ch = visit(fi, ci, MM, depth + 1, false, false, false, inhP); if (ch) node.children.push(ch); }
        if (!node.name) node.name = `product ${pi + 1}`;
        return node;
      } finally { onPath.delete(key); }
    };
    // まずモデルファイルの根（root）から辿り、無ければ各ファイル構造の親のない製品から辿ります
    for (const po of file.model?.product_occurrences ?? []) {
      const fi = fsByUuid.get(uid(po.unique_id));
      if (fi === undefined) continue;
      // root_index は 1 始まり（実ファイルでは製品数と同じ値＝最後の製品）
      const n = visit(fi, po.root_index - 1, ID, 0); if (n) roots.push(n);
    }
    if (!roots.length) file.fs.forEach((fs, fi) => {
      const prods: any[] = fs.tree?.products ?? [];
      const isChild = new Set<number>();
      prods.forEach((p) => { for (const c of p.references_product_occurrence?.index_child_occurrence ?? []) isChild.add(c); const r = p.references_product_occurrence; if (r?.biased_index_prototype > 0 && (!r.prototype_in_same_file_structure || r.prototype_in_same_file_structure.flag)) isChild.add(r.biased_index_prototype - 1); });
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
    out = placed.map((p) => {
      const m = meshes[p.mesh]; const slots = styleSlots.get(p.mesh) ?? [];
      // 面に色が無い枠だけ、引き継いだスタイルの色で置き換えます
      const colors = p.inh && slots.some((x) => !x) ? m.colors.map((c, k) => (slots[k] ? c : styleColor(file.fs[p.inh!.fi], p.inh!.s))) : m.colors;
      return { ...m, colors, matrix: p.matrix, name: p.name };
    });
    const rest = meshes.map((_m, i) => (used.has(i) ? -1 : i)).filter((i) => i >= 0);
    if (rest.length) { const n: PrcNode = { name: 'other meshes', meshes: [], children: [] }; for (const i of rest) { n.meshes.push(out.length); out.push({ ...meshes[i], name: `mesh ${i + 1}` }); } tree.children.push(n); }
  } else {
    out = meshes.map((mm, i) => ({ ...mm, name: `mesh ${i + 1}` }));
    tree = out.length > 1 ? { name: nameOf(file.model) || 'PRC', meshes: out.map((_, i) => i), children: [] } : null;
  }
  return { meshes: out, tree, brepOnly: meshes.length === 0, stats: { meshes: meshes.length, verified, triangles: tris, treeFromFile: !!(tree && placed.length) }, warnings };
}
