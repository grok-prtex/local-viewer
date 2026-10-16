import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import ThreeView, { material } from './ThreeView';
import ModelTree, { type TreeNode } from './ModelTree';
import { ErrorBox } from '../ui';
import { Progress, readWithProgress, nextFrame, type ProgressState } from '../progress';
import { t } from '../i18n';

interface FaceColor { first: number; last: number; color: number[] | null; }
interface WorkerMesh { name: string; position: Float32Array; normal: Float32Array | null; index: Uint32Array; color: number[] | null; faceColors: FaceColor[] | null; }
interface OcctNode { name: string; meshes: number[]; children: OcctNode[]; }

/** ファイルを読んでいる間に WASM の準備を始めておきます */
function warmOcct(): Worker { const w = new Worker('/occt-worker.js?v=' + __COMMIT__); w.postMessage({ warm: true }); return w; }

function runOcct(w: Worker, kind: 'step' | 'iges', buffer: ArrayBuffer, onStage: (p: ProgressState) => void, job: { cancel?: () => void }): Promise<{ meshes: WorkerMesh[]; root: OcctNode | null }> {
  return new Promise((resolve, reject) => {
    job.cancel = () => { w.terminate(); reject(new Error('cancelled')); };
    w.onmessage = (e) => {
      if (e.data.type === 'progress') { onStage({ stage: '解析中', detail: t('OpenCascade で形状を計算しています') }); return; }
      w.terminate(); e.data.ok ? resolve(e.data) : reject(new Error(e.data.error));
    };
    w.onerror = (e) => { w.terminate(); reject(new Error(e.message)); };
    w.postMessage({ kind, buffer }, [buffer]);
  });
}

const rgb = (c: number[]) => new THREE.Color(c[0], c[1], c[2]);

function buildMesh(m: WorkerMesh): THREE.Mesh {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.position, 3));
  if (m.normal) g.setAttribute('normal', new THREE.BufferAttribute(m.normal, 3));
  g.setIndex(new THREE.BufferAttribute(m.index, 1));
  if (!m.normal) g.computeVertexNormals();
  if (m.faceColors) {
    // 面ごとの色（STEP の面色）をマテリアルグループで表現します
    const mats: THREE.Material[] = []; const key = new Map<string, number>();
    for (const f of m.faceColors) {
      const c = f.color ?? m.color; const k = c ? c.join(',') : 'none';
      let mi = key.get(k); if (mi == null) { mi = mats.length; key.set(k, mi); mats.push(material(c ? rgb(c) : undefined)); }
      g.addGroup(f.first * 3, (f.last - f.first + 1) * 3, mi);
    }
    return new THREE.Mesh(g, mats);
  }
  return new THREE.Mesh(g, material(m.color ? rgb(m.color) : undefined));
}

