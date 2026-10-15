import * as THREE from 'three';
import { material } from '../viewers/ThreeView';
import type { U3DMesh } from './parse';

export function loadU3D(buffer: ArrayBuffer, job?: { cancel?: () => void }): Promise<{ group: THREE.Group; progressiveSkipped: number; tree: { name: string; children: { name: string; children: never[] }[] } | null }> {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    if (job) job.cancel = () => { w.terminate(); reject(new Error('cancelled')); };
    w.onmessage = (e) => {
      w.terminate();
      if (!e.data.ok) { reject(new Error(e.data.error)); return; }
      const group = new THREE.Group();
      for (const m of e.data.meshes as U3DMesh[]) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
        if (m.normals) g.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3)); else g.computeVertexNormals();
        // 面ごとのマテリアル（シェーディング ID）でグループ分け
        const f = m.materialOfFace; let s = 0;
        for (let i = 1; i <= f.length; i++) if (i === f.length || f[i] !== f[s]) { g.addGroup(s * 3, (i - s) * 3, f[s]); s = i; }
        const mats = m.colors.map((c) => material(c));
        const mesh = new THREE.Mesh(g, mats.length > 1 ? mats : mats[0]);
        mesh.name = m.name || `mesh ${group.children.length + 1}`;
        mesh.applyMatrix4(new THREE.Matrix4().fromArray(m.matrix));
        group.add(mesh);
      }
      if (!group.children.length) { reject(new Error('empty')); return; }
      const tree = group.children.length > 1 ? { name: 'U3D', children: group.children.map((c) => ({ name: c.name, children: [] as never[] })) } : null;
      resolve({ group, progressiveSkipped: e.data.progressiveSkipped, tree });
    };
    w.onerror = (e) => { w.terminate(); reject(new Error(e.message)); };
    w.postMessage(buffer, [buffer]);
  });
}
