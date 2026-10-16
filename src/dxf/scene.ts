/* eslint-disable @typescript-eslint/no-explicit-any */
import { cleanMText, cleanText } from './parse';

export type P = { x: number; y: number };
export type Seg = { layer: string; color: number; pts: P[] };
/** 画面に描く文字。x,y は基準点（ワールド座標）、h は文字高さ、rot はラジアン */
export type TextItem = {
  s: string; x: number; y: number; h: number; rot: number; wf: number;
  ha: 0 | 1 | 2; va: 'baseline' | 'bottom' | 'middle' | 'top';
  width?: number; layer: string; color: number; multiline?: boolean;
  /** 寸法・引出線の文字（縮小時も最小サイズで表示） */ dim?: boolean;
};
export type DxfScene = { segs: Seg[]; texts: TextItem[]; skipped: number; skippedTypes: Record<string, number> };
/** アフィン変換 x' = a x + c y + e, y' = b x + d y + f */
type M = [number, number, number, number, number, number];
const I: M = [1, 0, 0, 1, 0, 0];
const mul = (m: M, n: M): M => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const ap = (m: M, p: P): P => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] });
const av = (m: M, x: number, y: number): P => ({ x: m[0] * x + m[2] * y, y: m[1] * x + m[3] * y });

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
  return b > 0 ? arcPts(c, Math.abs(r), a0, a1) : arcPts(c, Math.abs(r), a1, a0).reverse();
}
const fmtNum = (v: number) => { const s = (Math.round(v * 100) / 100).toFixed(2); return s.replace(/\.?0+$/, ''); };

/** 線分クリップ（Liang–Barsky）。ビューポートの外を切り落とします */
function clipSeg(p: P, q: P, r: { x0: number; y0: number; x1: number; y1: number }): [P, P] | null {
  let t0 = 0, t1 = 1; const dx = q.x - p.x, dy = q.y - p.y;
  const chk = (pp: number, qq: number) => { if (pp === 0) return qq >= 0; const t = qq / pp; if (pp < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } return true; };
  if (!chk(-dx, p.x - r.x0) || !chk(dx, r.x1 - p.x) || !chk(-dy, p.y - r.y0) || !chk(dy, r.y1 - p.y)) return null;
  return [{ x: p.x + t0 * dx, y: p.y + t0 * dy }, { x: p.x + t1 * dx, y: p.y + t1 * dy }];
}

export function hasPaperSpace(dxf: any): boolean {
  return (dxf.entities ?? []).some((e: any) => e.inPaperSpace && e.type !== 'VIEWPORT');
}

