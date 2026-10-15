import { useEffect, useRef, useState } from 'react';
import { extOf } from '../detect';
import { imageSub, jpegCandidates, type ImageSub } from '../media';
import { Loading, ErrorBox } from '../ui';

interface Page { url: string; w: number; h: number; label?: string; }

async function imageDataToUrl(d: { width: number; height: number; data: Uint8ClampedArray | Uint8Array }): Promise<Page> {
  const c = document.createElement('canvas'); c.width = d.width; c.height = d.height;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(d.data.buffer, d.data.byteOffset, d.width * d.height * 4), d.width, d.height), 0, 0);
  const blob: Blob = await new Promise((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error('toBlob'))), 'image/png'));
  return { url: URL.createObjectURL(blob), w: d.width, h: d.height };
}
function probeNative(blob: Blob): Promise<Page> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(blob); const im = new Image();
    im.onload = () => res({ url, w: im.naturalWidth, h: im.naturalHeight });
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('native')); };
    im.src = url;
  });
}
function heic(buf: ArrayBuffer): Promise<Page[]> {
  return new Promise((res, rej) => {
    const w = new Worker('/heic-worker.js');
    w.onmessage = async (e) => { w.terminate(); if (!e.data.ok) return rej(new Error(e.data.error)); res(await Promise.all(e.data.images.map(imageDataToUrl))); };
    w.onerror = (e) => { w.terminate(); rej(new Error(e.message)); };
    w.postMessage(buf, [buf]);
  });
}

async function decode(file: File, sub: ImageSub): Promise<{ pages: Page[]; note?: string }> {
  const svgType = sub === 'svg' ? 'image/svg+xml' : file.type;
  // ブラウザ自身が表示できる形式は、まずそのまま試します（Safari の HEIC / TIFF / JXL など）
  if (sub === 'native' || sub === 'svg' || sub === 'heic' || sub === 'tiff' || sub === 'jxl') {
    try { return { pages: [await probeNative(new Blob([file], { type: svgType }))] }; } catch { if (sub === 'native' || sub === 'svg') throw new Error('native'); }
  }
  const buf = await file.arrayBuffer();
  switch (sub) {
    case 'heic': { const p = await heic(buf); return { pages: p.map((x, i) => ({ ...x, label: p.length > 1 ? `画像 ${i + 1}` : undefined })) }; }
    case 'jxl': { const { default: dec } = await import('@jsquash/jxl/decode'); return { pages: [await imageDataToUrl(await dec(buf))] }; }
    case 'tiff': {
      const UTIF = (await import('utif')).default;
      const ifds = UTIF.decode(buf).filter((i: Record<string, unknown>) => i.t256 && i.t257);
      const pages: Page[] = [];
      for (const [i, ifd] of ifds.slice(0, 50).entries()) {
        UTIF.decodeImage(buf, ifd);
        pages.push({ ...(await imageDataToUrl({ width: ifd.width, height: ifd.height, data: UTIF.toRGBA8(ifd) })), label: `ページ ${i + 1}` });
      }
      if (!pages.length) throw new Error('tiff');
      return { pages };
    }
    case 'psd': {
      const { readPsd } = await import('ag-psd');
      const psd = readPsd(buf, { skipLayerImageData: true, skipThumbnail: true, useImageData: true });
      if (!psd.imageData) throw new Error('psd');
      if (!(psd.imageData.data instanceof Uint8ClampedArray || psd.imageData.data instanceof Uint8Array)) throw new Error('psd depth');
      return { pages: [await imageDataToUrl(psd.imageData as { width: number; height: number; data: Uint8ClampedArray })], note: '合成済みの画像を表示しています（レイヤーごとの表示はしていません）。' };
    }
    case 'tga': {
      const { TGALoader } = await import('three/examples/jsm/loaders/TGALoader.js');
      const t = new TGALoader().parse(buf) as unknown as { data: Uint8Array; width: number; height: number; flipY: boolean };
      const rows = new Uint8Array(t.data.length), rl = t.width * 4;
      for (let y = 0; y < t.height; y++) rows.set(t.data.subarray(y * rl, (y + 1) * rl), (t.flipY ? t.height - 1 - y : y) * rl);
      return { pages: [await imageDataToUrl({ width: t.width, height: t.height, data: rows })] };
    }
    case 'raw': {
      const b = new Uint8Array(buf); let best: Page | null = null;
      for (const off of jpegCandidates(b)) {
        try {
          const p = await probeNative(new Blob([b.subarray(off)], { type: 'image/jpeg' }));
          if (!best || p.w * p.h > best.w * best.h) { if (best) URL.revokeObjectURL(best.url); best = p; } else URL.revokeObjectURL(p.url);
        } catch { /* 次の候補へ */ }
      }
      if (!best) throw new Error('raw');
      return { pages: [best], note: 'カメラ RAW に埋め込まれたプレビュー画像を表示しています（現像処理はしていません）。' };
    }
  }
  throw new Error('unsupported');
}

