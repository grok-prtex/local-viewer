import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import DxfParser from 'dxf-parser';
import { Loading, ErrorBox } from '../ui';

/* eslint-disable @typescript-eslint/no-explicit-any */
type P = { x: number; y: number };
type Seg = { layer: string; color: number; pts: P[] };

function arcPts(c: P, r: number, a0: number, a1: number): P[] {
  while (a1 <= a0) a1 += Math.PI * 2;
  const n = Math.max(8, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 96));
  return Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) }; });
}
function bulgePts(p0: P, p1: P, b: number): P[] {
  if (!b) return [p0, p1];
  const th = 4 * Math.atan(b), d = Math.hypot(p1.x - p0.x, p1.y - p0.y), r = d / (2 * Math.sin(th / 2));
  const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2, h = r * Math.cos(th / 2);
  const ux = -(p1.y - p0.y) / d, uy = (p1.x - p0.x) / d;
  const c = { x: mx + ux * h, y: my + uy * h };
  const a0 = Math.atan2(p0.y - c.y, p0.x - c.x), a1 = Math.atan2(p1.y - c.y, p1.x - c.x);
  const pts = b > 0 ? arcPts(c, Math.abs(r), a0, a1) : arcPts(c, Math.abs(r), a1, a0).reverse();
  return pts;
}

/** DXF のエンティティを線分列に変換します（TEXT 系は現在は描画しません） */
export function dxfToSegments(dxf: any): { segs: Seg[]; skipped: number } {
  const layers = dxf.tables?.layer?.layers ?? {};
  const segs: Seg[] = []; let skipped = 0;
  const walk = (ents: any[], tf: (p: P) => P, depth: number, parentLayer?: string) => {
    for (const e of ents ?? []) {
      const layer = e.layer === '0' && parentLayer ? parentLayer : e.layer ?? '0';
      const color = e.color ?? layers[layer]?.color ?? 0xffffff;
      const add = (pts: P[]) => segs.push({ layer, color, pts: pts.map(tf) });
      switch (e.type) {
        case 'LINE': add(e.vertices); break;
        case 'LWPOLYLINE': case 'POLYLINE': {
          const v = e.vertices ?? []; const out: P[] = [];
          const n = e.shape ? v.length : v.length - 1;
          for (let i = 0; i < n; i++) { const s = bulgePts(v[i], v[(i + 1) % v.length], v[i].bulge ?? 0); out.push(...(i ? s.slice(1) : s)); }
          if (out.length) add(out); break;
        }
        case 'CIRCLE': add(arcPts(e.center, e.radius, 0, Math.PI * 2)); break;
        case 'ARC': add(arcPts(e.center, e.radius, e.startAngle, e.endAngle)); break;
        case 'ELLIPSE': {
          const ma = e.majorAxisEndPoint, rx = Math.hypot(ma.x, ma.y), ry = rx * e.axisRatio, rot = Math.atan2(ma.y, ma.x);
          let a0 = e.startAngle ?? 0, a1 = e.endAngle ?? Math.PI * 2; while (a1 <= a0) a1 += Math.PI * 2;
          const pts: P[] = []; for (let i = 0; i <= 96; i++) { const a = a0 + ((a1 - a0) * i) / 96, x = rx * Math.cos(a), y = ry * Math.sin(a); pts.push({ x: e.center.x + x * Math.cos(rot) - y * Math.sin(rot), y: e.center.y + x * Math.sin(rot) + y * Math.cos(rot) }); }
          add(pts); break;
        }
        case 'SPLINE': { const p = e.fitPoints?.length ? e.fitPoints : e.controlPoints; if (p?.length) add(p); break; }
        case 'SOLID': case '3DFACE': { const p = e.points ?? e.vertices; if (p?.length) add([...p, p[0]]); break; }
        case 'INSERT': {
          const blk = dxf.blocks?.[e.name]; if (!blk || depth > 8) { skipped++; break; }
          const bx = blk.position?.x ?? 0, by = blk.position?.y ?? 0;
          const sx = e.xScale ?? 1, sy = e.yScale ?? 1, r = ((e.rotation ?? 0) * Math.PI) / 180;
          const cos = Math.cos(r), sin = Math.sin(r);
          walk(blk.entities, (p) => { const x = (p.x - bx) * sx, y = (p.y - by) * sy; return tf({ x: e.position.x + x * cos - y * sin, y: e.position.y + x * sin + y * cos }); }, depth + 1, layer);
          break;
        }
        default: skipped++;
      }
    }
  };
  walk(dxf.entities, (p) => ({ x: p.x, y: p.y }), 0);
  return { segs, skipped };
}