export default function CadViewer({ file, kind }: { file: File; kind: 'stl' | 'step' | 'iges' | 'u3d' }) {
  const [obj, setObj] = useState<THREE.Object3D | null>(null);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [err, setErr] = useState('');
  const [prog, setProg] = useState<ProgressState>({ stage: '読み込み中', pct: 0 });
  const job = useRef<{ cancel?: () => void; cancelled: boolean }>({ cancelled: false });

  useEffect(() => {
    let alive = true; const j = { cancelled: false } as { cancel?: () => void; cancelled: boolean }; job.current = j;
    const set = (p: ProgressState) => { if (alive) setProg(p); };
    (async () => {
      const pre = kind === 'step' || kind === 'iges' ? warmOcct() : null;
      j.cancel = () => pre?.terminate();
      const buf = await readWithProgress(file, (pct) => set({ stage: '読み込み中', pct }), j);
      const group = new THREE.Group(); group.name = file.name;
      let root: TreeNode | null = null;
      if (kind === 'u3d') {
        set({ stage: '解析中' });
        const { loadU3D } = await import('../u3d/toThree');
        const u = await loadU3D(buf, j); group.add(u.group); if (u.tree) root = { name: u.tree.name, obj: u.group, children: u.tree.children.map((c, i) => ({ name: c.name, obj: u.group.children[i], children: [] })) };
      } else if (kind === 'stl') {
        set({ stage: '解析中' }); await nextFrame();
        const g = new STLLoader().parse(buf);
        if (!g.getAttribute('normal')) g.computeVertexNormals();
        const names: string[] = g.userData.groupNames ?? [];
        if (g.groups.length > 1) {
          // ASCII STL の複数 solid は、名前付きの別部品に分けます（ツリー・選択・ゴースト表示が使えます）
          const tn: TreeNode = { name: file.name, obj: group, children: [] };
          g.groups.forEach((gr, i) => {
            const sub = new THREE.BufferGeometry();
            for (const k of ['position', 'normal'] as const) { const a = g.getAttribute(k); if (a) sub.setAttribute(k, new THREE.BufferAttribute((a.array as Float32Array).slice(gr.start * 3, (gr.start + gr.count) * 3), 3)); }
            const m = new THREE.Mesh(sub, material()); m.name = names[i]?.trim() || `solid ${i + 1}`;
            group.add(m); tn.children.push({ name: m.name, obj: m, children: [] });
          });
          root = tn;
        } else group.add(new THREE.Mesh(g, material()));
      } else {
        set({ stage: '解析中', detail: t('WebAssembly を準備しています') });
        const r = await runOcct(pre!, kind, buf, set, j);
        if (!r.meshes.length) throw new Error('empty');
        const built: THREE.Mesh[] = [];
        for (let i = 0; i < r.meshes.length; i++) {
          if (j.cancelled) throw new Error('cancelled');
          built.push(buildMesh(r.meshes[i]));
          if (i % 100 === 99) { set({ stage: '形状変換中', pct: (i / r.meshes.length) * 100, detail: t('{0} / {1} 部品', i + 1, r.meshes.length) }); await nextFrame(); }
        }
        // 部品の階層（アセンブリ構造）を Three.js のグループに写します
        const toGroup = (n: OcctNode, depth: number): [THREE.Object3D, TreeNode] => {
          const gr = new THREE.Group(); gr.name = n.name;
          const tn: TreeNode = { name: n.name || t('（名前なし）'), obj: gr, children: [] };
          for (const mi of n.meshes) { const m = built[mi]; if (!m) continue; m.name = r.meshes[mi].name; gr.add(m); if (n.children.length || n.meshes.length > 1) tn.children.push({ name: m.name || t('形状 {0}', mi + 1), obj: m, children: [] }); }
          if (depth < 40) for (const c of n.children) { const [co, ct] = toGroup(c, depth + 1); gr.add(co); tn.children.push(ct); }
          // 同じ部品が複数あるときは SolidWorks と同じく <1> <2> … を付けます
          const cnt = new Map<string, number>(); for (const c of tn.children) cnt.set(c.name, (cnt.get(c.name) ?? 0) + 1);
          const seen = new Map<string, number>();
          for (const c of tn.children) if ((cnt.get(c.name) ?? 0) > 1) { const k = (seen.get(c.name) ?? 0) + 1; seen.set(c.name, k); c.name = `${c.name} <${k}>`; c.obj.name = c.name; }
          return [gr, tn];
        };
        if (r.root) { const [o, t0] = toGroup(r.root, 0); group.add(o); let t = t0; while (t.name === '（名前なし）' && t.children.length === 1 && t.children[0].children.length) t = t.children[0]; root = t; } else built.forEach((m) => group.add(m));
      }
      set({ stage: '描画中' }); await nextFrame();
      if (alive) { setTree(root && root.children.length ? root : null); setObj(group); }
    })().catch((e) => {
      if (!alive) return;
      if (String(e?.message) === 'cancelled') setErr(t('読み込みをキャンセルしました。'));
      else { console.warn('cad load failed', e); setErr(t('3D モデルを読み込めませんでした。ファイルが壊れているか、対応していない書式の可能性があります。')); }
    });
    return () => { alive = false; j.cancelled = true; j.cancel?.(); };
  }, [file, kind]);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!obj) return <Progress p={prog} onCancel={() => { job.current.cancelled = true; job.current.cancel?.(); setErr(t('読み込みをキャンセルしました。')); }} />;
  return <ThreeView object={obj} side={tree ? <ModelTree root={tree} /> : undefined} />;
}
