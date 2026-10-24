/** スライス（層）の 3D 表示：全層の輪郭線と、選んだ層の塗りつぶし・強調 */
import * as THREE from 'three';
import { apply, isClosed, type LayerIndex, type SliceModel } from './slice3mf';

export const SLICE_DONE = 0x0e9e6b, SLICE_REST = 0x8a8f96, SLICE_CUR = 0xf08a24;
const MAX_VERTS = 6_000_000;

export interface SliceScene { group: THREE.Group; setLayer: (k: number) => void; stride: number; segments: number }

export function buildSliceScene(model: SliceModel, li: LayerIndex): SliceScene {
  // スライスを造形空間の Z 順に並べ、層 k までを drawRange の先頭部分で描けるようにします
  const recs: { i: number; j: number; z: number; n: number }[] = [];
  let total = 0;
  model.instances.forEach((ins, i) => ins.slices.forEach((s, j) => {
    let n = 0; for (const p of s.polys) n += (p.length - 1) * 2;
    recs.push({ i, j, z: li.tops[i][j], n }); total += n;
  }));
  recs.sort((a, b) => a.z - b.z);
  // 頂点が多すぎるときは、全体図の層を間引きます（選んだ層は常に全部描きます）
  const stride = Math.max(1, Math.ceil(total / MAX_VERTS));
  const zRank = new Map(li.zs.map((z, k) => [z, k]));
  const use = recs.filter((r) => stride === 1 || (zRank.get(r.z) ?? 0) % stride === 0);
  const nv = use.reduce((a, r) => a + r.n, 0);
  const pos = new Float32Array(nv * 3);
  const endZ: number[] = []; const endV: number[] = [];
  let o = 0;
  for (const r of use) {
    const ins = model.instances[r.i], s = ins.slices[r.j], xy = s.xy;
    for (const p of s.polys) for (let q = 0; q < p.length - 1; q++) for (const v of [p[q], p[q + 1]]) {
      const w = apply(ins.m, xy[v * 2], xy[v * 2 + 1], s.ztop); pos[o++] = w[0]; pos[o++] = w[1]; pos[o++] = w[2];
    }
    endZ.push(r.z); endV.push(o / 3);
  }
  const attr = new THREE.BufferAttribute(pos, 3);
  const gDone = new THREE.BufferGeometry(); gDone.setAttribute('position', attr);
  const gRest = new THREE.BufferGeometry(); gRest.setAttribute('position', attr);
  const done = new THREE.LineSegments(gDone, new THREE.LineBasicMaterial({ color: SLICE_DONE }));
  const rest = new THREE.LineSegments(gRest, new THREE.LineBasicMaterial({ color: SLICE_REST, transparent: true, opacity: 0.18, depthWrite: false }));
  done.name = 'slices'; rest.name = 'slices-above';
  done.frustumCulled = rest.frustumCulled = false;
  const cur = new THREE.Group(); cur.name = 'current-layer';
  const group = new THREE.Group(); group.name = 'slice-layers'; group.add(done, rest, cur);
  const fillMat = new THREE.MeshBasicMaterial({ color: SLICE_CUR, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
  const lineMat = new THREE.LineBasicMaterial({ color: SLICE_CUR, depthTest: false });

  const setLayer = (k: number) => {
    const z = li.zs[k] ?? -Infinity;
    // 二分探索：z 以下で終わるスライスの頂点数
    let lo = 0, hi = endZ.length - 1, cut = 0;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (endZ[mid] <= z + 1e-9) { cut = endV[mid]; lo = mid + 1; } else hi = mid - 1; }
    gDone.setDrawRange(0, cut); gRest.setDrawRange(cut, nv - cut);
    for (const c of [...cur.children]) { cur.remove(c); (c as THREE.Mesh).geometry.dispose(); }
    model.instances.forEach((ins, i) => {
      const j = li.at(k, i); if (j < 0) return;
      const s = ins.slices[j], xy = s.xy;
      const m4 = new THREE.Matrix4().fromArray(ins.m).multiply(new THREE.Matrix4().makeTranslation(0, 0, s.ztop));
      const path = new THREE.ShapePath();
      const lp: number[] = [];
      for (const p of s.polys) {
        for (let q = 0; q < p.length - 1; q++) lp.push(xy[p[q] * 2], xy[p[q] * 2 + 1], 0, xy[p[q + 1] * 2], xy[p[q + 1] * 2 + 1], 0);
        if (!isClosed(p)) continue;
        path.moveTo(xy[p[0] * 2], xy[p[0] * 2 + 1]);
        for (let q = 1; q < p.length; q++) path.lineTo(xy[p[q] * 2], xy[p[q] * 2 + 1]);
      }
      // 外周・穴の向きに頼らず偶奇規則で塗ります（時計回りで書かれたファイルにも対応）
      (path as unknown as { userData: { style: { fillRule: string } } }).userData = { style: { fillRule: 'evenodd' } };
      const shapes = path.subPaths.length ? path.toShapes() : [];
      if (shapes.length) {
        const fill = new THREE.Mesh(new THREE.ShapeGeometry(shapes), fillMat);
        fill.matrixAutoUpdate = false; fill.matrix.copy(m4); fill.userData.noPick = true; fill.renderOrder = 2; cur.add(fill);
      }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
      const line = new THREE.LineSegments(lg, lineMat); line.matrixAutoUpdate = false; line.matrix.copy(m4); line.renderOrder = 3; cur.add(line);
    });
  };
  setLayer(li.zs.length - 1);
  return { group, setLayer, stride, segments: total / 2 };
}