export default function DxfViewer({ file }: { file: File }) {
  const host = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<{ segs: Seg[]; skipped: number } | null>(null);
  const [err, setErr] = useState('');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [bg, setBgMode] = useState<'light' | 'dark' | 'jade'>('dark');
  const api = useRef<{ fit: () => void; lines: Map<string, THREE.Object3D>; setBg: (m: 'light' | 'dark' | 'jade') => void } | null>(null);

  useEffect(() => {
    let alive = true;
    file.text().then((t) => {
      const d = new DxfParser().parseSync(t);
      if (!d) throw new Error('parse');
      if (alive) setData(dxfToSegments(d));
    }).catch(() => alive && setErr('DXF を読み込めませんでした。バイナリ DXF や DWG には、現在は対応していません。'));
    return () => { alive = false; };
  }, [file]);

  useEffect(() => {
    if (!data) return;
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -1e6, 1e6);
    const lines = new Map<string, THREE.Group>();
    const mats = new Map<string, THREE.LineBasicMaterial>();
    const whites: THREE.LineBasicMaterial[] = [];
    // 同じレイヤー・同じ色の線を 1 つの LineSegments にまとめます（描画呼び出しを数十万から数百に減らします）
    const buckets = new Map<string, { layer: string; color: number; n: number; segs: Seg[] }>();
    for (const s of data.segs) {
      if (s.pts.length < 2) continue;
      const k = s.layer + '\u0000' + s.color;
      let b = buckets.get(k); if (!b) { b = { layer: s.layer, color: s.color, n: 0, segs: [] }; buckets.set(k, b); }
      b.segs.push(s); b.n += s.pts.length - 1;
    }
    for (const b of buckets.values()) {
      let g = lines.get(b.layer); if (!g) { g = new THREE.Group(); lines.set(b.layer, g); scene.add(g); }
      const key = String(b.color);
      let m = mats.get(key);
      if (!m) { m = new THREE.LineBasicMaterial({ color: b.color }); mats.set(key, m); if (b.color === 0xffffff || b.color === 0) whites.push(m); }
      const arr = new Float32Array(b.n * 6); let o = 0;
      for (const s of b.segs) for (let i = 1; i < s.pts.length; i++) { const p = s.pts[i - 1], q = s.pts[i]; arr[o] = p.x; arr[o + 1] = p.y; arr[o + 3] = q.x; arr[o + 4] = q.y; o += 6; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      g.add(new THREE.LineSegments(geo, m));
    }
    const box = new THREE.Box3().setFromObject(scene);
    const controls = new OrbitControls(cam, renderer.domElement);
    controls.enableRotate = false; controls.screenSpacePanning = true;
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
    const fit = () => {
      const w = el.clientWidth, h = el.clientHeight, c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
      const half = Math.max(sz.x / w, sz.y / h) * 0.55 || 1;
      cam.left = -w * half; cam.right = w * half; cam.top = h * half; cam.bottom = -h * half; cam.zoom = 1;
      cam.position.set(c.x, c.y, 10); controls.target.set(c.x, c.y, 0); cam.updateProjectionMatrix(); controls.update();
    };
    const BGS = { light: 0xf4f5f3, dark: 0x1e2124, jade: 0xe8f0ec } as const;
    const orig = new Map([...mats.values()].map((x) => [x, x.color.clone()]));
    // 明るい背景では、黄色・シアンなど明るい線色を暗くして読みやすくします
    const setBg = (m: 'light' | 'dark' | 'jade') => {
      scene.background = new THREE.Color(BGS[m]);
      for (const [x, c0] of orig) {
        if (whites.includes(x)) { x.color.set(m === 'dark' ? 0xe8ebe6 : 0x2a2e32); continue; }
        const c = c0.clone(); const hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl);
        if (m === 'dark') { if (hsl.l < 0.35) c.setHSL(hsl.h, hsl.s, 0.6); }
        else if (hsl.l > 0.42) c.setHSL(hsl.h, Math.min(1, hsl.s), 0.36);
        x.color.copy(c);
      }
    };
    setBg('dark');
    api.current = { fit, lines, setBg };
    const resize = () => { renderer.setSize(el.clientWidth, el.clientHeight); fit(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    let raf = 0; const loop = () => { raf = requestAnimationFrame(loop); renderer.render(scene, cam); }; loop();
    el.dataset.rendered = 'true';
    return () => { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); el.removeChild(renderer.domElement); };
  }, [data]);

  useEffect(() => { api.current?.lines.forEach((g, l) => { g.visible = !hidden.has(l); }); }, [hidden, data]);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!data) return <Loading>図面を読み込んでいます</Loading>;
  const layerNames = [...new Set(data.segs.map((s) => s.layer))].sort();
  return (
    <div className="three-wrap">
      <div className="toolbar">
        <button onClick={() => api.current?.fit()}>全体表示</button>
        <button onClick={() => { const o = (['light', 'dark', 'jade'] as const); const n = o[(o.indexOf(bg) + 1) % 3]; setBgMode(n); api.current?.setBg(n); }} data-testid="bg">背景 {bg === 'light' ? 'ライト' : bg === 'dark' ? 'ダーク' : 'ジェード'}</button>
        {data.skipped > 0 && <span className="hint-inline">文字・寸法など {data.skipped} 件は、現在は表示していません。</span>}
      </div>
      <div className="dxf-layout">
        <div className="three-host" ref={host} data-testid="dxf-host" />
        <aside className="layers">
          <div className="label mono">LAYERS · {layerNames.length}</div>
          {layerNames.map((l) => (
            <label key={l}><input type="checkbox" checked={!hidden.has(l)} onChange={() => { const n = new Set(hidden); n.has(l) ? n.delete(l) : n.add(l); setHidden(n); }} /> {l}</label>
          ))}
        </aside>
      </div>
      <p className="hint">ドラッグで移動、ホイール（ピンチ）で拡大縮小します。</p>
    </div>
  );
}
