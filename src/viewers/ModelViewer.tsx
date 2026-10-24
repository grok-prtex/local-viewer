import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import ThreeView, { material } from './ThreeView';
import ModelTree, { type TreeNode } from './ModelTree';
import { ErrorBox } from '../ui';
import { Progress, readWithProgress, nextFrame, type ProgressState } from '../progress';
import { extOf } from '../detect';
import { t } from '../i18n';
import { baseName, makeResolver } from '../model/resolve';

/** 部品ツリー（名前のある子を最大 2,000 件まで） */
function treeOf(root: THREE.Object3D, name: string): TreeNode | null {
  let n = 0;
  const walk = (o: THREE.Object3D, depth: number): TreeNode => {
    const kids = depth > 30 ? [] : o.children.filter((c) => (c as THREE.Mesh).isMesh || (c as THREE.Points).isPoints || c.children.length);
    const node: TreeNode = { name: o.name || (depth === 0 ? name : t('（名前なし）')), obj: o, children: [] };
    for (const c of kids) { if (n++ > 2000) break; node.children.push(walk(c, depth + 1)); }
    // 子が 1 つだけの入れ子は 1 段にまとめます
    if (node.children.length === 1 && node.children[0].children.length && depth > 0) return { ...node.children[0], name: node.name === t('（名前なし）') ? node.children[0].name : node.name };
    return node;
  };
  const tr = walk(root, 0);
  let leaves = 0; const cnt = (x: TreeNode) => { if (!x.children.length) leaves++; x.children.forEach(cnt); }; cnt(tr);
  return leaves > 1 ? tr : null;
}

const MST = ['読み込み中', '解析中', '描画中'] as const;
type Kind = 'obj' | 'gltf' | 'glb' | 'ply' | '3mf';

