/**
 * 3MF スライス拡張（Slice Extension, http://schemas.microsoft.com/3dmanufacturing/slice/2015/07）の読み取り。
 * slicestack / slice / polygon / sliceref（別パーツ .model への参照）と、build item・component・
 * 製造拡張の p:path をたどって「どの層を、どの変換で置くか」を求めます。three.js には依存しません。
 */
export const NS_CORE = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';
export const NS_SLICE = 'http://schemas.microsoft.com/3dmanufacturing/slice/2015/07';
export const NS_PROD = 'http://schemas.microsoft.com/3dmanufacturing/production/2015/06';

/** 1 層。xy は頂点の (x, y) を交互に並べたもの、polys は頂点番号の列（startv から segment の v2 を順に） */
export interface Slice { ztop: number; xy: Float32Array; polys: Uint32Array[] }
/** 4x4 行列（three.js と同じ列優先 16 要素） */
export type Mat = number[];
export interface SliceInstance { name: string; stackId: string; part: string; zbottom: number; slices: Slice[]; m: Mat; lowres: boolean }
export interface SliceIssue { code: 'missing-stack' | 'missing-part' | 'nested-ref' | 'cycle' | 'too-deep' | 'missing-object' | 'non-planar' | 'order'; detail: string }
export interface SliceModel { unit: string; instances: SliceInstance[]; issues: SliceIssue[]; fallback: boolean; stackCount: number }

interface StackDef { zbottom: number; kids: ({ slice: Slice } | { ref: { id: string; path: string } })[] }
interface ObjDef { name: string; stack?: string; lowres: boolean; comps: { oid: string; path?: string; m: Mat }[] }
interface Part { unit: string; stacks: Map<string, StackDef>; objects: Map<string, ObjDef>; items: { oid: string; path?: string; m: Mat }[] }

