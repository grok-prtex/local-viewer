/** 3MF スライス（層）の操作パネル：表示切り替え・層スライダー・選んだ層の上面図 */
import { useEffect, useRef, useState } from 'react';
import { t, useLang, useResolvedTheme } from '../i18n';
import { apply, isClosed, type LayerIndex, type SliceModel } from '../model/slice3mf';
import type { SliceScene } from '../model/sliceScene';

export type SliceMode = 'mesh' | 'layers' | 'both';
const UNIT: Record<string, string> = { millimeter: 'mm', micron: 'µm', centimeter: 'cm', meter: 'm', inch: 'in', foot: 'ft' };
const fmtZ = (z: number) => { const s = z.toFixed(4).replace(/0+$/, '').replace(/\.$/, ''); return s === '-0' ? '0' : s; };

export default function SlicePanel({ model, li, scene, mode, setMode, hasMesh }: { model: SliceModel; li: LayerIndex; scene: SliceScene; mode: SliceMode; setMode: (m: SliceMode) => void; hasMesh: boolean }) {
  useLang();
  const theme = useResolvedTheme();
  const n = li.zs.length;
  const [k, setK] = useState(n - 1);
  const cv = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(260);
  const unit = UNIT[model.unit] ?? model.unit;

  useEffect(() => { scene.setLayer(k); }, [k, scene]);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(120, Math.floor(el.clientWidth))));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  // 上面図の範囲（全層の XY 外形。層を動かしても縮尺は変えません）
  const ext = useRef<[number, number, number, number] | null>(null);
  if (!ext.current) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const ins of model.instances) for (const s of ins.slices) for (let v = 0; v < s.xy.length; v += 2) {
      const p = apply(ins.m, s.xy[v], s.xy[v + 1], s.ztop);
      if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
    }
    ext.current = Number.isFinite(x0) ? [x0, y0, x1, y1] : [0, 0, 1, 1];
  }

  useEffect(() => {
    const c = cv.current; if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = w, H = w;
    c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px';
    const g = c.getContext('2d')!; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(document.documentElement);
    const v = (name: string, d: string) => css.getPropertyValue(name).trim() || d;
    g.fillStyle = v('--paper-2', '#f4f4f0'); g.fillRect(0, 0, W, H);
    const [x0, y0, x1, y1] = ext.current!;
    const pad = 12, sc = Math.min((W - pad * 2) / Math.max(x1 - x0, 1e-9), (H - pad * 2) / Math.max(y1 - y0, 1e-9));
    const ox = (W - (x1 - x0) * sc) / 2, oy = (H - (y1 - y0) * sc) / 2;
    const X = (x: number) => ox + (x - x0) * sc, Y = (y: number) => H - (oy + (y - y0) * sc);
    // 外形の枠
    g.strokeStyle = v('--line-2', '#d6d8d2'); g.lineWidth = 1; g.setLineDash([4, 3]);
    g.strokeRect(X(x0), Y(y1), (x1 - x0) * sc, (y1 - y0) * sc); g.setLineDash([]);
    let polys = 0;
    const draw = (kk: number, fill: boolean, stroke: string, lw: number) => {
      model.instances.forEach((ins, i) => {
        const j = li.at(kk, i); if (j < 0) return;
        const s = ins.slices[j];
        const closed = new Path2D(), open = new Path2D();
        for (const p of s.polys) {
          const path = isClosed(p) ? closed : open;
          p.forEach((vi, q) => { const w2 = apply(ins.m, s.xy[vi * 2], s.xy[vi * 2 + 1], s.ztop); if (q) path.lineTo(X(w2[0]), Y(w2[1])); else path.moveTo(X(w2[0]), Y(w2[1])); });
          if (isClosed(p)) path.closePath();
          if (fill) polys++;
        }
        if (fill) { g.fillStyle = theme === 'dark' ? 'rgba(240,138,36,0.32)' : 'rgba(240,138,36,0.26)'; g.fill(closed, 'evenodd'); }
        g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(closed); g.stroke(open);
      });
    };
    if (k > 0) draw(k - 1, false, v('--ink-4', '#b4b9bf'), 1);
    draw(k, true, '#f08a24', 1.6);
    c.dataset.polys = String(polys);
  }, [k, w, theme, model, li]);

  const step = (d: number) => setK((x) => Math.min(n - 1, Math.max(0, x + d)));
  const z = li.zs[k] ?? 0;
  const bottom = (() => { let b = Infinity; model.instances.forEach((_ins, i) => { const j = li.at(k, i); if (j >= 0) b = Math.min(b, li.bottoms[i][j]); }); return Number.isFinite(b) ? b : null; })();
  return (
    <div className="slice-panel" data-testid="slice-panel">
      <div className="slice-ctrl">
        <div className="slice-head">
          <b>{t('スライス（層）')}</b>
          <span className="seg" role="group" aria-label={t('表示')}>
            <button aria-pressed={mode === 'layers'} onClick={() => setMode('layers')} data-testid="slice-mode-layers">{t('レイヤー')}</button>
            <button aria-pressed={mode === 'mesh'} disabled={!hasMesh} onClick={() => setMode('mesh')} data-testid="slice-mode-mesh" title={hasMesh ? undefined : t('このファイルにはメッシュがありません')}>{t('メッシュ')}</button>
            <button aria-pressed={mode === 'both'} disabled={!hasMesh} onClick={() => setMode('both')} data-testid="slice-mode-both">{t('両方')}</button>
          </span>
        </div>
        <div className="slice-row">
          <button onClick={() => step(-1)} disabled={k <= 0} aria-label={t('前の層')} data-testid="slice-prev">−</button>
          <input type="range" min={1} max={n} step={1} value={k + 1} onChange={(e) => setK(+e.target.value - 1)} aria-label={t('層')} data-testid="slice-slider" disabled={n < 2} />
          <button onClick={() => step(1)} disabled={k >= n - 1} aria-label={t('次の層')} data-testid="slice-next">＋</button>
        </div>
        <dl className="slice-info">
          <dt>{t('層')}</dt><dd className="mono" data-testid="slice-layer">{(k + 1).toLocaleString()} / {n.toLocaleString()}</dd>
          <dt>{t('高さ（上面）')}</dt><dd className="mono" data-testid="slice-z">Z {fmtZ(z)} {unit}</dd>
          {bottom !== null && <><dt>{t('厚さ')}</dt><dd className="mono">{fmtZ(z - bottom)} {unit}</dd></>}
          <dt>{t('オブジェクト')}</dt><dd className="mono">{model.instances.length.toLocaleString()}</dd>
        </dl>
        <p className="hint">{t('スライダーか −／＋ ボタン（キーボードの矢印キー）で 1 層ずつ動かせます。オレンジが選んだ層、緑がそれより下の層です。')}</p>
      </div>
      <div className="slice-top" ref={box}>
        <span className="label">{t('上から見た図（XY）')}</span>
        <canvas ref={cv} data-testid="slice-top" aria-label={t('選んだ層を上から見た図')} role="img" />
      </div>
    </div>
  );
}
