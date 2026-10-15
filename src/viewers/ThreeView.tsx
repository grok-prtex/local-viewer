import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface Props { object: THREE.Object3D; side?: React.ReactNode; up?: 'z' | 'y'; }

type Api = { fit: () => void; setWire: (w: boolean) => void; setBg: (dark: boolean) => void; setGrid: (g: boolean) => void; setPivot: (origin: boolean) => void; setGhost: (g: boolean) => void; setUp: (u: 'z' | 'y') => void; setColors: (c: boolean) => void };

function label(text: string, color: string) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!; g.fillStyle = color; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 32, 34);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  s.scale.setScalar(0.45); return s;
}

/** 画面の隅に出す座標軸（カメラの向きに追従） */
function makeGizmo() {
  const scene = new THREE.Scene();
  const axes: [THREE.Vector3, number, string, string][] = [[new THREE.Vector3(1, 0, 0), 0xd23c3c, '#d23c3c', 'X'], [new THREE.Vector3(0, 1, 0), 0x2e9d4a, '#2e9d4a', 'Y'], [new THREE.Vector3(0, 0, 1), 0x2f6fd6, '#2f6fd6', 'Z']];
  for (const [d, hex, css, t] of axes) {
    scene.add(new THREE.ArrowHelper(d, new THREE.Vector3(), 0.8, hex, 0.22, 0.12));
    const l = label(t, css); l.position.copy(d).multiplyScalar(1.05); scene.add(l);
  }
  const cam = new THREE.OrthographicCamera(-1.4, 1.4, 1.4, -1.4, 0.1, 10);
  return { scene, cam };
}