export const IDENT: Mat = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
/** 3MF の transform（m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32、行ベクトル p' = p·M）を列優先 4x4 に */
export function parseTransform(s: string | undefined): Mat {
  if (!s) return IDENT.slice();
  const v = s.trim().split(/\s+/).map(Number);
  if (v.length !== 12 || v.some((x) => !Number.isFinite(x))) return IDENT.slice();
  return [v[0], v[1], v[2], 0, v[3], v[4], v[5], 0, v[6], v[7], v[8], 0, v[9], v[10], v[11], 1];
}
export function mul(a: Mat, b: Mat): Mat {
  const r = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + rr] * b[c * 4 + k]; r[c * 4 + rr] = s; }
  return r;
}
export const apply = (m: Mat, x: number, y: number, z: number): [number, number, number] =>
  [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
/** 層が水平のまま保たれる変換か（z が x, y に依存せず、x, y が z に依存しない） */
export const isPlanar = (m: Mat) => Math.abs(m[2]) < 1e-9 && Math.abs(m[6]) < 1e-9 && Math.abs(m[8]) < 1e-9 && Math.abs(m[9]) < 1e-9;

const decode = (s: string) => s.indexOf('&') < 0 ? s : s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (_, e: string) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ({ lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" } as Record<string, string>)[e.toLowerCase()]);
export const normPath = (p: string, base = '/3D/3dmodel.model') => {
  let s = decode(p).replace(/\\/g, '/');
  if (!s.startsWith('/')) s = base.replace(/[^/]*$/, '') + s;
  const out: string[] = [];
  for (const seg of s.split('/')) { if (!seg || seg === '.') continue; if (seg === '..') out.pop(); else out.push(seg); }
  return '/' + out.join('/');
};

/**
 * 名前空間を解決しながらタグを順に読む軽量スキャナ（壊れた終了タグなどにも寛容）。
 * 数十 MB のスライスデータでも DOM を作らずに済むよう、必要な要素だけを拾います。
 */
function scan(xml: string, onStart: (ns: string, local: string, attr: (ns: string, name: string) => string | undefined) => void, onEnd: (ns: string, local: string) => void) {
  const tag = /<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<[?!][\s\S]*?>/g;
  const attrRe = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  const scopes: { name: string; map: Map<string, string> | null; ns: string; local: string }[] = [];
  const lookup = (pfx: string) => { for (let i = scopes.length - 1; i >= 0; i--) { const v = scopes[i].map?.get(pfx); if (v !== undefined) return v; } return pfx === 'xml' ? 'xml' : ''; };
  let m: RegExpExecArray | null;
  while ((m = tag.exec(xml))) {
    if (!m[2]) continue;
    const name = m[2];
    if (m[1]) {
      // 対応する開始タグまで戻す（閉じ忘れ・余分な終了タグに寛容）
      let i = scopes.length - 1; while (i >= 0 && scopes[i].name !== name) i--;
      if (i < 0) continue;
      while (scopes.length > i) { const s = scopes.pop()!; onEnd(s.ns, s.local); }
      continue;
    }
    const raw: [string, string][] = [];
    let map: Map<string, string> | null = null;
    if (m[3]) { attrRe.lastIndex = 0; let a: RegExpExecArray | null; while ((a = attrRe.exec(m[3]))) {
      const v = decode(a[2] ?? a[3] ?? '');
      if (a[1] === 'xmlns') (map ??= new Map()).set('', v); else if (a[1].startsWith('xmlns:')) (map ??= new Map()).set(a[1].slice(6), v); else raw.push([a[1], v]);
    } }
    const sc = { name, map, ns: '', local: '' };
    scopes.push(sc);
    const c = name.indexOf(':');
    const ns = (sc.ns = lookup(c < 0 ? '' : name.slice(0, c)));
    const local = (sc.local = c < 0 ? name : name.slice(c + 1));
    const attr = (ans: string, an: string) => {
      for (const [k, v] of raw) { const ci = k.indexOf(':'); if (ci < 0 ? (ans === '' && k === an) : (k.slice(ci + 1) === an && lookup(k.slice(0, ci)) === ans)) return v; }
      return undefined;
    };
    onStart(ns, local, attr);
    if (m[4]) { scopes.pop(); onEnd(ns, local); }
  }
}

/** 1 つのモデルパーツ（.model の XML）を読む */
export function parsePart(xml: string): Part {
  const part: Part = { unit: 'millimeter', stacks: new Map(), objects: new Map(), items: [] };
  let stack: StackDef | null = null, slice: { ztop: number; xy: number[]; polys: number[][] } | null = null, poly: number[] | null = null;
  let obj: ObjDef | null = null;
  scan(xml, (ns, local, attr) => {
    if (ns === NS_SLICE) {
      if (local === 'slicestack') { stack = { zbottom: +(attr('', 'zbottom') ?? 0) || 0, kids: [] }; const id = attr('', 'id'); if (id) part.stacks.set(id, stack); }
      else if (local === 'slice' && stack) slice = { ztop: +(attr('', 'ztop') ?? NaN), xy: [], polys: [] };
      else if (local === 'vertex' && slice) slice.xy.push(+(attr('', 'x') ?? 0) || 0, +(attr('', 'y') ?? 0) || 0);
      else if (local === 'polygon' && slice) { poly = [+(attr('', 'startv') ?? 0) || 0]; slice.polys.push(poly); }
      else if (local === 'segment' && poly) poly.push(+(attr('', 'v2') ?? 0) || 0);
      else if (local === 'sliceref' && stack) { const id = attr('', 'slicestackid'); if (id) stack.kids.push({ ref: { id, path: attr('', 'slicepath') ?? '' } }); }
    } else if (ns === NS_CORE) {
      if (local === 'model') part.unit = attr('', 'unit') || 'millimeter';
      else if (local === 'object') {
        obj = { name: attr('', 'name') ?? '', stack: attr(NS_SLICE, 'slicestackid'), lowres: attr(NS_SLICE, 'meshresolution') === 'lowres', comps: [] };
        const id = attr('', 'id'); if (id) part.objects.set(id, obj);
      } else if (local === 'component' && obj) { const oid = attr('', 'objectid'); if (oid) obj.comps.push({ oid, path: attr(NS_PROD, 'path'), m: parseTransform(attr('', 'transform')) }); }
      else if (local === 'item') { const oid = attr('', 'objectid'); if (oid) part.items.push({ oid, path: attr(NS_PROD, 'path'), m: parseTransform(attr('', 'transform')) }); }
    }
  }, (ns, local) => {
    if (ns === NS_SLICE) {
      if (local === 'slicestack') stack = null;
      else if (local === 'slice' && slice && stack) {
        const s = slice as { ztop: number; xy: number[]; polys: number[][] };
        const n = s.xy.length / 2;
        (stack as StackDef).kids.push({ slice: { ztop: s.ztop, xy: Float32Array.from(s.xy), polys: s.polys.filter((p) => p.length >= 2).map((p) => Uint32Array.from(p.map((i) => (i < n ? i : 0)))) } });
        slice = null; poly = null;
      } else if (local === 'polygon') poly = null;
    } else if (ns === NS_CORE && local === 'object') obj = null;
  });
  return part;
}

/** ルートの .model パスを _rels/.rels から求める */
export function rootModelPath(rels: string | null): string {
  if (rels) {
    let found = '';
    scan(rels, (_ns, local, attr) => { if (!found && local === 'Relationship' && /3dmodel$/.test(attr('', 'Type') ?? '')) found = attr('', 'Target') ?? ''; }, () => {});
    if (found) return normPath(found, '/');
  }
  return '/3D/3dmodel.model';
}

export type ReadPart = (path: string) => Promise<string | null>;
const MAX_DEPTH = 8;

/** パッケージ全体からスライスの配置を組み立てます。スライスが 1 つもなければ null */
export async function loadSlices(read: ReadPart): Promise<SliceModel | null> {
  const rootPath = rootModelPath(await read('/_rels/.rels'));
  const cache = new Map<string, Promise<Part | null>>();
  const getPart = (p: string) => { let v = cache.get(p.toLowerCase()); if (!v) { v = read(p).then((x) => (x == null ? null : parsePart(x))); cache.set(p.toLowerCase(), v); } return v; };
  const root = await getPart(rootPath);
  if (!root) return null;
  const issues: SliceIssue[] = [];
  const note = (code: SliceIssue['code'], detail: string) => { if (!issues.some((i) => i.code === code && i.detail === detail)) issues.push({ code, detail }); };

  const resolve = async (path: string, id: string, depth: number, seen: string[]): Promise<{ zbottom: number; slices: Slice[] } | null> => {
    const key = path + '#' + id;
    if (seen.includes(key)) { note('cycle', key); return null; }
    if (depth > MAX_DEPTH) { note('too-deep', key); return null; }
    const part = await getPart(path);
    if (!part) { note('missing-part', path); return null; }
    const st = part.stacks.get(id);
    if (!st) { note('missing-stack', key); return null; }
    const slices: Slice[] = [];
    for (const k of st.kids) {
      if ('slice' in k) { slices.push(k.slice); continue; }
      if (depth >= 1) note('nested-ref', key);
      const sub = await resolve(k.ref.path ? normPath(k.ref.path, path) : path, k.ref.id, depth + 1, [...seen, key]);
      if (sub) slices.push(...sub.slices);
    }
    return { zbottom: st.zbottom, slices };
  };

  const instances: SliceInstance[] = [];
  const walk = async (path: string, oid: string, m: Mat, depth: number, label: string) => {
    const part = await getPart(path);
    const o = part?.objects.get(oid);
    if (!o) { note(part ? 'missing-object' : 'missing-part', part ? path + '#' + oid : path); return; }
    const name = o.name || label || '#' + oid;
    if (o.stack) {
      const r = await resolve(path, o.stack, 0, []);
      if (r && r.slices.length) instances.push({ name, stackId: o.stack, part: path, zbottom: r.zbottom, slices: r.slices, m, lowres: o.lowres });
      return;
    }
    if (depth < MAX_DEPTH) for (const c of o.comps) await walk(c.path ? normPath(c.path, path) : path, c.oid, mul(m, c.m), depth + 1, name);
  };
  for (const it of root.items) await walk(it.path ? normPath(it.path, rootPath) : rootPath, it.oid, it.m, 0, '');

  let fallback = false;
  if (!instances.length && root.stacks.size) {
    // 造形指示（build）からたどれない場合は、ルートのスライススタックをそのまま並べて見せます
    fallback = true;
    for (const id of root.stacks.keys()) {
      const r = await resolve(rootPath, id, 0, []);
      if (r && r.slices.length) instances.push({ name: 'slicestack ' + id, stackId: id, part: rootPath, zbottom: r.zbottom, slices: r.slices, m: IDENT.slice(), lowres: false });
    }
  }
  if (!instances.length && !issues.length) return null;
  for (const ins of instances) {
    if (!isPlanar(ins.m)) note('non-planar', ins.name);
    for (let i = 1; i < ins.slices.length; i++) if (!(ins.slices[i].ztop > ins.slices[i - 1].ztop)) { note('order', ins.name); break; }
    ins.slices = ins.slices.filter((s) => Number.isFinite(s.ztop));
  }
  let stackCount = 0; for (const p of cache.values()) { const v = await p; if (v) stackCount += v.stacks.size; }
  return { unit: root.unit, instances, issues, fallback, stackCount };
}

/** 全体の層（Z の昇順・重複なし）と、各層で各インスタンスのどのスライスが該当するか */
export interface LayerIndex {
  zs: number[];
  /** インスタンスごとの各スライスの造形空間での Z（上面）と下面 */
  tops: number[][]; bottoms: number[][];
  /** 層 k で、インスタンス i の該当スライス番号（なければ -1） */
  at: (k: number, i: number) => number;
}
const zOf = (m: Mat, z: number) => apply(m, 0, 0, z)[2];
export function layerIndex(model: SliceModel): LayerIndex {
  const set = new Set<number>();
  const tops = model.instances.map((ins) => ins.slices.map((s) => { const z = Math.round(zOf(ins.m, s.ztop) * 1e6) / 1e6; set.add(z); return z; }));
  const bottoms = model.instances.map((ins, i) => ins.slices.map((_s, j) => (j ? tops[i][j - 1] : Math.round(zOf(ins.m, ins.zbottom) * 1e6) / 1e6)));
  const zs = [...set].sort((a, b) => a - b);
  const at = (k: number, i: number) => {
    const z = zs[k], t = tops[i];
    if (z === undefined || !t.length) return -1;
    // z を含む (下面, 上面] のスライス
    let lo = 0, hi = t.length - 1, ans = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (t[mid] >= z - 1e-9) { ans = mid; hi = mid - 1; } else lo = mid + 1; }
    if (ans < 0) return -1;
    return z > bottoms[i][ans] - 1e-9 || t[ans] === z ? ans : -1;
  };
  return { zs, tops, bottoms, at };
}

/** 多角形の符号付き面積（反時計回りが正） */
export function polyArea(xy: Float32Array, p: Uint32Array): number {
  let a = 0;
  for (let i = 0; i < p.length - 1; i++) { const u = p[i] * 2, v = p[i + 1] * 2; a += xy[u] * xy[v + 1] - xy[v] * xy[u + 1]; }
  return a / 2;
}
export const isClosed = (p: Uint32Array) => p.length >= 4 && p[0] === p[p.length - 1];