export default function ModelViewer({ file, siblings }: { file: File; siblings: File[] }) {
  const ext = extOf(file.name) as Kind;
  const [obj, setObj] = useState<THREE.Object3D | null>(null);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [err, setErr] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [prog, setProg] = useState<ProgressState>({ stage: '読み込み中', pct: 0, stages: MST });
  const job = useRef<{ cancelled: boolean }>({ cancelled: false });

  useEffect(() => {
    let alive = true; const j = { cancelled: false }; job.current = j;
    const res = makeResolver(siblings);
    const set = (p: ProgressState) => { if (alive) setProg({ ...p, stages: MST }); };
    (async () => {
      const buf = await readWithProgress(file, (pct) => set({ stage: '読み込み中', pct }), j);
      set({ stage: '解析中' }); await nextFrame();
      const manager = new THREE.LoadingManager(); manager.setURLModifier(res.modify);
      const head = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
      const kind: Kind = String.fromCharCode(...head) === 'glTF' ? 'glb' : ext;
      let root: THREE.Object3D; const n: string[] = [];
      if (kind === 'gltf' || kind === 'glb') {
        const [{ GLTFLoader }, { DRACOLoader }, { MeshoptDecoder }] = await Promise.all([
          import('three/examples/jsm/loaders/GLTFLoader.js'), import('three/examples/jsm/loaders/DRACOLoader.js'), import('three/examples/jsm/libs/meshopt_decoder.module.js')]);
        const draco = new DRACOLoader(); draco.setDecoderPath('/vendor/draco/'); draco.setDecoderConfig({ type: 'wasm' });
        const loader = new GLTFLoader(manager); loader.setDRACOLoader(draco); loader.setMeshoptDecoder(MeshoptDecoder);
        try {
          const g = await loader.parseAsync(kind === 'glb' ? buf : new TextDecoder().decode(buf), '');
          root = g.scene ?? g.scenes?.[0];
          if (!root) throw new Error('empty');
        } catch (e) {
          if (res.missing.size) throw Object.assign(new Error('missing'), { missing: [...res.missing] });
          const m = String((e as Error)?.message ?? '');
          if (/extension/i.test(m) && /not supported|unknown|required/i.test(m)) throw Object.assign(new Error('ext'), { detail: m.replace(/^THREE\.GLTFLoader:\s*/, '') });
          throw e;
        } finally { draco.dispose(); }
      } else if (kind === 'obj') {
        const text = new TextDecoder().decode(buf);
        if (!/^\s*(v|f)\s/m.test(text)) throw new Error('not obj');
        const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
        const loader = new OBJLoader(manager);
        const libs = [...text.matchAll(/^\s*mtllib\s+(.+?)\s*$/gm)].map((m) => m[1]);
        const mtls = libs.map((l) => res.find(l)).filter((f): f is File => !!f);
        const extra = siblings.filter((f) => extOf(f.name) === 'mtl' && !mtls.includes(f));
        const use = mtls.length ? mtls : extra;
        if (use.length) {
          const { MTLLoader } = await import('three/examples/jsm/loaders/MTLLoader.js');
          const ml = new MTLLoader(manager); ml.setMaterialOptions({ side: THREE.DoubleSide });
          // 見つからない画像を指す map_* 行は外します（読めない画像が黒く塗られるのを防ぎ、.mtl の色で表示）
          const strip = (src: string) => src.replace(/^\s*(map_\w+|bump|disp|decal|norm|refl)\s+(.+?)\s*$/gim, (line, _k, rest: string) => {
            const name = rest.split(/\s+/).pop()!;
            if (res.find(name)) return line;
            res.missingTex.add(name.replace(/\\/g, '/').split('/').pop()!); return '';
          });
          const all = await Promise.all(use.map(async (f) => ml.parse(strip(await f.text()), '')));
          const mc = all[0]; for (const o of all.slice(1)) Object.assign(mc.materialsInfo, o.materialsInfo);
          mc.preload(); loader.setMaterials(mc);
        } else if (libs.length) n.push(t('材質ファイル（{0}）が一緒に選ばれていないため、色なしで表示しています。.obj と .mtl をまとめて選ぶと色が付きます。', libs.join(', ')));
        root = loader.parse(text);
        root.traverse((o) => {
          const m = o as THREE.Mesh; if (!m.isMesh) return;
          const vc = !!m.geometry.getAttribute('color');
          if (!use.length) { const mt = material(vc ? 0xffffff : undefined); mt.vertexColors = vc; m.material = mt; }
          if (!m.geometry.getAttribute('normal')) m.geometry.computeVertexNormals();
        });
      } else if (kind === 'ply') {
        const { PLYLoader } = await import('three/examples/jsm/loaders/PLYLoader.js');
        const g = new PLYLoader(manager).parse(buf);
        if (!g.getAttribute('position') || g.getAttribute('position').count === 0) throw new Error('empty');
        const vc = !!g.getAttribute('color');
        if (g.index) {
          if (!g.getAttribute('normal')) g.computeVertexNormals();
          const mt = material(vc ? 0xffffff : undefined); mt.vertexColors = vc;
          root = new THREE.Mesh(g, mt);
        } else {
          // 面のない点群
          g.computeBoundingSphere();
          root = new THREE.Points(g, new THREE.PointsMaterial({ size: (g.boundingSphere?.radius ?? 1) / 300, vertexColors: vc, color: vc ? 0xffffff : 0x5d6670 }));
          n.push(t('面のない点群として表示しています（{0} 点）。', g.getAttribute('position').count.toLocaleString()));
        }
        root.name = file.name;
      } else {
        const { ThreeMFLoader } = await import('three/examples/jsm/loaders/3MFLoader.js');
        root = new ThreeMFLoader(manager).parse(buf);
        let meshes = 0; root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes++; });
        if (!meshes) throw new Error('empty');
      }
      await res.settle();
      if (res.missingTex.size) n.push(t('見つからないファイルがあるため、一部の画像（テクスチャ）を省いて表示しています：{0}', [...res.missingTex].join(', ')));
      let tris = 0; root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { const g = m.geometry; tris += (g.index ? g.index.count : g.getAttribute('position')?.count ?? 0) / 3; } });
      root.userData.tris = tris;
      set({ stage: '描画中' }); await nextFrame();
      const group = new THREE.Group(); group.name = file.name; group.add(root);
      if (alive) { setNotes(n); setTree(treeOf(root, file.name)); setObj(group); }
    })().catch((e) => {
      if (!alive) return;
      res.dispose();
      const m = String(e?.message);
      if (m === 'cancelled') setErr(t('読み込みをキャンセルしました。'));
      else if (m === 'missing') setErr(t('参照しているファイルが見つかりません：{0}。.gltf と一緒に .bin や画像ファイルもまとめて選んでください。', (e.missing as string[]).join(', ')));
      else if (m === 'ext') setErr(t('この glTF は、まだ対応していない拡張機能を使っています：{0}', e.detail));
      else { console.warn('model load failed', e); setErr(t('3D モデルを読み込めませんでした。ファイルが壊れているか、対応していない書式の可能性があります。')); }
    });
    return () => { alive = false; j.cancelled = true; setTimeout(() => res.dispose(), 0); };
  }, [file, siblings, ext]);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!obj) return <Progress p={prog} onCancel={() => { job.current.cancelled = true; setErr(t('読み込みをキャンセルしました。')); }} />;
  const tris = Math.round(obj.children[0]?.userData.tris ?? 0);
  return (
    <div data-testid="model-view">
      {notes.map((x) => <p key={x} className="hint note" data-testid="model-note">{x}</p>)}
      <ThreeView object={obj} up={ext === '3mf' ? 'z' : 'y'} env={ext === 'gltf' || ext === 'glb'} side={tree ? <ModelTree root={tree} /> : undefined} />
      {tris > 0 && <p className="hint mono" data-testid="model-stats">{t('三角形 {0}', tris.toLocaleString())}{siblings.length ? ' · ' + t('一緒に読み込んだファイル {0}', siblings.map((f) => baseName(f.name)).join(', ')) : ''}</p>}
    </div>
  );
}
