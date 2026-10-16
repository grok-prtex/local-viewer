import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { decodeDxf, parseDxf } from '../dxf/parse';
import { buildScene, hasPaperSpace, type DxfScene, type Seg, type TextItem } from '../dxf/scene';
import { Loading, ErrorBox } from '../ui';
import { t } from '../i18n';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Bg = 'light' | 'dark' | 'jade';
const FONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Noto Sans CJK JP","Yu Gothic","Meiryo",sans-serif';
/** 背景に合わせて線・文字の色を読みやすく調整します */
function adjust(rgb: number, m: Bg): THREE.Color {
  if (rgb === 0xffffff || rgb === 0) return new THREE.Color(m === 'dark' ? 0xe8ebe6 : 0x2a2e32);
  const c = new THREE.Color(rgb); const hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl);
  if (m === 'dark') { if (hsl.l < 0.35) c.setHSL(hsl.h, hsl.s, 0.6); }
  else if (hsl.l > 0.42) c.setHSL(hsl.h, Math.min(1, hsl.s), 0.36);
  return c;
}
/** MTEXT の幅指定に合わせて折り返します（ctx は基準 100px のフォント） */
function wrapLines(ctx: CanvasRenderingContext2D, t: TextItem): string[] {
  const lines = t.s.split('\n');
  if (!t.width) return lines;
  const k = 100 / (t.h * 1.25), maxPx = t.width * k * 1.02, out: string[] = [];
  ctx.font = `100px ${FONT}`;
  for (const ln of lines) {
    let cur = '';
    for (const ch of ln) { if (cur && ctx.measureText(cur + ch).width > maxPx) { const sp = cur.lastIndexOf(' '); if (sp > 0 && /[ -~]/.test(ch)) { out.push(cur.slice(0, sp)); cur = cur.slice(sp + 1) + ch; } else { out.push(cur); cur = ch; } } else cur += ch; }
    out.push(cur);
  }
  return out;
}
export default function DxfViewer({ file }: { file: File }) {
  const host = useRef<HTMLDivElement>(null);
  const hidden0 = useMemo(() => new Set<string>(), []);
  const [dxf, setDxf] = useState<any>(null);
  const [mode, setMode] = useState<'model' | 'paper'>('model');
  const data: DxfScene | null = useMemo(() => (dxf ? buildScene(dxf, mode) : null), [dxf, mode]);
  const hiddenRef = useRef(hidden0);
  const [err, setErr] = useState('');
  const [hidden, setHidden] = useState<Set<string>>(hidden0);
  const [bg, setBgMode] = useState<Bg>('dark');
  const bgRef = useRef<Bg>('dark');
  const api = useRef<{ fit: () => void; lines: Map<string, THREE.Object3D>; setBg: (m: Bg) => void; redraw: () => void } | null>(null);

  useEffect(() => {
    let alive = true;
    file.arrayBuffer().then((b) => {
      const d = parseDxf(decodeDxf(new Uint8Array(b)));
      if (!d) throw new Error('parse');
      if (!alive) return;
      const off = Object.entries<any>(d.tables?.layer?.layers ?? {}).filter(([, l]) => l.visible === false || l.frozen).map(([n]) => n);
      if (off.length) { const h = new Set(off); hiddenRef.current = h; setHidden(h); }
      // 図枠がペーパー空間（レイアウト）にある図面は、最初からレイアウトを表示します
      setMode(hasPaperSpace(d) ? 'paper' : 'model');
      setDxf(d);
    }).catch(() => alive && setErr(t('DXF を読み込めませんでした。バイナリ DXF や DWG には、現在は対応していません。')));
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
      if (!m) { m = new THREE.LineBasicMaterial({ color: b.color }); mats.set(key, m); }
      const arr = new Float32Array(b.n * 6); let o = 0;
      for (const s of b.segs) for (let i = 1; i < s.pts.length; i++) { const p = s.pts[i - 1], q = s.pts[i]; arr[o] = p.x; arr[o + 1] = p.y; arr[o + 3] = q.x; arr[o + 4] = q.y; o += 6; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      g.add(new THREE.LineSegments(geo, m));
    }
    const box = new THREE.Box3().setFromObject(scene);
    for (const tx of data.texts) {
      // 文字のおおよその外形（回転を考慮）も全体表示に含めます
      const ls = tx.s.split('\n'), wd = Math.min(tx.width ?? Infinity, tx.h * 1.1 * Math.max(...ls.map((l) => l.length))), ht = tx.h * 1.7 * ls.length;
      const c = Math.cos(tx.rot), sn = Math.sin(tx.rot);
      for (const [u, v] of [[0, 0], [wd, 0], [0, ht], [wd, ht], [-wd, -ht]] as const) box.expandByPoint(new THREE.Vector3(tx.x + (u * c - v * sn) * (tx.ha === 0 ? 1 : 0.5), tx.y + (u * sn + v * c) * 0.5, 0));
    }
    if (data.segs.length === 0 && data.texts.length > 0) box.setFromPoints(data.texts.map((tx) => new THREE.Vector3(tx.x, tx.y, 0))).expandByScalar(10);
    // 文字は WebGL ではなく重ねた 2D キャンバスに、ブラウザの日本語フォントで描きます
    const cv = document.createElement('canvas'); cv.className = 'dxf-text'; cv.dataset.testid = 'dxf-text';
    Object.assign(cv.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
    el.appendChild(cv);
    const ctx = cv.getContext('2d')!;
    const wraps = new Map<TextItem, string[]>();
    let drawn = 0;
    const redraw = () => {
      const w = el.clientWidth, h = el.clientHeight, dpr = Math.min(window.devicePixelRatio, 2);
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px'; }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sc = w / ((cam.right - cam.left) / cam.zoom), cx = cam.position.x, cy = cam.position.y;
      const hid = hiddenRef.current, m = bgRef.current; const colors = new Map<number, string>(); drawn = 0;
      for (const tx of data.texts) {
        if (hid.has(tx.layer)) continue;
        const fpx = tx.h * sc * 1.25; if (fpx < 1.5) continue;
        const sx = w / 2 + (tx.x - cx) * sc, sy = h / 2 - (tx.y - cy) * sc;
        let lines = wraps.get(tx); if (!lines) { lines = wrapLines(ctx, tx); wraps.set(tx, lines); }
        const reach = fpx * Math.max(...lines.map((l) => l.length)) * 1.1 + fpx * lines.length * 1.7;
        if (sx + reach < 0 || sx - reach > w || sy + reach < 0 || sy - reach > h) continue;
        let col = colors.get(tx.color); if (!col) { col = '#' + adjust(tx.color, m).getHexString(); colors.set(tx.color, col); }
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(-tx.rot); if (tx.wf !== 1 && tx.wf > 0) ctx.scale(tx.wf, 1);
        ctx.font = `${fpx}px ${FONT}`; ctx.fillStyle = col;
        ctx.textAlign = tx.ha === 1 ? 'center' : tx.ha === 2 ? 'right' : 'left';
        const capPx = tx.h * sc, lh = tx.h * sc * (5 / 3);
        if (tx.multiline || lines.length > 1) {
          // 1 行目の大文字の上端を基準に、行間 5/3 で並べます（AutoCAD の既定）
          const total = (lines.length - 1) * lh + capPx;
          const top = tx.va === 'top' ? 0 : tx.va === 'middle' ? -total / 2 : -total;
          ctx.textBaseline = 'alphabetic';
          lines.forEach((ln, i) => ctx.fillText(ln, 0, top + capPx + i * lh));
        } else {
          ctx.textBaseline = 'alphabetic';
          const dy = tx.va === 'top' ? capPx : tx.va === 'middle' ? capPx / 2 : tx.va === 'bottom' ? -capPx * 0.25 : 0;
          ctx.fillText(lines[0], 0, dy);
        }
        ctx.restore(); drawn++;
      }
      cv.dataset.drawn = String(drawn);
    };
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
    const orig = new Map([...mats.entries()].map(([k, x]) => [x, +k]));
    // 明るい背景では、黄色・シアンなど明るい線色を暗くして読みやすくします
    const setBg = (m: Bg) => {
      bgRef.current = m;
      scene.background = new THREE.Color(BGS[m]);
      for (const [x, rgb] of orig) x.color.copy(adjust(rgb, m));
      redraw();
    };
    setBg(bgRef.current);
    controls.addEventListener('change', redraw);
    api.current = { fit, lines, setBg, redraw };
    const resize = () => { renderer.setSize(el.clientWidth, el.clientHeight); fit(); redraw(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    let raf = 0; const loop = () => { raf = requestAnimationFrame(loop); renderer.render(scene, cam); }; loop();
    el.dataset.rendered = 'true';
    return () => { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); el.removeChild(renderer.domElement); el.removeChild(cv); };
  }, [data]);

  useEffect(() => { hiddenRef.current = hidden; api.current?.lines.forEach((g, l) => { g.visible = !hidden.has(l); }); api.current?.redraw(); }, [hidden, data]);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!data) return <Loading>{t('図面を読み込んでいます')}</Loading>;
  const layerNames = [...new Set([...data.segs.map((s) => s.layer), ...data.texts.map((s) => s.layer)])].sort();
  const paper = dxf && hasPaperSpace(dxf);
  return (
    <div className="three-wrap">
      <div className="toolbar">
        <button onClick={() => api.current?.fit()}>{t('全体表示')}</button>
        <button onClick={() => { const o = (['light', 'dark', 'jade'] as const); const n = o[(o.indexOf(bg) + 1) % 3]; setBgMode(n); api.current?.setBg(n); }} data-testid="bg">{t('背景')} {bg === 'light' ? t('ライト') : bg === 'dark' ? t('ダーク') : t('ジェード')}</button>
        {paper && <button onClick={() => setMode(mode === 'paper' ? 'model' : 'paper')} data-testid="dxf-space">{mode === 'paper' ? t('レイアウト表示中（モデルに切替）') : t('モデル表示中（レイアウトに切替）')}</button>}
        {data.skipped > 0 && <span className="hint-inline" title={Object.entries(data.skippedTypes).map(([k, v]) => `${k}: ${v}`).join('\n')}>{t('ハッチング・画像など {0} 件は、現在は表示していません。', data.skipped)}</span>}
      </div>
      <div className="dxf-layout">
        <div className="three-host" ref={host} data-testid="dxf-host" />
        <aside className="layers">
          <div className="label mono">LAYERS · {layerNames.length}</div>
          {layerNames.map((l) => (
            <label key={l}><input type="checkbox" checked={!hidden.has(l)} onChange={() => { const n = new Set(hidden); if (n.has(l)) n.delete(l); else n.add(l); setHidden(n); }} /> {l}</label>
          ))}
        </aside>
      </div>
      <p className="hint">{t('ドラッグで移動、ホイール（ピンチ）で拡大縮小します。')}</p>
    </div>
  );
}
