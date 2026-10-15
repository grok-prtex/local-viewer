import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import ThreeView, { material } from './ThreeView';
import { Loading, ErrorBox } from '../ui';

interface WorkerMesh { position: Float32Array; normal: Float32Array | null; index: Uint32Array; color: number[] | null; }

function runOcct(kind: 'step' | 'iges', buffer: ArrayBuffer): Promise<WorkerMesh[]> {
  return new Promise((resolve, reject) => {
    const w = new Worker('/occt-worker.js');
    w.onmessage = (e) => { w.terminate(); e.data.ok ? resolve(e.data.meshes) : reject(new Error(e.data.error)); };
    w.onerror = (e) => { w.terminate(); reject(new Error(e.message)); };
    w.postMessage({ kind, buffer }, [buffer]);
  });
}

export default function CadViewer({ file, kind }: { file: File; kind: 'stl' | 'step' | 'iges' | 'u3d' }) {
  const [obj, setObj] = useState<THREE.Object3D | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    (async () => {
      const buf = await file.arrayBuffer();
      const group = new THREE.Group();
      if (kind === 'u3d') {
        const { loadU3D } = await import('../u3d/toThree');
        group.add((await loadU3D(buf)).group);
      } else if (kind === 'stl') {
        const g = new STLLoader().parse(buf);
        if (!g.getAttribute('normal')) g.computeVertexNormals();
        group.add(new THREE.Mesh(g, material()));
      } else {
        const meshes = await runOcct(kind as 'step' | 'iges', buf);
        if (!meshes.length) throw new Error('empty');
        for (const m of meshes) {
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.BufferAttribute(m.position, 3));
          if (m.normal) g.setAttribute('normal', new THREE.BufferAttribute(m.normal, 3));
          g.setIndex(new THREE.BufferAttribute(m.index, 1));
          if (!m.normal) g.computeVertexNormals();
          const c = m.color ? new THREE.Color(m.color[0], m.color[1], m.color[2]) : undefined;
          group.add(new THREE.Mesh(g, material(c)));
        }
      }
      if (alive) setObj(group);
    })().catch((e) => { console.warn('cad load failed', e); if (alive) setErr('3D モデルを読み込めませんでした。ファイルが壊れているか、対応していない書式の可能性があります。'); });
    return () => { alive = false; };
  }, [file, kind]);
  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!obj) return <Loading>{kind === 'stl' ? '読み込んでいます' : 'モデルを解析しています。大きなファイルは時間がかかります'}</Loading>;
  return <ThreeView object={obj} />;
}
