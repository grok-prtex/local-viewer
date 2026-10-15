import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface Props { object: THREE.Object3D; }

/** STL / STEP / IGES 共通の 3D ビューア */
export default function ThreeView({ object }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ fit: () => void; setWire: (w: boolean) => void; setBg: (dark: boolean) => void } | null>(null);
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
    camera.up.set(0, 0, 1);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f96, 1.6));
    const dir = new THREE.DirectionalLight(0xffffff, 1.6);
    camera.add(dir); dir.position.set(1, 1, 2); scene.add(camera);
    scene.add(object);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.screenSpacePanning = true;

    const box = new THREE.Box3().setFromObject(object);
    const sz = box.getSize(new THREE.Vector3());
    setSize(sz);
    const fit = () => {
      const c = box.getCenter(new THREE.Vector3());
      const r = Math.max(sz.length() / 2, 1e-6);
      const d = r / Math.sin((camera.fov * Math.PI) / 360);
      camera.position.copy(c).add(new THREE.Vector3(1, -1.2, 0.9).normalize().multiplyScalar(d * 1.05));
      camera.near = d / 1000; camera.far = d * 100; camera.updateProjectionMatrix();
      controls.target.copy(c); controls.update();
    };
    const setW = (w: boolean) => object.traverse((o) => {
      const mm = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] | undefined;
      for (const m of Array.isArray(mm) ? mm : mm ? [mm] : []) if ('wireframe' in m) m.wireframe = w;
    });
    const setBg = (d: boolean) => { scene.background = new THREE.Color(d ? 0x16181b : 0xf4f4f0); };
    setBg(false);
    api.current = { fit, setWire: setW, setBg };
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize(); fit();
    let raf = 0;
    const loop = () => { raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); };
    loop();
    el.dataset.rendered = 'true';
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
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
        {size && <span className="mono dims">外形 {fmt(size.x)} × {fmt(size.y)} × {fmt(size.z)}</span>}
      </div>
      <div className="three-host" ref={host} data-testid="three-host" />
      <p className="hint">ドラッグで回転、右ドラッグ（2本指）で移動、ホイール（ピンチ）で拡大縮小します。</p>
    </div>
  );
}
const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(2));

export function material(color?: THREE.ColorRepresentation) {
  return new THREE.MeshStandardMaterial({ color: color ?? 0x9aa3ab, metalness: 0.15, roughness: 0.55, side: THREE.DoubleSide });
}