export default function ImageViewer({ file }: { file: File }) {
  const [res, setRes] = useState<{ pages: Page[]; note?: string } | null>(null);
  const [err, setErr] = useState('');
  const [page, setPage] = useState(0);
  const [dark, setDark] = useState(false);
  const [view, setView] = useState<{ s: number; x: number; y: number } | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const sub = imageSub(extOf(file.name), new Uint8Array(0));

  useEffect(() => {
    let alive = true; let made: Page[] = [];
    (async () => {
      const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
      const s = imageSub(extOf(file.name), head) ?? sub ?? 'native';
      const r = await decode(file, s); made = r.pages;
      if (alive) { setRes(r); setPage(0); setView(null); } else r.pages.forEach((p) => URL.revokeObjectURL(p.url));
    })().catch((e) => { console.warn('image failed', e); if (alive) setErr('この画像を表示できませんでした。ファイルが壊れているか、まだ対応していない書き方の可能性があります。'); });
    return () => { alive = false; made.forEach((p) => URL.revokeObjectURL(p.url)); };
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  const cur = res?.pages[page];
  const fit = () => {
    const el = host.current; if (!el || !cur) return;
    const s = Math.min(el.clientWidth / cur.w, el.clientHeight / cur.h, 1);
    setView({ s, x: (el.clientWidth - cur.w * s) / 2, y: (el.clientHeight - cur.h * s) / 2 });
  };
  useEffect(() => { if (cur && !view) fit(); }); // eslint-disable-line react-hooks/exhaustive-deps
  const zoomAt = (f: number, cx?: number, cy?: number) => setView((v) => {
    if (!v || !host.current) return v;
    const px = cx ?? host.current.clientWidth / 2, py = cy ?? host.current.clientHeight / 2;
    const s = Math.min(40, Math.max(0.02, v.s * f)), k = s / v.s;
    return { s, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
  });

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!res || !cur) return <Loading>画像を読み込んでいます</Loading>;
  return (
    <div>
      <div className="toolbar">
        <button onClick={fit}>全体表示</button>
        <button onClick={() => { const el = host.current!; setView({ s: 1, x: (el.clientWidth - cur.w) / 2, y: (el.clientHeight - cur.h) / 2 }); }}>等倍</button>
        <button onClick={() => zoomAt(1 / 1.25)}>縮小</button>
        <button onClick={() => zoomAt(1.25)}>拡大</button>
        <button aria-pressed={dark} onClick={() => setDark(!dark)}>背景 {dark ? '黒' : '白'}</button>
        {res.pages.length > 1 && (
          <select value={page} onChange={(e) => { setPage(Number(e.target.value)); setView(null); }} aria-label="ページ">
            {res.pages.map((p, i) => <option key={i} value={i}>{p.label ?? i + 1}</option>)}
          </select>
        )}
        <span className="mono dims" data-testid="img-dims">{cur.w} × {cur.h} px · {Math.round((view?.s ?? 1) * 100)}%</span>
      </div>
      <div ref={host} className={'img-host' + (dark ? ' dark' : '')} data-testid="img-host"
        onWheel={(e) => { const r = host.current!.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }}
        onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY }; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
        onPointerMove={(e) => { const d = drag.current; if (!d) return; setView((v) => v && { ...v, x: v.x + e.clientX - d.x, y: v.y + e.clientY - d.y }); drag.current = { x: e.clientX, y: e.clientY }; }}
        onPointerUp={() => { drag.current = null; }}
        onDoubleClick={fit}>
        {view && <img src={cur.url} alt={file.name} draggable={false} data-testid="img" style={{ width: cur.w * view.s, height: cur.h * view.s, transform: `translate(${view.x}px, ${view.y}px)` }} />}
      </div>
      <p className="hint">{res.note ? res.note + ' ' : ''}ホイールで拡大縮小、ドラッグで移動、ダブルクリックで全体表示します。</p>
    </div>
  );
}
