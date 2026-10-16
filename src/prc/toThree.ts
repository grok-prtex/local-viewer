import * as THREE from 'three';
import { material } from '../viewers/ThreeView';
import type { TreeNode } from '../viewers/ModelTree';
import type { PrcScene, PrcNode } from './scene';

export interface PrcLoaded { group: THREE.Group; tree: TreeNode | null; brepOnly: boolean; stats: PrcScene['stats'] }

/** PRC を Worker で解析し、three.js のグループと部品ツリーにします */
export function loadPRC(buffer: ArrayBuffer, job?: { cancel?: () => void }, onProgress?: (p: number, label: string) => void): Promise<PrcLoaded> {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    if (job) job.cancel = () => { w.terminate(); reject(new Error('cancelled')); };
    w.onmessage = (e) => {
      if ('progress' in e.data) { onProgress?.(e.data.progress, e.data.label); return; }
      w.terminate();
      if (!e.data.ok) { reject(new Error(e.data.error)); return; }
      const s = e.data.scene as PrcScene;
      const group = new THREE.Group();
      const objs: THREE.Mesh[] = [];
      const matCache = new Map<string, THREE.Material>();
      const mat = (c: number[]) => {
        const k = c.join(',');
        let m = matCache.get(k);
        if (!m) { const mm = material(new THREE.Color(c[0], c[1], c[2])); if (c[3] < 1) { mm.transparent = true; mm.opacity = c[3]; } m = mm; matCache.set(k, m); }
        return m;
      };
      for (const m of s.meshes) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
        if (m.normals) g.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3)); else g.computeVertexNormals();
        const f = m.colorOfTriangle; let st = 0;
        if (m.colors.length > 1) for (let i = 1; i <= f.length; i++) if (i === f.length || f[i] !== f[st]) { g.addGroup(st * 3, (i - st) * 3, f[st]); st = i; }
        const mats = m.colors.map(mat);
        const mesh = new THREE.Mesh(g, mats.length > 1 ? mats : mats[0] ?? material());
        mesh.name = m.name;
        mesh.applyMatrix4(new THREE.Matrix4().fromArray(m.matrix));
        group.add(mesh); objs.push(mesh);
      }
      let tree: TreeNode | null = null;
      if (s.tree) {
        const conv = (n: PrcNode): TreeNode => {
          const kids = n.children.map(conv);
          // メッシュ 1 つだけの節はそのメッシュを、そうでなければ子と自分のメッシュをまとめたグループを操作対象にする
          if (!kids.length && n.meshes.length === 1) return { name: n.name, obj: objs[n.meshes[0]], children: [] };
          const proxy = new THREE.Group(); // 表示切替用（子の visible をまとめて切り替える）
          const own = n.meshes.map((i) => ({ name: objs[i].name || n.name, obj: objs[i], children: [] as TreeNode[] }));
          const all = [...kids, ...(n.meshes.length > 1 || kids.length ? own : [])];
          const node: TreeNode = { name: n.name, obj: proxy, children: all };
          Object.defineProperty(proxy, 'visible', { get: () => all.some((c) => c.obj.visible), set: (v: boolean) => { for (const c of all) setVis(c, v); } });
          if (!all.length && n.meshes.length === 1) return { name: n.name, obj: objs[n.meshes[0]], children: [] };
          return node;
        };
        const setVis = (n: TreeNode, v: boolean) => { n.obj.visible = v; };
        tree = conv(s.tree);
      }
      resolve({ group, tree, brepOnly: s.brepOnly, stats: s.stats });
    };
    w.onerror = (e) => { w.terminate(); reject(new Error(e.message)); };
    w.postMessage(buffer, [buffer]);
  });
}