/** DXF をモデル空間（または最初のレイアウト）の線分と文字に変換します */
export function buildScene(dxf: any, mode: 'model' | 'paper' = 'model'): DxfScene {
  const layers = dxf.tables?.layer?.layers ?? {};
  const hdr = dxf.header ?? {};
  const dimTxt = +(hdr.$DIMTXT ?? 2.5) * +(hdr.$DIMSCALE || 1) || 2.5;
  const dimAsz = +(hdr.$DIMASZ ?? 2.5) * +(hdr.$DIMSCALE || 1) || 2.5;
  const segs: Seg[] = []; const texts: TextItem[] = []; let skipped = 0; const skippedTypes: Record<string, number> = {};
  const skip = (t: string) => { skipped++; skippedTypes[t] = (skippedTypes[t] ?? 0) + 1; };
  let clip: { x0: number; y0: number; x1: number; y1: number } | null = null;

  const walk = (ents: any[], m: M, depth: number, pLayer?: string, pColor?: number, inDim = false) => {
    for (const e of ents ?? []) {
      if (e.visible === false) continue;
      const layer = (e.layer === '0' || e.layer == null) && pLayer ? pLayer : e.layer ?? '0';
      const lc: number = layers[layer]?.color ?? pColor ?? 0xffffff;
      const color: number = e.colorIndex === 0 ? (pColor ?? lc) : e.colorIndex === 256 || e.color == null ? lc : e.color;
      const add = (pts: P[]) => {
        const w = pts.map((p) => ap(m, p));
        if (!clip) { segs.push({ layer, color, pts: w }); return; }
        for (let i = 1; i < w.length; i++) { const c = clipSeg(w[i - 1], w[i], clip); if (c) segs.push({ layer, color, pts: c }); }
      };
      const text = (s: string, at: P, h: number, rotDeg: number, ha: TextItem['ha'], va: TextItem['va'], extra: Partial<TextItem> = {}) => {
        if (!s || !s.trim() || !at) return;
        const p = ap(m, at); const r = (rotDeg * Math.PI) / 180;
        if (clip && (p.x < clip.x0 || p.x > clip.x1 || p.y < clip.y0 || p.y > clip.y1)) return;
        const dir = av(m, Math.cos(r), Math.sin(r)), up = av(m, -Math.sin(r), Math.cos(r));
        const sc = Math.hypot(up.x, up.y);
        texts.push({ dim: inDim || e.type === 'DIMENSION' || e.type === 'MULTILEADER', s, x: p.x, y: p.y, h: (h || 2.5) * sc, rot: Math.atan2(dir.y, dir.x), wf: (extra.wf ?? 1) * (Math.hypot(dir.x, dir.y) / (sc || 1)), ha, va, layer, color, ...extra, width: extra.width ? extra.width * Math.hypot(dir.x, dir.y) : undefined });
      };
      const textEnt = (s: string) => {
        const hz = e.halign ?? e.horizontalJustification ?? 0, vt = e.valign ?? e.verticalJustification ?? 0;
        const useEnd = (hz || vt) && e.endPoint;
        let at = useEnd ? e.endPoint : e.startPoint;
        let ha: TextItem['ha'] = hz === 1 || hz === 4 ? 1 : hz === 2 ? 2 : 0;
        let va: TextItem['va'] = (['baseline', 'bottom', 'middle', 'top'] as const)[vt] ?? 'baseline';
        if (hz === 4) va = 'middle';
        if ((hz === 3 || hz === 5) && e.endPoint && e.startPoint) { at = { x: (e.startPoint.x + e.endPoint.x) / 2, y: (e.startPoint.y + e.endPoint.y) / 2 }; ha = 1; }
        text(cleanText(s), at, e.textHeight, e.rotation ?? 0, ha, va, { wf: e.xScale ?? e.scale ?? 1 });
      };
      const arrow = (tip: P, from: P, size: number) => {
        const dx = from.x - tip.x, dy = from.y - tip.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, w = size / 6;
        const b = { x: tip.x + ux * size, y: tip.y + uy * size };
        add([{ x: b.x - uy * w, y: b.y + ux * w }, tip, { x: b.x + uy * w, y: b.y - ux * w }, { x: b.x - uy * w, y: b.y + ux * w }]);
      };
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
          const a0 = e.startAngle ?? 0; let a1 = e.endAngle ?? Math.PI * 2; while (a1 <= a0) a1 += Math.PI * 2;
          const pts: P[] = []; for (let i = 0; i <= 96; i++) { const a = a0 + ((a1 - a0) * i) / 96, x = rx * Math.cos(a), y = ry * Math.sin(a); pts.push({ x: e.center.x + x * Math.cos(rot) - y * Math.sin(rot), y: e.center.y + x * Math.sin(rot) + y * Math.cos(rot) }); }
          add(pts); break;
        }
        case 'SPLINE': { const p = e.fitPoints?.length ? e.fitPoints : e.controlPoints; if (p?.length) add(p); break; }
        case 'SOLID': case '3DFACE': { const p = e.points ?? e.vertices; if (p?.length) add(p.length === 4 && e.type === 'SOLID' ? [p[0], p[1], p[3], p[2], p[0]] : [...p, p[0]]); break; }
        case 'TEXT': textEnt(e.text ?? ''); break;
        case 'ATTRIB': if (!e.invisible) textEnt(e.text ?? ''); break;
        case 'ATTDEF':
          // ブロック内の属性定義は INSERT 側の ATTRIB が値を持つので、定数属性だけ描きます
          if (e.invisible) break;
          if (depth === 0) textEnt(e.tag ?? e.text ?? ''); else if (e.constant) textEnt(e.text ?? '');
          break;
        case 'MTEXT': {
          const ap0 = e.attachmentPoint ?? 1; const col = (ap0 - 1) % 3, row = Math.floor((ap0 - 1) / 3);
          const rot = e.directionVector ? (Math.atan2(e.directionVector.y, e.directionVector.x) * 180) / Math.PI : e.rotation ?? 0;
          text(cleanMText(e.text ?? ''), e.position, e.height, rot, col as 0 | 1 | 2, (['top', 'middle', 'bottom'] as const)[row], { multiline: true, width: e.width || undefined });
          break;
        }
        case 'INSERT': {
          const blk = dxf.blocks?.[e.name]; if (!blk || depth > 12) { skip('INSERT'); break; }
          const bx = blk.position?.x ?? 0, by = blk.position?.y ?? 0;
          const sx = e.xScale ?? 1, sy = e.yScale ?? 1, r = ((e.rotation ?? 0) * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r);
          const nx = e.columnCount || 1, ny = e.rowCount || 1;
          for (let ix = 0; ix < nx; ix++) for (let iy = 0; iy < ny; iy++) {
            const ox = ix * (e.columnSpacing ?? 0), oy = iy * (e.rowSpacing ?? 0);
            const px = e.position.x + ox * cos - oy * sin, py = e.position.y + ox * sin + oy * cos;
            const local: M = [cos * sx, sin * sx, -sin * sy, cos * sy, px - (cos * sx * bx - sin * sy * by), py - (sin * sx * bx + cos * sy * by)];
            walk(blk.entities, mul(m, local), depth + 1, layer, color, inDim);
          }
          break;
        }
        case 'DIMENSION': {
          const blk = e.block && dxf.blocks?.[e.block];
          if (blk?.entities?.length) { walk(blk.entities, m, depth + 1, layer, color, true); break; }
          // 匿名ブロックが無い：寸法線・矢印・寸法値を自前で描きます
          const t = e.dimensionType & 7, p13 = e.linearOrAngularPoint1, p14 = e.linearOrAngularPoint2, p10 = e.anchorPoint;
          const label = (v: number, pre = '') => { const s = e.text && e.text !== '<>' ? e.text.replace('<>', pre + fmtNum(v)) : pre + fmtNum(v); return e.text === ' ' ? '' : cleanMText(s); };
          if ((t === 0 || t === 1) && p13 && p14 && p10) {
            let ux: number, uy: number;
            if (t === 1) { const L = Math.hypot(p14.x - p13.x, p14.y - p13.y) || 1; ux = (p14.x - p13.x) / L; uy = (p14.y - p13.y) / L; }
            else { const a = ((e.angle ?? 0) * Math.PI) / 180; ux = Math.cos(a); uy = Math.sin(a); }
            const proj = (p: P) => { const k = (p.x - p10.x) * ux + (p.y - p10.y) * uy; return { x: p10.x + ux * k, y: p10.y + uy * k }; };
            const q1 = proj(p13), q2 = proj(p14);
            add([p13, q1]); add([p14, q2]); add([q1, q2]); arrow(q1, q2, dimAsz); arrow(q2, q1, dimAsz);
            const meas = e.actualMeasurement ?? Math.abs((p14.x - p13.x) * ux + (p14.y - p13.y) * uy);
            const at = e.middleOfText ?? { x: (q1.x + q2.x) / 2, y: (q1.y + q2.y) / 2 };
            let deg = (Math.atan2(uy, ux) * 180) / Math.PI; if (deg > 90.001 || deg < -89.999) deg += 180;
            text(label(meas), at, dimTxt, deg, 1, e.middleOfText ? 'middle' : 'bottom');
          } else if ((t === 3 || t === 4) && p10 && e.diameterOrRadiusPoint) {
            const p15 = e.diameterOrRadiusPoint; add([p10, p15]); arrow(p15, p10, dimAsz);
            const meas = e.actualMeasurement ?? Math.hypot(p15.x - p10.x, p15.y - p10.y);
            text(label(meas, t === 3 ? '⌀' : 'R'), e.middleOfText ?? p15, dimTxt, 0, 1, 'middle');
          } else if (e.middleOfText && e.actualMeasurement != null) {
            text(label(t === 2 || t === 5 ? (e.actualMeasurement * 180) / Math.PI : e.actualMeasurement, ''), e.middleOfText, dimTxt, 0, 1, 'middle');
          } else skip('DIMENSION');
          break;
        }
        case 'LEADER': {
          const v = e.vertices ?? []; if (v.length < 2) break;
          add(v); if (e.arrow) arrow(v[0], v[1], dimAsz); break;
        }
        case 'MULTILEADER': {
          const as = e.arrowSize || dimAsz;
          e.leaders.forEach((ld: any, i: number) => {
            const line = e.lines[i] ?? [];
            const pts = [...line]; if (ld.last) pts.push(ld.last);
            if (ld.last && ld.dir && ld.len) pts.push({ x: ld.last.x + ld.dir.x * ld.len, y: ld.last.y + ld.dir.y * ld.len });
            if (pts.length >= 2) { add(pts); arrow(pts[0], pts[1], as); }
          });
          if (e.leaders.length === 0) for (const line of e.lines) if (line.length >= 2) { add(line); arrow(line[0], line[1], as); }
          if (e.text && e.textPos) {
            const rot = e.textDir ? (Math.atan2(e.textDir.y, e.textDir.x) * 180) / Math.PI : 0;
            text(cleanMText(e.text), e.textPos, e.textHeight || dimTxt, rot, 0, 'top', { multiline: true });
          }
          break;
        }
        case 'POINT': case 'VIEWPORT': case 'SEQEND': case 'ATTRIB_END': break;
        default: skip(e.type ?? '?');
      }
    }
  };
  const all = dxf.entities ?? [];
  if (mode === 'paper') {
    const paper = all.filter((e: any) => e.inPaperSpace);
    const model = all.filter((e: any) => !e.inPaperSpace);
    // ペーパー空間のビューポートに、モデル空間を縮尺・切り抜きして描きます（id 1 は用紙全体なので除く）
    for (const vp of paper.filter((e: any) => e.type === 'VIEWPORT' && e.id !== 1 && e.center && e.width && e.height && e.viewHeight)) {
      const k = vp.height / vp.viewHeight, vc = vp.viewCenter ?? { x: 0, y: 0 };
      clip = { x0: vp.center.x - vp.width / 2, x1: vp.center.x + vp.width / 2, y0: vp.center.y - vp.height / 2, y1: vp.center.y + vp.height / 2 };
      walk(model, [k, 0, 0, k, vp.center.x - vc.x * k, vp.center.y - vc.y * k], 0);
      clip = null;
    }
    walk(paper, I, 0);
  } else walk(all.filter((e: any) => !e.inPaperSpace), I, 0);
  return { segs, texts, skipped, skippedTypes };
}