/** STL / STEP / IGES 共通の 3D ビューア */
export default function ThreeView({ object, side, up: up0 = 'z' }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const [grid, setGrid] = useState(false);
  const [up, setUp] = useState<'z' | 'y'>(up0);
  const [colors, setColors] = useState(false);
  const [ghost, setGhost] = useState(true);
  const [picked, setPicked] = useState('');
  const [pivotNote, setPivotNote] = useState('モデル中心');
  const [wire, setWire] = useState(false);
  const [dark, setDark] = useState(false);
  const [size, setSize] = useState<THREE.Vector3 | null>(null);

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1e7);
    let upAxis: 'z' | 'y' = up0;
    camera.up.set(0, 0, 1);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f96, 1.6));
    const dir = new THREE.DirectionalLight(0xffffff, 1.6);
    camera.add(dir); dir.position.set(1, 1, 2); scene.add(camera);
    scene.add(object);
    // OrbitControls は生成時の camera.up で回転軸を固定するため、上方向を変えたら作り直します
    let controls!: OrbitControls;
    const makeControls = () => {
      const t = controls ? controls.target.clone() : null;
      controls?.dispose();
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.screenSpacePanning = true;
      if (t) controls.target.copy(t);
    };
    makeControls();
    let pivotOrigin = false;

    const box = new THREE.Box3().setFromObject(object);
    const sz = box.getSize(new THREE.Vector3());
    setSize(sz);
    const fit = () => {
      const c = pivotOrigin ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
      const m = box.getCenter(new THREE.Vector3());
      const r = Math.max(sz.length() / 2, 1e-6);
      const d = r / Math.sin((camera.fov * Math.PI) / 360);
      camera.up.set(0, upAxis === 'z' ? 0 : 1, upAxis === 'z' ? 1 : 0);
      makeControls();
      const v = upAxis === 'z' ? new THREE.Vector3(1, -1.2, 0.9) : new THREE.Vector3(1, 0.9, 1.2);
      camera.position.copy(m).add(v.normalize().multiplyScalar(d * 1.05 + c.distanceTo(m)));
      camera.near = d / 1000; camera.far = d * 100; camera.updateProjectionMatrix();
      controls.target.copy(c); controls.update();
    };
    const setW = (w: boolean) => object.traverse((o) => {
      const mm = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] | undefined;
      for (const m of Array.isArray(mm) ? mm : mm ? [mm] : []) if ('wireframe' in m) m.wireframe = w;
    });
    const setBg = (d: boolean) => { scene.background = new THREE.Color(d ? 0x16181b : 0xf4f4f0); };
    setBg(false);
    // 原点の座標軸とグリッド（切り替え式）
    const L = Math.max(sz.x, sz.y, sz.z) || 1;
    const helpers = new THREE.Group(); helpers.visible = false; scene.add(helpers);
    const buildHelpers = () => {
      helpers.clear();
      helpers.add(new THREE.AxesHelper(L * 0.6));
      const g = new THREE.GridHelper(L * 2, 20, 0x8a8f96, 0xc9ccd0);
      if (upAxis === 'z') g.rotation.x = Math.PI / 2;
      g.position.copy(upAxis === 'z' ? new THREE.Vector3(0, 0, box.min.z) : new THREE.Vector3(0, box.min.y, 0));
      helpers.add(g);
    };
    buildHelpers();
    // 部品ごとの色分けとクリックで強調
    const meshes: THREE.Mesh[] = []; object.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    const orig = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>(meshes.map((m) => [m, m.material]));
    const distinct = meshes.map((_, i) => material(new THREE.Color().setHSL((i * 0.618034) % 1, 0.55, 0.55)));
    const base = new Map(orig);
    const ghostCache = new Map<THREE.Material, THREE.Material>();
    const ghostOf = (mt: THREE.Material) => {
      let g = ghostCache.get(mt);
      if (!g) { g = mt.clone(); g.transparent = true; g.opacity = 0.22; g.depthWrite = false; ghostCache.set(mt, g); }
      return g;
    };
    let ghostOn = true;
    const applyMats = () => meshes.forEach((m) => {
      const b = base.get(m)!;
      m.material = ghostOn && sel && m !== sel ? (Array.isArray(b) ? b.map(ghostOf) : ghostOf(b)) : b;
      m.renderOrder = ghostOn && sel && m !== sel ? 1 : 0;
    });
    const setColors = (on: boolean) => { meshes.forEach((m, i) => base.set(m, on ? distinct[i] : orig.get(m)!)); applyMats(); setW(wireNow); };
    let wireNow = false;
    let sel: THREE.Mesh | null = null; let selBox: THREE.BoxHelper | null = null;
    const ray = new THREE.Raycaster(); let down = { x: 0, y: 0 };
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4 || e.button !== 0) return;
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      const hit = ray.intersectObjects(meshes.filter((m) => { let o: THREE.Object3D | null = m; while (o) { if (!o.visible) return false; o = o.parent; } return true; }), false)[0];
      if (selBox) { scene.remove(selBox); selBox.dispose(); selBox = null; }
      sel = hit ? (hit.object as THREE.Mesh) : null;
      if (sel) { selBox = new THREE.BoxHelper(sel, 0xff7a00); scene.add(selBox); }
      applyMats(); setW(wireNow);
      let n = ''; let o: THREE.Object3D | null = sel; while (o && !n) { n = o.name; o = o.parent; }
      setPicked(sel ? n || '（名前なし）' : '');
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);
    // ダブルクリックした面の点を回転中心にします
    const onDbl = (e: MouseEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      const hit = ray.intersectObjects(meshes, false).find((h) => { let o: THREE.Object3D | null = h.object; while (o) { if (!o.visible) return false; o = o.parent; } return true; });
      if (hit) { controls.target.copy(hit.point); controls.update(); setPivotNote('ダブルクリックした点'); }
    };
    renderer.domElement.addEventListener('dblclick', onDbl);
    api.current = {
      fit, setWire: (w) => { wireNow = w; setW(w); }, setBg,
      setGrid: (g) => { helpers.visible = g; },
      setUp: (u) => { upAxis = u; buildHelpers(); fit(); },
      setPivot: (o) => { pivotOrigin = o; fit(); setPivotNote(o ? '原点' : 'モデル中心'); },
      setColors,
      setGhost: (g) => { ghostOn = g; applyMats(); setW(wireNow); },
    };
    const gizmo = makeGizmo();
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize(); fit();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop); controls.update();
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setScissorTest(false); renderer.setViewport(0, 0, w, h); renderer.render(scene, camera);
      // 左下に座標軸ギズモを重ねて描きます
      const gs = Math.min(110, w / 4);
      gizmo.cam.position.set(0, 0, 4).applyQuaternion(camera.quaternion); gizmo.cam.quaternion.copy(camera.quaternion);
      renderer.autoClear = false; renderer.clearDepth();
      renderer.setScissorTest(true); renderer.setScissor(6, 6, gs, gs); renderer.setViewport(6, 6, gs, gs);
      renderer.render(gizmo.scene, gizmo.cam); renderer.autoClear = true; renderer.setScissorTest(false);
    };
    loop();
    el.dataset.rendered = 'true';
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onDown); renderer.domElement.removeEventListener('pointerup', onUp); renderer.domElement.removeEventListener('dblclick', onDbl);
      distinct.forEach((m) => m.dispose()); ghostCache.forEach((m) => m.dispose());
      object.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); });
      renderer.dispose(); el.removeChild(renderer.domElement);
    };
  }, [object]);

  return (
    <div className="three-wrap">
      <div className="toolbar">
        <button onClick={() => api.current?.fit()}>全体表示</button>
        <button aria-pressed={wire} onClick={() => { setWire(!wire); api.current?.setWire(!wire); }}>ワイヤーフレーム</button>
        <button aria-pressed={dark} onClick={() => { setDark(!dark); api.current?.setBg(!dark); }}>背景 {dark ? '黒' : '白'}</button>
        <button aria-pressed={grid} onClick={() => { setGrid(!grid); api.current?.setGrid(!grid); }}>原点・グリッド</button>
        <button onClick={() => { const u = up === 'z' ? 'y' : 'z'; setUp(u); api.current?.setUp(u); }} title="モデルの上方向を切り替えます">上方向 {up.toUpperCase()}</button>
        <button onClick={() => { const o = pivotNote !== '原点'; api.current?.setPivot(o); }} data-testid="pivot">回転中心：{pivotNote}</button>
        <button aria-pressed={ghost} onClick={() => { setGhost(!ghost); api.current?.setGhost(!ghost); }} title="部品を選んだとき、ほかの部品を薄く表示します">ゴースト表示</button>
        <button aria-pressed={colors} onClick={() => { setColors(!colors); api.current?.setColors(!colors); }}>部品ごとに色分け</button>
        {size && <span className="mono dims">外形 {fmt(size.x)} × {fmt(size.y)} × {fmt(size.z)}</span>}
      </div>
      <div className={side ? 'three-layout' : undefined}>
        <div className="three-host" ref={host} data-testid="three-host" />
        {side}
      </div>
      {picked && <p className="picked" data-testid="picked">選択中：<b>{picked}</b></p>}
      <p className="hint">クリックで部品を選択、ダブルクリックでその点を回転中心に、ドラッグで回転、右ドラッグ（2本指）で移動、ホイール（ピンチ）で拡大縮小します。</p>
    </div>
  );
}
const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(2));

export function material(color?: THREE.ColorRepresentation) {
  return new THREE.MeshStandardMaterial({ color: color ?? 0x9aa3ab, metalness: 0.15, roughness: 0.55, side: THREE.DoubleSide });
}
